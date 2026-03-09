# 一步步发布生产

按顺序执行，每步打勾后再进行下一步。遇到问题可对照 `deployment-readiness.md` 与各服务文档。

---

## 各服务在哪里注册 / 登录

| 服务 | 注册与登录入口 | 说明 |
|------|----------------|------|
| **Stripe** | [https://dashboard.stripe.com](https://dashboard.stripe.com) | 用邮箱注册；第 5 步配 Webhook 在 **Developers → Webhooks** |
| **Clerk** | [https://dashboard.clerk.com](https://dashboard.clerk.com) | 用 GitHub/邮箱注册；第 6 步配生产域名在 **你的应用 → Configure → Domains** |
| **Inngest** | [https://app.inngest.com](https://app.inngest.com) | 用 GitHub 登录；第 7 步配生产环境在 **你的 App → Environments** 或 **Sync** |

注册后，API Key / Signing Key 等都在各自 Dashboard 里按上文第 3、5、6、7 步的路径获取。

---

## 后端是什么？Supabase 要自己部署吗？

- **本项目的「后端」**：就是 Next.js 里的 **API 路由**（`src/app/api/*`，例如 `/api/health`、`/api/courses/generate`、`/api/stripe/webhook` 等）。它们和前端页面**一起**跑在 **Vercel** 上，没有单独一台“后端服务器”。所以：**部署后端 = 在 Vercel 部署本项目**（第 2 步导入仓库并 Deploy）。部署完成后，前端和 API 都在同一个生产域名下（例如 `https://xxx.vercel.app`）。
- **Supabase 不是你要部署的东西**：Supabase 是**托管服务**（数据库在 Supabase 云端）。你只需要：
  1. 在 [Supabase 官网](https://supabase.com) **新建一个项目**（第 4 步），
  2. 在 Supabase 的 **SQL Editor** 里**执行本仓库的迁移 SQL**（建表），
  3. 在 Supabase 的 **Settings → API** 里**复制 Project URL 和密钥**，填到 Vercel 的环境变量里。  
  之后，Vercel 上跑着的 Next.js（你的“后端”）会用这些密钥去**连接** Supabase 的数据库，读写数据。你不需要自己装数据库、也不需要在某台机器上“部署 Supabase”。

总结：**你只需要部署一次 Vercel**（第 2 步 + 环境变量）；Supabase / Clerk / Stripe 等都是在它们自己的云端，你只做「注册 → 拿密钥 → 填到 Vercel」即可。

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

## 第 4 步：Supabase 生产库（详细）

> 若你**开发和生产共用同一个 Supabase 项目**，可跳过 4.1～4.2，直接从 **4.3** 拿 API 与密钥，再确认 **4.4～4.5** 的迁移已跑过、表存在即可。

### 4.1 注册与登录

- [ ] 打开 [https://supabase.com](https://supabase.com)，点击 **Start your project**
- [ ] 使用 GitHub / GitLab / 邮箱 登录或注册（推荐用 GitHub 一键登录）
- [ ] 登录后进入 **Dashboard**（项目列表页）

### 4.2 新建项目（生产库）

- [ ] 点击 **New project**
- [ ] **Organization**：选默认或你建好的组织
- [ ] **Name**：填项目名，例如 `learn-article-prod` 或 `paperflow-production`
- [ ] **Database Password**：为数据库设置一个**强密码**（务必保存到密码管理器；后续用 Service Role Key 连库，一般不会再用这个密码，但重置会麻烦）
- [ ] **Region**：选离你用户最近的区域（如 `Northeast Asia (Tokyo)`、`West US` 等）
- [ ] 点击 **Create new project**，等待约 1～2 分钟，状态变为 **Active**

### 4.3 拿到 API 地址和密钥（给 Vercel 用）

- [ ] 在项目里左侧点 **Project Settings**（齿轮图标）
- [ ] 左侧选 **API**
- [ ] 在 **Project URL** 处复制地址，即 `NEXT_PUBLIC_SUPABASE_URL`（形如 `https://xxxxx.supabase.co`）
- [ ] **Project API keys** 里：
  - **anon public**：复制，即 `NEXT_PUBLIC_SUPABASE_ANON_KEY`（可暴露在前端）
  - **service_role**：点击 **Reveal** 后复制，即 `SUPABASE_SERVICE_ROLE_KEY`（仅服务端、绝不要暴露到前端）
- [ ] 把这三个值填到 **Vercel → 项目 → Settings → Environment Variables** 的 Production 中（若第 3 步还没填 Supabase 相关变量，在这里补上）

### 4.4 执行数据库迁移（建表）

本仓库的迁移文件在 `supabase/migrations/`，需**按文件名顺序**执行下面三个文件里的 SQL。

**方式 A：在 Supabase 网页里用 SQL Editor 执行（推荐，无需装 CLI）**

- [ ] 在 Supabase 项目左侧点 **SQL Editor**
- [ ] 点击 **New query**

**第一个文件：`20260309000000_initial_schema.sql`**

- [ ] 打开你本地的 `supabase/migrations/20260309000000_initial_schema.sql`，**全选并复制**全部内容
- [ ] 在 SQL Editor 里粘贴，点击 **Run**（或 Ctrl/Cmd + Enter）
- [ ] 确认底部显示 **Success**，无报错

**第二个文件：`20260309010000_generation_tasks.sql`**

- [ ] 打开 `supabase/migrations/20260309010000_generation_tasks.sql`，全选复制
- [ ] SQL Editor 里 **New query**，粘贴后 **Run**，确认 Success

**第三个文件：`20260309020000_add_clerk_user_id.sql`**

- [ ] 打开 `supabase/migrations/20260309020000_add_clerk_user_id.sql`，全选复制
- [ ] SQL Editor 里 **New query**，粘贴后 **Run**，确认 Success

**方式 B：用 Supabase CLI（本地已安装 CLI 时）**

- [ ] 终端里：`npx supabase link --project-ref 你的项目ID`（项目 ID 在 Settings → General → Reference ID）
- [ ] 按提示输入数据库密码（4.2 步设的）
- [ ] 执行：`npx supabase db push`
- [ ] 看到迁移成功提示即可

### 4.5 确认表已建好

- [ ] 在 Supabase 左侧点 **Table Editor**
- [ ] 确认能看到以下表（名称可能带 schema，在 `public` 下）：
  - `users`、`subscriptions`、`usage_quotas`、`sources`、`courses`、`chapters`、`concepts`、`concept_edges`、`user_progress`、`user_achievements`、`user_favorites`、`generation_tasks` 等
- [ ] 或用 **SQL Editor** 执行下面语句，应返回一列表名：
  ```sql
  select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE'
  order by table_name;
  ```

### 4.6 小结

- [ ] Supabase 项目已创建并处于 Active
- [ ] 已把 **Project URL**、**anon key**、**service_role key** 填到 Vercel 环境变量
- [ ] 三个迁移文件均已成功执行，表结构齐全
- [ ] 若第 3 步时还没填 Supabase 变量，填好后在 Vercel 里 **Redeploy** 一次

---

## 第 5 步：Stripe Webhook（生产）

- **在哪里操作**：登录 [Stripe Dashboard](https://dashboard.stripe.com) → 左侧 **Developers** → **Webhooks** → **Add endpoint**（若还没有生产 Webhook）
- [ ] 部署完成后，拿到生产域名，例如 `https://your-app.vercel.app`
- [ ] 在 Webhooks 页点击 **Add endpoint**
  - **Endpoint URL**：`https://你的生产域名/api/stripe/webhook`
  - **Events to send**：勾选 `checkout.session.completed`、`customer.subscription.updated`、`customer.subscription.deleted`、`invoice.payment_succeeded`（按你实际 webhook 代码里用到的选）
- [ ] 创建后点击 **Reveal** signing secret，复制
- [ ] 在 Vercel **Environment Variables** 中把 `STRIPE_WEBHOOK_SECRET` 设为该值，保存后 **Redeploy** 一次

---

## 第 6 步：Clerk 生产（详细）

- **在哪里操作**：登录 [Clerk Dashboard](https://dashboard.clerk.com) → 选中你的应用 → 左侧 **Configure** → 先 **Domains**，再 **Paths**。

### 6.1 Domains

- [ ] 在 **Domains** 里点 **Add domain**，填你的生产域名（如 `your-app.vercel.app` 或自定义域名 `www.xxx.com`），保存。

### 6.2 Paths 怎么填（本仓库用弹窗登录，无单独登录页）

本项目的登录是 **Header 里的「Sign in」按钮 → Clerk 弹窗**，没有单独的 `/sign-in`、`/sign-up` 页面，所以 Paths 可以尽量从简。

| 区块 | 字段 | 建议填法 |
|------|------|----------|
| **Development host** | Fallback development host | 本地开发用，填 `http://localhost:3000` 即可。 |
| **Application paths** | Home URL | 留空（表示首页在根路径 `/`）；或填 `/`。 |
| | Unauthorized sign in URL | 留空；或填 `/`（设备未授权时跳回首页）。 |
| **Component paths**（Sign-in / Sign-up / Signing out） | Sign-in page on development host | 留空即可（当前用弹窗，不用独立登录页）。若以后做了 `/sign-in` 页面，再改成 `/sign-in`。 |
| | Sign-up page on development host | 同上，留空或以后填 `/sign-up`。 |
| | Signing out → Page on development host | 填 **`/`**（登出后回到首页）。 |

说明：

- **Sign-in page on Account Portal**、**Sign-up page on Account Portal** 是 Clerk 自带的托管页，不用改。
- 若 Clerk 提示 “Setting component paths via the Dashboard will be deprecated”，之后可以按文档在代码里用 `signInUrl` / `signUpUrl` / `afterSignOutUrl` 配置，当前在 Dashboard 这样填即可。
- 生产环境访问时，Clerk 会认你在 **Domains** 里加的生产域名；Paths 里的 “development host” 主要影响本地和「从外部发起的」功能（如模拟登录），本地用 `http://localhost:3000` 即可。

### 6.3 登录后跳转（可选）

若希望用户登录后直接进仪表盘：在 **Paths** 或 **Sessions** 相关设置里找 “After sign-in URL” / “Redirect URL”，填 `https://你的域名/dashboard`（或留空用代码里的默认行为）。本仓库若未在代码里写死，Clerk 默认可能跳到 `/`，你可在需要时再改。

### 6.4 确认 API Keys（解决 “Missing publishableKey” 必做）

- [ ] 在 Clerk 左侧 **API Keys**，确认右上角环境选 **Production**，复制：
  - **Publishable key**（形如 `pk_live_xxxx`）→ 对应 Vercel 变量名：**`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`**
  - **Secret key**（形如 `sk_live_xxxx`）→ 对应 Vercel 变量名：**`CLERK_SECRET_KEY`**
- [ ] 在 **Vercel** → 你的项目 → **Settings** → **Environment Variables** 中新增/核对：
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` = 上面复制的 Publishable key（**Production** 必勾）
  - `CLERK_SECRET_KEY` = 上面复制的 Secret key（**Production** 必勾）
- [ ] 保存后到 **Deployments** → 最新部署右侧 **⋯** → **Redeploy**（改完 `NEXT_PUBLIC_*` 必须重新部署才会生效）。

---

## 第 7 步：Inngest 生产

- **在哪里操作**：登录 [Inngest Dashboard](https://app.inngest.com) → 选中你的 App（或 **Create app** 新建）→ 左侧 **Manage** → **Environments**（或 **Sync**），为生产环境填 App URL 和查看 Signing Key
- [ ] 添加或编辑 **Production** 环境，**App URL** 填 `https://你的生产域名/api/inngest`
- [ ] 确认该环境使用的 **Signing Key** 已填入 Vercel 的 `INNGEST_SIGNING_KEY`

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

## Vercel 部署失败：是代码还是配置？

- **先本地跑一遍构建**：在项目根目录执行 `npm run build`。若**本地 build 通过**，则当前代码没问题，Vercel 失败多半是**配置或环境**（见下）。若**本地 build 就报错**，则是代码问题，按报错修代码后再推送。
- **Vercel 上怎么看报错**：Vercel 项目 → **Deployments** → 点进失败的那次部署 → 看 **Building** 或 **Logs** 里**红色报错**（例如 `Error: ...`、`ZodError`、`Failed to collect page data`）。把最后几行错误贴给协作者或按提示排查。
- **常见配置原因**：
  1. **环境变量**：Vercel 的 **Settings → Environment Variables** 里，Production 是否把必填项都填了？若某变量在 Vercel 里是「空」或未填，构建阶段可能报错（本项目已对可选 URL 做兼容，未填的 URL 变量不会导致 build 失败）。
  2. **Node 版本**：Vercel 默认 Node 18+，一般无需改。若报错和 Node 有关，可在 **Settings → General → Node.js Version** 选 20。
  3. **构建命令**：保持默认 `npm run build`（即 `next build`），不要改成 `npm run dev` 等。

结论：**本地 `npm run build` 成功 + Vercel 失败 → 优先按上面看 Vercel 日志，并检查环境变量与 Node 版本。**

---

## 常见问题

- **健康检查 503**：多半是 DB 或必填 env 未配；看响应里的 `missing` 或 `db` 字段。
- **Stripe Webhook 签名失败**：确认 `STRIPE_WEBHOOK_SECRET` 是**生产** Webhook 的 signing secret，且未多复制空格。
- **Clerk 登录后 404 / 跳错**：检查 Clerk 里生产域名和 Redirect URLs 是否包含当前域名与路径。
- **Inngest 不触发**：确认生产 App URL 为 `https://域名/api/inngest`，且 `INNGEST_SIGNING_KEY` 为生产 Signing Key。

完成以上步骤后，生产环境即可对外使用。预生成示例课程、Demo 视频等可按 `deployment-readiness.md` 在之后迭代。
