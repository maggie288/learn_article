import { Ratelimit } from "@upstash/ratelimit";
import { getRedisClient } from "@/lib/cache/upstash";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
}

const fallbackStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(key: string, limit: number): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "1 h"),
      analytics: false,
      prefix: "paperflow",
    });

    const result = await ratelimit.limit(key);

    return {
      allowed: result.success,
      limit,
      remaining: result.remaining,
      resetAt: new Date(result.reset).toISOString(),
    };
  }

  const now = Date.now();
  const existing = fallbackStore.get(key);

  if (!existing || existing.resetAt <= now) {
    fallbackStore.set(key, {
      count: 1,
      resetAt: now + 60 * 60 * 1000,
    });

    return {
      allowed: true,
      limit,
      remaining: Math.max(limit - 1, 0),
      resetAt: new Date(now + 60 * 60 * 1000).toISOString(),
    };
  }

  existing.count += 1;
  fallbackStore.set(key, existing);

  return {
    allowed: existing.count <= limit,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: new Date(existing.resetAt).toISOString(),
  };
}

/** 按自然日限流（例如 Pro 用户短视频导出 5 次/天）. */
export async function checkRateLimitDaily(
  key: string,
  limit: number,
): Promise<RateLimitResult> {
  const redis = getRedisClient();

  if (redis) {
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "24 h"),
      analytics: false,
      prefix: "paperflow:d",
    });

    const result = await ratelimit.limit(key);
    return {
      allowed: result.success,
      limit,
      remaining: result.remaining,
      resetAt: new Date(result.reset).toISOString(),
    };
  }

  const now = Date.now();
  const existing = fallbackStore.get(`d:${key}`);
  const dayMs = 24 * 60 * 60 * 1000;
  if (!existing || existing.resetAt <= now) {
    fallbackStore.set(`d:${key}`, { count: 1, resetAt: now + dayMs });
    return { allowed: true, limit, remaining: Math.max(limit - 1, 0), resetAt: new Date(now + dayMs).toISOString() };
  }
  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    limit,
    remaining: Math.max(limit - existing.count, 0),
    resetAt: new Date(existing.resetAt).toISOString(),
  };
}
