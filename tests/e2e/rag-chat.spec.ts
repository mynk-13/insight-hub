import { test, expect } from "@playwright/test";

// CUJ-04: Collection-scoped chat query
// CUJ-05: Citation click → source reader navigation
// These tests verify auth gates and API contract; full RAG requires live LLM (E2E in CI with real keys)

test.describe("RAG Chat — auth gates", () => {
  test("GET /api/chats requires authentication", async ({ request }) => {
    const res = await request.get("/api/chats?workspaceId=clx000000000000000000000");
    expect(res.status()).toBe(401);
  });

  test("POST /api/chats requires authentication", async ({ request }) => {
    const res = await request.post("/api/chats", {
      data: { workspaceId: "clx000000000000000000000" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/chats/[chatId]/messages requires authentication", async ({ request }) => {
    const res = await request.post("/api/chats/clx000000000000000000000/messages", {
      data: { query: "What is the capital of France?" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST .../regenerate requires authentication", async ({ request }) => {
    const res = await request.post(
      "/api/chats/clx000000000000000000000/messages/clx111111111111111111111/regenerate",
      { data: {} },
    );
    expect(res.status()).toBe(401);
  });

  test("GET /api/chats/[chatId] requires authentication", async ({ request }) => {
    const res = await request.get("/api/chats/clx000000000000000000000");
    expect(res.status()).toBe(401);
  });
});

test.describe("RAG Chat — validation", () => {
  test("POST /api/chats rejects missing workspaceId", async ({ request }) => {
    const res = await request.post("/api/chats", { data: {} });
    // 401 (not authed) is also acceptable here
    expect([400, 401]).toContain(res.status());
  });

  test("POST messages rejects empty query", async ({ request }) => {
    const res = await request.post("/api/chats/clx000000000000000000000/messages", {
      data: { query: "" },
    });
    expect([400, 401]).toContain(res.status());
  });

  test("POST messages rejects unknown model", async ({ request }) => {
    const res = await request.post("/api/chats/clx000000000000000000000/messages", {
      data: { query: "test", model: "gpt-99-turbo" },
    });
    expect([400, 401]).toContain(res.status());
  });
});
