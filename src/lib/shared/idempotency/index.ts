import "server-only";
import { NextResponse } from "next/server";
import { cache, CacheKeys } from "@/lib/shared/cache";

const TTL_SECONDS = 86_400; // 24 hours

interface CachedResponse {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

// Wraps a mutation handler with idempotency semantics.
// If the request carries an Idempotency-Key header and that key was seen
// within the last 24 hours, the original response is replayed verbatim.
// Requests without the header pass through unchanged.
export async function withIdempotency(
  req: Request,
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const key = req.headers.get("Idempotency-Key");
  if (!key) return handler();

  const cacheKey = CacheKeys.idempotency(key);
  const cached = await cache.get<CachedResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached.body, {
      status: cached.status,
      headers: { "X-Idempotent-Replayed": "true", ...cached.headers },
    });
  }

  const response = await handler();
  const cloned = response.clone();
  const body = await cloned.json().catch(() => null);

  await cache.set(cacheKey, { status: response.status, body }, TTL_SECONDS);

  return response;
}
