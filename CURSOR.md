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
- `src/lib/engine/verification/`：自验证管线（Layer 5）
- `src/lib/db/`：Supabase 客户端和数据访问
- `src/lib/inngest/`：Inngest 客户端和工作流
- `src/app/api/`：API 路由
- `src/components/`：React 组件
- `supabase/migrations/`：数据库迁移

## 护城河相关数据结构（从第一天就开始记录）

### 用户学习行为日志（每次交互都记录）
- chapter_view: {user_id, chapter_id, timestamp, duration_seconds}
- quiz_attempt: {user_id, question_id, selected_answer, correct, time_spent}
- content_interaction: {user_id, chapter_id, element_type, action}
  - element_type: "analogy" | "formula" | "code" | "svg" | "audio"
  - action: "viewed" | "expanded" | "collapsed" | "replayed" | "skipped"
- difficulty_switch: {user_id, course_id, from_level, to_level}
- course_share: {user_id, course_id, platform, timestamp}

### Personal Knowledge Graph 表
- user_concepts: {user_id, concept_id, mastery_level, last_reviewed, review_count}
- mastery_level: 0.0-1.0 (基于测验正确率 + 衰减函数)

### 类比贡献表
- user_analogies: {user_id, concept_id, analogy_text, submitted_at}
- analogy_scores: {analogy_id, exam_sim_score, user_quiz_score, usage_count}

### 已落地的护城河写入
- **chapter_views**：章节页打开时 POST `/api/courses/:id/chapters/:index/view`
- **quiz_attempts**：测验提交时在 quiz 路由内写入每道题；**user_concepts** 同步更新掌握度
- **content_interactions**：POST `/api/courses/:id/chapters/:index/interact`（body: elementType, action）
- **difficulty_switches**：难度切换时 POST `/api/courses/:id/difficulty-switch`（fromLevel, toLevel）
- **course_shares**：分享时 POST `/api/courses/:id/share`（platform）


## 教材手法库（嵌入 Narrator Agent）

### 每个章节的必备元素（checklist）
□ 以问题开头，不以定义开头（费曼）
□ 遵循 ABT 结构：And → But → Therefore（Olson）
□ 核心概念使用"发明叙事"——引导读者自己推导出结论（3Blue1Brown）
□ 标注"惊奇度"——让读者知道这段有多重要（Greene）
□ 先给 80% 准确的简化版，再逐步精确（费曼螺旋式）
□ 数学公式必须配思想实验版本（霍金规则）
□ SVG 可视化必须属于五种教学角色之一（3Blue1Brown）
□ 章节间有桥梁微故事（GEB 交织叙事）
□ 检查题需要反事实推理，不能靠背诵回答（费曼反死记硬背）
□ 课程开头和结尾使用 Cosmic Zoom（Sagan）

### 验证新增
□ Feynman Verifier：用更小的模型尝试从课程中学习
□ ABT 结构检测：每章是否有明确的转折点
□ 惊奇度分布检查：不能全程高强度或全程平淡
□ 桥梁微故事完整性：相邻章节之间是否有过渡