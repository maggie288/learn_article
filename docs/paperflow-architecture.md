# PaperFlow — 完整开发说明书

## 版本 2.0 · 生产级规格

> 本文档是 PaperFlow 的**唯一开发权威**。所有功能实现、技术选型、代码规范、业务逻辑均以本文档为准。
> 商业策略详见 `paperflow-business.md`，本文档已整合其中所有对开发有影响的需求。

---

## 一、产品定义

### 1.1 一句话定义

PaperFlow 是 AI 驱动的论文与代码深度学习引擎：**录入论文/代码地址，由同一套核心生成引擎自动产出「课程、博客、播客、短视频」四种形态**。

### 1.2 主产品线

```
录入论文/代码地址
        │
        ▼
   ┌─────────────────────────────────────────────────────────┐
   │              核心生成引擎 (Layer 1–5)                    │
   │   Ingestion → 深度提取 → 路径生成 → 多 Agent 内容 → 自验证  │
   └────────────────────────┬────────────────────────────────┘
                            │ 统一中间表示（章节+讲解+SVG+测验+引用）
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ 生成课程 │         │ 生成博客 │         │ 生成播客 │
   │ Web 学习 │         │ 长文阅读 │         │ 音频流   │
   │ + 测验   │         │ SEO 友好 │         │ 章节连播 │
   └─────────┘         └─────────┘         └─────────┘
        │
        ▼
   ┌─────────┐
   │生成短视频 │
   │ 2–3 分钟  │
   │ 精华切片  │
   └─────────┘
```

**铁律**：四种形态共享同一套引擎产出，Layer 6 只做渲染与分发，不重复调用 LLM。

### 1.3 核心价值主张

- 零基础可理解前沿论文与开源项目
- 课程质量由引擎五道关卡自动验证，不依赖用户主观反馈
- 全局知识图谱随使用累积增长，新课程质量持续进化
- 3Blue1Brown 的教学质量 × AI 的生成速度 × Duolingo 的学习系统

### 1.4 核心差异化（护城河）

| 护城河 | 说明 |
|--------|------|
| 自验证引擎 | 每份课程通过五道自动化质量关卡，市场无第二家 |
| 累积知识图谱 | 每处理一篇论文，全局概念图谱增长，新课程质量更高 |
| 可视化教学 | SVG 交互图 + 语音 + 文字三位一体 |
| 三层难度自适配 | 同一篇论文 Explorer/Builder/Researcher 自动适配 |
| 路径生成靠算法 | 拓扑排序 + ZPD + 认知负荷，可复现可调参，非 LLM 拍板 |

### 1.5 我们不是什么

| 我们不是 | 区别 |
|----------|------|
| ChatGPT wrapper | 有自验证引擎，不是"问一下 LLM 就输出" |
| SciSpace / Elicit | 它们做摘要和文献管理，我们做教学和理解 |
| Aibrary | 它做畅销书音频摘要，我们做论文/代码深度教学 |
| Coursera / Udemy | 人工制作课程，我们 AI 实时生成 |
| NotebookLM | 它生成泛泛的播客对话，我们生成结构化、可验证的教学课程 |

### 1.6 目标用户画像

| 优先级 | 用户 | 付费意愿 | 痛点 |
|--------|------|----------|------|
| P0 | 技术好奇者（工程师、PM、技术创始人） | $15-30/月 | 每天看到新论文讨论但插不上话 |
| P1 | 学生和早期研究者 | $8-15/月 | 导师让读论文但完全看不懂 |
| P2 | 企业技术团队 | $150-300/人/年 | 组织内部技术分享效率低 |

### 1.7 商业模式与定价

**收费方式**：订阅以 **USDT** 收取；定价以美元标价，实际支付时按约定汇率或固定 USDT 数量收取。

```
┌─────────────────────────────────────────────────────┐
│                  Free（免费层）                       │
│  每月 3 篇课程 · 仅 Explorer 难度 · 无音频下载       │
├─────────────────────────────────────────────────────┤
│              Pro（$19/月 或 $149/年，收 USDT）         │
│  无限课程 · 三种难度 · 播客音频下载                   │
│  学习进度追踪 · 优先生成队列 · 收藏夹                │
├─────────────────────────────────────────────────────┤
│            Team（$14/人/月，最低 3 人，收 USDT）      │
│  Pro 全部功能 + 团队课程库共享                        │
│  协作笔记 · 团队学习仪表盘 · 管理后台                │
├─────────────────────────────────────────────────────┤
│                  API（按量计费）                      │
│  $2/篇课程生成 · 可嵌入到其他产品中（收 USDT）        │
└─────────────────────────────────────────────────────┘
```

### 1.8 成本结构

```
单篇课程生成成本：
├── LLM API (Claude / MiniMax，提取+6 Agent+验证) ≈ $0.30-0.80（视策略与用量）
├── TTS 音频生成 (ElevenLabs)      ≈ $0.10-0.20
├── 存储和 CDN                      ≈ $0.01
└── 总计                            ≈ $0.40-1.00

Pro 用户月均生成 8-15 篇课程
├── 成本：$3.20 - $15.00
├── 收入：$19.00
└── 毛利率：21% - 83%（均值约 55%）

成本优化手段：
├── 缓存热门论文（同一篇论文不重复生成）→ 成本降 60%+
├── LLM 双 Key（Claude + MiniMax）自动选「最便宜」或「最先返回」→ 成本/延迟优化
├── Sonnet / MiniMax M2 为主力而非 Opus → 成本降 50%
└── 自建/开源 TTS → 成本趋近于零
```

---

## 二、系统架构

### 2.1 六层引擎架构

```
用户输入（arXiv URL / GitHub URL）
          │
          ▼
┌─────────────────────────────────────────────┐
│           Layer 1: Ingestion                │
│     内容获取 · PDF 解析 · 代码分析           │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│           Layer 2: Deep Extraction          │
│     结构提取 · 思维链重建 · 概念图谱         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       Layer 3: World Model & Path Gen       │
│   概念图谱比对 · 拓扑排序 · 难度适配         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│      Layer 4: Multi-Agent Content Gen       │
│  Narrator·Analogist·Visualizer·Examiner     │
│        ·Connector·Coder (并行)              │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       Layer 5: Self-Verification            │
│  覆盖率·忠实度·前置完备·教学质量·考试模拟    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│       Layer 6: Rendering & Delivery         │
│  课程(Web) · 博客(长文) · 播客(音频) · 短视频 │
│  同一份引擎产出 → 多形态渲染与分发            │
└─────────────────────────────────────────────┘
```

### 2.2 生产部署架构

```
                    ┌─────────────────────────────────────────┐
                    │            Vercel (Next.js)             │
                    │  前端 + API Routes + Serverless 引擎逻辑  │
                    └──────────────┬──────────────────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    Supabase     │    │  Upstash Redis   │    │    Inngest       │
│  DB + Auth +    │    │  缓存 / 限流     │    │  异步任务编排     │
│  Storage        │    │                  │    │  (生成/导出等)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │
         │ 若路径生成等必须用 Python
         ▼
┌─────────────────┐    外部 API：Anthropic / MiniMax / OpenAI / ElevenLabs
│  Railway        │
│  单容器 Python   │
│  (可选)         │
└─────────────────┘
```

---

## 三、技术栈

### 3.1 前端

| 项目 | 选型 |
|------|------|
| 框架 | Next.js 14+ (App Router) |
| 语言 | TypeScript（严格模式） |
| UI | Tailwind CSS + Shadcn/ui |
| SVG 可视化 | 动态 React SVG 组件（内联，非图片） |
| 音频 | 课程/播客/短视频语音 = TTS(narration)，见 3.4 |
| 状态管理 | Zustand |
| 部署 | Vercel |

### 3.2 后端

| 项目 | 选型 |
|------|------|
| 框架 | Next.js API Routes；可选独立 FastAPI 跑 Python 引擎逻辑 |
| 语言 | TypeScript (API Routes) + Python (引擎核心，可选) |
| LLM | Claude API (claude-sonnet-4-20250514) + MiniMax (M2-her)；双 Key 时自动选「最先返回」或「最便宜」，见 3.2.1 |
| 数据库 | PostgreSQL (Supabase) |
| 缓存 | Redis (Upstash) |
| 异步任务 | Inngest（任务编排，与 Vercel 深度集成） |
| 文件存储 | Supabase Storage / Cloudflare R2 |
| 部署 | Vercel 全栈优先；仅必要时 Railway 跑 Python |

#### 3.2.1 LLM 多 Provider 与双 Key 策略

引擎层通过统一 LLM 封装（`src/lib/llm/unified-llm.ts`）同时支持 **Claude (Anthropic)** 与 **MiniMax**。配置两个 Key 时，由环境变量 `LLM_STRATEGY` 决定行为：

| 策略 | 说明 |
|------|------|
| `first`（默认） | 并发请求所有已配置的 Provider，**采用最先成功返回**的结果，降低延迟。 |
| `cheapest` | 仅用当前配置中预估**成本最低**的 Provider（默认 MiniMax 权重低于 Claude）；若该 Provider 失败则回退到另一个。 |

- **环境变量**：`ANTHROPIC_API_KEY`、`MINIMAX_API_KEY` 至少配置一个；`LLM_STRATEGY=first|cheapest` 可选。
- **使用处**：Layer 2 深度提取、Layer 4 各 Agent（如 Narrator）、以及所有 `callLlmJson` 调用均经统一层，返回结果中会带上实际使用的 `provider`（如 `extractionMeta.provider`）。

### 3.3 第三方服务

| 服务 | 选型 |
|------|------|
| PDF 解析 | pdf.js + Mathpix（数学公式 OCR） |
| 代码分析 | tree-sitter（AST 解析） |
| TTS/语音 | ElevenLabs 或 Play.ht（正式环境），见 3.4 |
| 支付 | USDT（加密货币支付：创建支付请求 → 用户转账 → 提交 tx_hash → 人工/自动核对后开通订阅） |
| 认证 | 自研邮件注册/登录（邮箱 + 密码，password_hash 存库，可选邮件验证码） |
| 监控 | Sentry（错误追踪） + PostHog（产品分析 + 埋点） |
| 邮件 | Resend（事务邮件 + Newsletter） |
| DNS/CDN | Cloudflare（免费）或 Vercel 自带 |

**认证流程**：注册（邮箱 + 密码 → 写入 `users` 表并存储 `password_hash`，可选邮箱验证）；登录（校验密码 → 签发 session，如 JWT 或服务端 session + cookie）；受保护路由通过 middleware 或 API 内校验 session 获取 `userId`。可选：忘记密码（邮件重置链接）、邮箱验证码登录。

### 3.4 Narration 与语音方案

**Narration = 讲解稿文本**（纯文字），由 Narrator Agent（LLM）按章生成，存于 `chapters.narration`。

| 使用场景 | Narration 的角色 |
|----------|----------------|
| 课程页 | 直接展示为可读文字 |
| 博客 | 各章 narration 拼成长文 |
| 播客/短视频 | TTS(narration) = 语音读白 |

**语音 = TTS(narration)**，声音质量取决于 TTS 选型：

| 方案 | 说明 | 适用场景 |
|------|------|----------|
| **ElevenLabs / Play.ht** | 神经 TTS，多说话人，可调语速/停顿 | 播客、短视频（正式产出） |
| **SSML 韵律预处理** | 在 narration 中插入停顿/重音标记 | 提升 TTS 自然度 |
| **Fish Audio / 声音克隆** | 固定「PaperFlow 主讲人」声线 | 品牌统一、长期 |

**规则**：播客与短视频**必须使用 ElevenLabs 或同级 TTS**，禁止在正式环境用浏览器 Web Speech API。博客形态仅提供文字，不做「听博客」。

---

## 四、生产环境部署方案（一人公司 · 盈利优先）

### 4.1 选型原则

**固定成本趋近于零、随收入缩放、一人可运维。** 全托管 + 按量付费，不买 VPS、不自己管 K8s。

| 层级 | 选型 | 理由 | 月成本（早期） |
|------|------|------|----------------|
| 前端 + API | **Vercel** Pro ($20/月) | Next.js 原生、零运维、自动 HTTPS/CDN | $20 |
| 数据库 + Auth + 文件 | **Supabase** | PostgreSQL + 认证 + Storage 一体 | $0～25 |
| 缓存 | **Upstash Redis** | 按请求计费，与 Vercel/Edge 兼容 | $0～10 |
| 异步任务 | **Inngest** | 无需自建 worker，按事件计费 | $0（免费额度） |
| Python 引擎（可选） | **Railway** 单服务 | 仅必须用 Python 时 | $5～20 |
| 域名/DNS | **Cloudflare** 免费 | 解析 + CDN/防护 | $0 |

**默认推荐**：路径生成用 TypeScript/Node 实现，不开 Railway，全部跑在 Vercel 上。

### 4.2 成本控制目标

- 基础设施月费 < MRR 的 **5%**（MRR $3k 时 < $150/月）
- 早期（0～$1k MRR）：约 **$20～50/月**
- 真正的大头是 **LLM/TTS 按量费用**，不是基础设施

### 4.3 开发时部署适配规则

以下规则**开发阶段即必须遵守**，保证上线只需配环境变量。

**环境与配置**
- 所有配置用**环境变量**，禁止写死域名、端口、API Key
- 本地用 `.env.local`，生产在 Vercel/Supabase 控制台配置
- 用 `NEXT_PUBLIC_APP_ENV`（`development | staging | production`）区分环境

**API 与引擎**
- 对外只暴露 Vercel 上的 API 路由
- Railway Python 服务（如有）仅被内部调用，地址从 `ENGINE_PYTHON_URL` 读取
- 长时间生成任务一律走 **Inngest** 异步触发，API 只投递任务 + 返回 taskId

**数据库与存储**
- 使用 Supabase 官方 SDK，连接串从环境变量读取
- 迁移用 Supabase Migration，不在代码里手写 DDL
- 大文件存 Supabase Storage（或 R2），URL 存库，不把 blob 塞 PostgreSQL

**可观测与健康**
- 提供 `GET /api/health`：返回 `{ "db": "ok", "env": "production" }`
- 关键路径打结构化日志（requestId、userId、courseId、错误码）
- 敏感信息不写进日志

**安全与限流**
- Inngest/Supabase Webhook 用签名/密钥校验；USDT 支付请求需校验用户身份与金额
- 生产环境关闭调试接口
- 「生成课程 / 导出短视频」等重接口做**按用户限流**（Upstash Redis），防止滥用拉高 LLM/TTS 成本

### 4.4 开发时推广与增长适配规则

以下来自 `paperflow-business.md` 推广策略、增长飞轮、Launch Checklist，**开发时须一并实现**。

**SEO（课程即获客页面）**
- 每篇课程有独立公开 URL：`/paper/[slug]`（如 `attention-is-all-you-need`）
- 课程页**必须 SSR**，可被爬虫索引
- 动态生成 meta：`title`、`description`、`og:image`
- og:image 由 Vercel OG Image Generation 动态生成：含论文标题 + 核心 SVG
- 提供 `sitemap.xml`，含所有已发布课程 URL

**分享与病毒式传播**
- 每篇课程有「分享」按钮，生成带 og:image 的链接
- **前 2 章未登录用户免费开放**（软门控），第 3 章起引导注册
- **学完徽章**：完课后生成成就卡，一键分享到 Twitter/LinkedIn

**分析埋点**
- PostHog 事件追踪，以下事件**必须在行为发生时上报**：
  - `course_generated` · `chapter_viewed` · `chapter_completed` · `quiz_submitted`
  - `course_completed` · `course_shared` · `subscription_started` · `subscription_cancelled`

**推广渠道对系统的要求**
- Twitter/PH/HN：依赖「可分享链接 + 精美预览图」→ og:image、公开 URL、前 2 章免费
- 短视频/YouTube/B 站：「课程导出 2–3 分钟精华视频」→ SVG + TTS 合成，结尾 CTA
- Newsletter：「按篇输出精华摘要」→ 从 narration 聚合
- 联盟营销：推荐人专属链接 → 系统支持 `ref=` 参数，注册/付费时记录 `referrer_id`
- 嵌入与 API：课程详情 API 预留 `?embed=1` 精简结构，供 Notion/Obsidian/Widget 使用

**Launch 前必须就绪**
- 落地页：价值主张 + Demo 视频 + 邮件收集（早鸟/等待列表）
- USDT 支付流程并测试（创建支付请求、提交 tx_hash、核对开通）
- OG Image 自动生成
- 至少 5 篇预生成的高质量示例课程
- 健康检查与基础监控

---

## 五、数据模型

### 5.1 核心实体

```sql
-- ==================== 用户与认证 ====================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                            -- 自研邮件登录：bcrypt 等哈希
  name TEXT,
  avatar_url TEXT,
  knowledge_level TEXT DEFAULT 'explorer',       -- explorer | builder | researcher
  preferred_language TEXT DEFAULT 'zh-CN',
  referrer_id UUID REFERENCES users(id),         -- 联盟推荐人
  email_verified_at TIMESTAMPTZ,                 -- 邮箱验证时间（可选）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  plan TEXT NOT NULL,                            -- free | pro | team
  status TEXT NOT NULL,                          -- active | canceled | expired
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  payment_request_id UUID,                       -- 关联 usdt_payment_requests（最近一次开通）
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- USDT 支付请求：用户提交转账信息，人工/自动核对后开通订阅
CREATE TABLE usdt_payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  plan TEXT NOT NULL,
  amount_usdt TEXT,
  tx_hash TEXT,                                  -- 链上交易哈希
  status TEXT NOT NULL DEFAULT 'pending',        -- pending | confirmed | rejected
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_usdt_payment_requests_user_id ON usdt_payment_requests(user_id);
CREATE INDEX idx_usdt_payment_requests_status ON usdt_payment_requests(status);

-- 免费用户月度使用量追踪
CREATE TABLE usage_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  period TEXT NOT NULL,                          -- '2026-03' 格式
  courses_generated INTEGER DEFAULT 0,
  UNIQUE(user_id, period)
);

-- ==================== 源内容 ====================

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,                            -- 'paper' | 'github'
  url TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE,                              -- 公开 URL 用，如 attention-is-all-you-need
  title TEXT,
  authors TEXT[],
  abstract TEXT,
  raw_content JSONB,                             -- 原始提取内容
  concept_graph JSONB,                           -- 概念图谱
  thinking_chain JSONB,                          -- 思维链重建
  extraction_meta JSONB,                         -- 提取元数据（耗时、模型版本等）
  extraction_status TEXT DEFAULT 'pending',       -- pending | processing | completed | failed
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 课程 ====================

CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) NOT NULL,
  user_id UUID REFERENCES users(id),             -- 触发生成的用户
  difficulty TEXT NOT NULL,                       -- explorer | builder | researcher
  language TEXT DEFAULT 'zh-CN',
  path_config JSONB,                             -- 学习路径配置
  quality_scores JSONB,                          -- 自验证综合分数
  status TEXT DEFAULT 'queued',                  -- queued | extracting | generating | verifying | fixing | published | failed
  version INTEGER DEFAULT 1,
  total_chapters INTEGER,
  estimated_minutes INTEGER,
  blog_html TEXT,                                -- 缓存的博客长文（由 narration 聚合）
  podcast_url TEXT,                              -- 拼接后的完整播客音频 URL
  short_video_url TEXT,                          -- 导出的短视频 URL
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE TABLE chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) NOT NULL,
  order_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  narration TEXT NOT NULL,                       -- 讲解稿文本（核心产出）
  narration_ssml TEXT,                           -- 带韵律标记的版本（供 TTS）
  svg_components JSONB,                          -- SVG 可视化 JSON 描述
  analogies JSONB,                               -- 使用的类比
  quiz_questions JSONB,                          -- 测验题目
  code_snippets JSONB,                           -- 代码片段（Builder/Researcher）
  audio_url TEXT,                                -- 本章 TTS 音频 URL
  audio_duration_seconds INTEGER,
  source_citations JSONB,                        -- 原文引用标注
  concept_names TEXT[],                          -- 本章覆盖的概念名列表
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 全局知识图谱（跨论文累积） ====================

CREATE TABLE concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  domain TEXT,                                   -- ml | physics | chemistry | cs | ...
  difficulty_level FLOAT,                        -- 0.0-1.0
  description TEXT,
  common_misconceptions TEXT[],
  best_analogies JSONB,                          -- 经过验证的最佳类比
  usage_count INTEGER DEFAULT 0,                 -- 被多少课程引用
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE concept_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_concept_id UUID REFERENCES concepts(id),
  to_concept_id UUID REFERENCES concepts(id),
  relation_type TEXT,                            -- requires | related | extends | contrasts
  strength FLOAT DEFAULT 1.0,
  UNIQUE(from_concept_id, to_concept_id)
);

-- ==================== 用户学习 ====================

CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  course_id UUID REFERENCES courses(id) NOT NULL,
  chapter_id UUID REFERENCES chapters(id) NOT NULL,
  status TEXT DEFAULT 'not_started',             -- not_started | in_progress | completed
  quiz_score FLOAT,
  quiz_answers JSONB,
  time_spent_seconds INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, chapter_id)
);

CREATE TABLE user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  course_id UUID REFERENCES courses(id) NOT NULL,
  achievement_type TEXT NOT NULL,                 -- course_completed | streak_7 | streak_30 | concepts_50
  badge_image_url TEXT,                          -- 成就卡图片（可分享）
  shared BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, course_id, achievement_type)
);

CREATE TABLE user_favorites (
  user_id UUID REFERENCES users(id) NOT NULL,
  course_id UUID REFERENCES courses(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(user_id, course_id)
);

-- ==================== 质量验证 ====================

CREATE TABLE verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES courses(id) NOT NULL,
  check_type TEXT NOT NULL,                      -- coverage | faithfulness | prerequisites | pedagogy | exam_sim
  score FLOAT NOT NULL,
  details JSONB,
  passed BOOLEAN NOT NULL,
  model_used TEXT,                               -- 验证用的模型
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 联盟营销 ====================

CREATE TABLE referral_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id) NOT NULL,
  referred_user_id UUID REFERENCES users(id) NOT NULL,
  subscription_id UUID REFERENCES subscriptions(id),
  commission_amount FLOAT,                       -- 佣金金额
  status TEXT DEFAULT 'pending',                 -- pending | paid | expired
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==================== 分析事件（可选，也可纯走 PostHog） ====================

CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**订阅与支付说明**：订阅由 USDT 支付请求确认后开通；`subscriptions.payment_request_id` 可关联 `usdt_payment_requests.id`。定价仍以美元标价，实际以 USDT 收取（按约定汇率或固定 USDT 数量）。

### 5.2 索引策略

```sql
CREATE INDEX idx_sources_slug ON sources(slug);
CREATE INDEX idx_sources_type ON sources(type);
CREATE INDEX idx_courses_source_id ON courses(source_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_difficulty ON courses(difficulty);
CREATE INDEX idx_chapters_course_id ON chapters(course_id);
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_course_id ON user_progress(course_id);
CREATE INDEX idx_concepts_domain ON concepts(domain);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_usage_quotas_user_period ON usage_quotas(user_id, period);
```

---

## 六、核心生成引擎详细设计

### 6.1 Layer 1: Ingestion（内容获取）

```
输入: URL (arXiv / GitHub)
输出: 标准化的 SourceDocument 对象
```

#### 6.1.1 论文获取流水线

```typescript
interface PaperIngestionPipeline {
  fetchPDF(arxivUrl: string): Promise<Buffer>;

  parsePDF(pdf: Buffer): Promise<{
    sections: Section[];
    paragraphs: Paragraph[];
    equations: Equation[];       // LaTeX
    figures: Figure[];           // 提取为图片
    tables: Table[];             // 结构化数据
    references: Reference[];
    abstract: string;
    metadata: PaperMetadata;
  }>;

  parseEquations(equations: Equation[]): Promise<{
    latex: string;
    plainTextExplanation: string;
    variables: Variable[];
  }[]>;

  // Vision Model 理解图表
  analyzeFigures(figures: Figure[]): Promise<{
    description: string;
    keyInsights: string[];
    dataPoints: any[];
  }[]>;
}
```

**降级策略**：PDF 解析失败时，自动尝试 arXiv HTML 版本（`ar5iv.labs.arxiv.org`）。

#### 6.1.2 GitHub 获取流水线

```typescript
interface GitHubIngestionPipeline {
  fetchRepoMeta(repoUrl: string): Promise<RepoMetadata>;

  fetchKeyFiles(repo: RepoMetadata): Promise<{
    readme: string;
    packageJson: any;
    entryPoints: SourceFile[];
    configFiles: SourceFile[];
    coreModules: SourceFile[];     // 按引用频率排序
  }>;

  // tree-sitter AST 分析
  analyzeCode(files: SourceFile[]): Promise<{
    architecture: ArchitectureGraph;
    keyFunctions: FunctionSummary[];
    dataFlow: DataFlowDiagram;
    designPatterns: Pattern[];
  }>;

  aggregateDocs(repo: RepoMetadata): Promise<{
    officialDocs: string[];
    inlineComments: Comment[];
    commitHistory: CommitSummary[];
  }>;
}
```

### 6.2 Layer 2: Deep Extraction（深度提取）

```
输入: SourceDocument
输出: ExtractionResult { conceptGraph, thinkingChain, innovations, prerequisites }
```

#### 6.2.1 概念图谱提取 Prompt

```typescript
const CONCEPT_EXTRACTION_PROMPT = `
你是一位资深的科学教育家。分析以下论文内容，提取所有核心概念及其关系。

要求：
1. 识别论文中所有核心概念（不只是关键词，是可以被独立解释的知识单元）
2. 对每个概念标注：
   - name: 概念名称
   - definition: 一句话定义
   - difficulty: 理解难度 0.0-1.0
   - domain: 所属领域
   - prerequisites: 理解这个概念需要先懂什么（列出概念名）
   - common_misconceptions: 常见误解
3. 识别概念之间的关系：
   - requires: A 必须在 B 之前理解
   - extends: A 是 B 的扩展/变体
   - contrasts: A 和 B 是对比关系

输出格式：严格 JSON
{
  "concepts": [...],
  "edges": [...],
  "external_prerequisites": [...]
}
`;
```

#### 6.2.2 思维链重建 Prompt

```typescript
const THINKING_CHAIN_PROMPT = `
你是一位科学史学家。分析这篇论文，重建作者的思维过程。

不要复述论文内容，而是推理：
1. 问题起源：他们观察到了什么现象/限制？
2. 关键洞察：核心的"啊哈时刻"是什么？
3. 方法选择：为什么选择这种方法？有什么 trade-off？
4. 验证策略：实验设计背后的逻辑？
5. 未说之言：暗含的假设是什么？淡化了什么局限性？

输出：一条线性的思维链，每一步都有明确的因果关系。
`;
```

### 6.3 Layer 3: World Model & Path Generation

#### 6.3.1 学习路径生成算法

```python
from collections import defaultdict
from typing import List, Dict, Tuple

def generate_learning_path(
    concepts: List[Dict],
    edges: List[Tuple[str, str]],  # (prerequisite, dependent)
    user_level: float,             # 0.0-1.0
    max_cognitive_load: int = 4,   # Miller's Law
    zpd_range: float = 0.3,       # 最近发展区范围
) -> List[List[Dict]]:
    """
    基于约束的学习路径生成：改进的 Kahn 拓扑排序 + ZPD 过滤 + 认知负荷分组。
    """
    graph = defaultdict(list)
    in_degree = defaultdict(int)
    concept_map = {c['name']: c for c in concepts}

    for prereq, dep in edges:
        graph[prereq].append(dep)
        in_degree[dep] += 1

    relevant = [
        c for c in concepts
        if c['difficulty'] <= user_level + zpd_range
        or c.get('is_core', False)
    ]

    queue = []
    for c in relevant:
        if in_degree[c['name']] == 0:
            queue.append(c)

    queue.sort(key=lambda c: -c.get('importance', 0.5))

    sorted_path = []
    visited = set()

    while queue:
        queue.sort(key=lambda c: abs(c['difficulty'] - user_level))
        current = queue.pop(0)

        if current['name'] in visited:
            continue
        visited.add(current['name'])
        sorted_path.append(current)

        user_level = max(user_level, current['difficulty'])

        for next_name in graph[current['name']]:
            in_degree[next_name] -= 1
            if in_degree[next_name] == 0 and next_name not in visited:
                if next_name in concept_map:
                    queue.append(concept_map[next_name])

    chapters = []
    current_chapter = []
    current_difficulty = 0

    for concept in sorted_path:
        if (len(current_chapter) >= max_cognitive_load or
            (current_chapter and
             concept['difficulty'] - current_difficulty > 0.2)):
            chapters.append(current_chapter)
            current_chapter = []

        current_chapter.append(concept)
        current_difficulty = concept['difficulty']

    if current_chapter:
        chapters.append(current_chapter)

    return chapters
```

#### 6.3.2 三种难度路径配置

```typescript
const DIFFICULTY_CONFIGS = {
  explorer: {
    label: "探索者",
    targetAudience: "零基础，好奇心驱动",
    includesMath: false,
    includesCode: false,
    analogyDensity: "high",
    maxConceptsPerChapter: 2,
    estimatedMinutes: 15,
    promptModifier: "用日常生活的类比解释，完全不使用数学公式和代码。假设读者没有任何技术背景。",
  },
  builder: {
    label: "构建者",
    targetAudience: "有编程或理工科基础",
    includesMath: true,
    includesCode: true,
    analogyDensity: "medium",
    maxConceptsPerChapter: 3,
    estimatedMinutes: 30,
    promptModifier: "保留核心数学公式但为每个公式提供直觉解释。包含简化的代码示例。",
  },
  researcher: {
    label: "研究者",
    targetAudience: "研究者/高级工程师",
    includesMath: true,
    includesCode: true,
    analogyDensity: "low",
    maxConceptsPerChapter: 4,
    estimatedMinutes: 60,
    promptModifier: "完整的数学推导和证明。包含可直接运行的代码。深入分析局限性和开放问题。",
  },
};
```

### 6.4 Layer 4: Multi-Agent Content Generation

#### 6.4.1 编排流水线

```typescript
import { inngest } from "@/lib/inngest";

export const generateCourse = inngest.createFunction(
  { id: "generate-course" },
  { event: "course/generate.requested" },
  async ({ event, step }) => {
    const { sourceId, difficulty, language, userId } = event.data;

    // Step 1: 获取/执行提取
    const extraction = await step.run("fetch-extraction", async () => {
      return db.sources.findUnique({ where: { id: sourceId } });
    });

    // Step 2: 生成学习路径
    const path = await step.run("generate-path", async () => {
      return generateLearningPath(
        extraction.concept_graph,
        DIFFICULTY_CONFIGS[difficulty]
      );
    });

    // Step 3: 并行生成每个章节（六个 Agent 并行）
    const chapterResults = await Promise.all(
      path.chapters.map((chapter, index) =>
        step.run(`generate-chapter-${index}`, async () => {
          const [narration, analogies, svg, quiz, connections, code] =
            await Promise.all([
              narratorAgent(chapter, extraction, difficulty),
              analogistAgent(chapter, extraction, difficulty),
              visualizerAgent(chapter, extraction, difficulty),
              examinerAgent(chapter, extraction, difficulty),
              connectorAgent(chapter, extraction),
              difficulty !== 'explorer'
                ? coderAgent(chapter, extraction)
                : null,
            ]);

          return {
            order_index: index,
            title: chapter.title,
            narration: narration.text,
            svg_components: svg.components,
            analogies: analogies.selected,
            quiz_questions: quiz.questions,
            source_citations: narration.citations,
            code_snippets: code?.snippets || null,
            concept_names: chapter.concepts.map(c => c.name),
          };
        })
      )
    );

    // Step 4: 自验证
    const verification = await step.run("self-verify", async () => {
      return runVerificationPipeline(chapterResults, extraction, sourceId);
    });

    // Step 5: 验证失败则自动修复 + 重新验证
    if (!verification.allPassed) {
      const fixed = await step.run("auto-fix", async () => {
        return autoFixFailedChapters(
          chapterResults, verification.failedChecks, extraction
        );
      });
      await step.run("re-verify", async () => {
        return runVerificationPipeline(fixed, extraction, sourceId);
      });
    }

    // Step 6: 生成 TTS 音频（ElevenLabs）
    const audioResults = await step.run("generate-audio", async () => {
      return Promise.all(
        chapterResults.map(ch => generateTTS(ch.narration, language))
      );
    });

    // Step 7: 生成博客长文（聚合 narration）
    const blogHtml = await step.run("generate-blog", async () => {
      return renderBlogFromChapters(chapterResults);
    });

    // Step 8: 拼接播客音频
    const podcastUrl = await step.run("generate-podcast", async () => {
      return concatenateAudioFiles(audioResults.map(a => a.url));
    });

    // Step 9: 保存到数据库 + 更新全局概念图谱
    await step.run("save-and-index", async () => {
      await saveCourse(sourceId, difficulty, chapterResults, audioResults, verification, blogHtml, podcastUrl);
      await updateGlobalConceptGraph(extraction.concept_graph);
    });

    // Step 10: 生成 og:image 并缓存
    await step.run("generate-og-image", async () => {
      return generateAndCacheOGImage(sourceId, chapterResults[0]);
    });

    return { courseId: "...", status: "published" };
  }
);
```

#### 6.4.2 各 Agent 的 System Prompt

```typescript
const AGENT_PROMPTS = {
  narrator: `你是一位世界级的科学教育家，擅长把复杂概念讲得引人入胜。

规则：
1. 每个段落必须以一个问题或悬念开头
2. 先讲"为什么这个问题重要"，再讲"怎么解决"
3. 每个核心声明后标注原文出处 [Section X.X]
4. 不要使用"众所周知""显而易见"等短语
5. 用第二人称叙述，像在和读者对话

输出格式：
{
  "text": "讲解正文...",
  "citations": [{"claim": "...", "source_section": "3.2", "source_quote": "..."}]
}`,

  analogist: `你是一位类比大师。为抽象概念找到完美的生活类比。

好类比的标准：
1. 具体：用五感可以体验的事物
2. 准确：映射关系正确，不引起误解
3. 有限：明确说明类比在哪里"破裂"
4. 文化通用：避免需要特定文化背景的例子

为每个概念提供 3 个候选类比，按准确性排序。

输出格式：
{
  "concept": "Self-Attention",
  "candidates": [
    {
      "analogy": "...",
      "accuracy_score": 0.9,
      "limitation": "...",
      "cultural_specificity": "low"
    }
  ],
  "selected": 0
}`,

  visualizer: `你是一位数据可视化专家。为核心概念设计 SVG 可视化图表。

规则：
1. 图表必须是"理解的必要条件"，不是装饰
2. 不用图就能讲清楚的概念，不加图
3. 最少视觉元素传达最多信息（Tufte 原则）
4. 颜色编码全局一致
5. 支持 step 参数做分步展示

输出 JSON 描述（不是 SVG 代码），前端根据描述渲染：
{
  "type": "flow_diagram | bar_chart | architecture | sequence | comparison",
  "elements": [...],
  "steps": [...],
  "color_scheme": {...}
}`,

  examiner: `你是一位严格但公正的考官。为每个章节设计检查题。

题目分布：
- 40% 事实回忆
- 40% 概念理解
- 20% 应用迁移

规则：
1. 只用课程中已讲过的知识就能回答
2. 错误选项必须是常见误解，不能明显荒谬
3. 每道题的解答要解释正确和错误的原因

输出格式：
{
  "questions": [
    {
      "type": "concept_understanding",
      "question": "...",
      "options": ["A. ...", "B. ...", "C. ...", "D. ..."],
      "correct": "B",
      "explanation": "..."
    }
  ]
}`,

  connector: `你是一位知识网络专家。将当前章节的概念与全局知识图谱中的已有概念建立联系。

输出：
{
  "connections": [
    { "from": "当前概念", "to": "已有概念", "relation": "...", "explanation": "..." }
  ]
}`,

  coder: `你是一位资深工程师。为 Builder/Researcher 难度的章节编写代码示例。

Builder 难度：简化的核心代码片段，重在理解思路。
Researcher 难度：可直接运行的完整代码，含注释。

输出格式：
{
  "snippets": [
    { "language": "python", "code": "...", "explanation": "..." }
  ]
}`,
};
```

### 6.5 Layer 5: Self-Verification Pipeline

```typescript
interface VerificationPipeline {
  checks: VerificationCheck[];
  passThreshold: number;
}

const VERIFICATION_PIPELINE: VerificationPipeline = {
  passThreshold: 0.85,
  checks: [
    {
      id: "coverage",
      name: "概念覆盖率",
      weight: 0.25,
      // 用独立 LLM 做"开卷考试"：问题来自概念图谱，答案只能从课程中找
      // 能答对的 / 总概念数 = 覆盖率
    },
    {
      id: "faithfulness",
      name: "内容忠实度",
      weight: 0.25,
      // 提取课程中所有声明，逐一与原文做 NLI 比对
      // 无矛盾的 / 总声明数 = 忠实度
    },
    {
      id: "prerequisites",
      name: "前置知识完备性",
      weight: 0.15,
      // 检测：每个概念在使用前是否已被解释
      // 无缺口的 / 总概念数 = 完备性
    },
    {
      id: "pedagogy",
      name: "教学质量评分",
      weight: 0.15,
      // LLM 按 rubric 评分：问题驱动、具体先于抽象、类比安全性、认知负荷、递进性
      // 平均分 / 5 = 教学质量
    },
    {
      id: "exam_simulation",
      name: "白板 LLM 考试",
      weight: 0.20,
      // 从原文生成专家级问题 → 白板 LLM 只读课程内容答题 → 与标准答案比对
      // 正确率 = 考试通过率
    },
  ],
};
```

**验证失败处理**：自动定位未通过的检查项，调用对应 Agent 修复（如覆盖率低 → 补充遗漏概念的 narration；忠实度差 → 修正矛盾声明），然后重新验证，最多重试 2 次。

### 6.6 Layer 6: 多形态渲染

引擎（Layer 1–5）输出**一份标准化课程结构**。Layer 6 从同一份数据渲染四种形态：

| 形态 | 数据来源 | 渲染方式 | 说明 |
|------|----------|----------|------|
| **课程** | 全部章节 + SVG + 测验 | Web UI（React 组件） | 主产品：学习页、进度、测验 |
| **博客** | 各章 narration 聚合 + 配图 | HTML 长文 | SEO、分享、可独立阅读 |
| **播客** | 各章 TTS 音频拼接 | 连续音频流 + RSS | 全屏播放 / 下载 / 播客平台分发 |
| **短视频** | 精选 1–2 章 + 核心 SVG + TTS | 合成视频（2–3 分钟） | YouTube/B 站分发，结尾 CTA |

**博客渲染规则**：
- 由各章 `narration` 按顺序拼接
- 可插入首图（og:image）和关键 SVG 导出图
- 不再调用 LLM，纯数据格式化

**播客渲染规则**：
- 各章 `audio_url` 按顺序拼接为完整播客
- 生成 RSS feed 用于 Apple Podcasts / Spotify / 小宇宙分发

**短视频渲染规则**：
- 从课程中选取「精华章节」或生成摘要脚本
- SVG 动画帧 + TTS 音频 + 字幕合成视频
- 结尾 CTA 指向 `paperflow.ai/paper/[slug]`

---

## 七、API 设计

### 7.1 完整 API 端点

```
=== 课程生成 ===
POST   /api/courses/generate              触发课程生成（异步，返回 taskId）
GET    /api/courses/status/:taskId         轮询生成状态

=== 课程消费 ===
GET    /api/courses/:id                    课程详情（含全部章节）
GET    /api/courses/:id/chapters/:index    单个章节
POST   /api/courses/:id/chapters/:index/quiz  提交测验答案
GET    /api/courses/:id/progress           用户学习进度
POST   /api/courses/:id/favorite           收藏/取消收藏

=== 多形态输出 ===
GET    /api/courses/:id/blog               博客长文（HTML/Markdown）
GET    /api/courses/:id/podcast            播客音频流
GET    /api/courses/:id/podcast/rss        播客 RSS feed
POST   /api/courses/:id/export-short-video 导出短视频（异步任务）

=== 发现与搜索 ===
GET    /api/courses                        课程列表（分页 + 筛选 + 排序）
GET    /api/courses/trending               热门课程
GET    /api/courses/search?q=              全文搜索

=== 源分析 ===
POST   /api/sources/analyze                预分析源内容（返回概念图谱）

=== 认证（自研邮件） ===
POST   /api/auth/register                  注册（邮箱 + 密码）
POST   /api/auth/login                     登录（邮箱 + 密码，返回 session）
POST   /api/auth/logout                    登出
GET    /api/auth/session                   当前登录用户（校验 session）

=== 用户 ===
GET    /api/user/profile                   当前用户资料
PATCH  /api/user/profile                   更新资料（知识水平、语言等）
GET    /api/user/dashboard                 学习仪表盘（进度、成就、连续天数）
GET    /api/user/achievements              成就列表
GET    /api/user/favorites                 收藏课程

=== 支付 ===
POST   /api/payment/usdt/request           创建 USDT 支付请求（返回金额、收款地址、订单号）
POST   /api/payment/usdt/confirm            用户提交 tx_hash 确认转账
GET    /api/payment/usdt/requests          当前用户支付请求列表（含状态）
（管理端）POST /api/payment/usdt/approve   人工核对后确认开通订阅

=== SEO 与增长 ===
GET    /paper/[slug]/opengraph-image       动态 og:image
GET    /sitemap.xml                        课程 sitemap
GET    /api/courses/:id?embed=1            精简嵌入结构（Notion/Obsidian/Widget 用）

=== 运维 ===
GET    /api/health                         健康检查
```

### 7.2 请求/响应规范

```typescript
// 统一响应格式
type ApiResponse<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: {
    code: string;        // QUOTA_EXCEEDED | NOT_FOUND | UNAUTHORIZED | ...
    message: string;
  };
};

// 生成课程请求
interface GenerateCourseRequest {
  url: string;           // arXiv 或 GitHub URL
  difficulty: "explorer" | "builder" | "researcher";
  language: string;      // 默认 zh-CN
}

// 生成课程响应
interface GenerateCourseResponse {
  taskId: string;
  courseId: string;
  status: "queued";
  estimatedMinutes: number;
}
```

### 7.3 API 安全与限流

| 接口类别 | 限流规则 | 认证要求 |
|----------|----------|----------|
| 课程生成 | Free: 3 次/月；Pro: 无限但 10 次/小时 | 必须登录 |
| 课程查看 | 前 2 章无限；第 3 章起须登录 | 可选 |
| 测验提交 | 30 次/小时 | 必须登录 |
| 短视频导出 | Pro: 5 次/天 | 必须登录 + Pro |
| USDT 支付确认/管理 | 校验登录与权限 | 必须登录（管理端需管理员） |
| 公开页面 | 无限 | 无 |

---

## 八、前端架构

### 8.1 页面路由

```
/                                → 首页（价值主张 + 输入框 + Demo + 邮件收集）
/explore                         → 发现页（热门课程 + 分类 + 搜索）
/generate                        → 生成页（输入 URL → 选难度 → 等待 → 跳转）
/paper/[slug]                    → 课程公开页（SEO 规范 URL，SSR，前 2 章未登录可看）
/paper/[slug]/chapter/[index]    → 学习页
/paper/[slug]/blog               → 博客形态
/paper/[slug]/podcast            → 播客模式
/course/[id]                     → 课程概览（内部 ID，重定向到 /paper/[slug]）
/dashboard                       → 个人仪表盘（学习进度 + 成就 + 连续天数）
/dashboard/favorites             → 收藏夹
/pricing                         → 定价页
/settings                        → 设置（知识水平 + 语言 + 订阅管理）
```

**路由规则**：对外分享与 SEO 统一使用 `/paper/[slug]`。`/course/[id]` 仅内部使用，访问时重定向到对应 slug。

### 8.2 核心组件树

```
CoursePlayer（学习页主体）
├── ProgressBar                // 课程整体进度
├── VisualPanel                // SVG 可视化区域
│   ├── SVGRenderer            // JSON → SVG 渲染
│   └── StepController         // 分步动画控制
├── NarrationPanel             // 讲解文本区域
│   ├── TypewriterText         // 打字机效果
│   ├── CitationTooltip        // 点击引用查看原文
│   ├── DifficultyToggle       // 切换难度等级
│   └── CodeBlock              // 代码片段（Builder/Researcher）
├── AudioController            // 音频控制条
│   ├── PlayPause
│   ├── ProgressSlider
│   ├── SpeedControl           // 0.5x ~ 2x
│   └── ChapterNav             // 上一章/下一章
├── ShareBar                   // 分享（复制链接、Twitter、LinkedIn；触发 course_shared）
├── QuizModal                  // 章节末测验
│   ├── QuestionCard
│   ├── OptionList
│   ├── FeedbackDisplay        // 正确/错误 + 解释
│   └── NextChapterCTA
└── CompletionCelebration      // 全课程完成：学完徽章 + 一键分享

BlogView（博客形态）
├── ArticleHeader              // 标题、作者、日期、难度标签
├── TableOfContents            // 目录导航
├── ArticleBody                // narration 聚合的长文
│   └── InlineSVG              // 关键可视化图
├── ShareBar
└── RelatedCourses             // 推荐相关课程

PodcastPlayer（播客模式）
├── FullScreenPlayer           // 全屏播放器
├── ChapterList                // 章节列表 + 当前章节高亮
├── Transcript                 // 同步显示 narration 文本
├── SpeedControl
└── DownloadButton             // Pro 可下载

LandingPage（首页）
├── Hero                       // 价值主张 + 输入框（贴链接即可体验）
├── DemoVideo                  // 产品演示视频
├── SampleCourses              // 5 篇预生成的示例课程
├── HowItWorks                 // 三步流程图
├── Pricing                    // 定价卡片
├── Testimonials               // 用户评价（Launch 后添加）
├── EmailCapture               // 邮件收集（早鸟/等待列表）
└── Footer

Dashboard（个人仪表盘）
├── LearningStreak             // 连续学习天数
├── ConceptMap                 // 已掌握概念图谱可视化
├── RecentCourses              // 最近学习的课程
├── Achievements               // 成就徽章墙
└── RecommendedPapers          // 推荐论文（基于已学概念）
```

### 8.3 状态管理

```typescript
// Zustand Store 结构
interface AppStore {
  // 用户
  user: User | null;
  subscription: Subscription | null;

  // 当前课程
  currentCourse: Course | null;
  currentChapterIndex: number;
  audioPlaying: boolean;
  audioSpeed: number;

  // 学习进度
  progress: Map<string, ChapterProgress>;

  // UI
  difficulty: "explorer" | "builder" | "researcher";
  sidebarOpen: boolean;
}
```

---

## 九、业务逻辑实现规范

### 9.1 付费门控

```
门控层级：
├── 课程生成 → API 层（检查 subscription + usage_quotas）
├── 难度选择 → API 层（Free 只允许 explorer）
├── 章节访问 → API 层 + 前端（前 2 章免费，第 3 章起需登录）
├── 音频下载 → API 层（Pro only）
├── 短视频导出 → API 层（Pro only）
└── 优先队列 → Inngest 优先级（Pro 用户任务优先执行）

实现规则：
├── 门控在 API 层实现，前端仅做 UI 引导
├── Free 用户月度用量通过 usage_quotas 表追踪
├── 订阅状态在 USDT 支付请求被确认后写入/更新 subscriptions 表
└── 前端根据 subscription.plan 决定 UI 展示（显示/隐藏/灰色按钮）
```

### 9.2 USDT 支付集成

```
流程：
├── 用户点击 Subscribe → 调用 /api/payment/usdt/request
├── 后端创建 usdt_payment_requests 记录，返回：收款地址、应付 USDT 数量、订单号
├── 用户向指定地址转账 USDT，取得 tx_hash
├── 用户在前端提交 tx_hash → 调用 /api/payment/usdt/confirm
├── 人工核对（或接入链上查询）→ 确认到账后调用 /api/payment/usdt/approve
│   → 更新 usdt_payment_requests.status = 'confirmed'
│   → 创建或更新 subscriptions（plan、current_period_start/end、payment_request_id）
└── 用户可在设置页查看「我的订阅」与「支付记录」

开发注意：
├── 金额与收款地址、链（如 TRC20/ERC20）由环境变量配置
├── 幂等：同一 payment_request 只可确认一次
├── 可选：接入链上 API 自动校验 tx_hash 到账后再自动 approve
└── 定价页展示美元等价与应付 USDT（按约定汇率或固定数量）
```

### 9.3 缓存策略

```
热门论文缓存（核心成本优化）：
├── 同一篇论文 + 同一难度 = 同一课程，不重复生成
├── 查找逻辑：source.url + difficulty → courses 表查已有 published 记录
├── 命中 → 直接返回已有课程
├── 未命中 → 触发生成任务
└── 缓存命中率目标 > 60%（热门论文被多人请求）

Redis 缓存（Upstash）：
├── 课程详情：key = course:{id}，TTL = 1h
├── 用户 session/限流：key = ratelimit:{userId}:{endpoint}，TTL = 按规则
├── 概念图谱热点数据：key = concept:{name}，TTL = 24h
└── sitemap 缓存：key = sitemap，TTL = 1h
```

### 9.4 PostHog 埋点清单

| 事件名 | 触发时机 | 附带属性 |
|--------|----------|----------|
| `course_generated` | 课程生成完成 | sourceUrl, difficulty, generationTime |
| `chapter_viewed` | 用户打开章节 | courseId, chapterIndex, difficulty |
| `chapter_completed` | 用户完成章节 | courseId, chapterIndex, timeSpent |
| `quiz_submitted` | 提交测验 | courseId, chapterIndex, score |
| `course_completed` | 全课程完成 | courseId, totalTime, averageQuizScore |
| `course_shared` | 点击分享按钮 | courseId, platform(twitter/linkedin/copy) |
| `blog_viewed` | 查看博客形态 | courseId |
| `podcast_played` | 播放播客 | courseId, duration |
| `subscription_started` | 开始付费 | plan, source |
| `subscription_cancelled` | 取消付费 | plan, reason |
| `badge_shared` | 分享学完徽章 | courseId, platform |
| `referral_signup` | 通过推荐链接注册 | referrerId |

---

## 十、开发计划（完整版）

### Phase 1: 基础设施与核心引擎（Week 1–2）

```
Week 1: 项目骨架 + Layer 1–3
- [ ] 项目初始化（Next.js + Supabase + Tailwind + Shadcn）
- [ ] 数据库 Schema 创建（全部表 + 索引）
- [ ] 环境变量配置 + 健康检查端点
- [ ] 自研邮件注册/登录（注册、登录、password_hash、session）
- [ ] 论文 PDF 获取和解析（Layer 1: pdf.js + Mathpix）
- [ ] 概念图谱提取（Layer 2: Claude API）
- [ ] 思维链重建（Layer 2）
- [ ] 学习路径生成算法（Layer 3: TypeScript 实现）
- [ ] Inngest 集成 + 课程生成任务编排骨架

Week 2: Layer 4–5 + 基础前端
- [ ] Narrator Agent 实现
- [ ] Analogist Agent 实现
- [ ] Visualizer Agent 实现
- [ ] Examiner Agent 实现
- [ ] Connector Agent 实现
- [ ] Coder Agent 实现
- [ ] 自验证管线（5 道检查）
- [ ] 自动修复 + 重新验证逻辑
- [ ] 全局概念图谱更新逻辑
```

### Phase 2: 前端完整实现（Week 3–4）

```
Week 3: 学习体验
- [ ] 首页（LandingPage 组件：Hero + Demo + 示例课程 + 邮件收集）
- [ ] 生成页（输入 URL → 选难度 → 轮询状态 → 跳转）
- [ ] CoursePlayer 学习页（SVG + 文本 + 音频 + 分步动画）
- [ ] 三种难度切换（共享概念图谱，切换内容深度）
- [ ] 测验系统（QuizModal 组件）
- [ ] 前 2 章免费 + 第 3 章软门控

Week 4: 多形态 + 发现
- [ ] BlogView 博客形态
- [ ] PodcastPlayer 播客模式
- [ ] 课程发现页（热门 + 搜索 + 分类）
- [ ] /paper/[slug] 公开页 SSR
- [ ] Dashboard 个人仪表盘（进度 + 连续天数 + 概念图谱）
- [ ] 收藏夹
```

### Phase 3: 商业化与增长系统（Week 5–6）

```
Week 5: 支付与门控
- [ ] USDT 支付流程（创建请求、展示收款信息、提交 tx_hash、人工/自动核对）
- [ ] 付费门控全流程（API 层 + 前端 UI）
- [ ] 免费用户月度配额（usage_quotas）
- [ ] 定价页（美元标价 + USDT 应付金额）
- [ ] 订阅管理页（设置 → 我的订阅与支付记录）

Week 6: SEO + 分享 + 埋点
- [ ] 动态 og:image 生成（Vercel OG）
- [ ] sitemap.xml 自动生成
- [ ] meta tags 动态注入（title/description/og:*）
- [ ] ShareBar 组件（复制链接、Twitter、LinkedIn）
- [ ] 学完徽章生成 + 分享
- [ ] PostHog 埋点（全部事件）
- [ ] 联盟营销：ref= 参数 → referrer_id → referral_stats
- [ ] 邮件收集（Resend 集成）
```

### Phase 4: 完善与上线（Week 7–8）

```
Week 7: 质量与性能
- [ ] ElevenLabs TTS 集成（替换 Web Speech API）
- [ ] SSML 韵律预处理
- [ ] 缓存策略实现（热门论文 + Redis）
- [ ] 限流实现（Upstash）
- [ ] GitHub 项目解析（Layer 1 扩展）
- [ ] 生成进度实时推送（骨架先返回，逐章流式渲染）
- [ ] 错误处理与降级（PDF 失败 → HTML 版本）

Week 8: 上线准备
- [ ] 预生成 5 篇高质量示例课程
- [ ] 落地页 Demo 视频
- [ ] 安全审计（API 限流、Webhook 签名、环境变量）
- [ ] Sentry 错误监控配置
- [ ] 部署到 Vercel 生产环境
- [ ] 域名 + SSL + Cloudflare
- [ ] 最终冒烟测试
- [ ] Launch 准备（PH 页面、HN 帖子、Twitter 预热）
```

### Phase 5: 持续迭代

```
- [ ] 短视频导出（SVG + TTS → 视频合成）
- [ ] 多语言支持（英文优先）
- [ ] PWA（离线缓存 + 推送通知）
- [ ] Chrome Extension（arXiv 页面侧边栏）
- [ ] 社区评论和纠错
- [ ] 学习成就系统（Streak、概念解锁）
- [ ] 全局知识图谱可视化
- [ ] 每日推荐（"今日 arXiv 热门"）
- [ ] Team Plan 团队功能
- [ ] API 对外开放（按量计费）
- [ ] Obsidian / Notion 插件
- [ ] 播客 RSS 自动分发
```

---

## 十一、项目结构

### 11.1 目录结构

```
paperflow/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── (marketing)/               # 营销页面组
│   │   │   ├── page.tsx               # 首页
│   │   │   ├── pricing/page.tsx       # 定价页
│   │   │   └── layout.tsx
│   │   ├── (app)/                     # 登录后页面组
│   │   │   ├── dashboard/page.tsx     # 仪表盘
│   │   │   ├── generate/page.tsx      # 生成页
│   │   │   ├── explore/page.tsx       # 发现页
│   │   │   ├── settings/page.tsx      # 设置
│   │   │   └── layout.tsx
│   │   ├── paper/
│   │   │   └── [slug]/
│   │   │       ├── page.tsx           # 课程公开页（SSR）
│   │   │       ├── chapter/[index]/page.tsx
│   │   │       ├── blog/page.tsx      # 博客形态
│   │   │       ├── podcast/page.tsx   # 播客模式
│   │   │       └── opengraph-image.tsx  # 动态 og:image
│   │   ├── api/
│   │   │   ├── courses/
│   │   │   │   ├── generate/route.ts
│   │   │   │   ├── [id]/route.ts
│   │   │   │   ├── [id]/chapters/[index]/route.ts
│   │   │   │   ├── [id]/chapters/[index]/quiz/route.ts
│   │   │   │   ├── [id]/blog/route.ts
│   │   │   │   ├── [id]/podcast/route.ts
│   │   │   │   ├── [id]/progress/route.ts
│   │   │   │   └── [id]/favorite/route.ts
│   │   │   ├── sources/analyze/route.ts
│   │   │   ├── payment/
│   │   │   │   ├── usdt/
│   │   │   │   │   ├── request/route.ts    # 创建支付请求
│   │   │   │   │   ├── confirm/route.ts    # 提交 tx_hash
│   │   │   │   │   ├── requests/route.ts   # 用户支付记录
│   │   │   │   │   └── approve/route.ts    # 管理端确认开通
│   │   │   ├── user/
│   │   │   │   ├── profile/route.ts
│   │   │   │   ├── dashboard/route.ts
│   │   │   │   └── achievements/route.ts
│   │   │   ├── health/route.ts
│   │   │   └── inngest/route.ts       # Inngest handler
│   │   ├── sitemap.ts                 # 动态 sitemap
│   │   └── layout.tsx                 # 根 layout（Session/Auth Provider + PostHog）
│   ├── components/
│   │   ├── course/                    # CoursePlayer, ChapterView, etc.
│   │   ├── blog/                      # BlogView, ArticleBody, etc.
│   │   ├── podcast/                   # PodcastPlayer, etc.
│   │   ├── svg/                       # SVGRenderer, StepController
│   │   ├── quiz/                      # QuizModal, QuestionCard
│   │   ├── audio/                     # AudioController
│   │   ├── share/                     # ShareBar, BadgeCard
│   │   ├── dashboard/                 # Dashboard 组件
│   │   ├── landing/                   # 首页组件
│   │   └── ui/                        # Shadcn/ui 组件
│   ├── lib/
│   │   ├── engine/                    # 核心生成引擎
│   │   │   ├── ingestion/             # Layer 1: PDF/GitHub 获取解析
│   │   │   ├── extraction/            # Layer 2: 概念图谱 + 思维链
│   │   │   ├── path-generation/       # Layer 3: 拓扑排序 + 难度适配
│   │   │   ├── rendering/             # Layer 6: 博客/播客/短视频渲染
│   │   │   └── types.ts               # 引擎类型定义
│   │   ├── agents/                    # Layer 4: 各 Agent prompt + 调用
│   │   │   ├── narrator.ts
│   │   │   ├── analogist.ts
│   │   │   ├── visualizer.ts
│   │   │   ├── examiner.ts
│   │   │   ├── connector.ts
│   │   │   ├── coder.ts
│   │   │   └── types.ts
│   │   ├── verification/              # Layer 5: 自验证管线
│   │   │   ├── coverage.ts
│   │   │   ├── faithfulness.ts
│   │   │   ├── prerequisites.ts
│   │   │   ├── pedagogy.ts
│   │   │   ├── exam-simulation.ts
│   │   │   ├── auto-fix.ts
│   │   │   └── pipeline.ts
│   │   ├── db/                        # Supabase 客户端 + 查询
│   │   ├── payment/                   # USDT 支付集成
│   │   ├── tts/                       # TTS 集成（ElevenLabs）
│   │   ├── analytics/                 # PostHog 封装
│   │   ├── cache/                     # Redis 缓存封装
│   │   ├── rate-limit/                # 限流封装
│   │   ├── inngest/                   # Inngest 客户端 + 任务定义
│   │   └── utils/                     # 通用工具
│   ├── hooks/                         # React hooks
│   └── stores/                        # Zustand stores
├── supabase/
│   └── migrations/                    # 数据库迁移
├── public/
├── .env.local                         # 本地环境变量
├── .env.example                       # 环境变量模板
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── CURSOR.md                          # Cursor AI 上下文
```

### 11.2 环境变量

```env
# .env.local（完整清单）

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM（至少配置一个；双 Key 时见 3.2.1 策略）
ANTHROPIC_API_KEY=
MINIMAX_API_KEY=
LLM_STRATEGY=                 # 可选：first（默认，最先返回）| cheapest（最便宜优先）
OPENAI_API_KEY=

# 认证
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=

# 支付
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_PRO_MONTHLY_PRICE_ID=
STRIPE_PRO_YEARLY_PRICE_ID=
STRIPE_TEAM_PRICE_ID=

# 异步任务
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=

# TTS
ELEVENLABS_API_KEY=

# 缓存/限流
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# 分析
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# 邮件
RESEND_API_KEY=

# 环境区分
NEXT_PUBLIC_APP_ENV=                   # development | staging | production
NEXT_PUBLIC_APP_URL=                   # https://paperflow.ai

# 可选：Python 引擎
ENGINE_PYTHON_URL=
```

---

## 十二、开发规范

### 12.1 代码风格

- **TypeScript 严格模式**：`strict: true`，禁止 `any`
- **函数式优先**：避免 class，用纯函数 + hooks
- **错误处理**：用 Result 类型（`{ success, data } | { success, error }`），不用裸 try-catch
- **命名**：文件用 kebab-case，组件用 PascalCase，函数/变量用 camelCase
- **SVG 可视化**：React 组件内联渲染，不用图片文件

### 12.2 API 开发规范

- 所有 API 路由统一返回 `ApiResponse<T>` 格式
- 认证检查用自研 session middleware（或 Supabase Auth），在路由内获取 userId
- 数据库操作用 Supabase SDK，不写原生 SQL（迁移文件除外）
- 长任务投递到 Inngest，API 立即返回 taskId
- 每个 API 路由开头做参数校验（Zod）

### 12.3 前端开发规范

- 页面组件只做布局和数据获取，业务逻辑放 hooks/stores
- Server Components 默认，Client Components 仅在需要交互时使用
- PostHog 埋点在行为发生的组件内触发，不在父组件代理
- 所有用户可见文本支持 i18n 预留（字符串提取为常量）

### 12.4 Git 规范

- 分支：`main`（生产）、`dev`（开发）、`feature/*`（功能）、`fix/*`（修复）
- Commit message：`feat: 添加课程生成API` / `fix: 修复PDF解析超时` / `chore: 更新依赖`
- PR 必须包含：改了什么 + 为什么改 + 如何测试

---

## 十三、关键风险与缓解

| 风险 | 影响 | 缓解策略 |
|------|------|----------|
| LLM 生成内容不准确 | 用户信任崩塌 | Layer 5 自验证 + 原文引用标注 + 矛盾自动修复 |
| 生成速度慢（多 Agent） | 用户等待流失 | 先返回骨架，逐章流式渲染；热门论文缓存 |
| API 成本过高 | 无法盈利 | Sonnet 为主力；缓存命中率 > 60%；免费用户限额 |
| 论文 PDF 解析失败 | 部分论文无法处理 | 降级到 arXiv HTML 版本 |
| 竞品快速复制 | 失去先发优势 | 知识图谱数据飞轮 + 自验证质量壁垒 |
| TTS 音质差 | 播客/短视频体验差 | 正式环境强制 ElevenLabs；博客不做音频 |
| Launch 当天宕机 | 口碑损失 | 健康检查 + Sentry 报警 + Vercel 自动扩容 |
| USDT 支付确认延迟/失败 | 用户已转账未开通 | 人工核对流程 + 可选链上 API 自动校验；幂等 approve |

---

## 十四、Cursor AI 开发上下文

以下内容保存为项目根目录 `CURSOR.md`：

```markdown
# PaperFlow — Cursor 开发上下文

## 项目定位
AI 驱动的论文/代码学习引擎。录入 URL，由核心生成引擎产出课程、博客、播客、短视频四种形态。

## 技术栈
- Next.js 14 App Router + TypeScript（严格模式）
- Supabase (PostgreSQL + Auth + Storage)
- Claude API + MiniMax（双 Key 时自动选最先返回或最便宜）
- Inngest (异步任务编排)
- Tailwind + Shadcn/ui
- USDT 支付（自建流程：请求 → 转账 → 提交 tx_hash → 核对开通）
- 自研邮件注册/登录（邮箱 + 密码，password_hash）
- PostHog (埋点)
- ElevenLabs (TTS)
- Upstash Redis (缓存/限流)

## 代码风格
- 函数式优先，避免 class
- 所有 API 用 server actions 或 API routes
- 错误处理用 Result 类型而非 try-catch
- SVG 可视化用 React 组件内联
- 统一 API 响应格式：{ success, data } | { success, error }

## 关键设计决策
1. 路径生成用算法（拓扑排序 + ZPD），不用 LLM
2. 内容生成用多 Agent 并行，不用单次 LLM 调用
3. 质量验证是自动化的 5 道关卡，不依赖用户反馈
4. 三种难度共享概念图谱，只改内容深度和 promptModifier
5. 四种形态（课程/博客/播客/短视频）共享同一份引擎产出，Layer 6 只做渲染
6. 部署：Vercel + Supabase + Upstash + Inngest，开发时遵守环境变量规则
7. SEO：/paper/[slug] SSR + 动态 og:image + sitemap.xml
8. 门控：API 层实现，不在前端；Free 3 篇/月、仅 Explorer
9. 埋点：PostHog 上报 course_generated | chapter_viewed | chapter_completed | quiz_submitted | course_completed | course_shared | subscription_started | subscription_cancelled

## 文件结构约定
- src/lib/engine/ — 核心生成引擎（Layer 1-3, 6）
- src/lib/agents/ — 各 Agent 的 prompt 和调用（Layer 4）
- src/lib/verification/ — 自验证管线（Layer 5）
- src/lib/payment/ — USDT 支付集成
- src/lib/tts/ — TTS 集成
- src/lib/analytics/ — PostHog 封装
- src/lib/cache/ — Redis 缓存
- src/lib/rate-limit/ — 限流
- src/app/api/ — API 路由
- src/components/ — React 组件（按功能分目录）
- supabase/migrations/ — 数据库迁移
```


## 引擎效率优化（MiniMax 理念）

### Agent 分级调度策略

| Agent | 推荐模型 | 原因 | 预估 token |
|-------|---------|------|-----------|
| Deep Extraction | Claude Sonnet | 需要深度理解 | ~3000 |
| Path Generator | 算法（无 LLM） | 拓扑排序，纯算法 | 0 |
| Narrator | Claude Sonnet | 叙事质量是核心 | ~2000/章 |
| Analogist | Claude Haiku / MiniMax M2.5 | 结构化任务 | ~500/章 |
| Visualizer | Claude Haiku / MiniMax M2.5 | JSON 描述输出 | ~400/章 |
| Examiner | MiniMax M2.5 / GPT-4o-mini | 出题是模板化的 | ~300/章 |
| Connector | 向量搜索 + 小模型 | 查图谱不需要大模型 | ~200 |
| Verifier | Claude Sonnet（仅关键关卡） | 验证需要判断力 | ~1500 |

### 三级生成策略（懒加载）

第一级：骨架生成（<2 秒，~800 token）
→ 用快速模型生成：课程标题、章节列表、每章核心概念
→ 用户立刻看到课程结构
→ 成本：约 $0.01

第二级：按需章节生成（3-5 秒/章，~2500 token/章）
→ 用户点开某一章时才触发生成
→ 调 Sonnet 生成完整叙事 + 可视化
→ 成本：约 $0.05/章

第三级：深度内容（用户主动请求）
→ "深入这个概念" → 调 Sonnet 生成专家级解释
→ "看原文" → 展示论文对应段落
→ 成本：约 $0.03/次

总效果：
├── 如果用户只浏览骨架 → 成本 $0.01
├── 如果学完 4 章 → 成本 $0.21
├── 如果学完全部 10 章 → 成本 $0.51
└── 对比原方案（全量预生成）→ 成本 $0.80-1.50

节省 50-70% 的 API 成本，同时用户体验更好（即时反馈）。

### 思维链压缩指令

在所有 Agent 的 system prompt 中加入：
"直接输出结构化结果。不要解释你的推理过程。
不要使用'让我思考一下''首先我注意到'等过渡语。
如果输出是 JSON，只输出 JSON，不加任何 markdown 包裹或解释。"

预估效果：每个 Agent 的 output token 减少 40-60%。