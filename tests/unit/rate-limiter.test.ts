import { describe, it, expect, vi, beforeEach } from "vitest";

const mockAuthLimit = vi.fn();
const mockMagicLimit = vi.fn();

// Call counts track which limiter is being used
let instanceCount = 0;

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn(function MockRedis() {
    // constructor — no-op for tests
  }),
}));

vi.mock("@upstash/ratelimit", () => {
  function MockRatelimit(this: { limit: typeof vi.fn }) {
    instanceCount++;
    // First instance = authLimiter, second = magicLinkLimiter
    this.limit = instanceCount === 1 ? mockAuthLimit : mockMagicLimit;
  }
  MockRatelimit.slidingWindow = vi.fn().mockReturnValue({});
  return { Ratelimit: MockRatelimit };
});

// Import AFTER mocks are in place
const { checkAuthRateLimit, checkMagicLinkRateLimit } =
  await import("@/lib/modules/auth/rate-limiter");

describe("checkAuthRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success=true when under limit", async () => {
    mockAuthLimit.mockResolvedValue({ success: true, remaining: 9 });
    const result = await checkAuthRateLimit("127.0.0.1");
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(9);
    expect(mockAuthLimit).toHaveBeenCalledWith("127.0.0.1");
  });

  it("returns success=false when limit exceeded", async () => {
    mockAuthLimit.mockResolvedValue({ success: false, remaining: 0 });
    const result = await checkAuthRateLimit("192.168.0.1");
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });
});

describe("checkMagicLinkRateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success=true when under limit", async () => {
    mockMagicLimit.mockResolvedValue({ success: true, remaining: 4 });
    const result = await checkMagicLinkRateLimit("user@example.com");
    expect(result.success).toBe(true);
    expect(mockMagicLimit).toHaveBeenCalledWith("user@example.com");
  });

  it("returns success=false when limit exceeded", async () => {
    mockMagicLimit.mockResolvedValue({ success: false, remaining: 0 });
    const result = await checkMagicLinkRateLimit("user@example.com");
    expect(result.success).toBe(false);
  });
});
