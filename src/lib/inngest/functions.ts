import { inngest } from "@/lib/inngest/client";
import { getCourseById, updateGenerationTask } from "@/lib/db/repositories";
import {
  runChapterAnalogistOnly,
  runChapterCoderOnly,
  runChapterExaminerOnly,
  runChapterNarratorOnly,
  runChapterSave,
  runChapterVisualizerOnly,
  runChapterConnectorOnly,
  pollNarratorDraft,
  type ChapterAgentsResult,
} from "@/lib/engine/generate-chapter-on-demand";
import { serverEnv } from "@/lib/env";
import {
  runCourseGenerationPhase1Extract,
  runCourseGenerationPhase1Ingest,
  runCourseGenerationPhase1PathShell,
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

      // 阶段 1 拆成 3 步，适配 Vercel 免费 10s 超时
      const afterIngest = await step.run("phase1-ingest", () =>
        runCourseGenerationPhase1Ingest(payload),
      );
      const afterExtract = await step.run("phase1-extract", () =>
        runCourseGenerationPhase1Extract(payload, afterIngest.sourceId),
      );
      const phase1 = await step.run("phase1-path-shell", () =>
        runCourseGenerationPhase1PathShell(payload, afterExtract.sourceId),
      );

      for (let i = 0; i < phase1.totalChapters; i++) {
        const course = await getCourseById(phase1.courseId);
        const existing = course?.chapters[i];
        if (existing?.narration?.trim()) {
          await updateGenerationTask(phase1.taskId, {
            progressChaptersDone: Math.min(i + 1, phase1.totalChapters),
          });
          continue;
        }

        const base = serverEnv.INNGEST_USE_WORKER
          ? await (async () => {
              await step.sendEvent(`emit-narrator-request-${i}`, {
                name: "worker/narrator.requested",
                data: {
                  taskId: phase1.taskId,
                  courseId: phase1.courseId,
                  chapterIndex: i,
                },
              });
              return await step.run(`chapter-${i}-narrator-from-worker`, () =>
                pollNarratorDraft(phase1.courseId, i),
              );
            })()
          : await step.run(`chapter-${i}-narrator`, () =>
              runChapterNarratorOnly(phase1.courseId, i),
            );
        const [analogist, visualizer, examiner] = await Promise.all([
          step.run(`chapter-${i}-analogist`, () => runChapterAnalogistOnly(phase1.courseId, i)),
          step.run(`chapter-${i}-visualizer`, () => runChapterVisualizerOnly(phase1.courseId, i)),
          step.run(`chapter-${i}-examiner`, () => runChapterExaminerOnly(phase1.courseId, i)),
        ]);
        await step.run(`chapter-${i}-connector`, () =>
          runChapterConnectorOnly(phase1.courseId, i),
        );
        const coder = await step.run(`chapter-${i}-coder`, () =>
          runChapterCoderOnly(phase1.courseId, i),
        );
        const agents: ChapterAgentsResult = {
          analogies: analogist.analogies,
          svgComponents: visualizer.svgComponents,
          quizQuestions: examiner.quizQuestions,
          codeSnippets: coder.codeSnippets,
        };
        await step.run(`chapter-${i}-save`, () =>
          runChapterSave(phase1.courseId, i, phase1.taskId, phase1.totalChapters, base, agents),
        );
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
