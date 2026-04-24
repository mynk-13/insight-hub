import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class MockStripe {
    constructor(_k: string, _o?: unknown) {}
  },
}));
vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    constructor(_o?: unknown) {}
  },
}));
vi.mock("@/lib/modules/billing/adapters/stripe", () => ({
  StripeAdapter: class {
    gateway = "STRIPE" as const;
  },
}));
vi.mock("@/lib/modules/billing/adapters/razorpay", () => ({
  RazorpayAdapter: class {
    gateway = "RAZORPAY" as const;
  },
}));
vi.mock("@/lib/modules/billing/adapters/paypal", () => ({
  PayPalAdapter: class {
    gateway = "PAYPAL" as const;
  },
}));
vi.mock("@/lib/modules/billing/adapters/billdesk", () => ({
  BillDeskAdapter: class {
    gateway = "BILLDESK" as const;
  },
}));
vi.mock("@/lib/shared/circuit-breaker", () => ({
  CircuitBreaker: class {
    constructor(_name: string, _opts?: unknown) {}
    async execute(fn: () => unknown) {
      return fn();
    }
  },
}));

const mockCacheGet = vi.fn();
vi.mock("@/lib/shared/cache", () => ({
  cache: { get: mockCacheGet, set: vi.fn(), del: vi.fn() },
  CacheKeys: { gatewayHealth: (gw: string) => `gateway:health:${gw}` },
  redis: {},
}));

describe("selectGateway", () => {
  beforeEach(() => {
    vi.resetModules();
    mockCacheGet.mockReset();
  });

  it("returns STRIPE for non-India country codes", async () => {
    mockCacheGet.mockResolvedValue(null);
    const { selectGateway } = await import("@/lib/modules/billing/router");
    expect(await selectGateway("US")).toBe("STRIPE");
  });

  it("returns RAZORPAY for India (IN)", async () => {
    mockCacheGet.mockResolvedValue(null);
    const { selectGateway } = await import("@/lib/modules/billing/router");
    expect(await selectGateway("IN")).toBe("RAZORPAY");
  });

  it("returns STRIPE when no country code provided", async () => {
    mockCacheGet.mockResolvedValue(null);
    const { selectGateway } = await import("@/lib/modules/billing/router");
    expect(await selectGateway(undefined)).toBe("STRIPE");
  });

  it("skips unhealthy STRIPE and falls back to PAYPAL", async () => {
    mockCacheGet.mockImplementation(async (key: string) => {
      if (key === "gateway:health:STRIPE") return { healthy: false, checkedAt: Date.now() };
      return null;
    });
    const { selectGateway } = await import("@/lib/modules/billing/router");
    expect(await selectGateway("US")).toBe("PAYPAL");
  });

  it("returns chain[0] when all gateways are unhealthy", async () => {
    mockCacheGet.mockResolvedValue({ healthy: false, checkedAt: Date.now() });
    const { selectGateway } = await import("@/lib/modules/billing/router");
    expect(await selectGateway("IN")).toBe("RAZORPAY");
  });
});

describe("getAdapter", () => {
  it("returns adapter for each known gateway", async () => {
    const { getAdapter } = await import("@/lib/modules/billing/router");
    expect(getAdapter("STRIPE").gateway).toBe("STRIPE");
    expect(getAdapter("RAZORPAY").gateway).toBe("RAZORPAY");
    expect(getAdapter("PAYPAL").gateway).toBe("PAYPAL");
    expect(getAdapter("BILLDESK").gateway).toBe("BILLDESK");
  });

  it("throws for unknown gateway", async () => {
    const { getAdapter } = await import("@/lib/modules/billing/router");
    expect(() => getAdapter("UNKNOWN")).toThrow();
  });
});
