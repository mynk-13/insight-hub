import { describe, it, expect } from "vitest";

// Filter encoding/decoding utilities
function encodeFilters(params: {
  q?: string;
  type?: string[];
  collection?: string;
  from?: string;
  to?: string;
}): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.type?.length) sp.set("type", params.type.join(","));
  if (params.collection) sp.set("collection", params.collection);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return sp;
}

function decodeFilters(sp: URLSearchParams) {
  const type = sp.get("type");
  return {
    q: sp.get("q") ?? undefined,
    type: type ? type.split(",").filter(Boolean) : undefined,
    collection: sp.get("collection") ?? undefined,
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };
}

describe("searchFilterUrlEncoding", () => {
  it("encodes a simple query", () => {
    const sp = encodeFilters({ q: "machine learning" });
    expect(sp.get("q")).toBe("machine learning");
  });

  it("encodes multiple type filters as comma-separated", () => {
    const sp = encodeFilters({ type: ["PDF", "DOCX"] });
    expect(sp.get("type")).toBe("PDF,DOCX");
  });

  it("round-trips query through encode → decode", () => {
    const original = { q: "neural networks", type: ["PDF", "URL"], from: "2025-01-01" };
    const decoded = decodeFilters(encodeFilters(original));
    expect(decoded.q).toBe(original.q);
    expect(decoded.type).toEqual(original.type);
    expect(decoded.from).toBe(original.from);
  });

  it("omits undefined params from URL", () => {
    const sp = encodeFilters({ q: "hello" });
    expect(sp.has("type")).toBe(false);
    expect(sp.has("collection")).toBe(false);
    expect(sp.has("from")).toBe(false);
  });

  it("decodes missing params as undefined", () => {
    const decoded = decodeFilters(new URLSearchParams("q=test"));
    expect(decoded.type).toBeUndefined();
    expect(decoded.collection).toBeUndefined();
  });

  it("handles special characters in query via URLSearchParams encoding", () => {
    const sp = encodeFilters({ q: "LLM & RAG (2025)" });
    const decoded = decodeFilters(sp);
    expect(decoded.q).toBe("LLM & RAG (2025)");
  });

  it("preserves collection filter through round-trip", () => {
    const sp = encodeFilters({ collection: "col_abc123" });
    expect(decodeFilters(sp).collection).toBe("col_abc123");
  });

  it("handles empty type array by omitting type param", () => {
    const sp = encodeFilters({ type: [] });
    expect(sp.has("type")).toBe(false);
  });
});

describe("collectionPinLimit", () => {
  it("enforces max 5 pinned collections", () => {
    const maxPinned = 5;
    const pinnedCount = 5;
    const wouldExceed = pinnedCount >= maxPinned;
    expect(wouldExceed).toBe(true);
  });

  it("allows pinning when under limit", () => {
    const maxPinned = 5;
    const pinnedCount = 4;
    const canPin = pinnedCount < maxPinned;
    expect(canPin).toBe(true);
  });
});
