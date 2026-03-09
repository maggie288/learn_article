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
  OPENAI_API_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_PRO_MONTHLY_PRICE_ID: z.string().optional(),
  STRIPE_PRO_YEARLY_PRICE_ID: z.string().optional(),
  STRIPE_TEAM_PRICE_ID: z.string().optional(),
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().optional(),
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrl,
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  ENGINE_PYTHON_URL: optionalUrl,
});

export type AppEnv = z.infer<typeof envSchema>;

export const serverEnv = envSchema.parse({
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  STRIPE_PRO_MONTHLY_PRICE_ID: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  STRIPE_PRO_YEARLY_PRICE_ID: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  STRIPE_TEAM_PRICE_ID: process.env.STRIPE_TEAM_PRICE_ID,
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  INNGEST_EVENT_KEY: process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY: process.env.INNGEST_SIGNING_KEY,
  ENGINE_PYTHON_URL: process.env.ENGINE_PYTHON_URL,
});

const phaseOneRequiredKeys = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "ANTHROPIC_API_KEY",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
] as const;

export function getMissingEnvKeys() {
  return phaseOneRequiredKeys.filter((key) => !serverEnv[key]);
}

export function getEnvSummary() {
  const missing = getMissingEnvKeys();

  return {
    appEnv: serverEnv.NEXT_PUBLIC_APP_ENV,
    missing,
    ready: missing.length === 0,
  };
}

export function isClerkConfigured() {
  return Boolean(
    serverEnv.CLERK_SECRET_KEY && serverEnv.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
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

export function isPostHogConfigured() {
  return Boolean(
    serverEnv.NEXT_PUBLIC_POSTHOG_KEY && serverEnv.NEXT_PUBLIC_POSTHOG_HOST,
  );
}
