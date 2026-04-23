import { describe, it, expect } from "vitest";
import { parseCitationSegments, extractCitationIndices } from "@/lib/modules/rag/citation-parser";

describe("parseCitationSegments", () => {
  it("returns a single text segment for plain text", () => {
    const segments = parseCitationSegments("Hello world.");
    expect(segments).toEqual([{ type: "text", content: "Hello world." }]);
  });

  it("detects a single citation marker", () => {
    const segments = parseCitationSegments("According to the study [1], this is true.");
    expect(segments).toContainEqual({ type: "citation", index: 1 });
    expect(segments.find((s) => s.type === "text" && s.content.includes("According"))).toBeTruthy();
  });

  it("detects multiple citations", () => {
    const segments = parseCitationSegments("Facts [1] and more [3].");
    const citations = segments.filter((s) => s.type === "citation");
    expect(citations).toHaveLength(2);
    expect(citations[0]).toEqual({ type: "citation", index: 1 });
    expect(citations[1]).toEqual({ type: "citation", index: 3 });
  });

  it("handles citation at start of string", () => {
    const segments = parseCitationSegments("[2] is relevant.");
    expect(segments[0]).toEqual({ type: "citation", index: 2 });
    expect(segments[1]).toEqual({ type: "text", content: " is relevant." });
  });

  it("handles citation at end of string", () => {
    const segments = parseCitationSegments("See source [4]");
    const last = segments[segments.length - 1];
    expect(last).toEqual({ type: "citation", index: 4 });
  });

  it("does not match [0] (zero-indexed citations are invalid)", () => {
    const segments = parseCitationSegments("Invalid [0] citation.");
    expect(segments.every((s) => s.type === "text")).toBe(true);
  });

  it("returns empty array for empty string", () => {
    expect(parseCitationSegments("")).toEqual([]);
  });

  it("preserves text between consecutive citations", () => {
    const segments = parseCitationSegments("[1][2]");
    expect(segments).toHaveLength(2);
    expect(segments[0]).toEqual({ type: "citation", index: 1 });
    expect(segments[1]).toEqual({ type: "citation", index: 2 });
  });
});

describe("extractCitationIndices", () => {
  it("extracts all unique citation indices in order", () => {
    const indices = extractCitationIndices("See [3], [1], and [3] again.");
    expect(indices).toEqual([1, 3]);
  });

  it("returns empty array when no citations", () => {
    expect(extractCitationIndices("No citations here.")).toEqual([]);
  });

  it("handles multiple consecutive citations", () => {
    const indices = extractCitationIndices("[1][2][3]");
    expect(indices).toEqual([1, 2, 3]);
  });
});
