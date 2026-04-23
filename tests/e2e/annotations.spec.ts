import { test, expect } from "@playwright/test";

// CUJ-10: Annotations & Notifications — auth gate and API validation

test.describe("annotation API auth gates", () => {
  test("GET /api/sources/:id/annotations requires auth", async ({ request }) => {
    const res = await request.get("/api/sources/fake-source-id/annotations");
    expect(res.status()).toBe(401);
  });

  test("POST /api/sources/:id/annotations requires auth", async ({ request }) => {
    const res = await request.post("/api/sources/fake-source-id/annotations", {
      data: { anchor: { text: "hello", start: 0, end: 5 }, color: "yellow" },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/sources/:id/annotations/:aid requires auth", async ({ request }) => {
    const res = await request.patch("/api/sources/fake-source-id/annotations/fake-ann-id", {
      data: { content: "updated" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/sources/:id/annotations/:aid requires auth", async ({ request }) => {
    const res = await request.delete("/api/sources/fake-source-id/annotations/fake-ann-id");
    expect(res.status()).toBe(401);
  });

  test("POST .../replies requires auth", async ({ request }) => {
    const res = await request.post("/api/sources/fake-source-id/annotations/fake-ann-id/replies", {
      data: { content: "reply" },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH .../resolve requires auth", async ({ request }) => {
    const res = await request.patch("/api/sources/fake-source-id/annotations/fake-ann-id/resolve");
    expect(res.status()).toBe(401);
  });

  test("POST .../reactions requires auth", async ({ request }) => {
    const res = await request.post(
      "/api/sources/fake-source-id/annotations/fake-ann-id/reactions",
      { data: { emoji: "👍" } },
    );
    expect(res.status()).toBe(401);
  });
});

test.describe("notification API auth gates", () => {
  test("GET /api/notifications requires auth", async ({ request }) => {
    const res = await request.get("/api/notifications?workspace=test");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/notifications requires auth (mark all read)", async ({ request }) => {
    const res = await request.patch("/api/notifications?workspace=test");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/notifications/:id requires auth", async ({ request }) => {
    const res = await request.patch("/api/notifications/fake-notif-id");
    expect(res.status()).toBe(401);
  });

  test("GET /api/notifications/preferences requires auth", async ({ request }) => {
    const res = await request.get("/api/notifications/preferences");
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/notifications/preferences requires auth", async ({ request }) => {
    const res = await request.patch("/api/notifications/preferences", {
      data: { type: "MENTION", email: false },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("annotation API validation", () => {
  test("POST /api/sources/:id/annotations with invalid body returns 401 (not logged in)", async ({
    request,
  }) => {
    const res = await request.post("/api/sources/fake/annotations", {
      data: {},
    });
    expect(res.status()).toBe(401);
  });

  test("POST .../reactions with invalid emoji returns 401 (not logged in)", async ({ request }) => {
    const res = await request.post("/api/sources/fake/annotations/fake-ann/reactions", {
      data: { emoji: "invalid" },
    });
    expect(res.status()).toBe(401);
  });
});
