import { describe, it, expect } from "vitest";
import { buildSystemPrompt, hasUsableChunks, NO_RESULTS_RESPONSE } from "@/lib/modules/rag/prompt";
import type { RankedChunk } from "@/lib/modules/rag/types";

function makeRanked(overrides: Partial<RankedChunk> = {}): RankedChunk {
  return {
    chunkId: "c-1",
    sourceId: "s-1",
    sourceName: "Test Source",
    sourceUrl: null,
    content: "Paris is the capital of France.",
    rrfScore: 0.025,
    topScore: 0.85,
    confidence: "HIGH",
    chunkIndex: 0,
    ...overrides,
  };
}

describe("buildSystemPrompt", () => {
  it("includes all passage contents", () => {
    const chunks = [
      makeRanked({ chunkId: "c-1", sourceName: "Doc A", content: "Fact one." }),
      makeRanked({ chunkId: "c-2", sourceName: "Doc B", content: "Fact two." }),
    ];

    const prompt = buildSystemPrompt(chunks);

    expect(prompt).toContain("Fact one.");
    expect(prompt).toContain("Fact two.");
  });

  it("numbers passages starting at [1]", () => {
    const chunks = [makeRanked(), makeRanked({ chunkId: "c-2" })];
    const prompt = buildSystemPrompt(chunks);

    expect(prompt).toContain("[1]");
    expect(prompt).toContain("[2]");
  });

  it("includes source name in each passage", () => {
    const chunks = [makeRanked({ sourceName: "Annual Report 2024" })];
    const prompt = buildSystemPrompt(chunks);
    expect(prompt).toContain("Annual Report 2024");
  });

  it("includes page number when present", () => {
    const chunks = [makeRanked({ pageNumber: 42 })];
    const prompt = buildSystemPrompt(chunks);
    expect(prompt).toContain("page 42");
  });

  it("omits page number when absent", () => {
    const chunks = [makeRanked({ pageNumber: undefined })];
    const prompt = buildSystemPrompt(chunks);
    expect(prompt).not.toContain("page");
  });

  it("instructs model to cite inline with [n] format", () => {
    const chunks = [makeRanked()];
    const prompt = buildSystemPrompt(chunks);
    expect(prompt).toMatch(/\[n\]/);
  });
});

describe("hasUsableChunks", () => {
  it("returns true when a chunk has high topScore", () => {
    expect(hasUsableChunks([makeRanked({ topScore: 0.75 })])).toBe(true);
  });

  it("returns true when a chunk has sufficient rrfScore", () => {
    expect(hasUsableChunks([makeRanked({ topScore: 0, rrfScore: 0.018 })])).toBe(true);
  });

  it("returns false when all chunks are below thresholds", () => {
    const lowChunks = [makeRanked({ topScore: 0.5, rrfScore: 0.01 })];
    expect(hasUsableChunks(lowChunks)).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasUsableChunks([])).toBe(false);
  });
});

describe("NO_RESULTS_RESPONSE", () => {
  it("is a non-empty string", () => {
    expect(typeof NO_RESULTS_RESPONSE).toBe("string");
    expect(NO_RESULTS_RESPONSE.length).toBeGreaterThan(20);
  });
});
