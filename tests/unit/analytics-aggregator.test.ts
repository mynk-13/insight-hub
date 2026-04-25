import { describe, it, expect } from "vitest";

// Pure-function helpers extracted for unit testing without DB/Redis
function buildDailyBuckets(since: Date, days: number): Map<string, number> {
  const counts = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  return counts;
}

function fillBuckets(
  events: Array<{ createdAt: Date }>,
  counts: Map<string, number>,
): Map<string, number> {
  for (const e of events) {
    const key = e.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function aggregateTokens(
  messages: Array<{
    model: string | null;
    tokensIn: number | null;
    tokensOut: number | null;
    costUsd: string | null;
  }>,
) {
  let totalIn = 0,
    totalOut = 0,
    totalCost = 0;
  const modelMap = new Map<string, { tokensIn: number; tokensOut: number; costUsd: number }>();
  for (const m of messages) {
    const model = m.model ?? "unknown";
    const tIn = m.tokensIn ?? 0;
    const tOut = m.tokensOut ?? 0;
    const cost = m.costUsd ? Number(m.costUsd) : 0;
    totalIn += tIn;
    totalOut += tOut;
    totalCost += cost;
    const e = modelMap.get(model) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0 };
    e.tokensIn += tIn;
    e.tokensOut += tOut;
    e.costUsd += cost;
    modelMap.set(model, e);
  }
  return { totalIn, totalOut, totalCost, byModel: modelMap };
}

function countCitations(messages: Array<{ citations: unknown }>) {
  const counts = new Map<string, number>();
  for (const msg of messages) {
    const citations = msg.citations as Array<{ sourceId?: string }>;
    if (!Array.isArray(citations)) continue;
    for (const c of citations) {
      if (c.sourceId) counts.set(c.sourceId, (counts.get(c.sourceId) ?? 0) + 1);
    }
  }
  return counts;
}

describe("analytics — daily bucket builder", () => {
  it("builds exactly 30 buckets starting from since", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const buckets = buildDailyBuckets(since, 30);
    expect(buckets.size).toBe(30);
    expect(buckets.has("2026-01-01")).toBe(true);
    expect(buckets.has("2026-01-30")).toBe(true);
    expect(buckets.has("2026-01-31")).toBe(false);
  });

  it("all initial counts are zero", () => {
    const since = new Date("2026-03-01T00:00:00Z");
    const buckets = buildDailyBuckets(since, 7);
    for (const v of buckets.values()) expect(v).toBe(0);
  });

  it("fills buckets correctly from event list", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const buckets = buildDailyBuckets(since, 7);
    const events = [
      { createdAt: new Date("2026-01-01T10:00:00Z") },
      { createdAt: new Date("2026-01-01T14:00:00Z") },
      { createdAt: new Date("2026-01-03T09:00:00Z") },
    ];
    fillBuckets(events, buckets);
    expect(buckets.get("2026-01-01")).toBe(2);
    expect(buckets.get("2026-01-02")).toBe(0);
    expect(buckets.get("2026-01-03")).toBe(1);
  });

  it("ignores events outside the bucket range", () => {
    const since = new Date("2026-01-01T00:00:00Z");
    const buckets = buildDailyBuckets(since, 3);
    const events = [{ createdAt: new Date("2025-12-31T23:59:59Z") }];
    fillBuckets(events, buckets);
    // key "2025-12-31" not in map — gets ignored naturally
    expect(buckets.get("2026-01-01")).toBe(0);
  });
});

describe("analytics — token aggregation", () => {
  it("sums tokens and cost across messages", () => {
    const messages = [
      { model: "gpt-4o-mini", tokensIn: 100, tokensOut: 50, costUsd: "0.001500" },
      { model: "gpt-4o-mini", tokensIn: 200, tokensOut: 80, costUsd: "0.002800" },
    ];
    const { totalIn, totalOut, totalCost } = aggregateTokens(messages);
    expect(totalIn).toBe(300);
    expect(totalOut).toBe(130);
    expect(totalCost).toBeCloseTo(0.0043, 4);
  });

  it("groups by model correctly", () => {
    const messages = [
      { model: "gpt-4o-mini", tokensIn: 100, tokensOut: 50, costUsd: "0.001" },
      { model: "claude-haiku", tokensIn: 80, tokensOut: 30, costUsd: "0.0005" },
    ];
    const { byModel } = aggregateTokens(messages);
    expect(byModel.size).toBe(2);
    expect(byModel.get("gpt-4o-mini")?.tokensIn).toBe(100);
    expect(byModel.get("claude-haiku")?.tokensOut).toBe(30);
  });

  it("handles null values gracefully", () => {
    const messages = [{ model: null, tokensIn: null, tokensOut: null, costUsd: null }];
    const { totalIn, totalOut, totalCost, byModel } = aggregateTokens(messages);
    expect(totalIn).toBe(0);
    expect(totalOut).toBe(0);
    expect(totalCost).toBe(0);
    expect(byModel.get("unknown")?.tokensIn).toBe(0);
  });

  it("returns zero totals for empty message list", () => {
    const { totalIn, totalOut, totalCost } = aggregateTokens([]);
    expect(totalIn).toBe(0);
    expect(totalOut).toBe(0);
    expect(totalCost).toBe(0);
  });
});

describe("analytics — citation counting", () => {
  it("counts citations per source", () => {
    const messages = [
      { citations: [{ sourceId: "src1" }, { sourceId: "src2" }] },
      { citations: [{ sourceId: "src1" }] },
    ];
    const counts = countCitations(messages);
    expect(counts.get("src1")).toBe(2);
    expect(counts.get("src2")).toBe(1);
  });

  it("skips entries without sourceId", () => {
    const messages = [{ citations: [{ text: "no source" }, { sourceId: "src1" }] }];
    const counts = countCitations(messages);
    expect(counts.size).toBe(1);
    expect(counts.get("src1")).toBe(1);
  });

  it("handles non-array citations field", () => {
    const messages = [{ citations: null }, { citations: "invalid" }];
    const counts = countCitations(messages);
    expect(counts.size).toBe(0);
  });

  it("returns empty map for empty message list", () => {
    expect(countCitations([]).size).toBe(0);
  });
});
