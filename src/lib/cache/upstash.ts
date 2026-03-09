import { Redis } from "@upstash/redis";
import { isUpstashConfigured, serverEnv } from "@/lib/env";

let redis: Redis | null = null;

export function getRedisClient() {
  if (!isUpstashConfigured()) {
    return null;
  }

  if (!redis) {
    redis = new Redis({
      url: serverEnv.UPSTASH_REDIS_REST_URL!,
      token: serverEnv.UPSTASH_REDIS_REST_TOKEN!,
    });
  }

  return redis;
}
