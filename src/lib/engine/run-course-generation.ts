import { createNarrationForChapter } from "@/lib/agents/narrator";
import { captureServerEvent } from "@/lib/analytics/server";
import {
  createCourseShell,
  getSourceRecord,
  publishCourse,
  saveExtractionResult,
  updateCourseStatus,
  updateGenerationTask,
  upsertSourceDocument,
} from "@/lib/db/repositories";
import { extractPaperInsights } from "@/lib/engine/extraction/extract-paper-insights";
import { ingestPaperFromUrl } from "@/lib/engine/ingestion/paper";
import { generateLearningPath } from "@/lib/engine/path-generation/generate-learning-path";
import type { CourseTaskPayload } from "@/lib/engine/types";

export async function runCourseGeneration(payload: CourseTaskPayload) {
  const startedAt = Date.now();
  await updateGenerationTask(payload.taskId, {
    status: "extracting",
  });

  const sourceDocument = await ingestPaperFromUrl(payload.sourceUrl);
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

  const chapters = path.chapters.map((chapter, index) =>
    createNarrationForChapter({
      chapter,
      extraction,
      difficulty: payload.difficulty,
      orderIndex: index,
    }),
  );

  await updateCourseStatus(course.id, "verifying");

  const published = await publishCourse({
    courseId: course.id,
    chapters,
    qualityScores: {
      coverage: 0.8,
      faithfulness: 0.8,
      pedagogy: 0.75,
    },
  });

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
