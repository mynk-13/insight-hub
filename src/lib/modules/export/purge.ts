import "server-only";
import { Pinecone } from "@pinecone-database/pinecone";
import { del } from "@vercel/blob";
import { db } from "@/lib/shared/db";

/** Hard-purge a workspace: removes all vectors, blobs, and DB records. */
export async function hardPurgeWorkspace(workspaceId: string): Promise<void> {
  // 1. Collect all blob keys before deleting DB records
  const sources = await db.source.findMany({
    where: { workspaceId },
    select: { id: true, blobKey: true },
  });

  // 2. Delete vectors from Pinecone by workspaceId filter
  try {
    const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? "" });
    const index = pinecone.index(process.env.PINECONE_INDEX ?? "");
    await index.deleteMany({ filter: { workspaceId } });
  } catch {
    // Non-fatal — Pinecone purge failure shouldn't block DB purge
  }

  // 3. Delete blobs from Vercel Blob storage
  const blobKeys = sources.map((s) => s.blobKey).filter((k): k is string => k !== null);
  if (blobKeys.length > 0) {
    try {
      await del(blobKeys);
    } catch {
      // Non-fatal — blob cleanup failure shouldn't block DB purge
    }
  }

  // 4. Hard-delete workspace from DB (cascades to all relations)
  await db.workspace.delete({ where: { id: workspaceId } });
}

/** Restore a soft-deleted workspace within the 30-day window. */
export async function restoreWorkspace(workspaceId: string): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { deletedAt: true },
  });

  if (!workspace?.deletedAt) throw new Error("WORKSPACE_NOT_DELETED");

  const daysSinceDeletion = (Date.now() - workspace.deletedAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDeletion > 30) throw new Error("RESTORE_WINDOW_EXPIRED");

  await db.workspace.update({
    where: { id: workspaceId },
    data: { deletedAt: null },
  });
}

/** Find workspaces soft-deleted more than 30 days ago and hard-purge them. */
export async function purgeExpiredWorkspaces(): Promise<number> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const expired = await db.workspace.findMany({
    where: { deletedAt: { lt: cutoff } },
    select: { id: true },
  });

  for (const ws of expired) {
    await hardPurgeWorkspace(ws.id);
  }

  return expired.length;
}
