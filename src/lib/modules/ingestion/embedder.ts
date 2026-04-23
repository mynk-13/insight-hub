import "server-only";
import OpenAI from "openai";
import { cache, CacheKeys } from "@/lib/shared/cache";
import type { ChunkWithMeta, EmbeddedChunk } from "./types";

const EMBEDDING_MODEL = "text-embedding-3-small";
const BATCH_SIZE = 100;
const MAX_PARALLEL = 3;
// 30 days in seconds
const EMBED_CACHE_TTL = 60 * 60 * 24 * 30;

function getOpenAI(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

async function embedBatchWithRetry(
  openai: OpenAI,
  texts: string[],
  attempt = 0,
): Promise<number[][]> {
  try {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: 1536,
    });
    return res.data.map((d) => d.embedding);
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    if (status === 429 && attempt < 4) {
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, delay));
      return embedBatchWithRetry(openai, texts, attempt + 1);
    }
    throw err;
  }
}

export async function embedChunks(chunks: ChunkWithMeta[]): Promise<EmbeddedChunk[]> {
  const openai = getOpenAI();
  const result: EmbeddedChunk[] = new Array(chunks.length);

  // Check cache for each chunk first
  const uncachedIndices: number[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const cached = await cache.get<number[]>(CacheKeys.embedCache(chunks[i].contentHash));
    if (cached) {
      result[i] = { ...chunks[i], embedding: cached };
    } else {
      uncachedIndices.push(i);
    }
  }

  // Batch uncached chunks, run MAX_PARALLEL batches concurrently
  const batches: number[][] = [];
  for (let i = 0; i < uncachedIndices.length; i += BATCH_SIZE) {
    batches.push(uncachedIndices.slice(i, i + BATCH_SIZE));
  }

  for (let i = 0; i < batches.length; i += MAX_PARALLEL) {
    const parallelBatches = batches.slice(i, i + MAX_PARALLEL);
    const batchResults = await Promise.all(
      parallelBatches.map((batchIndices) =>
        embedBatchWithRetry(
          openai,
          batchIndices.map((idx) => chunks[idx].content),
        ).then((embeddings) =>
          embeddings.map((embedding, j) => ({ idx: batchIndices[j], embedding })),
        ),
      ),
    );

    // Flatten and store results + warm cache
    for (const batchResult of batchResults) {
      for (const { idx, embedding } of batchResult) {
        result[idx] = { ...chunks[idx], embedding };
        // Fire-and-forget cache warm
        cache
          .set(CacheKeys.embedCache(chunks[idx].contentHash), embedding, EMBED_CACHE_TTL)
          .catch(() => {});
      }
    }
  }

  return result;
}
