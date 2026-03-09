import { getRedisClient } from "@/lib/cache/upstash";

export async function getJsonCache<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const value = await redis.get<T>(key);
  return value ?? null;
}

export async function setJsonCache<T>(key: string, value: T, ttlSeconds: number) {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  await redis.set(key, value, {
    ex: ttlSeconds,
  });
}

export async function deleteCacheKeys(keys: string[]) {
  const redis = getRedisClient();
  if (!redis || keys.length === 0) {
    return;
  }

  await redis.del(...keys);
}
