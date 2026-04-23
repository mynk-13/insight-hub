import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { NotificationService } from "@/lib/modules/annotations";

async function getWorkspaceId(req: NextRequest, userId: string): Promise<string | null> {
  const slug = req.nextUrl.searchParams.get("workspace");
  if (!slug) return null;
  const ws = await db.workspace.findUnique({
    where: { slug, deletedAt: null },
    select: { id: true },
  });
  if (!ws) return null;
  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: ws.id, userId } },
  });
  return member ? ws.id : null;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(req, session.user.id);
  if (!workspaceId)
    return NextResponse.json({ error: "workspace param required" }, { status: 400 });

  const [notifications, unreadCount] = await Promise.all([
    NotificationService.list(session.user.id, workspaceId),
    NotificationService.unreadCount(session.user.id, workspaceId),
  ]);

  return NextResponse.json({ notifications, unreadCount });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const workspaceId = await getWorkspaceId(req, session.user.id);
  if (!workspaceId)
    return NextResponse.json({ error: "workspace param required" }, { status: 400 });

  await NotificationService.markAllRead(session.user.id, workspaceId);
  return NextResponse.json({ ok: true });
}
