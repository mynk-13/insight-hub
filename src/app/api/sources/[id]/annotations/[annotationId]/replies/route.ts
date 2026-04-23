import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { AnnotationService, NotificationService } from "@/lib/modules/annotations";

const replySchema = z.object({ content: z.string().min(1).max(5000) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId, annotationId } = await params;

  const source = await db.source.findFirst({
    where: { id: sourceId, deletedAt: null },
    select: { workspaceId: true, workspace: { select: { slug: true } } },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: source.workspaceId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (member.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const reply = await AnnotationService.createReply(
      annotationId,
      source.workspaceId,
      sourceId,
      session.user.id,
      parsed.data,
    );

    const parent = await db.annotation.findUnique({
      where: { id: annotationId },
      select: { userId: true },
    });

    if (parent && parent.userId !== session.user.id) {
      const replier = await db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      await NotificationService.create(parent.userId, source.workspaceId, "ANNOTATION_REPLY", {
        title: `${replier?.name ?? "Someone"} replied to your annotation`,
        body: parsed.data.content.slice(0, 200),
        resourceId: annotationId,
        resourceUrl: `/ws/${source.workspace.slug}/sources/${sourceId}`,
      });
    }

    // Notify mentioned users in reply
    const mentionedIds = AnnotationService.parseMentions(parsed.data.content);
    const replier = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    for (const mentionedId of mentionedIds) {
      if (mentionedId === session.user.id || mentionedId === parent?.userId) continue;
      const mentionedMember = await db.member.findUnique({
        where: { workspaceId_userId: { workspaceId: source.workspaceId, userId: mentionedId } },
      });
      if (!mentionedMember) continue;
      await NotificationService.create(mentionedId, source.workspaceId, "MENTION", {
        title: `${replier?.name ?? "Someone"} mentioned you`,
        body: parsed.data.content.slice(0, 200),
        resourceId: annotationId,
        resourceUrl: `/ws/${source.workspace.slug}/sources/${sourceId}`,
      });
    }

    return NextResponse.json({ reply }, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "REPLY_LIMIT")
      return NextResponse.json({ error: "Reply limit reached" }, { status: 422 });
    throw e;
  }
}
