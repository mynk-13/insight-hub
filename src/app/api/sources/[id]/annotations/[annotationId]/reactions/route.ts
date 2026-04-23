import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { AnnotationService } from "@/lib/modules/annotations";
import { REACTION_EMOJI } from "@/lib/modules/annotations/types";

const reactionSchema = z.object({ emoji: z.enum(REACTION_EMOJI) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; annotationId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId, annotationId } = await params;

  const source = await db.source.findFirst({
    where: { id: sourceId, deletedAt: null },
    select: { workspaceId: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: source.workspaceId, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  try {
    const result = await AnnotationService.toggleReaction(
      annotationId,
      source.workspaceId,
      session.user.id,
      parsed.data.emoji,
    );
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    throw e;
  }
}
