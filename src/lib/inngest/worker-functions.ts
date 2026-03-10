/**
 * 自建 worker 上跑的重步骤：narrator（及可扩展 extract、TTS 等）。
 * 部署到 Railway/Render 等无 10s 限制的环境，主应用通过 DB draft 轮询结果。
 */

import { inngest } from "@/lib/inngest/client";
import { setNarratorDraft } from "@/lib/db/repositories";
import { runChapterNarratorOnly } from "@/lib/engine/generate-chapter-on-demand";

export const workerNarratorFunction = inngest.createFunction(
  { id: "worker-narrator" },
  { event: "worker/narrator.requested" },
  async ({ event, step }) => {
    const data = event.data as {
      taskId: string;
      courseId: string;
      chapterIndex: number;
    };
    if (
      typeof data.taskId !== "string" ||
      typeof data.courseId !== "string" ||
      typeof data.chapterIndex !== "number"
    ) {
      throw new Error("worker/narrator.requested requires taskId, courseId, chapterIndex");
    }

    const base = await step.run("run-narrator", () =>
      runChapterNarratorOnly(data.courseId, data.chapterIndex),
    );

    await step.run("write-draft", async () => {
      await setNarratorDraft(data.courseId, data.chapterIndex, base as unknown as Record<string, unknown>);
    });

    return { taskId: data.taskId, courseId: data.courseId, chapterIndex: data.chapterIndex };
  },
);
