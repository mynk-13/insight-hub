import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { CollectionService } from "@/lib/modules/workspace/collection";
import { canPerform } from "@/lib/modules/workspace/permission";

async function getWorkspaceAndRole(slug: string, userId: string) {
  const ws = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId }, select: { role: true } } },
  });
  if (!ws || ws.members.length === 0) return null;
  return { ws, role: ws.members[0].role };
}

type RouteParams = { params: Promise<{ slug: string; id: string; sourceId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id, sourceId } = await params;
  const ctx = await getWorkspaceAndRole(slug, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(ctx.role, "sources:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await CollectionService.removeSource(id, sourceId, ctx.ws.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
