import "server-only";
import { redis } from "@/lib/shared/cache";
import { CacheKeys } from "@/lib/shared/cache";

const MAX_HISTORY = 20;

export async function addSearchHistory(userId: string, wsId: string, query: string): Promise<void> {
  const key = CacheKeys.searchHistory(userId, wsId);
  await redis.lpush(key, query);
  await redis.ltrim(key, 0, MAX_HISTORY - 1);
}

export async function getSearchHistory(userId: string, wsId: string): Promise<string[]> {
  const key = CacheKeys.searchHistory(userId, wsId);
  const items = await redis.lrange<string>(key, 0, MAX_HISTORY - 1);
  // De-duplicate while preserving order
  return [...new Set(items)];
}

export async function clearSearchHistory(userId: string, wsId: string): Promise<void> {
  const key = CacheKeys.searchHistory(userId, wsId);
  await redis.del(key);
}
