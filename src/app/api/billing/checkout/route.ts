import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { getAdapter, selectGateway } from "@/lib/modules/billing";
import { canPerform } from "@/lib/modules/workspace/permission";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  workspaceSlug: z.string(),
  gateway: z.enum(["STRIPE", "RAZORPAY", "PAYPAL"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { workspaceSlug, gateway: requestedGateway } = parsed.data;
  const workspace = await db.workspace.findUnique({
    where: { slug: workspaceSlug },
    select: { id: true, tier: true },
  });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member || !canPerform(member.role, "billing:manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (workspace.tier === "PRO") {
    return NextResponse.json({ error: "Already Pro" }, { status: 409 });
  }

  const countryCode = req.headers.get("x-vercel-ip-country") ?? undefined;
  const gatewayName = requestedGateway ?? (await selectGateway(countryCode));
  const adapter = getAdapter(gatewayName);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;
  const result = await adapter.createSubscription({
    workspaceId: workspace.id,
    workspaceSlug,
    userEmail: session.user.email!,
    userId: session.user.id,
    successUrl: `${appUrl}/ws/${workspaceSlug}/settings/billing?success=1`,
    cancelUrl: `${appUrl}/ws/${workspaceSlug}/settings/billing?canceled=1`,
  });

  return NextResponse.json(result);
}
