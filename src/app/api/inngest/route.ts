import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  generateCourseFunction,
  shortVideoExportFunction,
} from "@/lib/inngest/functions";

/** Vercel 免费套餐单次调用约 10s；每步拆小以适配，超时后可用「继续生成」续跑 */
export const maxDuration = 10;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateCourseFunction, shortVideoExportFunction],
});
