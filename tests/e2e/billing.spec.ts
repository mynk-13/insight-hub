import { test, expect } from "@playwright/test";

test.describe("Billing API — auth gates", () => {
  test("POST /api/billing/checkout requires auth", async ({ request }) => {
    const res = await request.post("/api/billing/checkout", {
      data: { workspaceSlug: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/billing/cancel requires auth", async ({ request }) => {
    const res = await request.post("/api/billing/cancel", {
      data: { workspaceSlug: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/billing/status requires auth", async ({ request }) => {
    const res = await request.get("/api/billing/status?slug=test");
    expect(res.status()).toBe(401);
  });

  test("GET /api/billing/portal requires auth", async ({ request }) => {
    const res = await request.get("/api/billing/portal?slug=test");
    expect(res.status()).toBe(401);
  });
});

test.describe("Billing webhooks — reject invalid signatures", () => {
  test("POST /api/billing/webhooks/stripe rejects bad signature", async ({ request }) => {
    const res = await request.post("/api/billing/webhooks/stripe", {
      data: JSON.stringify({ type: "checkout.session.completed" }),
      headers: {
        "content-type": "application/json",
        "stripe-signature": "bad_signature",
      },
    });
    expect([400, 500]).toContain(res.status());
  });

  test("POST /api/billing/webhooks/razorpay rejects missing signature", async ({ request }) => {
    const res = await request.post("/api/billing/webhooks/razorpay", {
      data: JSON.stringify({ event: "subscription.activated" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("POST /api/billing/webhooks/billdesk returns 501", async ({ request }) => {
    const res = await request.post("/api/billing/webhooks/billdesk", {
      data: "{}",
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(501);
  });
});

test.describe("Reconciliation cron — requires secret", () => {
  test("POST /api/jobs/reconcile rejects without cron secret", async ({ request }) => {
    const res = await request.post("/api/jobs/reconcile");
    expect(res.status()).toBe(401);
  });
});
