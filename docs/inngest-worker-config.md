# Inngest + 课程生成 配置说明

## 一、只用 Vercel + Inngest（不配 Worker）

适用：Vercel 免费套餐、Inngest 免费套餐。每步约 10s 超时，步骤已拆小，超时后可点「继续生成」续跑。

### 1. 主应用 .env（Vercel 或本地）

```env
# Inngest（必填，否则不会走异步）
INNGEST_EVENT_KEY=你的 Inngest Event Key
INNGEST_SIGNING_KEY=你的 Inngest Signing Key

# 不要开 Worker（不填或 false）
# INNGEST_USE_WORKER=
```

### 2. Inngest 控制台

1. 打开 [Inngest Dashboard](https://app.inngest.com)
2. 选你的 App → **Sync** / **Apps**
3. 添加 **Sync URL**：主应用 Inngest 地址  
   - 本地：`https://你的 ngrok 或 tunnel 地址/api/inngest`  
   - 生产：`https://你的域名.vercel.app/api/inngest`

### 3. 行为

- 生成课程时：主应用发 `course/generate.requested`，Inngest 调你的 **主应用** `/api/inngest` 执行各 step（phase1 三步 + 每章 7 步 + finalize）。
- 某步超时：任务会失败，前端显示「继续生成」；点一次会重新派发，已完成的 step 会跳过（幂等），从中断处继续。

---

## 二、启用自建 Worker（narrator 放 Worker 跑）

适用：希望 narrator 不受 10s 限制，把最重的一步放到自建环境（Railway / Render / fly.io 等）。

### 1. 数据库

先跑迁移（含 `generation_chapter_drafts` 表）：

```bash
npx supabase db push
```

### 2. 主应用 .env（Vercel）

```env
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# 开启 Worker：narrator 步骤发到自建 worker
INNGEST_USE_WORKER=true
```

### 3. Worker 环境变量（与主应用同库、同 Inngest）

Worker 部署时需要和主应用**同一套**：

- **Supabase**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- **LLM**：`MINIMAX_API_KEY`（及可选 `MINIMAX_API_BASE`、`MINIMAX_MODEL`）
- **Inngest**：`INNGEST_EVENT_KEY`、`INNGEST_SIGNING_KEY`（与主应用一致）

其它（NEXTAUTH、Stripe 等）Worker 不必须，可按需少配。

### 4. 本地跑 Worker

```bash
# 根目录下，.env 已配好
npm run worker
```

默认：`http://localhost:3001/api/inngest`。

### 5. Inngest 里加 Worker 端点

1. Inngest Dashboard → 你的 App → **Sync** / **Apps**
2. 再添加**第二个** Sync URL（Worker）：
   - 本地调试：用 tunnel（如 `ngrok http 3001`）得到 `https://xxx.ngrok.io/api/inngest`
   - 生产：`https://你的worker域名/api/inngest`（如 Railway 的 `https://xxx.railway.app/api/inngest`）

这样会存在两个 Sync 端点：

- 主应用 URL：跑 `generate-course`、`short-video-export` 等
- Worker URL：跑 `worker-narrator`（处理 `worker/narrator.requested`）

### 6. 部署 Worker 到 Render

1. 登录 [Render](https://render.com) → **Dashboard** → **New** → **Web Service**
2. 连接你的 GitHub 仓库（本仓库），选默认分支（如 `main`）
3. 配置：
   - **Name**：随意，如 `paperflow-inngest-worker`
   - **Region**：选离你用户或主应用近的
   - **Root Directory**：**必须留空**（用仓库根目录，否则会报 `Cannot find module ... worker/serve.ts`）
   - **Runtime**：`Node`
   - **Build Command**：`npm install`
   - **Start Command**：`node worker/run.js`（用包装脚本从仓库根启动，避免 cwd 导致路径错误）
   - **Instance Type**：Free 即可（如需更长超时再升级）
4. **Environment**：添加与主应用一致的环境变量，例如：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `MINIMAX_API_KEY`（及可选 `MINIMAX_API_BASE`、`MINIMAX_MODEL`）
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
5. 创建 Web Service，等部署完成。Render 会分配一个 URL，如 `https://xxx.onrender.com`
6. 在 **Inngest Dashboard** 添加 Sync URL：`https://xxx.onrender.com/api/inngest`

注意：Render 免费实例一段时间无请求会休眠，首次请求可能较慢；Inngest 会重试。若需常驻可升级到付费实例。

### 7. 部署 Worker 到 Railway（示例）

1. 在 Railway 新建项目，从 GitHub 选本仓库
2. 根目录，**Start Command** 填：`npx tsx worker/serve.ts`
3. 在项目里配置与主应用相同的 Supabase、MiniMax、Inngest 环境变量
4. 部署后得到公网 URL，例如 `https://xxx.railway.app`
5. 在 Inngest 添加 Sync URL：`https://xxx.railway.app/api/inngest`

### 8. 流程简述

- 用户点「生成课程」→ 主应用发 `course/generate.requested`
- Inngest 调**主应用**跑 phase1（ingest / extract / path-shell）
- 每章：主应用发 `worker/narrator.requested`，**Worker** 跑 narrator 并写入 `generation_chapter_drafts`
- 主应用用一步轮询该表取回 narrator 结果，再在主应用上跑 analogist、visualizer、examiner、connector、coder、save
- 最后主应用跑 phase-final（校验、TTS、发布）

---

## 三、对照表

| 项目           | 不配 Worker        | 配 Worker                    |
|----------------|--------------------|------------------------------|
| 主应用 .env    | 不设 `INNGEST_USE_WORKER` | `INNGEST_USE_WORKER=true`   |
| Inngest 端点   | 只加主应用 URL     | 主应用 URL + Worker URL      |
| 数据库         | 按需迁移           | 必须包含 `generation_chapter_drafts` |
| 谁跑 narrator  | 主应用（可能 10s 超时） | 自建 Worker（无 10s 限制）   |
