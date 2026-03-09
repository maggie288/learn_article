/**
 * 第二级：按需章节生成。用户点开某一章时触发生成，调 Sonnet 生成完整叙事 + 可视化。
 */

import { analogistAgent } from "@/lib/agents/analogist";
import { connectorAgent } from "@/lib/agents/connector";
import { coderAgent } from "@/lib/agents/coder";
import { examinerAgent } from "@/lib/agents/examiner";
import { createNarrationForChapterWithLLM } from "@/lib/agents/narrator-llm";
import { createNarrationForChapter } from "@/lib/agents/narrator";
import { visualizerAgent } from "@/lib/agents/visualizer";
import {
  buildExtractionFromSource,
  getCourseById,
  getCoursePathConfig,
  getSourceById,
  upsertChapter,
} from "@/lib/db/repositories";
import type { DifficultyLevel, ExtractionResult, GeneratedChapter } from "@/lib/engine/types";
import { hasAnyLlmKey } from "@/lib/llm/unified-llm";

export async function generateChapterOnDemand(
  courseId: string,
  chapterIndex: number,
): Promise<GeneratedChapter | null> {
  const course = await getCourseById(courseId);
  if (!course) return null;
  if (course.status !== "skeleton") return null;

  const source = await getSourceById(course.sourceId);
  if (!source) return null;

  const extraction = buildExtractionFromSource(source);
  if (!extraction) return null;

  let path = await getCoursePathConfig(courseId);
  if (!path || !path.chapters[chapterIndex]) {
    const { generateLearningPath } = await import("@/lib/engine/path-generation/generate-learning-path");
    path = generateLearningPath(extraction, course.difficulty as DifficultyLevel);
  }
  const pathChapter = path.chapters[chapterIndex];
  if (!pathChapter) return null;

  const sourceDocument = source.rawContent ?? null;
  if (!sourceDocument) return null;

  const useLLM = hasAnyLlmKey();
  const base = useLLM
    ? await createNarrationForChapterWithLLM({
        chapter: pathChapter,
        extraction,
        difficulty: course.difficulty as DifficultyLevel,
        orderIndex: chapterIndex,
        totalChapters: path.chapters.length,
        sourceDocument,
        language: course.language,
      })
    : createNarrationForChapter({
        chapter: pathChapter,
        extraction,
        difficulty: course.difficulty as DifficultyLevel,
        orderIndex: chapterIndex,
      });

  const [analogies, visualizer, examiner, connector, coder] = await Promise.all([
    analogistAgent(pathChapter, extraction, course.difficulty as DifficultyLevel),
    visualizerAgent(pathChapter, extraction, course.difficulty as DifficultyLevel),
    examinerAgent(pathChapter, extraction, course.difficulty as DifficultyLevel),
    connectorAgent(pathChapter, extraction),
    course.difficulty !== "explorer"
      ? coderAgent(pathChapter, extraction, course.difficulty as DifficultyLevel)
      : Promise.resolve(null),
  ]);

  const chapter: GeneratedChapter = {
    ...base,
    analogies: analogies.selected.length > 0 ? analogies.selected : undefined,
    svgComponents: visualizer.components.length > 0 ? visualizer.components : undefined,
    quizQuestions: examiner.questions.length > 0 ? examiner.questions : undefined,
    codeSnippets: coder?.snippets?.length ? coder.snippets : undefined,
  };

  await upsertChapter(courseId, chapter);
  return chapter;
}
