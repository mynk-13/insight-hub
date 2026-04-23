import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { AnnotationService, NotificationService } from "@/lib/modules/annotations";

export async function PATCH(
  _req: NextRequest,
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

  try {
    const annotation = await AnnotationService.toggleResolve(
      annotationId,
      source.workspaceId,
      session.user.id,
      member.role,
    );

    if (annotation.isResolved && annotation.userId !== session.user.id) {
      const resolver = await db.user.findUnique({
        where: { id: session.user.id },
        select: { name: true },
      });
      await NotificationService.create(
        annotation.userId,
        source.workspaceId,
        "ANNOTATION_RESOLVED",
        {
          title: `${resolver?.name ?? "Someone"} resolved your annotation`,
          resourceId: annotationId,
          resourceUrl: `/ws/${source.workspace.slug}/sources/${sourceId}`,
        },
      );
    }

    return NextResponse.json({ annotation });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    throw e;
  }
}
