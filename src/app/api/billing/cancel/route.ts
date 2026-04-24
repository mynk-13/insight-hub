import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { getAdapter } from "@/lib/modules/billing";
import { canPerform } from "@/lib/modules/workspace/permission";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ workspaceSlug: z.string() });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const workspace = await db.workspace.findUnique({
    where: { slug: parsed.data.workspaceSlug },
    select: { id: true },
  });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member || !canPerform(member.role, "billing:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sub = await db.subscription.findUnique({ where: { workspaceId: workspace.id } });
  if (!sub || sub.status === "CANCELED") {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  const adapter = getAdapter(sub.gateway);
  await adapter.cancelSubscription(sub.gatewaySubId!);
  await db.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true },
  });

  return NextResponse.json({ ok: true });
}
