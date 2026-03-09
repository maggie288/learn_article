# 一步步发布生产

按顺序执行，每步打勾后再进行下一步。遇到问题可对照 `deployment-readiness.md` 与各服务文档。

---

## 各服务在哪里注册 / 登录

| 服务 | 注册与登录入口 | 说明 |
|------|----------------|------|
| **Inngest** | [https://app.inngest.com](https://app.inngest.com) | 用 GitHub 登录；第 6 步配生产环境在 **你的 App → Environments** 或 **Sync** |
| **Supabase** | [https://supabase.com](https://supabase.com) | 数据库托管；第 4 步建项目、执行迁移、拿 API 与密钥 |
| **Upstash** | [https://console.upstash.com](https://console.upstash.com) | Redis（限流/缓存）；在 Console 建库后拿 REST URL 与 Token |

**认证与支付**：本项目使用 **NextAuth 邮箱+密码登录**（无需 Clerk）；订阅使用 **USDT (TRC20)** 收款，无需 Stripe。NEXTAUTH_SECRET 自行生成，USDT 收款地址填到环境变量即可（见第 3 步）。

---

## 后端是什么？Supabase 要自己部署吗？

- **本项目的「后端」**：就是 Next.js 里的 **API 路由**（`src/app/api/*`，例如 `/api/health`、`/api/courses/generate`、`/api/auth/register` 等）。它们和前端页面**一起**跑在 **Vercel** 上，没有单独一台“后端服务器”。所以：**部署后端 = 在 Vercel 部署本项目**（第 2 步导入仓库并 Deploy）。部署完成后，前端和 API 都在同一个生产域名下（例如 `https://xxx.vercel.app`）。
- **Supabase 不是你要部署的东西**：Supabase 是**托管服务**（数据库在 Supabase 云端）。你只需要：
  1. 在 [Supabase 官网](https://supabase.com) **新建一个项目**（第 4 步），
  2. 在 Supabase 的 **SQL Editor** 里**执行本仓库的迁移 SQL**（建表），
  3. 在 Supabase 的 **Settings → API** 里**复制 Project URL 和密钥**，填到 Vercel 的环境变量里。  
  之后，Vercel 上跑着的 Next.js（你的“后端”）会用这些密钥去**连接** Supabase 的数据库，读写数据。你不需要自己装数据库、也不需要在某台机器上“部署 Supabase”。

总结：**你只需要部署一次 Vercel**（第 2 步 + 环境变量）；Supabase / Inngest / Upstash 等都是在它们自己的云端，你只做「注册 → 拿密钥 → 填到 Vercel」即可。

---

## 第 0 步：本地预检（约 5 分钟）

- [ ] 代码已提交到 Git，无未提交的敏感信息（`.env`、`.env.local` 已在 `.gitignore`，不要提交）
- [ ] 本地构建通过：
  ```bash
  npm ci
  npm run build
  ```
- [ ] 本地跑一遍关键流程（可选）：邮箱注册 → 登录 → 生成页提交一篇 → 看章节 → 测验 → 设置页 / 定价页 USDT 说明

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
| `NEXTAUTH_SECRET` | ✅ | **自行生成**：终端执行 `openssl rand -base64 32`，将输出整行复制填入（至少 32 字符，勿泄露、勿提交 Git） |
| `NEXTAUTH_URL` | 建议 | 填生产站点根地址，如 `https://你的项目.vercel.app`（不要末尾斜杠）；不填则 NextAuth 会从请求推断 |
| `UPSTASH_REDIS_REST_URL` | 建议 | [Upstash](https://console.upstash.com) → 你的 Redis → REST API → URL（限流等） |
| `UPSTASH_REDIS_REST_TOKEN` | 建议 | 同上 → Token |
| `USDT_TRC20_WALLET_ADDRESS` | 可选 | 你的 TRON (TRC20) 收款地址（T 开头的 34 位）；不填则定价页只显示「请配置」提示 |
| `NEXT_PUBLIC_POSTHOG_KEY` | 可选 | [PostHog](https://us.posthog.com) → Project → Project API Key |
| `NEXT_PUBLIC_POSTHOG_HOST` | 可选 | 同上 → Host，如 `https://us.i.posthog.com` |
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

本仓库的迁移文件在 `supabase/migrations/`，需**按文件名顺序**执行下面四个文件里的 SQL。

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

**第四个文件：`20260309100000_add_password_hash.sql`**

- [ ] 打开 `supabase/migrations/20260309100000_add_password_hash.sql`，全选复制
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
- [ ] 四个迁移文件均已成功执行，表结构齐全
- [ ] 若第 3 步时还没填 Supabase 变量，填好后在 Vercel 里 **Redeploy** 一次

---

## 第 5 步：NextAuth 与 USDT（生产）

本项目使用 **NextAuth 邮箱+密码** 登录，订阅使用 **USDT (TRC20)** 收款，无需 Stripe / Clerk。

### 5.1 NEXTAUTH_SECRET 与 NEXTAUTH_URL

- [ ] **NEXTAUTH_SECRET**（第 3 步环境变量表已说明）：在本地终端执行 `openssl rand -base64 32`，将输出整行复制，在 Vercel **Environment Variables** 中设为 `NEXTAUTH_SECRET`。生产与本地可各用不同值，勿泄露、勿提交 Git。
- [ ] **NEXTAUTH_URL**：在 Vercel 中设为生产站点根地址，如 `https://你的项目.vercel.app`（不要末尾斜杠）。若使用自定义域名，改为 `https://你的自定义域名`。

### 5.2 USDT 收款地址（可选）

- [ ] 若有 TRON (TRC20) 钱包，将收款地址（T 开头的 34 位）填到 Vercel 的 `USDT_TRC20_WALLET_ADDRESS`。不填则定价页会显示「请配置 USDT_TRC20_WALLET_ADDRESS」提示；填好后定价页会展示该地址与「复制地址」、说明文案。
- [ ] 用户订阅流程：用户到 **定价页** 查看 USDT 地址与说明，自行转账；到账后你可根据约定人工在 Supabase 的 `subscriptions` 表或后台为对应用户开通 Pro/Team，或后续对接「我已支付」表单与核对逻辑。

---

## 第 6 步：Inngest 生产

- **在哪里操作**：登录 [Inngest Dashboard](https://app.inngest.com) → 选中你的 App（或 **Create app** 新建）→ 左侧 **Manage** → **Environments**（或 **Sync**），为生产环境填 App URL 和查看 Signing Key
- [ ] 添加或编辑 **Production** 环境，**App URL** 填 `https://你的生产域名/api/inngest`
- [ ] 确认该环境使用的 **Signing Key** 已填入 Vercel 的 `INNGEST_SIGNING_KEY`

---

## 第 7 步：域名与 SSL（可选）

- [ ] Vercel 项目 → **Settings → Domains** → **Add** 你的域名
- [ ] 按提示在域名服务商处添加 CNAME 或 A 记录
- [ ] 验证通过后，Vercel 自动提供 HTTPS
- [ ] 若有自定义域名，回到 Vercel **Environment Variables**，把 `NEXT_PUBLIC_APP_URL` 改为 `https://你的自定义域名`，再 Redeploy

---

## 第 8 步：Resend 发信（可选）

- [ ] Resend → **Domains** 添加并验证你的发信域名（MX / SPF 等）
- [ ] 验证通过后，在 Vercel 中设置 `RESEND_FROM_EMAIL`、`LEAD_NOTIFY_EMAIL`，Redeploy

---

## 第 9 步：冒烟测试

在生产环境按顺序做一遍，确认无 5xx 或关键功能报错：

- [ ] **健康检查**：打开 `https://你的域名/api/health`，应返回 `200` 且 `db: "ok"`、`env: "production"`
- [ ] **首页**：打开首页，能看到落地页和示例课程（若已有发布课程）
- [ ] **注册/登录**：在 `/register` 用邮箱+密码注册，在 `/login` 登录，登录后能进 `/dashboard`
- [ ] **生成课程**：在 `/generate` 填一篇论文 URL（如一篇 arXiv），选难度，提交；轮询到完成后跳转到课程页
- [ ] **学习路径**：进入课程 → 打开某一章 → 标记完成 / 提交测验（若有）
- [ ] **订阅说明**：在 `/pricing` 应看到「使用 USDT 订阅」区块（若已配 `USDT_TRC20_WALLET_ADDRESS` 则显示收款地址与复制按钮）；在 `/settings` 能看到「订阅管理」与前往定价页链接
- [ ] **等待列表**：首页「Get early access」填邮箱提交，若配了 Resend，应收到或在你填的 `LEAD_NOTIFY_EMAIL` 收到一封通知

---

## 第 10 步：上线后检查

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
- **登录页报错或无法登录**：确认 Vercel 中已设置 `NEXTAUTH_SECRET`（`openssl rand -base64 32` 生成）和 `NEXTAUTH_URL`（生产域名，如 `https://你的项目.vercel.app`）。
- **Inngest 不触发**：确认生产 App URL 为 `https://域名/api/inngest`，且 `INNGEST_SIGNING_KEY` 为生产 Signing Key。

完成以上步骤后，生产环境即可对外使用。预生成示例课程、Demo 视频等可按 `deployment-readiness.md` 在之后迭代。
