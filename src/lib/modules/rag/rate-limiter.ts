import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Free tier: 50 queries per 30 days; Pro: 2000 per day
const FREE_WINDOW = "30 d";
const FREE_LIMIT = 50;
const PRO_WINDOW = "1 d";
const PRO_LIMIT = 2000;

function getRedis(): Redis {
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
}

export async function checkChatRateLimit(
  workspaceId: string,
  isPro: boolean,
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const redis = getRedis();

  const limiter = isPro
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(PRO_LIMIT, PRO_WINDOW),
        prefix: "chat:pro",
      })
    : new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(FREE_LIMIT, FREE_WINDOW),
        prefix: "chat:free",
      });

  const { success, remaining, reset } = await limiter.limit(workspaceId);
  return { allowed: success, remaining, reset };
}
