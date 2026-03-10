import { inngest, isInngestConfigured } from "@/lib/inngest/client";
import { updateGenerationTask } from "@/lib/db/repositories";
import {
  runCourseGeneration,
  runCourseGenerationSkeleton,
} from "@/lib/engine/run-course-generation";
import type { CourseTaskPayload } from "@/lib/engine/types";
import type { ShortVideoExportPayload } from "@/lib/inngest/short-video-export";

/**
 * 仅负责触发：有 Inngest 时发事件，无时在进程内后台跑（本地开发用）。
 * 整课生成重逻辑在 Inngest 分步执行，接口只做「触发 + 轮询状态」。
 */
export async function dispatchCourseGeneration(payload: CourseTaskPayload) {
  if (isInngestConfigured()) {
    await inngest.send({
      name: "course/generate.requested",
      data: payload,
    });
    return;
  }

  const run = payload.skeleton ? runCourseGenerationSkeleton : runCourseGeneration;
  void run(payload).catch(async (error) => {
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
      errorMessage: message || "Local workflow error",
    });
  });
}

export async function dispatchShortVideoExport(payload: ShortVideoExportPayload) {
  if (isInngestConfigured()) {
    await inngest.send({
      name: "short-video/export.requested",
      data: payload,
    });
    return;
  }

  const { runShortVideoExport } = await import("@/lib/inngest/short-video-export");
  void runShortVideoExport(payload).catch(() => {});
}
