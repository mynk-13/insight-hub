import "server-only";
import { db } from "@/lib/shared/db";
import { extractPdf } from "./extractors/pdf";
import { extractDocx } from "./extractors/docx";
import { extractUrl } from "./extractors/url";
import { chunkText } from "./chunker";
import { embedChunks } from "./embedder";
import { indexChunks } from "./indexer";
import { computeContentHash } from "./deduplicator";
import type { IngestionStatus } from "./types";
import type { SourceStatus, Prisma } from "@prisma/client";

async function updateStatus(
  sourceId: string,
  status: IngestionStatus,
  extra?: { failReason?: string },
): Promise<void> {
  await db.source.update({
    where: { id: sourceId },
    data: {
      status: status as SourceStatus,
      ...(extra?.failReason ? { metadata: { failReason: extra.failReason } } : {}),
    },
  });
}

export async function runIngestionPipeline(sourceId: string, workspaceId: string): Promise<void> {
  const source = await db.source.findUnique({
    where: { id: sourceId },
    select: { id: true, type: true, blobKey: true, url: true, title: true },
  });

  if (!source) throw new Error(`Source ${sourceId} not found`);

  try {
    // ── 1. Extract ──────────────────────────────────────────────────────────
    await updateStatus(sourceId, "EXTRACTING");
    let extractionResult: Awaited<ReturnType<typeof extractPdf>>;

    if (source.type === "PDF" && source.blobKey) {
      const buffer = await fetchBlobBuffer(source.blobKey);
      if (source.type === "PDF") {
        const pdfResult = await extractPdf(buffer);
        if (pdfResult.usedOcr) await updateStatus(sourceId, "OCR_RUNNING");
        extractionResult = pdfResult;
      } else {
        extractionResult = await extractDocx(buffer);
      }
    } else if (source.type === "DOCX" && source.blobKey) {
      const buffer = await fetchBlobBuffer(source.blobKey);
      extractionResult = await extractDocx(buffer);
    } else if (source.type === "URL" && source.url) {
      extractionResult = await extractUrl(source.url);
    } else if (source.type === "MARKDOWN" && source.blobKey) {
      const buffer = await fetchBlobBuffer(source.blobKey);
      const text = buffer.toString("utf-8");
      extractionResult = {
        text,
        pageCount: null,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        usedOcr: false,
      };
    } else {
      throw new Error(`Cannot extract source: missing blob or url for type ${source.type}`);
    }

    const contentHash = computeContentHash(extractionResult.text);

    // Duplicate detection — same workspace, same content
    const duplicate = await db.source.findFirst({
      where: { workspaceId, contentHash, deletedAt: null, id: { not: sourceId } },
      select: { id: true },
    });
    if (duplicate) {
      await db.source.delete({ where: { id: sourceId } });
      throw new Error(`DUPLICATE:${duplicate.id}`);
    }

    await db.source.update({
      where: { id: sourceId },
      data: {
        contentHash,
        pageCount: extractionResult.pageCount,
        wordCount: extractionResult.wordCount,
      },
    });

    // ── 2. Chunk ─────────────────────────────────────────────────────────────
    await updateStatus(sourceId, "CHUNKING");
    const chunks = await chunkText(
      extractionResult.text,
      sourceId,
      workspaceId,
      extractionResult.pageCount,
    );

    // ── 3. Embed ──────────────────────────────────────────────────────────────
    await updateStatus(sourceId, "EMBEDDING");
    const embeddedChunks = await embedChunks(chunks);

    // ── 4. Persist chunks to Postgres ────────────────────────────────────────
    await db.chunk.createMany({
      data: embeddedChunks.map((c) => ({
        sourceId,
        workspaceId,
        content: c.content,
        contentHash: c.contentHash,
        tokenCount: c.tokenCount,
        chunkIndex: c.chunkIndex,
        pageNumber: c.pageNumber ?? null,
        metadata: c.metadata as Prisma.InputJsonValue,
        pineconeId: `${workspaceId}:${sourceId}:${c.chunkIndex}`,
      })),
      skipDuplicates: true,
    });

    // ── 5. Index in Pinecone ─────────────────────────────────────────────────
    await indexChunks(embeddedChunks, sourceId, workspaceId);

    // ── 6. Mark indexed ──────────────────────────────────────────────────────
    await updateStatus(sourceId, "INDEXED");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (!message.startsWith("DUPLICATE:")) {
      await updateStatus(sourceId, "FAILED", { failReason: message }).catch(() => {});
    }
    throw err;
  }
}

async function fetchBlobBuffer(blobKey: string): Promise<Buffer> {
  const res = await fetch(blobKey);
  if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
