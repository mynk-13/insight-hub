import { test, expect } from "@playwright/test";

// CUJ-13: Export workspace
// CUJ-14: Delete workspace
// These tests verify auth gates and API contract without real DB/Redis.

test.describe("analytics API — auth gates", () => {
  test("GET /api/workspaces/test/analytics returns 401 when unauthenticated", async ({
    request,
  }) => {
    const res = await request.get("/api/workspaces/test/analytics");
    expect(res.status()).toBe(401);
  });

  test("GET /api/workspaces/test/analytics/export returns 401 when unauthenticated", async ({
    request,
  }) => {
    const res = await request.get("/api/workspaces/test/analytics/export?widget=queryVolume");
    expect(res.status()).toBe(401);
  });
});

test.describe("export API — auth gates", () => {
  test("POST /api/workspaces/test/export returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/workspaces/test/export", {
      data: { format: "zip" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/workspaces/test/export/job123 returns 401 when unauthenticated", async ({
    request,
  }) => {
    const res = await request.get("/api/workspaces/test/export/job123");
    expect(res.status()).toBe(401);
  });

  test("POST /api/workspaces/test/purge returns 401 when unauthenticated", async ({ request }) => {
    const res = await request.post("/api/workspaces/test/purge", {
      data: { confirmation: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/workspaces/test/restore returns 401 when unauthenticated", async ({
    request,
  }) => {
    const res = await request.post("/api/workspaces/test/restore");
    expect(res.status()).toBe(401);
  });
});

test.describe("audit log API — auth gates", () => {
  test("GET /api/workspaces/test/audit-logs returns 401 when unauthenticated", async ({
    request,
  }) => {
    const res = await request.get("/api/workspaces/test/audit-logs");
    expect(res.status()).toBe(401);
  });
});

test.describe("export job worker — auth gate", () => {
  test("POST /api/jobs/export returns 401 without cron secret", async ({ request }) => {
    const res = await request.post("/api/jobs/export");
    expect(res.status()).toBe(401);
  });
});

test.describe("export — invalid widget validation", () => {
  test("GET analytics/export with missing widget param returns 401 (no auth)", async ({
    request,
  }) => {
    const res = await request.get("/api/workspaces/test/analytics/export");
    expect(res.status()).toBe(401);
  });
});
