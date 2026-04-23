import { describe, it, expect } from "vitest";
import { computeContentHash } from "@/lib/modules/ingestion/deduplicator";

describe("computeContentHash", () => {
  it("returns a 64-char hex SHA-256 string", () => {
    const hash = computeContentHash("hello world");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("same content produces same hash", () => {
    const a = computeContentHash("identical content");
    const b = computeContentHash("identical content");
    expect(a).toBe(b);
  });

  it("different content produces different hashes", () => {
    const a = computeContentHash("content A");
    const b = computeContentHash("content B");
    expect(a).not.toBe(b);
  });

  it("works with Buffer input", () => {
    const hash = computeContentHash(Buffer.from("binary data"));
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("string and equivalent Buffer produce the same hash", () => {
    const str = computeContentHash("hello");
    const buf = computeContentHash(Buffer.from("hello", "utf-8"));
    expect(str).toBe(buf);
  });

  it("empty string is deterministic", () => {
    const hash = computeContentHash("");
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});
