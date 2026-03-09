# PaperFlow — Cursor 开发上下文

## 项目定位
AI 驱动的论文/代码学习引擎。录入 URL，由核心生成引擎产出课程、博客、播客、短视频四种形态。

## 技术栈
- Next.js App Router + TypeScript（严格模式）
- Supabase（PostgreSQL + Storage）
- LLM：Claude API + MiniMax（双 Key 时自动选最先返回或最便宜，见 `src/lib/llm/unified-llm.ts`）
- Inngest（异步任务编排）
- Tailwind + shadcn/ui 风格组件
- Stripe（后续支付）
- Clerk（后续认证）
- PostHog（后续埋点）
- ElevenLabs（后续 TTS）
- Upstash Redis（后续缓存/限流）

## 代码风格
- 函数式优先，避免 class
- 所有 API 用 API routes
- 错误处理用 Result 风格响应
- SVG 可视化用 React 组件内联
- 统一 API 响应格式：`{ success, data } | { success, error }`

## 关键设计决策
1. 路径生成用算法，不依赖 LLM 决策。
2. 内容生成最终会走多 Agent 并行，不用单次大调用。
3. 四种形态共享同一份引擎产出，渲染层不重复调用 LLM。
4. API 从第一天开始按异步任务模型设计。
5. 当前阶段暂缓认证，但保留完整数据库和接口扩展位。

## 文件结构约定
- `src/lib/engine/`：核心生成引擎（Layer 1-3, 6）
- `src/lib/agents/`：各 Agent 的 prompt 和调用（Layer 4）
- `src/lib/verification/`：自验证管线（Layer 5）
- `src/lib/db/`：Supabase 客户端和数据访问
- `src/lib/inngest/`：Inngest 客户端和工作流
- `src/app/api/`：API 路由
- `src/components/`：React 组件
- `supabase/migrations/`：数据库迁移
