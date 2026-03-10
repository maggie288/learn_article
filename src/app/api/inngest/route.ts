import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  generateCourseFunction,
  shortVideoExportFunction,
} from "@/lib/inngest/functions";

/** Inngest 回调需在超时内完成握手/确认 */
export const maxDuration = 30;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateCourseFunction, shortVideoExportFunction],
});
