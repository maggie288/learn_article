import { inngest } from "@/lib/inngest/client";
import { updateGenerationTask } from "@/lib/db/repositories";
import {
  runCourseGeneration,
  runCourseGenerationSkeleton,
} from "@/lib/engine/run-course-generation";
import type { CourseTaskPayload } from "@/lib/engine/types";
import {
  runShortVideoExport,
  type ShortVideoExportPayload,
} from "@/lib/inngest/short-video-export";

export const generateCourseFunction = inngest.createFunction(
  { id: "generate-course" },
  { event: "course/generate.requested" },
  async ({ event }) => {
    const payload = event.data as CourseTaskPayload;

    try {
      if (payload.skeleton) {
        return await runCourseGenerationSkeleton(payload);
      }
      return await runCourseGeneration(payload);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : error != null && typeof (error as { message?: string }).message === "string"
              ? (error as { message: string }).message
              : String(error);
      await updateGenerationTask(payload.taskId, {
        status: "failed",
        errorMessage: message || "Unknown workflow error",
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
