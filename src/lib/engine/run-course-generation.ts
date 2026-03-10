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
  getSourceById,
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
import type { CodeSnippet, CourseTaskPayload } from "@/lib/engine/types";
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

/**
 * 整课生成 - 阶段 1：拉取、提取、路径、建壳、插入骨架章节。
 * 幂等：若任务已有 courseId 且课程为 skeleton，直接返回，便于「继续上次未完成」。
 */
export async function runCourseGenerationPhase1(payload: CourseTaskPayload): Promise<{
  taskId: string;
  courseId: string;
  totalChapters: number;
}> {
  const { getGenerationTask, getCourseById } = await import("@/lib/db/repositories");
  const existingTask = await getGenerationTask(payload.taskId);
  if (existingTask?.courseId) {
    const course = await getCourseById(existingTask.courseId);
    if (course?.status === "skeleton" && course.chapters.length > 0) {
      await updateGenerationTask(payload.taskId, { status: "generating" });
      return {
        taskId: payload.taskId,
        courseId: existingTask.courseId,
        totalChapters: course.totalChapters ?? course.chapters.length,
      };
    }
  }

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
    progressTotalChapters: path.chapters.length,
    courseId: course.id,
  });

  return {
    taskId: payload.taskId,
    courseId: course.id,
    totalChapters: path.chapters.length,
  };
}

/** 阶段 1 拆步（适配 Vercel 10s 超时）：仅拉取并落库 source */
export async function runCourseGenerationPhase1Ingest(payload: CourseTaskPayload): Promise<{
  taskId: string;
  sourceUrl: string;
  sourceId: string;
}> {
  const { getGenerationTask, getCourseById } = await import("@/lib/db/repositories");
  const existingTask = await getGenerationTask(payload.taskId);
  if (existingTask?.courseId) {
    const course = await getCourseById(existingTask.courseId);
    if (course?.status === "skeleton" && course.chapters.length > 0) {
      const source = await getSourceById(course.sourceId);
      if (source) {
        await updateGenerationTask(payload.taskId, { status: "generating" });
        return {
          taskId: payload.taskId,
          sourceUrl: payload.sourceUrl,
          sourceId: source.id,
        };
      }
    }
  }

  await updateGenerationTask(payload.taskId, { status: "extracting" });
  const sourceDocument = await ingestFromUrl(payload.sourceUrl);
  const sourceRecord = await upsertSourceDocument(sourceDocument);
  return {
    taskId: payload.taskId,
    sourceUrl: payload.sourceUrl,
    sourceId: sourceRecord.id,
  };
}

/** 阶段 1 拆步：仅提取并落库 extraction */
export async function runCourseGenerationPhase1Extract(
  payload: CourseTaskPayload,
  sourceId: string,
): Promise<{ taskId: string; sourceUrl: string; sourceId: string }> {
  const source = await getSourceById(sourceId);
  if (!source?.rawContent) throw new Error(`Source ${sourceId} has no rawContent`);
  const extraction = await extractPaperInsights(source.rawContent);
  await saveExtractionResult(payload.sourceUrl, extraction);
  await updateGenerationTask(payload.taskId, { status: "generating" });
  return { taskId: payload.taskId, sourceUrl: payload.sourceUrl, sourceId };
}

/** 阶段 1 拆步：路径 + 建壳 + 骨架章节。幂等：若任务已有 skeleton 课程则直接返回 */
export async function runCourseGenerationPhase1PathShell(
  payload: CourseTaskPayload,
  sourceId: string,
): Promise<{ taskId: string; courseId: string; totalChapters: number }> {
  const { getGenerationTask, getCourseById, buildExtractionFromSource } = await import("@/lib/db/repositories");
  const existingTask = await getGenerationTask(payload.taskId);
  if (existingTask?.courseId) {
    const course = await getCourseById(existingTask.courseId);
    if (course?.status === "skeleton" && course.chapters.length > 0) {
      await updateGenerationTask(payload.taskId, { status: "generating" });
      return {
        taskId: payload.taskId,
        courseId: existingTask.courseId,
        totalChapters: course.totalChapters ?? course.chapters.length,
      };
    }
  }

  const source = await getSourceById(sourceId);
  if (!source) throw new Error(`Source ${sourceId} not found`);
  const extraction = buildExtractionFromSource(source);
  if (!extraction) throw new Error(`Extraction for source ${sourceId} not found`);

  const path = generateLearningPath(extraction, payload.difficulty);
  const course = await createCourseShell({
    sourceId,
    difficulty: payload.difficulty,
    language: payload.language,
    path,
  });
  await insertSkeletonChapters(course.id, path);
  await updateCourseStatus(course.id, "skeleton");
  await updateGenerationTask(payload.taskId, {
    progressTotalChapters: path.chapters.length,
    courseId: course.id,
  });
  return {
    taskId: payload.taskId,
    courseId: course.id,
    totalChapters: path.chapters.length,
  };
}

/**
 * 整课生成 - 最终阶段：校验、修图、TTS、发布。
 * 供 Inngest 分步执行，在「逐章生成」全部完成后调用。
 */
export async function runCourseGenerationPhaseFinal(
  payload: CourseTaskPayload,
  courseId: string,
): Promise<{ taskId: string; courseId: string }> {
  const startedAt = Date.now();
  const { getCourseById, getSourceById, buildExtractionFromSource } = await import("@/lib/db/repositories");
  const course = await getCourseById(courseId);
  if (!course || course.chapters.length === 0) {
    throw new Error(`Course ${courseId} not found or has no chapters`);
  }

  const source = await getSourceById(course.sourceId);
  if (!source) throw new Error(`Source for course ${courseId} not found`);
  const extraction = buildExtractionFromSource(source);
  if (!extraction) throw new Error(`Extraction for course ${courseId} not found`);

  await updateCourseStatus(courseId, "verifying");

  let currentChapters = course.chapters;
  let verification = await runVerificationPipeline(currentChapters, extraction);
  const maxVerifyAttempts = 2;

  for (let attempt = 1; attempt < maxVerifyAttempts && !verification.allPassed; attempt++) {
    await updateCourseStatus(courseId, "fixing");
    currentChapters = autoFixFailedChapters(
      currentChapters,
      verification.failedChecks,
      extraction,
    ) as typeof course.chapters;
    verification = await runVerificationPipeline(currentChapters, extraction);
  }

  const audioResults = await generateCourseAudio(
    courseId,
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const hasAnyAudio = chaptersWithAudio.some((ch) => ch.audioUrl);
  const podcastUrl =
    hasAnyAudio && appUrl ? `${appUrl}/api/courses/${courseId}/podcast/rss` : null;

  const blogHtml = renderBlogFromChapters(chaptersWithAudio, {
    courseTitle: source.title ?? undefined,
    language: payload.language,
  });

  const published = await publishCourse({
    courseId,
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

  return { taskId: payload.taskId, courseId: published.id };
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
  type ChapterResult = Awaited<
    ReturnType<typeof createNarrationForChapterWithLLM>
  > & {
    analogies?: Awaited<ReturnType<typeof analogistAgent>>["selected"];
    svgComponents?: Awaited<ReturnType<typeof visualizerAgent>>["components"];
    quizQuestions?: Awaited<ReturnType<typeof examinerAgent>>["questions"];
    codeSnippets?: CodeSnippet[];
  };
  const chapters: ChapterResult[] = [];

  /** 生产环境加速：并行生成章节，默认每批 2 章（可调大，注意 MiniMax 限流） */
  const chapterConcurrency = Math.max(1, Math.min(4, parseInt(process.env.GENERATION_CHAPTER_CONCURRENCY ?? "2", 10) || 2));

  for (let start = 0; start < path.chapters.length; start += chapterConcurrency) {
    const batchSize = Math.min(chapterConcurrency, path.chapters.length - start);
    const batchResults = await Promise.all(
      Array.from({ length: batchSize }, async (_, i) => {
        const index = start + i;
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

        return {
          ...base,
          analogies: analogies.selected.length > 0 ? analogies.selected : undefined,
          svgComponents: visualizer.components.length > 0 ? visualizer.components : undefined,
          quizQuestions: examiner.questions.length > 0 ? examiner.questions : undefined,
          codeSnippets: coder?.snippets?.length ? coder.snippets : undefined,
        } satisfies ChapterResult;
      }),
    );
    chapters.push(...batchResults);
    await updateGenerationTask(payload.taskId, {
      progressChaptersDone: Math.min(start + batchSize, path.chapters.length),
    });
  }

  chapters.sort((a, b) => a.orderIndex - b.orderIndex);

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
