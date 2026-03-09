import { analogistAgent } from "@/lib/agents/analogist";
import { connectorAgent } from "@/lib/agents/connector";
import { coderAgent } from "@/lib/agents/coder";
import { examinerAgent } from "@/lib/agents/examiner";
import { createNarrationForChapterWithLLM } from "@/lib/agents/narrator-llm";
import { createNarrationForChapter } from "@/lib/agents/narrator";
import { visualizerAgent } from "@/lib/agents/visualizer";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  createCourseShell,
  getSourceRecord,
  insertSkeletonChapters,
  publishCourse,
  saveExtractionResult,
  updateCourseStatus,
  updateGenerationTask,
  updateGlobalConceptGraph,
  upsertSourceDocument,
  writeVerificationLogs,
} from "@/lib/db/repositories";
import { extractPaperInsights } from "@/lib/engine/extraction/extract-paper-insights";
import { ingestFromUrl } from "@/lib/engine/ingestion/paper";
import { generateLearningPath } from "@/lib/engine/path-generation/generate-learning-path";
import { renderBlogFromChapters } from "@/lib/engine/rendering/blog";
import type { CourseTaskPayload } from "@/lib/engine/types";
import { autoFixFailedChapters } from "@/lib/engine/verification/auto-fix";
import { generateCourseAudio } from "@/lib/tts/elevenlabs";
import { runVerificationPipeline } from "@/lib/engine/verification/run-verification";
import { hasAnyLlmKey } from "@/lib/llm/unified-llm";

/**
 * 第一级：骨架生成（<2 秒量级）。仅生成标题、章节列表、每章核心概念，写入 skeleton 章节占位。
 * 用户立刻看到课程结构，按需再触发生成单章。
 */
export async function runCourseGenerationSkeleton(payload: CourseTaskPayload) {
  await updateGenerationTask(payload.taskId, { status: "extracting" });

  const sourceDocument = await ingestFromUrl(payload.sourceUrl);
  const sourceRecord = await upsertSourceDocument(sourceDocument);

  const extraction = await extractPaperInsights(sourceDocument);
  await saveExtractionResult(payload.sourceUrl, extraction);

  await updateGenerationTask(payload.taskId, { status: "generating" });

  const path = generateLearningPath(extraction, payload.difficulty);
  const course = await createCourseShell({
    sourceId: sourceRecord.id,
    difficulty: payload.difficulty,
    language: payload.language,
    path,
  });

  await insertSkeletonChapters(course.id, path);
  await updateCourseStatus(course.id, "skeleton");
  await updateGenerationTask(payload.taskId, {
    status: "skeleton",
    courseId: course.id,
  });

  return {
    taskId: payload.taskId,
    courseId: course.id,
    source: await getSourceRecord(payload.sourceUrl),
    path,
  };
}

export async function runCourseGeneration(payload: CourseTaskPayload) {
  const startedAt = Date.now();
  await updateGenerationTask(payload.taskId, {
    status: "extracting",
  });

  const sourceDocument = await ingestFromUrl(payload.sourceUrl);
  const sourceRecord = await upsertSourceDocument(sourceDocument);

  const extraction = await extractPaperInsights(sourceDocument);
  await saveExtractionResult(payload.sourceUrl, extraction);

  await updateGenerationTask(payload.taskId, {
    status: "generating",
  });

  const path = generateLearningPath(extraction, payload.difficulty);
  const course = await createCourseShell({
    sourceId: sourceRecord.id,
    difficulty: payload.difficulty,
    language: payload.language,
    path,
  });

  await updateGenerationTask(payload.taskId, {
    progressTotalChapters: path.chapters.length,
  });

  const useLLMNarrator = hasAnyLlmKey();
  const chapters: Awaited<
    ReturnType<
      typeof createNarrationForChapterWithLLM
    > extends Promise<infer T>
      ? T
      : ReturnType<typeof createNarrationForChapter>
  >[] = [];

  for (let index = 0; index < path.chapters.length; index++) {
    const chapter = path.chapters[index]!;
    const base = useLLMNarrator
      ? await createNarrationForChapterWithLLM({
          chapter,
          extraction,
          difficulty: payload.difficulty,
          orderIndex: index,
          totalChapters: path.chapters.length,
          sourceDocument,
          language: payload.language,
        })
      : createNarrationForChapter({
          chapter,
          extraction,
          difficulty: payload.difficulty,
          orderIndex: index,
        });

    const [analogies, visualizer, examiner, connector, coder] = await Promise.all([
      analogistAgent(chapter, extraction, payload.difficulty),
      visualizerAgent(chapter, extraction, payload.difficulty),
      examinerAgent(chapter, extraction, payload.difficulty),
      connectorAgent(chapter, extraction),
      payload.difficulty !== "explorer"
        ? coderAgent(chapter, extraction, payload.difficulty)
        : Promise.resolve(null),
    ]);

    chapters.push({
      ...base,
      analogies: analogies.selected.length > 0 ? analogies.selected : undefined,
      svgComponents: visualizer.components.length > 0 ? visualizer.components : undefined,
      quizQuestions: examiner.questions.length > 0 ? examiner.questions : undefined,
      codeSnippets: coder?.snippets?.length ? coder.snippets : undefined,
    });

    await updateGenerationTask(payload.taskId, {
      progressChaptersDone: index + 1,
    });
  }

  await updateCourseStatus(course.id, "verifying");

  let currentChapters = chapters;
  let verification = await runVerificationPipeline(currentChapters, extraction);
  const maxVerifyAttempts = 2;

  for (let attempt = 1; attempt < maxVerifyAttempts && !verification.allPassed; attempt++) {
    await updateCourseStatus(course.id, "fixing");
    currentChapters = autoFixFailedChapters(
      currentChapters,
      verification.failedChecks,
      extraction,
    ) as typeof chapters;
    verification = await runVerificationPipeline(currentChapters, extraction);
  }

  const audioResults = await generateCourseAudio(
    course.id,
    currentChapters.map((ch) => ({ orderIndex: ch.orderIndex, narration: ch.narration })),
  );

  const audioMap = new Map(
    audioResults.map((r) => [r.orderIndex, { url: r.audioUrl, duration: r.durationSeconds }]),
  );
  const chaptersWithAudio = currentChapters.map((ch) => ({
    ...ch,
    audioUrl: audioMap.get(ch.orderIndex)?.url ?? null,
    audioDurationSeconds: audioMap.get(ch.orderIndex)?.duration ?? null,
  }));

  const hasAnyAudio = chaptersWithAudio.some((ch) => ch.audioUrl);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const podcastUrl =
    hasAnyAudio && appUrl
      ? `${appUrl}/api/courses/${course.id}/podcast/rss`
      : null;

  const blogHtml = renderBlogFromChapters(chaptersWithAudio, {
    courseTitle: sourceRecord.title ?? undefined,
    language: payload.language,
  });

  const published = await publishCourse({
    courseId: course.id,
    chapters: chaptersWithAudio,
    qualityScores: verification.scores,
    blogHtml,
    podcastUrl,
  });

  await writeVerificationLogs(published.id, verification.scores);
  await updateGlobalConceptGraph(extraction.conceptGraph);

  await updateGenerationTask(payload.taskId, {
    status: published.status,
    courseId: published.id,
  });

  await captureServerEvent({
    distinctId: payload.taskId,
    event: "course_generated",
    properties: {
      sourceUrl: payload.sourceUrl,
      difficulty: payload.difficulty,
      generationTime: Date.now() - startedAt,
      courseId: published.id,
    },
  });

  return {
    taskId: payload.taskId,
    courseId: published.id,
    source: await getSourceRecord(payload.sourceUrl),
    path,
  };
}
