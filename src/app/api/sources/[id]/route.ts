import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/shared/db";
import { canPerform } from "@/lib/modules/workspace/permission";
import { deleteSourceVectors } from "@/lib/modules/ingestion/indexer";
import { del } from "@vercel/blob";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const source = await db.source.findUnique({
    where: { id, deletedAt: null },
    include: { chunks: { orderBy: { chunkIndex: "asc" }, take: 50 } },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: source.workspaceId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json(source);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const source = await db.source.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, workspaceId: true, blobKey: true, status: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: {
      workspaceId_userId: { workspaceId: source.workspaceId, userId: session.user.id },
    },
    select: { role: true },
  });
  if (!member || !canPerform(member.role, "sources:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Soft-delete in Postgres
  await db.source.update({ where: { id }, data: { deletedAt: new Date() } });

  // Best-effort cleanup: Pinecone vectors + Blob
  Promise.all([
    deleteSourceVectors(id, source.workspaceId).catch(() => {}),
    source.blobKey ? del(source.blobKey).catch(() => {}) : Promise.resolve(),
  ]).catch(() => {});

  return NextResponse.json({ deleted: true });
}
