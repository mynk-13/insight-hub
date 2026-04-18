// Redis cache client stub — wired to Upstash in Phase 4
// This module provides the interface; concrete implementation follows REQ-08

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}

// Placeholder no-op cache used before Upstash is wired (Phase 4)
class NoopCache implements CacheClient {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }
  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {}
  async del(_key: string): Promise<void> {}
  async exists(_key: string): Promise<boolean> {
    return false;
  }
}

export const cache: CacheClient = new NoopCache();

// Cache key schema — prevents collisions across modules
export const CacheKeys = {
  workspaceMeta: (wsId: string) => `ws:meta:${wsId}`,
  rateLimit: (identifier: string) => `ratelimit:${identifier}`,
  embedCache: (contentHash: string) => `embed:cache:${contentHash}`,
  gatewayHealth: (gateway: string) => `gateway:health:${gateway}`,
  sessionUser: (userId: string) => `session:user:${userId}`,
} as const;
