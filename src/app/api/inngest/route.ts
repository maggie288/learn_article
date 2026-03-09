import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  generateCourseFunction,
  shortVideoExportFunction,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateCourseFunction, shortVideoExportFunction],
});
