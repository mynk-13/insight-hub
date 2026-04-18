import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Sliding window: 10 sign-in attempts per IP per 10 minutes
const authLimiter = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(10, "10 m"),
  prefix: "ratelimit:auth",
});

// 5 magic-link requests per email per hour
const magicLinkLimiter = new Ratelimit({
  redis: new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }),
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  prefix: "ratelimit:magic",
});

export async function checkAuthRateLimit(
  ip: string,
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await authLimiter.limit(ip);
  return { success, remaining };
}

export async function checkMagicLinkRateLimit(
  email: string,
): Promise<{ success: boolean; remaining: number }> {
  const { success, remaining } = await magicLinkLimiter.limit(email);
  return { success, remaining };
}
