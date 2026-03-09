# 生产部署就绪清单

> 对照 `paperflow-architecture.md` 第四、十节（生产部署方案 + Phase 4 Week 8）整理。  
> 用于回答：**距离部署生产环境还差什么？**
>
> **一步步发布**：按顺序操作请用 **[deploy-production-step-by-step.md](./deploy-production-step-by-step.md)**。

---

## 一、已就绪项（可直接用于生产）

| 类别 | 项目 | 说明 |
|------|------|------|
| **环境与配置** | 环境变量 | 全部走 `.env` / Vercel 配置，无硬编码 |
| | `NEXT_PUBLIC_APP_ENV` | 支持 development / staging / production |
| | `.env.example` | 已提供完整变量模板 |
| **API 与引擎** | 对外 API | 仅 Vercel API 路由，长任务走 Inngest |
| | 健康检查 | `GET /api/health` 返回 db/env/missing |
| **数据库** | Supabase SDK | 连接与迁移均从环境变量读取 |
| | 迁移 | 使用 Supabase Migration，无手写 DDL |
| **认证与门控** | Clerk | 集成完成，middleware 保护 dashboard/settings |
| | 免费配额 | usage_quotas + 每月 3 篇 + 仅 Explorer |
| | 章节门控 | 前 2 章免费，第 3 章起需登录 |
| **支付** | Stripe | Checkout + Portal + Webhook，订阅同步到 DB |
| **限流与缓存** | Upstash | Redis + ratelimit 用于生成接口 |
| | 课程缓存 | 课程详情/列表/sitemap 使用 Redis，发布时失效 |
| **分析** | PostHog | 客户端 + 服务端埋点（生成/章节/订阅/测验/成就） |
| **SEO** | 公开课程页 | `/paper/[slug]` SSR，动态 meta |
| | og:image | 动态生成路由已存在 |
| | sitemap | 动态从已发布课程生成 |
| **学习与用户** | 进度/收藏 | 进度、收藏、Dashboard、Favorites 页 |
| | 测验与成就 | 章节测验提交、course_completed 成就、成就列表 API |
| | 用户资料 | GET/PATCH profile，Settings 页持久化 |

---

## 二、上线前必做（Week 8 + 文档 4.3）

### 2.1 健康检查与可观测

- [x] **健康检查增强**：`/api/health` 对 DB 做一次轻量查询，返回 `db: "ok"` / `"error"` / `"missing_env"`；仅当 env 就绪且 db ok 时返回 200。
- [x] **Sentry 错误监控**：已接入 `@sentry/nextjs`，仅在 `NEXT_PUBLIC_APP_ENV === "production"` 且配置 DSN 时初始化；含 server/edge/client 与 `global-error`。

### 2.2 安全与生产行为

- [x] **生产关闭调试**：当前无调试端点；已提供 `src/lib/guards.ts` 的 `requireDevelopment()`，后续若有调试路由可调用并在生产返回 404。
- [x] **Webhook 签名**：Stripe webhook 使用 `stripe-signature` + `constructEvent(..., STRIPE_WEBHOOK_SECRET)`；Inngest 使用 `INNGEST_SIGNING_KEY` 校验，生产环境需配置。
- [ ] **安全快速自检**：见下方 2.2.1 清单，上线前逐项确认。

### 2.2.1 安全快速自检清单（上线前逐项确认）

| 项 | 说明 |
|----|------|
| 限流 | 生成课程：按用户限流（Upstash）；等待列表：`POST /api/lead` 按 IP 10 次/小时。 |
| Webhook | Stripe、Inngest 生产环境均配置对应签名密钥，无裸接收。 |
| 环境变量 | 敏感变量仅从 Vercel/Supabase 控制台注入，`.env*.local` 不提交、已加入 `.gitignore`。 |
| 调试 | 无对外调试端点；若有新增，使用 `requireDevelopment()` 并在生产返回 404。 |

### 2.3 内容与落地页

- [ ] **预生成示例课程**：至少 5 篇高质量、已发布课程，用于首页/发现页展示与 SEO（运营动作）。
- [x] **落地页**：价值主张 + 示例课程 + **邮件收集**（Resend：`POST /api/lead`，首页「Get early access」表单）；可选后续加 Demo 视频。

### 2.4 部署与发布

- [ ] **Vercel 生产部署**：连接仓库，配置生产环境变量，部署 `main` 或发布分支。
- [ ] **域名与 SSL**：在 Vercel 或 Cloudflare 绑定域名，确认 HTTPS。
- [ ] **最终冒烟测试**：注册 → 生成一篇课程 → 看章节 → 完成测验 → 订阅/取消订阅 → 检查健康检查与关键埋点。

---

## 三、建议上线前补齐（文档 4.4 推广与增长）

| 项目 | 说明 | 优先级 | 状态 |
|------|------|--------|------|
| **ShareBar + course_shared** | 课程页「分享」按钮（复制链接、Twitter、LinkedIn），点击上报 `course_shared` | 高 | ✅ 已实现 |
| **学完徽章 + badge_shared** | Dashboard 成就区块展示「Course completed」+ Share achievement（复制/Twitter/LinkedIn），点击上报 `badge_shared` | 高 | ✅ 已实现 |
| **联盟推荐 ref=** | URL 支持 `?ref=推荐人用户UUID`，落地写入 cookie，新用户注册/同步时写入 `users.referrer_id` | 中 | ✅ 已实现 |
| **邮件收集** | Resend：`POST /api/lead` + 首页「Get early access」表单，按 IP 限流 10/小时 | 中 | ✅ 已实现 |

---

## 四、可上线后迭代（Phase 4/5）

- **TTS**：ElevenLabs 集成，替换或补充当前无音频/浏览器 TTS。
- **博客/播客形态**：Layer 6 从同一课程数据渲染 BlogView / PodcastPlayer 及对应路由。
- **生成进度实时推送**：骨架先返回，逐章流式或 SSE，提升等待体验。
- **错误降级**：PDF 解析失败时降级到 arXiv HTML。
- **GitHub 项目解析**：Layer 1 扩展，支持 GitHub URL。
- **更多 PostHog 事件**：如 `blog_viewed`、`podcast_played`、`referral_signup` 等按需补全。

---

## 五、最小上线清单（一句话）

1. 健康检查带真实 DB 探测，生产环境配置 Sentry。  
2. 确认 Webhook 签名与生产无调试端点，做一次安全与限流自检。  
3. 预生成至少 5 篇示例课程，落地页可展示价值与（可选）邮件收集。  
4. 在 Vercel 部署生产、绑定域名与 SSL，做一轮冒烟测试。  
5. （建议）ShareBar + `course_shared`、学完徽章 + `badge_shared`，便于传播与数据分析。

完成上述项后，即可部署到生产环境并对外发布；其余项按 Phase 4/5 在后续迭代中补齐。
