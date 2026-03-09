# 一步步发布生产

按顺序执行，每步打勾后再进行下一步。遇到问题可对照 `deployment-readiness.md` 与各服务文档。

---

## 第 0 步：本地预检（约 5 分钟）

- [ ] 代码已提交到 Git，无未提交的敏感信息（`.env`、`.env.local` 已在 `.gitignore`，不要提交）
- [ ] 本地构建通过：
  ```bash
  npm ci
  npm run build
  ```
- [ ] 本地跑一遍关键流程（可选）：注册/登录 → 生成页提交一篇 → 看章节 → 测验 → 设置页订阅入口

---

## 第 1 步：代码托管（若尚未做）

- [ ] 在 GitHub / GitLab / Bitbucket 创建**私有**仓库（推荐）
- [ ] 本地添加 remote 并推送：
  ```bash
  git remote add origin https://github.com/YOUR_ORG/learn_article.git
  git branch -M main
  git push -u origin main
  ```

---

## 第 2 步：Vercel 创建项目

- [ ] 打开 [Vercel](https://vercel.com) 并登录
- [ ] **Add New** → **Project**，从 Git 导入你的仓库
- [ ] **Framework Preset** 选 **Next.js**，Root Directory 保持默认，Build Command 默认 `next build`
- [ ] 先不要点 Deploy，到下一步配好环境变量再部署

---

## 第 3 步：配置生产环境变量

在 Vercel 项目 **Settings → Environment Variables** 中，为 **Production** 添加以下变量（可从 `.env.example` 对照）。  
值从哪里来见下表。

| 变量名 | 必填 | 获取方式 |
|--------|------|----------|
| `NEXT_PUBLIC_APP_ENV` | ✅ | 填 `production` |
| `NEXT_PUBLIC_APP_URL` | ✅ | 填生产域名，如 `https://paperflow.vercel.app`（先填 Vercel 默认域名，绑自定义域名后可改） |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 项目 → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 同上 → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | 同上 → service_role（保密） |
| `ANTHROPIC_API_KEY` | ✅ | [Anthropic Console](https://console.anthropic.com) → API Keys |
| `INNGEST_EVENT_KEY` | ✅ | [Inngest Dashboard](https://app.inngest.com) → 选 App → Keys |
| `INNGEST_SIGNING_KEY` | ✅ | 同上 → Signing Key（生产用） |
| `CLERK_SECRET_KEY` | ✅ | [Clerk Dashboard](https://dashboard.clerk.com) → API Keys |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | ✅ | 同上 |
| `STRIPE_SECRET_KEY` | ✅ | [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | ✅ | 见第 5 步（先部署拿到 URL 再配 Webhook） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ | Stripe → API keys → Publishable key |
| `STRIPE_PRO_MONTHLY_PRICE_ID` | ✅ | Stripe → Products → 你的 Pro 月付 Price ID |
| `STRIPE_PRO_YEARLY_PRICE_ID` | ✅ | Pro 年付 Price ID |
| `STRIPE_TEAM_PRICE_ID` | ✅ | Team Price ID（可与 Pro 同价占位） |
| `UPSTASH_REDIS_REST_URL` | ✅ | [Upstash](https://console.upstash.com) → 你的 Redis → REST API → URL |
| `UPSTASH_REDIS_REST_TOKEN` | ✅ | 同上 → Token |
| `NEXT_PUBLIC_POSTHOG_KEY` | 建议 | [PostHog](https://us.posthog.com) → Project → Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | 建议 | 同上 → Host，如 `https://us.i.posthog.com` |
| `RESEND_API_KEY` | 可选 | [Resend](https://resend.com) → API Keys |
| `RESEND_FROM_EMAIL` | 可选 | 已验证发信域名，如 `PaperFlow <onboarding@yourdomain.com>` |
| `LEAD_NOTIFY_EMAIL` | 可选 | 接收等待列表的邮箱 |
| `SENTRY_DSN` | 可选 | [Sentry](https://sentry.io) → Project → Settings → DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | 可选 | 同上（前端错误） |
| `SENTRY_ORG` / `SENTRY_PROJECT` | 可选 | Sentry 组织与项目 slug（用于 source map 上传） |
| `SENTRY_AUTH_TOKEN` | 可选 | Sentry → Auth Tokens（上传 source map 用） |

- [ ] 所有必填项填好后，保存
- [ ] 在 Vercel 项目里触发 **Redeploy**（或完成第 2 步的 Deploy），确保使用最新环境变量

---

## 第 4 步：Supabase 生产库

- [ ] 若与开发共用同一 Supabase 项目：确认所有 migrations 已跑（Supabase Dashboard → SQL Editor 或 `supabase db push`）
- [ ] 若新建生产项目：新建项目后，在 SQL Editor 中按顺序执行 `supabase/migrations/` 下所有 `.sql` 文件
- [ ] 确认 `users`、`courses`、`chapters`、`user_progress`、`subscriptions` 等表存在

---

## 第 5 步：Stripe Webhook（生产）

- [ ] 部署完成后，拿到生产域名，例如 `https://your-app.vercel.app`
- [ ] Stripe Dashboard → **Developers → Webhooks → Add endpoint**
  - **Endpoint URL**：`https://你的生产域名/api/stripe/webhook`
  - **Events to send**：勾选 `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.payment_succeeded`（按你实际 webhook 代码里用到的选）
- [ ] 创建后点击 **Reveal** signing secret，复制
- [ ] 在 Vercel **Environment Variables** 中把 `STRIPE_WEBHOOK_SECRET` 设为该值，保存后 **Redeploy** 一次

---

## 第 6 步：Clerk 生产

- [ ] Clerk Dashboard → 你的应用 → **Configure → Paths**（或 Domains）
- [ ] 添加生产域名（如 `your-app.vercel.app` 或自定义域名）
- [ ] **Settings → URLs**：Sign-in URL、Sign-up URL、After sign-in / sign-up 等可保持默认或指向生产路径（如 `https://你的域名/dashboard`）
- [ ] 确认生产环境用的是 **Production** 下的 API Keys（第 3 步里填的应是 Production 的 Key）

---

## 第 7 步：Inngest 生产

- [ ] Inngest Dashboard → 你的 App → **Sync** 或 **Environment**
- [ ] 添加 Production 环境，**App URL** 填 `https://你的生产域名/api/inngest`
- [ ] 确认 Production 使用的 **Signing Key** 已填入 Vercel 的 `INNGEST_SIGNING_KEY`

---

## 第 8 步：域名与 SSL（可选）

- [ ] Vercel 项目 → **Settings → Domains** → **Add** 你的域名
- [ ] 按提示在域名服务商处添加 CNAME 或 A 记录
- [ ] 验证通过后，Vercel 自动提供 HTTPS
- [ ] 若有自定义域名，回到 Vercel **Environment Variables**，把 `NEXT_PUBLIC_APP_URL` 改为 `https://你的自定义域名`，再 Redeploy

---

## 第 9 步：Resend 发信（可选）

- [ ] Resend → **Domains** 添加并验证你的发信域名（MX / SPF 等）
- [ ] 验证通过后，在 Vercel 中设置 `RESEND_FROM_EMAIL`、`LEAD_NOTIFY_EMAIL`，Redeploy

---

## 第 10 步：冒烟测试

在生产环境按顺序做一遍，确认无 5xx 或关键功能报错：

- [ ] **健康检查**：打开 `https://你的域名/api/health`，应返回 `200` 且 `db: "ok"`、`env: "production"`
- [ ] **首页**：打开首页，能看到落地页和示例课程（若已有发布课程）
- [ ] **注册/登录**：用 Clerk 注册或登录，能进 `/dashboard`
- [ ] **生成课程**：在 `/generate` 填一篇论文 URL（如一篇 arXiv），选难度，提交；轮询到完成后跳转到课程页
- [ ] **学习路径**：进入课程 → 打开某一章 → 标记完成 / 提交测验（若有）
- [ ] **订阅**：在 `/pricing` 或 `/settings` 点击升级 → 跳 Stripe Checkout；付测试卡或取消后，回到设置页能看到「Manage subscription」
- [ ] **等待列表**：首页「Get early access」填邮箱提交，若配了 Resend，应收到或在你填的 `LEAD_NOTIFY_EMAIL` 收到一封通知

---

## 第 11 步：上线后检查

- [ ] Stripe Webhook 的 **Recent deliveries** 里能看到 200，无大量 4xx/5xx
- [ ] Inngest 控制台里能看到生产环境的 run（若你刚触发过生成）
- [ ] PostHog（若已配）能看到生产环境事件
- [ ] Sentry（若已配）无异常飙升

---

## 常见问题

- **健康检查 503**：多半是 DB 或必填 env 未配；看响应里的 `missing` 或 `db` 字段。
- **Stripe Webhook 签名失败**：确认 `STRIPE_WEBHOOK_SECRET` 是**生产** Webhook 的 signing secret，且未多复制空格。
- **Clerk 登录后 404 / 跳错**：检查 Clerk 里生产域名和 Redirect URLs 是否包含当前域名与路径。
- **Inngest 不触发**：确认生产 App URL 为 `https://域名/api/inngest`，且 `INNGEST_SIGNING_KEY` 为生产 Signing Key。

完成以上步骤后，生产环境即可对外使用。预生成示例课程、Demo 视频等可按 `deployment-readiness.md` 在之后迭代。
