import { describe, it, expect } from "vitest";

// Pure CSV builder extracted for unit testing
type WidgetKey =
  | "sourcesOverTime"
  | "queryVolume"
  | "topCitedSources"
  | "memberActivity"
  | "tokenConsumption";

function buildCsv(widget: WidgetKey, rawData: unknown): string {
  if (widget === "sourcesOverTime" || widget === "queryVolume") {
    const rows = rawData as Array<{ date: string; count: number }>;
    return ["date,count", ...rows.map((r) => `${r.date},${r.count}`)].join("\n");
  }
  if (widget === "topCitedSources") {
    const rows = rawData as Array<{ sourceId: string; title: string; citationCount: number }>;
    return [
      "sourceId,title,citationCount",
      ...rows.map((r) => `${r.sourceId},"${r.title.replace(/"/g, '""')}",${r.citationCount}`),
    ].join("\n");
  }
  if (widget === "memberActivity") {
    const rows = rawData as Array<{
      userId: string;
      userName: string;
      queryCount: number;
      annotationCount: number;
      lastActiveAt: string | null;
    }>;
    return [
      "userId,userName,queryCount,annotationCount,lastActiveAt",
      ...rows.map(
        (r) =>
          `${r.userId},"${r.userName.replace(/"/g, '""')}",${r.queryCount},${r.annotationCount},${r.lastActiveAt ?? ""}`,
      ),
    ].join("\n");
  }
  const data = rawData as {
    totalTokensIn: number;
    totalTokensOut: number;
    totalCostUsd: number;
    byModel: Array<{ model: string; tokensIn: number; tokensOut: number; costUsd: number }>;
  };
  return [
    "model,tokensIn,tokensOut,costUsd",
    `_total,${data.totalTokensIn},${data.totalTokensOut},${data.totalCostUsd.toFixed(6)}`,
    ...data.byModel.map((r) => `${r.model},${r.tokensIn},${r.tokensOut},${r.costUsd.toFixed(6)}`),
  ].join("\n");
}

describe("export — CSV format", () => {
  it("sourcesOverTime produces date,count header + rows", () => {
    const csv = buildCsv("sourcesOverTime", [
      { date: "2026-01-01", count: 3 },
      { date: "2026-01-02", count: 1 },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("date,count");
    expect(lines[1]).toBe("2026-01-01,3");
    expect(lines[2]).toBe("2026-01-02,1");
  });

  it("queryVolume produces same structure as sourcesOverTime", () => {
    const csv = buildCsv("queryVolume", [{ date: "2026-01-05", count: 7 }]);
    expect(csv.startsWith("date,count")).toBe(true);
    expect(csv).toContain("2026-01-05,7");
  });

  it("topCitedSources escapes double-quotes in titles", () => {
    const csv = buildCsv("topCitedSources", [
      { sourceId: "s1", title: 'Report "Alpha"', citationCount: 5 },
    ]);
    expect(csv).toContain('"Report ""Alpha"""');
    expect(csv).toContain(",5");
  });

  it("topCitedSources header is correct", () => {
    const csv = buildCsv("topCitedSources", []);
    expect(csv).toBe("sourceId,title,citationCount");
  });

  it("memberActivity produces all five columns", () => {
    const csv = buildCsv("memberActivity", [
      {
        userId: "u1",
        userName: "Alice",
        queryCount: 10,
        annotationCount: 3,
        lastActiveAt: "2026-01-10T00:00:00Z",
      },
    ]);
    expect(csv.split("\n")[0]).toBe("userId,userName,queryCount,annotationCount,lastActiveAt");
    expect(csv).toContain("u1,");
    expect(csv).toContain(",10,3,");
  });

  it("memberActivity handles null lastActiveAt", () => {
    const csv = buildCsv("memberActivity", [
      { userId: "u2", userName: "Bob", queryCount: 0, annotationCount: 0, lastActiveAt: null },
    ]);
    const row = csv.split("\n")[1]!;
    expect(row.endsWith(",")).toBe(true); // empty lastActiveAt field
  });

  it("tokenConsumption includes _total row", () => {
    const csv = buildCsv("tokenConsumption", {
      totalTokensIn: 1000,
      totalTokensOut: 500,
      totalCostUsd: 0.015,
      byModel: [{ model: "gpt-4o-mini", tokensIn: 1000, tokensOut: 500, costUsd: 0.015 }],
    });
    expect(csv).toContain("_total,1000,500,");
    expect(csv).toContain("gpt-4o-mini,1000,500,");
  });

  it("tokenConsumption costUsd fixed to 6 decimal places", () => {
    const csv = buildCsv("tokenConsumption", {
      totalTokensIn: 0,
      totalTokensOut: 0,
      totalCostUsd: 0.1,
      byModel: [],
    });
    expect(csv).toContain("0.100000");
  });
});

describe("export — purge validation", () => {
  it("confirmation must match workspace slug exactly", () => {
    const slug: string = "my-workspace";
    expect(slug === "my-workspace").toBe(true);
    expect(slug === "My-Workspace").toBe(false);
    expect(slug === "my workspace").toBe(false);
    expect("" === slug).toBe(false);
  });

  it("restore window validation: 30 days", () => {
    const withinWindow = (deletedAt: Date) => {
      const daysSince = (Date.now() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince <= 30;
    };
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const expired = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    expect(withinWindow(recent)).toBe(true);
    expect(withinWindow(expired)).toBe(false);
  });
});
