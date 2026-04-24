import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "Missing slug" }, { status: 400 });

  const workspace = await db.workspace.findUnique({
    where: { slug },
    select: { id: true, tier: true },
  });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sub = await db.subscription.findUnique({
    where: { workspaceId: workspace.id },
    select: {
      tier: true,
      gateway: true,
      status: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return NextResponse.json({ tier: workspace.tier, subscription: sub });
}
