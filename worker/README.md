# Inngest Worker（自建重步骤）

将最重的步骤（如 narrator）放到无 10s 超时的自建环境跑，主应用通过 DB 轮询结果。

## 1. 数据库

执行迁移（含 `generation_chapter_drafts` 表）：

```bash
npx supabase db push
```

## 2. 本地运行

与主应用相同的 `.env`（Supabase、MINIMAX_API_KEY、INNGEST_EVENT_KEY、INNGEST_SIGNING_KEY 等）：

```bash
npm run worker
```

默认监听 `http://localhost:3001/api/inngest`。

## 3. Inngest 配置

- 在 Inngest 控制台添加 **Sync 端点**：`https://你的worker域名/api/inngest`
- 主应用（Vercel）保持原有 Sync 端点
- 事件 `worker/narrator.requested` 会发到 Worker 端点执行

## 4. 主应用

主应用 `.env` 中设置：

```
INNGEST_USE_WORKER=true
```

主应用会发送 `worker/narrator.requested`，然后轮询 `generation_chapter_drafts` 表取回 narrator 结果，再继续后续 agent 步与发布。

## 5. 部署 Worker（Render / Railway / fly.io）

### Render

1. Render Dashboard → **New** → **Web Service**，连 GitHub 本仓库
2. **Root Directory** 留空（仓库根目录）
3. **Build Command**：`npm install`  
   **Start Command**：`node worker/run.js`（不要用 `npx tsx worker/serve.ts`，否则可能报 ERR_MODULE_NOT_FOUND）
3. 在 **Environment** 里加：Supabase 三件套、`MINIMAX_API_KEY`、`INNGEST_EVENT_KEY`、`INNGEST_SIGNING_KEY`（与主应用一致）
4. 部署完成后记下 URL（如 `https://xxx.onrender.com`），在 Inngest 添加 Sync URL：`https://xxx.onrender.com/api/inngest`

免费实例无流量会休眠，首次请求可能冷启动几秒；可升级付费避免休眠。

### Railway

- 根目录 **Start Command**：`npx tsx worker/serve.ts`
- 环境变量同上，部署后在 Inngest 添加对应 `/api/inngest` URL
