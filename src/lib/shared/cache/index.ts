import { Redis } from "@upstash/redis";

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Singleton Redis client — shared by cache, queue, and idempotency modules.
// @upstash/redis is HTTP-based and edge-compatible; no TCP connection at construction time.
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? "http://localhost",
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? "",
});

class UpstashCache implements CacheClient {
  constructor(private readonly client: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value as Parameters<typeof this.client.set>[1], {
        ex: ttlSeconds,
      });
    } else {
      await this.client.set(key, value as Parameters<typeof this.client.set>[1]);
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count > 0;
  }
}

export const cache: CacheClient = new UpstashCache(redis);

// Cache key schema — single source of truth for all Redis key patterns.
// Changing a key here changes it everywhere; grep CacheKeys to find all usages.
export const CacheKeys = {
  workspaceMeta: (wsId: string) => `ws:meta:${wsId}`,
  rateLimit: (identifier: string) => `ratelimit:${identifier}`,
  embedCache: (contentHash: string) => `embed:cache:${contentHash}`,
  gatewayHealth: (gateway: string) => `gateway:health:${gateway}`,
  sessionUser: (userId: string) => `session:user:${userId}`,
  sessionKick: (userId: string) => `session:kick:${userId}`,
  roleChanged: (userId: string, wsId: string) => `role-changed:${userId}:${wsId}`,
  idempotency: (key: string) => `idempotency:${key}`,
  jobQueue: (queueName: string) => `queue:${queueName}`,
  searchHistory: (userId: string, wsId: string) => `search:history:${userId}:${wsId}`,
} as const;
