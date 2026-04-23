import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/modules/ingestion/chunker";

const SAMPLE_TEXT = Array.from(
  { length: 40 },
  (_, i) => `Paragraph ${i + 1}: ${"word ".repeat(50).trim()}.`,
).join("\n\n");

describe("chunkText", () => {
  it("splits long text into multiple chunks", async () => {
    const chunks = await chunkText(SAMPLE_TEXT, "src-1", "ws-1");
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("each chunk carries sourceId and workspaceId in metadata", async () => {
    const chunks = await chunkText(SAMPLE_TEXT, "src-42", "ws-99");
    for (const chunk of chunks) {
      expect(chunk.metadata.sourceId).toBe("src-42");
      expect(chunk.metadata.workspaceId).toBe("ws-99");
    }
  });

  it("chunkIndex is sequential starting from 0", async () => {
    const chunks = await chunkText(SAMPLE_TEXT, "src-1", "ws-1");
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
    });
  });

  it("each chunk has a non-empty contentHash", async () => {
    const chunks = await chunkText(SAMPLE_TEXT, "src-1", "ws-1");
    for (const chunk of chunks) {
      expect(chunk.contentHash).toMatch(/^[a-f0-9]{64}$/);
    }
  });

  it("tokenCount is positive for all chunks", async () => {
    const chunks = await chunkText(SAMPLE_TEXT, "src-1", "ws-1");
    for (const chunk of chunks) {
      expect(chunk.tokenCount).toBeGreaterThan(0);
    }
  });

  it("handles short text as a single chunk", async () => {
    const chunks = await chunkText("Hello world.", "src-1", "ws-1");
    expect(chunks.length).toBe(1);
    expect(chunks[0].content).toBe("Hello world.");
  });

  it("all chunk content is non-empty", async () => {
    const chunks = await chunkText(SAMPLE_TEXT, "src-1", "ws-1");
    for (const chunk of chunks) {
      expect(chunk.content.trim().length).toBeGreaterThan(0);
    }
  });
});
