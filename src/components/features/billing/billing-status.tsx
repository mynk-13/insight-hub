"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { UpgradeModal } from "./upgrade-modal";
import type { Tier, SubscriptionStatus, GatewayType } from "@prisma/client";

interface BillingStatusProps {
  workspaceSlug: string;
  tier: Tier;
  subscription: {
    status: SubscriptionStatus;
    gateway: GatewayType;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export function BillingStatus({ workspaceSlug, tier, subscription }: BillingStatusProps) {
  const [canceling, setCanceling] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the period ends.")) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      toast.success("Subscription will cancel at period end.");
      window.location.reload();
    } catch {
      toast.error("Failed to cancel subscription.");
    } finally {
      setCanceling(false);
    }
  }

  if (tier === "FREE" || !subscription) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Free Plan</p>
            <p className="text-sm text-muted-foreground">
              1 workspace · 10 sources · 50 queries/mo
            </p>
          </div>
          <UpgradeModal workspaceSlug={workspaceSlug} />
        </div>
      </Card>
    );
  }

  const periodEnd = new Date(subscription.currentPeriodEnd).toLocaleDateString();

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">Pro Plan</p>
            <Badge variant={subscription.status === "ACTIVE" ? "default" : "destructive"}>
              {subscription.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {subscription.cancelAtPeriodEnd ? `Cancels on ${periodEnd}` : `Renews on ${periodEnd}`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">via {subscription.gateway}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = `/api/billing/portal?slug=${workspaceSlug}`)}
          >
            Manage
          </Button>
          {!subscription.cancelAtPeriodEnd && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={canceling}
              className="text-destructive hover:text-destructive"
            >
              {canceling ? "Canceling..." : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
