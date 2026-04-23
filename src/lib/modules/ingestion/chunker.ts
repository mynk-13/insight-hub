import "server-only";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { computeContentHash } from "./deduplicator";
import type { ChunkWithMeta } from "./types";

// Target 600 tokens (≈2400 chars at ~4 chars/token), 100-token overlap (≈400 chars)
const CHUNK_SIZE = 2400;
const CHUNK_OVERLAP = 400;

export async function chunkText(
  text: string,
  sourceId: string,
  workspaceId: string,
  pageCount?: number | null,
): Promise<ChunkWithMeta[]> {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
    separators: ["\n\n", "\n", ". ", " ", ""],
  });

  const docs = await splitter.createDocuments([text]);

  return docs.map((doc, index) => {
    const content = doc.pageContent.trim();
    const contentHash = computeContentHash(content);

    // Estimate page number from character position if page count is known
    let pageNumber: number | undefined;
    if (pageCount && pageCount > 1) {
      const approxPosition =
        (doc.metadata?.loc?.lines?.from ?? index * CHUNK_SIZE) / Math.max(text.length, 1);
      pageNumber = Math.max(1, Math.ceil(approxPosition * pageCount));
    }

    return {
      content,
      contentHash,
      tokenCount: Math.ceil(content.length / 4),
      chunkIndex: index,
      pageNumber,
      metadata: {
        sourceId,
        workspaceId,
        chunkIndex: index,
        charStart: index * (CHUNK_SIZE - CHUNK_OVERLAP),
      },
    };
  });
}
