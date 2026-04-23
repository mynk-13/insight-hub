import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/shared/db";
import { generateEmbedding } from "@/lib/shared/embeddings";
import type { RetrievedChunk, RankedChunk, ChatContext, Citation } from "./types";

const TOP_K = 20;
const RRF_K = 60;
const TOP_N = 5;

// Confidence thresholds based on normalised RRF score (max possible ≈ 2/(60+1))
const HIGH_THRESHOLD = 0.022;
const MEDIUM_THRESHOLD = 0.015;

function getPinecone(): Pinecone {
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
}

async function denseRetrieve(
  embedding: number[],
  workspaceId: string,
  context: ChatContext,
): Promise<RetrievedChunk[]> {
  const pinecone = getPinecone();
  const index = pinecone.index(process.env.PINECONE_INDEX!);

  const filter: Record<string, string> = { workspaceId };
  if (context.type === "COLLECTION" && context.id) {
    filter.collectionId = context.id;
  } else if (context.type === "SOURCE" && context.id) {
    filter.sourceId = context.id;
  }

  const result = await index.query({
    vector: embedding,
    topK: TOP_K,
    filter,
    includeMetadata: true,
  });

  return (result.matches ?? []).map((m) => ({
    chunkId: m.id,
    sourceId: String(m.metadata?.sourceId ?? ""),
    sourceName: String(m.metadata?.sourceName ?? ""),
    sourceUrl: m.metadata?.sourceUrl ? String(m.metadata.sourceUrl) : null,
    content: String(m.metadata?.content ?? ""),
    score: m.score ?? 0,
    pageNumber: m.metadata?.pageNumber ? Number(m.metadata.pageNumber) : undefined,
    chunkIndex: Number(m.metadata?.chunkIndex ?? 0),
  }));
}

type BM25Row = {
  id: string;
  source_id: string;
  source_name: string;
  source_url: string | null;
  content: string;
  page_number: number | null;
  chunk_index: number;
  rank: number;
};

async function sparseRetrieve(
  query: string,
  workspaceId: string,
  context: ChatContext,
): Promise<RetrievedChunk[]> {
  const contextFilter =
    context.type === "SOURCE" && context.id
      ? Prisma.sql`AND c."sourceId" = ${context.id}`
      : context.type === "COLLECTION" && context.id
        ? Prisma.sql`AND c."sourceId" IN (
            SELECT "sourceId" FROM source_collections WHERE "collectionId" = ${context.id}
          )`
        : Prisma.sql``;

  // eslint-disable-next-line no-restricted-syntax
  const rows = await db.$queryRaw<BM25Row[]>(
    Prisma.sql`
      SELECT
        c.id,
        c."sourceId" AS source_id,
        s.name        AS source_name,
        s.url         AS source_url,
        c.content,
        c."pageNumber" AS page_number,
        c."chunkIndex" AS chunk_index,
        ts_rank_cd(to_tsvector('english', c.content), query) AS rank
      FROM chunks c
      JOIN sources s ON s.id = c."sourceId"
      , websearch_to_tsquery('english', ${query}) query
      WHERE c."workspaceId" = ${workspaceId}
        AND to_tsvector('english', c.content) @@ query
        ${contextFilter}
      ORDER BY rank DESC
      LIMIT ${TOP_K}
    `,
  );

  return rows.map((r) => ({
    chunkId: r.id,
    sourceId: r.source_id,
    sourceName: r.source_name,
    sourceUrl: r.source_url,
    content: r.content,
    score: Number(r.rank),
    pageNumber: r.page_number ?? undefined,
    chunkIndex: r.chunk_index,
  }));
}

export function reciprocalRankFusion(
  denseResults: RetrievedChunk[],
  sparseResults: RetrievedChunk[],
  k = RRF_K,
): Map<string, number> {
  const scores = new Map<string, number>();

  denseResults.forEach((chunk, rank) => {
    scores.set(chunk.chunkId, (scores.get(chunk.chunkId) ?? 0) + 1 / (k + rank + 1));
  });

  sparseResults.forEach((chunk, rank) => {
    scores.set(chunk.chunkId, (scores.get(chunk.chunkId) ?? 0) + 1 / (k + rank + 1));
  });

  return scores;
}

function scoreConfidence(rrfScore: number): "HIGH" | "MEDIUM" | "LOW" {
  if (rrfScore >= HIGH_THRESHOLD) return "HIGH";
  if (rrfScore >= MEDIUM_THRESHOLD) return "MEDIUM";
  return "LOW";
}

export async function hybridRetrieve(
  query: string,
  workspaceId: string,
  context: ChatContext,
): Promise<{ rankedChunks: RankedChunk[]; citations: Citation[] }> {
  const [embedding, sparseResults] = await Promise.all([
    generateEmbedding(query),
    sparseRetrieve(query, workspaceId, context),
  ]);

  const denseResults = await denseRetrieve(embedding, workspaceId, context);

  // Merge all unique chunks by ID
  const allChunks = new Map<string, RetrievedChunk>();
  [...denseResults, ...sparseResults].forEach((c) => allChunks.set(c.chunkId, c));

  const rrfScores = reciprocalRankFusion(denseResults, sparseResults);

  const ranked: RankedChunk[] = Array.from(rrfScores.entries())
    .map(([chunkId, rrfScore]) => {
      const chunk = allChunks.get(chunkId)!;
      return {
        ...chunk,
        rrfScore,
        topScore: chunk.score,
        confidence: scoreConfidence(rrfScore),
      };
    })
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, TOP_N);

  const citations: Citation[] = ranked.map((c, i) => ({
    index: i + 1,
    chunkId: c.chunkId,
    sourceId: c.sourceId,
    sourceName: c.sourceName,
    sourceUrl: c.sourceUrl,
    content: c.content,
    pageNumber: c.pageNumber,
  }));

  return { rankedChunks: ranked, citations };
}
