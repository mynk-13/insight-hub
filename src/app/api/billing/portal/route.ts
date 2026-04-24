import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { getAdapter } from "@/lib/modules/billing";
import { canPerform } from "@/lib/modules/workspace/permission";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const workspace = await db.workspace.findUnique({ where: { slug }, select: { id: true } });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member || !canPerform(member.role, "billing:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sub = await db.subscription.findUnique({ where: { workspaceId: workspace.id } });
  if (!sub?.gatewaySubId) return NextResponse.json({ error: "No subscription" }, { status: 404 });

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/ws/${slug}/settings/billing`;
  const adapter = getAdapter(sub.gateway);
  const url = await adapter.getPortalUrl(sub.gatewaySubId, returnUrl);
  return NextResponse.redirect(url);
}
