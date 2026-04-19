import { describe, it, expect } from "vitest";
import { CacheKeys } from "@/lib/shared/cache";

describe("CacheKeys schema", () => {
  it("workspaceMeta uses ws:meta prefix", () => {
    expect(CacheKeys.workspaceMeta("abc")).toBe("ws:meta:abc");
  });

  it("rateLimit uses ratelimit prefix", () => {
    expect(CacheKeys.rateLimit("127.0.0.1")).toBe("ratelimit:127.0.0.1");
  });

  it("embedCache uses embed:cache prefix", () => {
    const hash = "sha256:abc123";
    expect(CacheKeys.embedCache(hash)).toBe(`embed:cache:${hash}`);
  });

  it("gatewayHealth uses gateway:health prefix", () => {
    expect(CacheKeys.gatewayHealth("stripe")).toBe("gateway:health:stripe");
  });

  it("sessionUser uses session:user prefix", () => {
    expect(CacheKeys.sessionUser("user-1")).toBe("session:user:user-1");
  });

  it("sessionKick uses session:kick prefix", () => {
    expect(CacheKeys.sessionKick("user-2")).toBe("session:kick:user-2");
  });

  it("roleChanged encodes both userId and wsId", () => {
    expect(CacheKeys.roleChanged("user-1", "ws-1")).toBe("role-changed:user-1:ws-1");
  });

  it("idempotency uses idempotency prefix", () => {
    expect(CacheKeys.idempotency("req-uuid-123")).toBe("idempotency:req-uuid-123");
  });

  it("jobQueue uses queue prefix", () => {
    expect(CacheKeys.jobQueue("ingestion")).toBe("queue:ingestion");
  });

  it("each key generator produces unique namespaces", () => {
    const id = "same-id";
    const keys = [
      CacheKeys.workspaceMeta(id),
      CacheKeys.rateLimit(id),
      CacheKeys.embedCache(id),
      CacheKeys.gatewayHealth(id),
      CacheKeys.sessionUser(id),
      CacheKeys.sessionKick(id),
      CacheKeys.idempotency(id),
      CacheKeys.jobQueue(id),
    ];
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });
});
