import { inngest } from "@/lib/inngest/client";
import { getCourseById, updateGenerationTask } from "@/lib/db/repositories";
import { generateChapterOnDemand } from "@/lib/engine/generate-chapter-on-demand";
import {
  runCourseGenerationPhase1,
  runCourseGenerationPhaseFinal,
  runCourseGenerationSkeleton,
} from "@/lib/engine/run-course-generation";
import type { CourseTaskPayload } from "@/lib/engine/types";
import {
  runShortVideoExport,
  type ShortVideoExportPayload,
} from "@/lib/inngest/short-video-export";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error != null && typeof (error as { message?: string }).message === "string") {
    return (error as { message: string }).message;
  }
  return String(error);
}

/**
 * 整课生成：分步执行，每步单独超时，避免 Vercel FUNCTION_INVOCATION_TIMEOUT。
 * 接口只做「触发 + 轮询状态」，重逻辑全在 Inngest 各 step 中。
 */
export const generateCourseFunction = inngest.createFunction(
  { id: "generate-course" },
  { event: "course/generate.requested" },
  async ({ event, step }) => {
    const payload = event.data as CourseTaskPayload;

    try {
      if (payload.skeleton) {
        return await step.run("skeleton", () => runCourseGenerationSkeleton(payload));
      }

      const phase1 = await step.run("phase1-ingest-and-skeleton", () =>
        runCourseGenerationPhase1(payload),
      );

      for (let i = 0; i < phase1.totalChapters; i++) {
        await step.run(`chapter-${i}`, async () => {
          const course = await getCourseById(phase1.courseId);
          const existing = course?.chapters[i];
          if (existing?.narration?.trim()) {
            await updateGenerationTask(phase1.taskId, {
              progressChaptersDone: Math.min(i + 1, phase1.totalChapters),
            });
            return { orderIndex: i, skipped: true };
          }
          const chapter = await generateChapterOnDemand(phase1.courseId, i);
          if (!chapter) throw new Error(`Chapter ${i} generation failed`);
          await updateGenerationTask(phase1.taskId, {
            progressChaptersDone: Math.min(i + 1, phase1.totalChapters),
          });
          return { orderIndex: i };
        });
      }

      return await step.run("phase-final-verify-and-publish", () =>
        runCourseGenerationPhaseFinal(payload, phase1.courseId),
      );
    } catch (error) {
      const message = getErrorMessage(error) || "Unknown workflow error";
      await updateGenerationTask(payload.taskId, {
        status: "failed",
        errorMessage: message,
      });
      throw error;
    }
  },
);

export const shortVideoExportFunction = inngest.createFunction(
  { id: "short-video-export" },
  { event: "short-video/export.requested" },
  async ({ event }) => {
    const payload = event.data as ShortVideoExportPayload;
    try {
      return await runShortVideoExport(payload);
    } catch (error) {
      const { updateShortVideoExport } = await import("@/lib/db/repositories");
      await updateShortVideoExport(payload.exportId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  },
);
