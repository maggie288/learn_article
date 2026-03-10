import { z } from "zod";

// 构建时 Vercel 可能把未填的变量当成空字符串 ""，.url() 会报错；先当空为 undefined
const optionalUrl = z.preprocess(
  (val) => (val === "" || val == null ? undefined : val),
  z.string().url().optional(),
);

const envSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  MINIMAX_API_KEY: z.string().optional(),
  /** 国内开放平台用 https://api.minimaxi.com，海外默认 https://api.minimax.io */
  MINIMAX_API_BASE: z.string().optional(),
  /** Coding Plan 请用 MiniMax-M2.5；不填默认 MiniMax-M2.5 */
  MINIMAX_MODEL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  LLM_STRATEGY: z.enum(["first", "cheapest"]).optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  NEXTAUTH_URL: optionalUrl,
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_TEAM_PRICE_ID: z.string().optional(),
  USDT_TRC20_WALLET_ADDRESS: z.string().optional(),
  USDT_AMOUNT_PRO_MONTHLY: z.string().optional().transform((v) => v?.trim() || "15"),
  USDT_AMOUNT_PRO_YEARLY: z.string().optional().transform((v) => v?.trim() || "150"),
  USDT_AMOUNT_TEAM: z.string().optional().transform((v) => v?.trim() || "30"),
  PROMO_ALL_PLANS_FREE: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  /** 为 true 时 narrator 步骤发到自建 worker，主应用用 waitForEvent 等结果 */
  INNGEST_USE_WORKER: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
  ENGINE_PYTHON_URL: optionalUrl,
  ELEVENLABS_API_KEY: z.string().optional(),
  /** Mathpix 数学公式 OCR（Layer 1 可选）：PDF 中公式转 LaTeX */
  MATHPIX_APP_ID: z.string().optional(),
  MATHPIX_APP_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

export const serverEnv = envSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
  MINIMAX_API_BASE: process.env.MINIMAX_API_BASE,
  MINIMAX_MODEL: process.env.MINIMAX_MODEL,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LLM_STRATEGY: process.env.LLM_STRATEGY,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  STRIPE_TEAM_PRICE_ID: process.env.STRIPE_TEAM_PRICE_ID,
  USDT_TRC20_WALLET_ADDRESS: process.env.USDT_TRC20_WALLET_ADDRESS,
  USDT_AMOUNT_PRO_MONTHLY: process.env.USDT_AMOUNT_PRO_MONTHLY,
  USDT_AMOUNT_PRO_YEARLY: process.env.USDT_AMOUNT_PRO_YEARLY,
  USDT_AMOUNT_TEAM: process.env.USDT_AMOUNT_TEAM,
  PROMO_ALL_PLANS_FREE: process.env.PROMO_ALL_PLANS_FREE,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  INNGEST_USE_WORKER: process.env.INNGEST_USE_WORKER,
  ENGINE_PYTHON_URL: process.env.ENGINE_PYTHON_URL,
  ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
  MATHPIX_APP_ID: process.env.MATHPIX_APP_ID,
  MATHPIX_APP_KEY: process.env.MATHPIX_APP_KEY,
});

const phaseOneRequiredKeys = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
] as const;

/** 配置 MINIMAX_API_KEY 才视为 LLM 就绪 */
const hasLlmKey = () => Boolean(serverEnv.MINIMAX_API_KEY?.trim());

export function getMissingEnvKeys(): string[] {
  const missing: string[] = phaseOneRequiredKeys.filter((key) => !serverEnv[key as keyof AppEnv]);
  if (!hasLlmKey()) {
    missing.push("MINIMAX_API_KEY");
  }
  return missing;
}

export function getEnvSummary() {
  const missing = getMissingEnvKeys();

  return {
    appEnv: serverEnv.NEXT_PUBLIC_APP_ENV,
    missing,
    ready: missing.length === 0,
  };
}

export function isAuthConfigured() {
  return Boolean(
    serverEnv.NEXTAUTH_SECRET && serverEnv.NEXTAUTH_SECRET.length > 0,
  );
}

export function isUpstashConfigured() {
  return Boolean(serverEnv.UPSTASH_REDIS_REST_URL && serverEnv.UPSTASH_REDIS_REST_TOKEN);
}

export function isStripeConfigured() {
  return Boolean(
    serverEnv.STRIPE_SECRET_KEY &&
      serverEnv.STRIPE_WEBHOOK_SECRET &&
      serverEnv.STRIPE_PRO_MONTHLY_PRICE_ID &&
      serverEnv.STRIPE_PRO_YEARLY_PRICE_ID &&
      serverEnv.STRIPE_TEAM_PRICE_ID,
  );
}

export function getUsdtWalletAddress() {
  return serverEnv.USDT_TRC20_WALLET_ADDRESS?.trim() || null;
}

export function getUsdtAmountForPlan(plan: "pro-monthly" | "pro-yearly" | "team"): string {
  switch (plan) {
    case "pro-monthly":
      return serverEnv.USDT_AMOUNT_PRO_MONTHLY;
    case "pro-yearly":
      return serverEnv.USDT_AMOUNT_PRO_YEARLY;
    case "team":
      return serverEnv.USDT_AMOUNT_TEAM;
  }
}

export function isPromoAllPlansFree() {
  return Boolean(serverEnv.PROMO_ALL_PLANS_FREE);
}

export function isPostHogConfigured() {
  return Boolean(
    serverEnv.NEXT_PUBLIC_POSTHOG_KEY && serverEnv.NEXT_PUBLIC_POSTHOG_HOST,
  );
}
