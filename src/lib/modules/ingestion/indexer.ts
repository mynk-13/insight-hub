import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import type { EmbeddedChunk } from "./types";

function getPinecone() {
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
}

export async function indexChunks(
  chunks: EmbeddedChunk[],
  sourceId: string,
  workspaceId: string,
): Promise<void> {
  if (chunks.length === 0) return;

  const pc = getPinecone();
  const index = pc.index(process.env.PINECONE_INDEX!, process.env.PINECONE_HOST);

  const records = chunks.map((chunk) => ({
    id: `${workspaceId}:${sourceId}:${chunk.chunkIndex}`,
    values: chunk.embedding,
    metadata: {
      sourceId,
      workspaceId,
      chunkIndex: chunk.chunkIndex,
      // Pinecone RecordMetadata requires string | number | boolean — use -1 sentinel for null
      pageNumber: chunk.pageNumber ?? -1,
      contentHash: chunk.contentHash,
      content: chunk.content.slice(0, 500),
    } as RecordMetadata,
  }));

  // Upsert in batches of 100 using { records: [...] } API
  const BATCH = 100;
  for (let i = 0; i < records.length; i += BATCH) {
    await index.upsert({ records: records.slice(i, i + BATCH) });
  }
}

export async function deleteSourceVectors(sourceId: string, workspaceId: string): Promise<void> {
  const pc = getPinecone();
  const index = pc.index(process.env.PINECONE_INDEX!, process.env.PINECONE_HOST);
  await index.deleteMany({ filter: { sourceId, workspaceId } });
}
