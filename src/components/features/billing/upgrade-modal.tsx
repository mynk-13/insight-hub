"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface UpgradeModalProps {
  workspaceSlug: string;
  trigger?: React.ReactElement;
}

const FEATURES = [
  "Unlimited workspaces",
  "Unlimited sources",
  "2,000 queries/day",
  "GPT-4o + Claude Sonnet",
  "Priority support",
];

export function UpgradeModal({ workspaceSlug, trigger }: UpgradeModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  // Heuristic: India users get Razorpay/PayPal options; others get Stripe/PayPal
  const isIndia =
    typeof Intl !== "undefined" &&
    Intl.DateTimeFormat().resolvedOptions().timeZone === "Asia/Kolkata";

  async function checkout(gateway: "STRIPE" | "RAZORPAY" | "PAYPAL") {
    setLoading(gateway);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceSlug, gateway }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Checkout failed");
      }
      const data = (await res.json()) as {
        redirectUrl: string | null;
        gatewaySubId: string | null;
        gatewayKey: string | null;
      };

      if (gateway === "RAZORPAY" && data.gatewaySubId && data.gatewayKey) {
        await openRazorpayModal(data.gatewaySubId, data.gatewayKey);
        return;
      }

      if (data.redirectUrl) {
        window.location.assign(data.redirectUrl);
        return;
      }

      toast.error("Unable to start checkout. Please try another payment method.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  }

  async function openRazorpayModal(subscriptionId: string, key: string) {
    if (key === "rzp_test_placeholder") {
      toast.info("Razorpay requires business KYC. Please use Stripe or PayPal.");
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    document.body.appendChild(script);
    await new Promise<void>((resolve) => {
      script.onload = () => resolve();
    });

    const options = {
      key,
      subscription_id: subscriptionId,
      name: "InsightHub",
      description: "Pro Plan — Monthly",
      handler: () => {
        toast.success("Payment successful! Your workspace has been upgraded.");
        setOpen(false);
        window.location.reload();
      },
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    new (window as any).Razorpay(options).open();
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={trigger ?? <Button variant="default">Upgrade to Pro</Button>} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md rounded-xl border bg-background p-6 shadow-xl">
          <Dialog.Title className="text-xl font-semibold mb-1">Upgrade to Pro</Dialog.Title>
          <Dialog.Description className="text-sm text-muted-foreground mb-4">
            Unlock the full InsightHub experience.
          </Dialog.Description>

          <div className="mb-4 rounded-lg border p-4">
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-3xl font-bold">{isIndia ? "₹1,499" : "$19"}</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <ul className="space-y-1.5">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <span className="text-green-500">✓</span>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            {isIndia ? (
              <>
                <Button
                  className="w-full"
                  onClick={() => checkout("RAZORPAY")}
                  disabled={loading !== null}
                >
                  {loading === "RAZORPAY" ? "Opening..." : "Pay with Razorpay (UPI / Cards)"}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    India
                  </Badge>
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => checkout("PAYPAL")}
                  disabled={loading !== null}
                >
                  {loading === "PAYPAL" ? "Redirecting..." : "Pay with PayPal"}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => checkout("STRIPE")}
                  disabled={loading !== null}
                >
                  {loading === "STRIPE" ? "Redirecting..." : "Pay with Card (Stripe)"}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={() => checkout("STRIPE")}
                  disabled={loading !== null}
                >
                  {loading === "STRIPE" ? "Redirecting..." : "Pay with Card (Stripe)"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => checkout("PAYPAL")}
                  disabled={loading !== null}
                >
                  {loading === "PAYPAL" ? "Redirecting..." : "Pay with PayPal"}
                </Button>
              </>
            )}
          </div>

          <Dialog.Close
            render={
              <Button variant="ghost" className="mt-3 w-full text-sm text-muted-foreground" />
            }
          >
            Cancel
          </Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
