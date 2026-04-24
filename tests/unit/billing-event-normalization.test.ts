import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("stripe", () => ({ default: vi.fn().mockImplementation(() => ({})) }));
vi.mock("razorpay", () => ({ default: vi.fn().mockImplementation(() => ({})) }));

describe("StripeAdapter.normalizeEvent", () => {
  it("maps checkout.session.completed to subscription.activated", async () => {
    const { StripeAdapter } = await import("@/lib/modules/billing/adapters/stripe");
    const adapter = new StripeAdapter();
    const event = {
      id: "evt_test",
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_123",
          metadata: { workspaceId: "ws_abc" },
        },
      },
    };
    const result = adapter.normalizeEvent(event);
    expect(result?.type).toBe("subscription.activated");
    expect(result?.gatewaySubId).toBe("sub_123");
    expect(result?.gateway).toBe("STRIPE");
    expect(result?.workspaceId).toBe("ws_abc");
  });

  it("maps invoice.payment_failed to payment.failed", async () => {
    const { StripeAdapter } = await import("@/lib/modules/billing/adapters/stripe");
    const adapter = new StripeAdapter();
    const event = {
      id: "evt_fail",
      type: "invoice.payment_failed",
      data: { object: { subscription: "sub_456", lines: { data: [] } } },
    };
    const result = adapter.normalizeEvent(event);
    expect(result?.type).toBe("payment.failed");
    expect(result?.gatewaySubId).toBe("sub_456");
  });

  it("returns null for unknown event type", async () => {
    const { StripeAdapter } = await import("@/lib/modules/billing/adapters/stripe");
    const adapter = new StripeAdapter();
    const result = adapter.normalizeEvent({
      id: "evt",
      type: "unknown.event",
      data: { object: {} },
    });
    expect(result).toBeNull();
  });
});

describe("RazorpayAdapter.normalizeEvent", () => {
  beforeEach(() => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_x";
    process.env.RAZORPAY_KEY_SECRET = "sec";
    process.env.RAZORPAY_WEBHOOK_SECRET = "whs";
  });

  it("maps subscription.activated", async () => {
    const { RazorpayAdapter } = await import("@/lib/modules/billing/adapters/razorpay");
    const adapter = new RazorpayAdapter();
    const payload = {
      event: "subscription.activated",
      payload: {
        subscription: {
          entity: {
            id: "sub_rzp_1",
            notes: { workspaceId: "ws_rzp" },
            current_start: 1700000000,
            current_end: 1702592000,
          },
        },
      },
    };
    const result = adapter.normalizeEvent(payload);
    expect(result?.type).toBe("subscription.activated");
    expect(result?.gatewaySubId).toBe("sub_rzp_1");
    expect(result?.workspaceId).toBe("ws_rzp");
    expect(result?.gateway).toBe("RAZORPAY");
  });

  it("returns null for unknown Razorpay event", async () => {
    const { RazorpayAdapter } = await import("@/lib/modules/billing/adapters/razorpay");
    const adapter = new RazorpayAdapter();
    const result = adapter.normalizeEvent({
      event: "unknown",
      payload: { subscription: { entity: { id: "x" } } },
    });
    expect(result).toBeNull();
  });
});

describe("PayPalAdapter.normalizeEvent", () => {
  it("maps BILLING.SUBSCRIPTION.ACTIVATED", async () => {
    const { PayPalAdapter } = await import("@/lib/modules/billing/adapters/paypal");
    const adapter = new PayPalAdapter();
    const payload = {
      id: "WH-123",
      event_type: "BILLING.SUBSCRIPTION.ACTIVATED",
      resource: { id: "I-sub-paypal", custom_id: "ws_pp" },
    };
    const result = adapter.normalizeEvent(payload);
    expect(result?.type).toBe("subscription.activated");
    expect(result?.gateway).toBe("PAYPAL");
    expect(result?.workspaceId).toBe("ws_pp");
  });

  it("maps BILLING.SUBSCRIPTION.CANCELLED to subscription.canceled", async () => {
    const { PayPalAdapter } = await import("@/lib/modules/billing/adapters/paypal");
    const adapter = new PayPalAdapter();
    const payload = {
      id: "WH-456",
      event_type: "BILLING.SUBSCRIPTION.CANCELLED",
      resource: { id: "I-sub-2", custom_id: "ws_2" },
    };
    const result = adapter.normalizeEvent(payload);
    expect(result?.type).toBe("subscription.canceled");
  });
});
