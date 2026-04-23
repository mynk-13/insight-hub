import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { NotificationService } from "@/lib/modules/annotations";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ notifId: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { notifId } = await params;
  await NotificationService.markRead(notifId, session.user.id);
  return NextResponse.json({ ok: true });
}
