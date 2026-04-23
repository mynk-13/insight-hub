import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/shared/db";
import { generateEmbedding } from "@/lib/shared/embeddings";
import type { SearchFilter, SearchResultItem } from "./types";

const SEARCH_TOP_K = 20;
const RRF_K = 60;
const RESULT_TOP_N = 10;
const SNIPPET_WINDOW = 200;

function getPinecone(): Pinecone {
  return new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
}

function buildSnippet(content: string, query: string): string {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const lc = content.toLowerCase();
  let bestIdx = 0;
  for (const term of terms) {
    const idx = lc.indexOf(term);
    if (idx !== -1) {
      bestIdx = idx;
      break;
    }
  }

  const start = Math.max(0, bestIdx - 60);
  const end = Math.min(content.length, start + SNIPPET_WINDOW);
  let snippet = content.slice(start, end);
  if (start > 0) snippet = "…" + snippet;
  if (end < content.length) snippet = snippet + "…";

  for (const term of terms) {
    snippet = snippet.replace(
      new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
      "<mark>$1</mark>",
    );
  }
  return snippet;
}

type ChunkHit = {
  chunkId: string;
  sourceId: string;
  content: string;
  score: number;
  pageNumber?: number;
};

async function denseSearch(
  embedding: number[],
  workspaceId: string,
  filter: SearchFilter,
): Promise<ChunkHit[]> {
  const pinecone = getPinecone();
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  const metadata: Record<string, string> = { workspaceId };
  if (filter.collectionId) metadata.collectionId = filter.collectionId;

  const result = await index.query({
    vector: embedding,
    topK: SEARCH_TOP_K,
    filter: metadata,
    includeMetadata: true,
  });

  return (result.matches ?? []).map((m) => ({
    chunkId: m.id,
    sourceId: String(m.metadata?.sourceId ?? ""),
    content: String(m.metadata?.content ?? ""),
    score: m.score ?? 0,
    pageNumber: m.metadata?.pageNumber ? Number(m.metadata.pageNumber) : undefined,
  }));
}

type BM25Row = {
  id: string;
  source_id: string;
  content: string;
  page_number: number | null;
  rank: number;
};

async function sparseSearch(
  query: string,
  workspaceId: string,
  filter: SearchFilter,
): Promise<ChunkHit[]> {
  const collectionFilter = filter.collectionId
    ? Prisma.sql`AND c."sourceId" IN (
        SELECT "sourceId" FROM source_collections WHERE "collectionId" = ${filter.collectionId}
      )`
    : Prisma.sql``;

  // eslint-disable-next-line no-restricted-syntax
  const rows = await db.$queryRaw<BM25Row[]>(
    Prisma.sql`
      SELECT
        c.id,
        c."sourceId" AS source_id,
        c.content,
        c."pageNumber" AS page_number,
        ts_rank_cd(to_tsvector('english', c.content), query) AS rank
      FROM chunks c, websearch_to_tsquery('english', ${query}) query
      WHERE c."workspaceId" = ${workspaceId}
        AND to_tsvector('english', c.content) @@ query
        ${collectionFilter}
      ORDER BY rank DESC
      LIMIT ${SEARCH_TOP_K}
    `,
  );

  return rows.map((r) => ({
    chunkId: r.id,
    sourceId: r.source_id,
    content: r.content,
    score: Number(r.rank),
    pageNumber: r.page_number ?? undefined,
  }));
}

export async function semanticSearch(
  workspaceId: string,
  filter: SearchFilter,
): Promise<SearchResultItem[]> {
  if (!filter.query.trim()) return [];

  const [embedding, sparseResults] = await Promise.all([
    generateEmbedding(filter.query),
    sparseSearch(filter.query, workspaceId, filter),
  ]);
  const denseResults = await denseSearch(embedding, workspaceId, filter);

  // Collect all unique chunks
  const allChunks = new Map<string, ChunkHit>();
  [...denseResults, ...sparseResults].forEach((c) => allChunks.set(c.chunkId, c));

  // RRF scoring
  const rrfScores = new Map<string, number>();
  denseResults.forEach((c, rank) => {
    rrfScores.set(c.chunkId, (rrfScores.get(c.chunkId) ?? 0) + 1 / (RRF_K + rank + 1));
  });
  sparseResults.forEach((c, rank) => {
    rrfScores.set(c.chunkId, (rrfScores.get(c.chunkId) ?? 0) + 1 / (RRF_K + rank + 1));
  });

  // Group by sourceId — keep best-scoring chunk per source
  const sourceScores = new Map<string, { score: number; chunkId: string }>();
  for (const [chunkId, score] of rrfScores) {
    const chunk = allChunks.get(chunkId)!;
    const existing = sourceScores.get(chunk.sourceId);
    if (!existing || score > existing.score) {
      sourceScores.set(chunk.sourceId, { score, chunkId });
    }
  }

  const ranked = Array.from(sourceScores.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, RESULT_TOP_N);

  if (ranked.length === 0) return [];

  const sourceIds = ranked.map(([id]) => id);
  const sources = await db.source.findMany({
    where: {
      id: { in: sourceIds },
      workspaceId,
      deletedAt: null,
      ...(filter.type?.length ? { type: { in: filter.type } } : {}),
      ...(filter.dateFrom || filter.dateTo
        ? {
            createdAt: {
              ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
              ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
            },
          }
        : {}),
    },
  });

  const sourceMap = new Map(sources.map((s) => [s.id, s]));

  return ranked
    .filter(([id]) => sourceMap.has(id))
    .map(([id, { score, chunkId }]) => {
      const source = sourceMap.get(id)!;
      const chunk = allChunks.get(chunkId)!;
      return {
        sourceId: source.id,
        sourceTitle: source.title,
        sourceType: source.type,
        sourceUrl: source.url ?? null,
        snippet: buildSnippet(chunk.content, filter.query),
        score,
        pageNumber: chunk.pageNumber,
        tags: source.tags,
        createdAt: source.createdAt,
      };
    });
}
