import { inngest, isInngestConfigured } from "@/lib/inngest/client";
import { updateGenerationTask } from "@/lib/db/repositories";
import { runCourseGeneration } from "@/lib/engine/run-course-generation";
import type { CourseTaskPayload } from "@/lib/engine/types";

export async function dispatchCourseGeneration(payload: CourseTaskPayload) {
  if (isInngestConfigured()) {
    await inngest.send({
      name: "course/generate.requested",
      data: payload,
    });
    return;
  }

  void runCourseGeneration(payload).catch(async (error) => {
    await updateGenerationTask(payload.taskId, {
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Local workflow error",
    });
  });
}
