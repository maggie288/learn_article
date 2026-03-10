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
  takeNarratorDraft,
  upsertChapter,
} from "@/lib/db/repositories";
import type { CodeSnippet, DifficultyLevel, ExtractionResult, GeneratedChapter } from "@/lib/engine/types";
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

/** 仅跑叙述（适配 10s 超时拆步）；返回 base 供后续 agents + save 使用 */
export async function runChapterNarratorOnly(
  courseId: string,
  chapterIndex: number,
): Promise<{
  orderIndex: number;
  title: string;
  subtitle?: string;
  narration: string;
  conceptNames: string[];
  sourceCitations: string[];
}> {
  const course = await getCourseById(courseId);
  if (!course || course.status !== "skeleton") throw new Error(`Course ${courseId} not skeleton`);
  const source = await getSourceById(course.sourceId);
  if (!source) throw new Error(`Source not found`);
  const extraction = buildExtractionFromSource(source);
  if (!extraction) throw new Error(`Extraction not found`);

  let path = await getCoursePathConfig(courseId);
  if (!path || !path.chapters[chapterIndex]) {
    const { generateLearningPath } = await import("@/lib/engine/path-generation/generate-learning-path");
    path = generateLearningPath(extraction, course.difficulty as DifficultyLevel);
  }
  const pathChapter = path.chapters[chapterIndex];
  if (!pathChapter) throw new Error(`Chapter ${chapterIndex} not in path`);

  const sourceDocument = source.rawContent ?? null;
  if (!sourceDocument) throw new Error(`Source has no rawContent`);

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

  return {
    orderIndex: base.orderIndex,
    title: base.title,
    subtitle: base.subtitle,
    narration: base.narration,
    conceptNames: base.conceptNames,
    sourceCitations: base.sourceCitations ?? [],
  };
}

/** 单 agent 步骤，便于拆成更小 step 或迁到 worker */
export async function runChapterAnalogistOnly(courseId: string, chapterIndex: number) {
  const { pathChapter, extraction, difficulty } = await loadChapterContext(courseId, chapterIndex);
  const r = await analogistAgent(pathChapter, extraction, difficulty);
  return { analogies: r.selected.length > 0 ? r.selected : undefined };
}

export async function runChapterVisualizerOnly(courseId: string, chapterIndex: number) {
  const { pathChapter, extraction, difficulty } = await loadChapterContext(courseId, chapterIndex);
  const r = await visualizerAgent(pathChapter, extraction, difficulty);
  return { svgComponents: r.components.length > 0 ? r.components : undefined };
}

export async function runChapterExaminerOnly(courseId: string, chapterIndex: number) {
  const { pathChapter, extraction, difficulty } = await loadChapterContext(courseId, chapterIndex);
  const r = await examinerAgent(pathChapter, extraction, difficulty);
  return { quizQuestions: r.questions.length > 0 ? r.questions : undefined };
}

export async function runChapterConnectorOnly(courseId: string, chapterIndex: number) {
  const { pathChapter, extraction } = await loadChapterContext(courseId, chapterIndex);
  await connectorAgent(pathChapter, extraction);
}

export async function runChapterCoderOnly(courseId: string, chapterIndex: number) {
  const { pathChapter, extraction, difficulty, course } = await loadChapterContext(courseId, chapterIndex);
  if (course.difficulty === "explorer") return { codeSnippets: undefined as CodeSnippet[] | undefined };
  const r = await coderAgent(pathChapter, extraction, difficulty);
  return { codeSnippets: r?.snippets?.length ? r.snippets : undefined };
}

/** 共享：加载 course/source/path/extraction，供各 agent 步复用 */
async function loadChapterContext(courseId: string, chapterIndex: number) {
  const course = await getCourseById(courseId);
  if (!course || course.status !== "skeleton") throw new Error(`Course ${courseId} not skeleton`);
  const source = await getSourceById(course.sourceId);
  if (!source) throw new Error(`Source not found`);
  const extraction = buildExtractionFromSource(source);
  if (!extraction) throw new Error(`Extraction not found`);
  let path = await getCoursePathConfig(courseId);
  if (!path || !path.chapters[chapterIndex]) {
    const { generateLearningPath } = await import("@/lib/engine/path-generation/generate-learning-path");
    path = generateLearningPath(extraction, course.difficulty as DifficultyLevel);
  }
  const pathChapter = path.chapters[chapterIndex];
  if (!pathChapter) throw new Error(`Chapter ${chapterIndex} not in path`);
  return {
    course,
    pathChapter,
    extraction,
    difficulty: course.difficulty as DifficultyLevel,
  };
}

/** 仅跑类比/图/测验/连接/代码（适配 10s 超时拆步）；保留供按需单章生成等场景 */
export async function runChapterAgentsOnly(
  courseId: string,
  chapterIndex: number,
): Promise<{
  analogies?: Awaited<ReturnType<typeof analogistAgent>>["selected"];
  svgComponents?: Awaited<ReturnType<typeof visualizerAgent>>["components"];
  quizQuestions?: Awaited<ReturnType<typeof examinerAgent>>["questions"];
  codeSnippets?: CodeSnippet[] | null;
}> {
  const [analogies, visualizer, examiner, , coder] = await Promise.all([
    runChapterAnalogistOnly(courseId, chapterIndex),
    runChapterVisualizerOnly(courseId, chapterIndex),
    runChapterExaminerOnly(courseId, chapterIndex),
    runChapterConnectorOnly(courseId, chapterIndex),
    runChapterCoderOnly(courseId, chapterIndex),
  ]);
  return {
    analogies: analogies.analogies,
    svgComponents: visualizer.svgComponents,
    quizQuestions: examiner.quizQuestions,
    codeSnippets: coder.codeSnippets ?? undefined,
  };
}

/** 聚合各 agent 步结果，供 runChapterSave 使用 */
export type ChapterAgentsResult = {
  analogies?: Awaited<ReturnType<typeof runChapterAnalogistOnly>>["analogies"];
  svgComponents?: Awaited<ReturnType<typeof runChapterVisualizerOnly>>["svgComponents"];
  quizQuestions?: Awaited<ReturnType<typeof runChapterExaminerOnly>>["quizQuestions"];
  codeSnippets?: CodeSnippet[] | null;
};

/** 轮询 worker 写入的 narrator draft（主应用在 INNGEST_USE_WORKER 时用） */
export async function pollNarratorDraft(
  courseId: string,
  chapterIndex: number,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<Awaited<ReturnType<typeof runChapterNarratorOnly>>> {
  const intervalMs = options?.intervalMs ?? 3000;
  const timeoutMs = options?.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const draft = await takeNarratorDraft(courseId, chapterIndex);
    if (draft && typeof draft.orderIndex === "number" && typeof draft.narration === "string") {
      return {
        orderIndex: draft.orderIndex as number,
        title: String(draft.title ?? ""),
        subtitle: draft.subtitle != null ? String(draft.subtitle) : undefined,
        narration: String(draft.narration),
        conceptNames: Array.isArray(draft.conceptNames) ? (draft.conceptNames as string[]) : [],
        sourceCitations: Array.isArray(draft.sourceCitations) ? (draft.sourceCitations as string[]) : [],
      };
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Narrator draft timeout for course ${courseId} chapter ${chapterIndex}`);
}

/** 合并 narrator base + agents 并落库，更新任务进度 */
export async function runChapterSave(
  courseId: string,
  chapterIndex: number,
  taskId: string,
  totalChapters: number,
  base: Awaited<ReturnType<typeof runChapterNarratorOnly>>,
  agents: ChapterAgentsResult,
): Promise<void> {
  const chapter: GeneratedChapter = {
    ...base,
    sourceCitations: base.sourceCitations ?? [],
    analogies: agents.analogies,
    svgComponents: agents.svgComponents,
    quizQuestions: agents.quizQuestions,
    codeSnippets: agents.codeSnippets ?? undefined,
  };
  await upsertChapter(courseId, chapter);
  const { updateGenerationTask } = await import("@/lib/db/repositories");
  await updateGenerationTask(taskId, {
    progressChaptersDone: Math.min(chapterIndex + 1, totalChapters),
  });
}
