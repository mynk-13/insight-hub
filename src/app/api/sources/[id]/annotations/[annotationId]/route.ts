import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { AnnotationService } from "@/lib/modules/annotations";

const updateSchema = z.object({
  content: z.string().max(5000).optional(),
  color: z.string().optional(),
});

async function getContext(sourceId: string, annotationId: string, userId: string) {
  const source = await db.source.findFirst({
    where: { id: sourceId, deletedAt: null },
    select: { workspaceId: true },
  });
  if (!source) return null;
  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: source.workspaceId, userId } },
    select: { role: true },
  });
  if (!member) return null;
  return { workspaceId: source.workspaceId, role: member.role };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId, annotationId } = await params;
  const ctx = await getContext(sourceId, annotationId, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const annotation = await AnnotationService.update(
      annotationId,
      ctx.workspaceId,
      session.user.id,
      parsed.data,
    );
    return NextResponse.json({ annotation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId, annotationId } = await params;
  const ctx = await getContext(sourceId, annotationId, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await AnnotationService.softDelete(annotationId, ctx.workspaceId, session.user.id, ctx.role);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
