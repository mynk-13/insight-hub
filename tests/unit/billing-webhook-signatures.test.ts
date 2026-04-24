import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({
  default: class MockStripe {
    apiVersion = "2026-04-22.dahlia";
    webhooks = {
      constructEvent: vi.fn(() => {
        throw new Error("Invalid signature");
      }),
    };
    constructor(_key: string, _opts?: unknown) {}
  },
}));
vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    constructor(_opts?: unknown) {}
  },
}));

describe("Stripe webhook signature verification", () => {
  it("returns false when stripe-signature header is missing", async () => {
    const { StripeAdapter } = await import("@/lib/modules/billing/adapters/stripe");
    const adapter = new StripeAdapter();
    expect(adapter.verifyWebhookSignature("body", {})).toBe(false);
  });

  it("returns false when stripe throws on invalid signature", async () => {
    const { StripeAdapter } = await import("@/lib/modules/billing/adapters/stripe");
    const adapter = new StripeAdapter();
    expect(adapter.verifyWebhookSignature("body", { "stripe-signature": "bad" })).toBe(false);
  });
});

describe("Razorpay webhook signature verification", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_key";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "webhook_secret";
  });

  it("returns false when x-razorpay-signature header is missing", async () => {
    const { RazorpayAdapter } = await import("@/lib/modules/billing/adapters/razorpay");
    const adapter = new RazorpayAdapter();
    expect(adapter.verifyWebhookSignature("body", {})).toBe(false);
  });

  it("returns false for wrong signature", async () => {
    const { RazorpayAdapter } = await import("@/lib/modules/billing/adapters/razorpay");
    const adapter = new RazorpayAdapter();
    expect(
      adapter.verifyWebhookSignature("body", { "x-razorpay-signature": "deadbeef".repeat(8) }),
    ).toBe(false);
  });

  it("returns true for correct HMAC-SHA256 signature", async () => {
    const { RazorpayAdapter } = await import("@/lib/modules/billing/adapters/razorpay");
    const adapter = new RazorpayAdapter();
    const body = JSON.stringify({ event: "subscription.activated" });
    const sig = crypto.createHmac("sha256", "webhook_secret").update(body).digest("hex");
    expect(adapter.verifyWebhookSignature(body, { "x-razorpay-signature": sig })).toBe(true);
  });

  it("returns true for placeholder secret (dev mode)", async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = "razorpay_webhook_placeholder";
    const { RazorpayAdapter } = await import("@/lib/modules/billing/adapters/razorpay");
    const adapter = new RazorpayAdapter();
    expect(adapter.verifyWebhookSignature("any", {})).toBe(true);
  });
});

describe("PayPal webhook signature", () => {
  it("returns true for dev placeholder", async () => {
    process.env.PAYPAL_WEBHOOK_ID = "dev_placeholder";
    const { PayPalAdapter } = await import("@/lib/modules/billing/adapters/paypal");
    const adapter = new PayPalAdapter();
    expect(adapter.verifyWebhookSignature("body", {})).toBe(true);
  });
});

describe("BillDesk adapter stub", () => {
  it("verifyWebhookSignature always returns false", async () => {
    const { BillDeskAdapter } = await import("@/lib/modules/billing/adapters/billdesk");
    const adapter = new BillDeskAdapter();
    expect(adapter.verifyWebhookSignature("body", {})).toBe(false);
  });

  it("createSubscription throws", async () => {
    const { BillDeskAdapter } = await import("@/lib/modules/billing/adapters/billdesk");
    const adapter = new BillDeskAdapter();
    await expect(adapter.createSubscription({} as never)).rejects.toThrow();
  });
});
