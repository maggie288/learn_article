/**
 * 自建 Inngest Worker：只跑重步骤（narrator 等），无 10s 超时。
 * 部署到 Railway / Render / fly.io，在 Inngest 控制台添加此 URL 为 Sync 端点。
 *
 * 运行：npx tsx worker/serve.ts
 * 需配置与主应用相同的 .env（Supabase、MINIMAX_API_KEY、INNGEST_* 等）。
 */
import "dotenv/config";

import express from "express";
import { serve } from "inngest/express";
// 使用相对路径便于在仓库根目录用 tsx 运行
import { inngest } from "../src/lib/inngest/client";
import { workerNarratorFunction } from "../src/lib/inngest/worker-functions";

const app = express();
app.use(express.json());

app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [workerNarratorFunction],
  }),
);

const port = Number(process.env.PORT) || 3001;
app.listen(port, () => {
  console.log(`Worker Inngest at http://localhost:${port}/api/inngest`);
});
