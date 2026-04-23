import { describe, it, expect } from "vitest";
import { reciprocalRankFusion } from "@/lib/modules/rag/retriever";
import type { RetrievedChunk } from "@/lib/modules/rag/types";

function makeChunk(id: string, score = 0.5): RetrievedChunk {
  return {
    chunkId: id,
    sourceId: "src-1",
    sourceName: "Test Source",
    sourceUrl: null,
    content: "content",
    score,
    chunkIndex: 0,
  };
}

describe("reciprocalRankFusion", () => {
  it("assigns higher score to chunk ranked first in both lists", () => {
    const dense = [makeChunk("A"), makeChunk("B"), makeChunk("C")];
    const sparse = [makeChunk("A"), makeChunk("C"), makeChunk("B")];

    const scores = reciprocalRankFusion(dense, sparse);

    expect(scores.get("A")).toBeGreaterThan(scores.get("B")!);
    expect(scores.get("A")).toBeGreaterThan(scores.get("C")!);
  });

  it("returns score for each unique chunk across both lists", () => {
    const dense = [makeChunk("A"), makeChunk("B")];
    const sparse = [makeChunk("C"), makeChunk("D")];

    const scores = reciprocalRankFusion(dense, sparse);

    expect(scores.size).toBe(4);
    expect(scores.has("A")).toBe(true);
    expect(scores.has("D")).toBe(true);
  });

  it("chunk appearing only in one list gets lower score than one in both", () => {
    const dense = [makeChunk("BOTH"), makeChunk("DENSE_ONLY")];
    const sparse = [makeChunk("BOTH"), makeChunk("SPARSE_ONLY")];

    const scores = reciprocalRankFusion(dense, sparse);

    expect(scores.get("BOTH")).toBeGreaterThan(scores.get("DENSE_ONLY")!);
    expect(scores.get("BOTH")).toBeGreaterThan(scores.get("SPARSE_ONLY")!);
  });

  it("uses k=60 by default (score ≤ 2/(60+1) ≈ 0.033)", () => {
    const dense = [makeChunk("A")];
    const sparse = [makeChunk("A")];

    const scores = reciprocalRankFusion(dense, sparse);
    const maxPossible = 2 / (60 + 1);

    expect(scores.get("A")).toBeLessThanOrEqual(maxPossible + 0.001);
  });

  it("custom k changes the score magnitude", () => {
    const dense = [makeChunk("A")];
    const sparse = [makeChunk("A")];

    const scoresK60 = reciprocalRankFusion(dense, sparse, 60);
    const scoresK10 = reciprocalRankFusion(dense, sparse, 10);

    // Lower k → higher scores (less smoothing)
    expect(scoresK10.get("A")).toBeGreaterThan(scoresK60.get("A")!);
  });

  it("handles empty lists without error", () => {
    const scores = reciprocalRankFusion([], []);
    expect(scores.size).toBe(0);
  });

  it("handles one empty list", () => {
    const dense = [makeChunk("A"), makeChunk("B")];
    const scores = reciprocalRankFusion(dense, []);
    expect(scores.size).toBe(2);
    expect(scores.get("A")).toBeGreaterThan(scores.get("B")!);
  });
});
