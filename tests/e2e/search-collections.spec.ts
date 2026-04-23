import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Search API — auth gates", () => {
  test("GET /api/search returns 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/search?q=test&workspace=any`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/search returns 400 without required query params", async ({ request }) => {
    // Missing q param
    const res = await request.get(`${BASE_URL}/api/search?workspace=test`);
    expect(res.status()).toBe(401); // Auth checked first
  });

  test("GET /api/search/history returns 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/search/history?workspace=any`);
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/search/history returns 401 without session", async ({ request }) => {
    const res = await request.delete(`${BASE_URL}/api/search/history?workspace=any`);
    expect(res.status()).toBe(401);
  });
});

test.describe("Collections API — auth gates", () => {
  test("GET /api/workspaces/[slug]/collections returns 401 without session", async ({
    request,
  }) => {
    const res = await request.get(`${BASE_URL}/api/workspaces/test-ws/collections`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/workspaces/[slug]/collections returns 401 without session", async ({
    request,
  }) => {
    const res = await request.post(`${BASE_URL}/api/workspaces/test-ws/collections`, {
      data: { name: "My Collection" },
    });
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/workspaces/[slug]/collections/[id] returns 401 without session", async ({
    request,
  }) => {
    const res = await request.patch(`${BASE_URL}/api/workspaces/test-ws/collections/fake-id`, {
      data: { name: "Renamed" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/workspaces/[slug]/collections/[id] returns 401 without session", async ({
    request,
  }) => {
    const res = await request.delete(`${BASE_URL}/api/workspaces/test-ws/collections/fake-id`);
    expect(res.status()).toBe(401);
  });

  test("POST /api/workspaces/[slug]/collections/[id]/sources returns 401 without session", async ({
    request,
  }) => {
    const res = await request.post(
      `${BASE_URL}/api/workspaces/test-ws/collections/fake-id/sources`,
      {
        data: { sourceId: "fake-source-id" },
      },
    );
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/workspaces/[slug]/collections/[id]/sources/[sourceId] returns 401 without session", async ({
    request,
  }) => {
    const res = await request.delete(
      `${BASE_URL}/api/workspaces/test-ws/collections/fake-id/sources/fake-source-id`,
    );
    expect(res.status()).toBe(401);
  });

  test("PATCH /api/workspaces/[slug]/collections/reorder returns 401 without session", async ({
    request,
  }) => {
    const res = await request.patch(`${BASE_URL}/api/workspaces/test-ws/collections/reorder`, {
      data: { ids: [] },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/workspaces/[slug]/tags returns 401 without session", async ({ request }) => {
    const res = await request.get(`${BASE_URL}/api/workspaces/test-ws/tags`);
    expect(res.status()).toBe(401);
  });
});

test.describe("Search page — unauthenticated redirect", () => {
  test("search page redirects to signin without session", async ({ page }) => {
    await page.goto(`${BASE_URL}/ws/test-ws/search`);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("collections page redirects to signin without session", async ({ page }) => {
    await page.goto(`${BASE_URL}/ws/test-ws/collections`);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });

  test("collection detail page redirects to signin without session", async ({ page }) => {
    await page.goto(`${BASE_URL}/ws/test-ws/collections/fake-id`);
    await expect(page).toHaveURL(/\/auth\/signin/);
  });
});
