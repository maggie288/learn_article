import { inngest } from "@/lib/inngest/client";
import { updateGenerationTask } from "@/lib/db/repositories";
import { runCourseGeneration } from "@/lib/engine/run-course-generation";
import type { CourseTaskPayload } from "@/lib/engine/types";

export const generateCourseFunction = inngest.createFunction(
  { id: "generate-course" },
  { event: "course/generate.requested" },
  async ({ event }) => {
    const payload = event.data as CourseTaskPayload;

    try {
      return await runCourseGeneration(payload);
    } catch (error) {
      await updateGenerationTask(payload.taskId, {
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Unknown workflow error",
      });

      throw error;
    }
  },
);
