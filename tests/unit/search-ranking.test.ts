import { describe, it, expect } from "vitest";

// Pure RRF logic extracted from searcher for unit testing
function reciprocalRankFusion(
  denseIds: string[],
  sparseIds: string[],
  k = 60,
): Map<string, number> {
  const scores = new Map<string, number>();
  denseIds.forEach((id, rank) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
  });
  sparseIds.forEach((id, rank) => {
    scores.set(id, (scores.get(id) ?? 0) + 1 / (k + rank + 1));
  });
  return scores;
}

function buildSnippet(content: string, query: string): string {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  const lc = content.toLowerCase();
  let bestIdx = 0;
  for (const term of terms) {
    const idx = lc.indexOf(term);
    if (idx !== -1) {
      bestIdx = idx;
      break;
    }
  }
  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(content.length, start + 200);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < content.length) snippet = snippet + "…";
  for (const term of terms) {
    snippet = snippet.replace(
      new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
      "<mark>$1</mark>",
    );
  }
  return snippet;
}

describe("reciprocalRankFusion", () => {
  it("assigns higher score when chunk appears in both dense and sparse results", () => {
    const scores = reciprocalRankFusion(["a", "b"], ["a", "c"]);
    expect(scores.get("a")!).toBeGreaterThan(scores.get("b")!);
    expect(scores.get("a")!).toBeGreaterThan(scores.get("c")!);
  });

  it("applies diminishing returns for lower-ranked results", () => {
    const scores = reciprocalRankFusion(["a", "b", "c"], []);
    expect(scores.get("a")!).toBeGreaterThan(scores.get("b")!);
    expect(scores.get("b")!).toBeGreaterThan(scores.get("c")!);
  });

  it("scores from dense + sparse combine additively", () => {
    const combined = reciprocalRankFusion(["a"], ["a"]);
    const denseOnly = reciprocalRankFusion(["a"], []);
    const sparseOnly = reciprocalRankFusion([], ["a"]);
    expect(combined.get("a")).toBeCloseTo(denseOnly.get("a")! + sparseOnly.get("a")!, 10);
  });

  it("handles empty input", () => {
    expect(reciprocalRankFusion([], []).size).toBe(0);
  });

  it("returns unique chunks across both lists", () => {
    const scores = reciprocalRankFusion(["a", "b"], ["c", "d"]);
    expect(scores.size).toBe(4);
  });

  it("uses k=60 by default to dampen rank differences", () => {
    // rank1 → position 0: score = 1/(60+0+1) = 1/61
    // rank61 → position 1: score = 1/(60+1+1) = 1/62
    const scores = reciprocalRankFusion(["rank1", "rank61"], []);
    const ratio = scores.get("rank1")! / scores.get("rank61")!;
    // ratio = (1/61) / (1/62) = 62/61 ≈ 1.016
    expect(ratio).toBeCloseTo(62 / 61, 2);
  });
});

describe("buildSnippet", () => {
  it("highlights query terms with <mark> tags", () => {
    const content = "The quick brown fox jumps over the lazy dog";
    const snippet = buildSnippet(content, "quick fox");
    expect(snippet).toContain("<mark>quick</mark>");
    expect(snippet).toContain("<mark>fox</mark>");
  });

  it("adds ellipsis prefix when content starts mid-document", () => {
    const content = "x".repeat(100) + " target word here " + "x".repeat(100);
    const snippet = buildSnippet(content, "target");
    expect(snippet.startsWith("…")).toBe(true);
  });

  it("adds ellipsis suffix when content ends mid-document", () => {
    const content = "target " + "x".repeat(300);
    const snippet = buildSnippet(content, "target");
    expect(snippet.endsWith("…")).toBe(true);
  });

  it("is case-insensitive for highlighting", () => {
    const snippet = buildSnippet("The NEURAL network learns", "neural");
    expect(snippet).toContain("<mark>NEURAL</mark>");
  });

  it("skips short query terms (≤2 chars)", () => {
    const snippet = buildSnippet("an example sentence", "an example");
    expect(snippet).not.toContain("<mark>an</mark>");
    expect(snippet).toContain("<mark>example</mark>");
  });

  it("escapes regex special characters in query", () => {
    const snippet = buildSnippet("cost (USD) per query", "cost (USD)");
    // Should not throw and should contain the snippet text
    expect(snippet).toContain("cost");
  });
});
