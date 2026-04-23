import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/shared/db";
import { canPerform } from "@/lib/modules/workspace/permission";
import { jobQueue } from "@/lib/shared/queue";
import type { IngestionJobPayload } from "@/lib/shared/queue";
import type { SourceStatus } from "@prisma/client";

const ListSchema = z.object({
  workspaceId: z.string().min(1),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

// GET /api/sources?workspaceId=...
export async function GET(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = ListSchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { workspaceId, cursor, limit, status } = parsed.data;

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sources = await db.source.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      ...(status ? { status: status as SourceStatus } : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      url: true,
      mimeType: true,
      sizeBytes: true,
      pageCount: true,
      wordCount: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });

  const hasMore = sources.length > limit;
  const items = hasMore ? sources.slice(0, limit) : sources;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ items, nextCursor });
}

// POST /api/sources — trigger ingestion for an already-uploaded blob
const TriggerSchema = z.object({
  sourceId: z.string().min(1),
  workspaceId: z.string().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = TriggerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const { sourceId, workspaceId } = parsed.data;
  const userId = session.user.id;

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!member || !canPerform(member.role, "sources:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const source = await db.source.findUnique({
    where: { id: sourceId, workspaceId },
    select: { id: true, status: true },
  });
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });
  if (source.status !== "PENDING") {
    return NextResponse.json({ error: "Source is not in PENDING state" }, { status: 409 });
  }

  await jobQueue.enqueue<IngestionJobPayload>("ingestion", "source:ingest", {
    sourceId,
    workspaceId,
    userId,
  });

  return NextResponse.json({ queued: true });
}
