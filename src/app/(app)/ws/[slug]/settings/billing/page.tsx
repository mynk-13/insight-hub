import { Suspense } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { BillingStatus } from "@/components/features/billing/billing-status";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ success?: string; canceled?: string }>;
}

export default function BillingSettingsPage(props: Props) {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading billing…</div>}>
      <BillingSettingsContent {...props} />
    </Suspense>
  );
}

async function BillingSettingsContent({ params, searchParams }: Props) {
  const { slug } = await params;
  const { success, canceled } = await searchParams;

  const session = await auth();
  if (!session?.user?.id) return notFound();

  const workspace = await db.workspace.findUnique({
    where: { slug },
    select: { id: true, tier: true },
  });
  if (!workspace) return notFound();

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member) return notFound();

  const sub = await db.subscription.findUnique({
    where: { workspaceId: workspace.id },
    select: {
      status: true,
      gateway: true,
      currentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Manage your subscription and payment method.
        </p>
      </div>

      {success === "1" && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Your workspace has been upgraded to Pro. Welcome!
        </div>
      )}
      {canceled === "1" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Checkout was canceled. No charge was made.
        </div>
      )}

      <BillingStatus
        workspaceSlug={slug}
        tier={workspace.tier}
        subscription={
          sub
            ? {
                status: sub.status,
                gateway: sub.gateway,
                currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
                cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
              }
            : null
        }
      />

      <div className="rounded-lg border p-4 space-y-2">
        <h2 className="text-sm font-medium">Plan Limits</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Sources</p>
            <p className="font-medium">{workspace.tier === "PRO" ? "Unlimited" : "10"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Queries / month</p>
            <p className="font-medium">{workspace.tier === "PRO" ? "2,000 / day" : "50"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">LLM models</p>
            <p className="font-medium">
              {workspace.tier === "PRO" ? "GPT-4o + Claude Sonnet" : "GPT-4o-mini + Claude Haiku"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Workspaces</p>
            <p className="font-medium">{workspace.tier === "PRO" ? "Unlimited" : "1"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
