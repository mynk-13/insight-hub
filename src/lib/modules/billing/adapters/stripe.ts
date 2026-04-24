import "server-only";
import Stripe from "stripe";
import type {
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  NormalizedSubscriptionEvent,
  PaymentGatewayAdapter,
} from "../types";

let _stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-04-22.dahlia",
    });
  }
  return _stripe;
}

export class StripeAdapter implements PaymentGatewayAdapter {
  readonly gateway = "STRIPE" as const;

  async createSubscription(params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer_email: params.userEmail,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "InsightHub Pro",
              description: "Unlimited workspaces, sources, and queries",
            },
            unit_amount: 1900,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      metadata: { workspaceId: params.workspaceId, userId: params.userId },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    });
    return { redirectUrl: session.url, gatewaySubId: null, gatewayKey: null };
  }

  async cancelSubscription(gatewaySubId: string): Promise<void> {
    const stripe = getStripe();
    await stripe.subscriptions.update(gatewaySubId, { cancel_at_period_end: true });
  }

  async getPortalUrl(gatewaySubId: string, returnUrl: string): Promise<string> {
    const stripe = getStripe();
    const sub = await stripe.subscriptions.retrieve(gatewaySubId);
    const session = await stripe.billingPortal.sessions.create({
      customer: sub.customer as string,
      return_url: returnUrl,
    });
    return session.url;
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    const stripe = getStripe();
    const sig = headers["stripe-signature"];
    if (!sig) return false;
    try {
      stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
      return true;
    } catch {
      return false;
    }
  }

  normalizeEvent(payload: unknown): NormalizedSubscriptionEvent | null {
    // payload is the already-parsed Stripe event object
    const event = payload as Stripe.Event;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : ((session.subscription as Stripe.Subscription | null)?.id ?? "");
        return {
          type: "subscription.activated",
          gateway: "STRIPE",
          gatewayEventId: event.id,
          gatewaySubId: subId,
          workspaceId: session.metadata?.workspaceId,
          cancelAtPeriodEnd: false,
          rawPayload: event,
        };
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any;
        const subId: string =
          (typeof invoice.subscription === "string" ? invoice.subscription : null) ??
          invoice.parent?.subscription_details?.subscription ??
          "";
        const lines = invoice.lines?.data?.[0];
        return {
          type: event.type === "invoice.paid" ? "payment.succeeded" : "payment.failed",
          gateway: "STRIPE",
          gatewayEventId: event.id,
          gatewaySubId: subId,
          workspaceId: invoice.metadata?.workspaceId,
          currentPeriodStart: lines?.period?.start
            ? new Date(lines.period.start * 1000)
            : undefined,
          currentPeriodEnd: lines?.period?.end ? new Date(lines.period.end * 1000) : undefined,
          rawPayload: event,
        };
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any;
        const start: number = sub.current_period_start ?? sub.billing_cycle_anchor ?? 0;
        const end: number = sub.current_period_end ?? 0;
        return {
          type:
            event.type === "customer.subscription.updated"
              ? "subscription.updated"
              : "subscription.canceled",
          gateway: "STRIPE",
          gatewayEventId: event.id,
          gatewaySubId: sub.id,
          workspaceId: sub.metadata?.workspaceId,
          currentPeriodStart: start ? new Date(start * 1000) : undefined,
          currentPeriodEnd: end ? new Date(end * 1000) : undefined,
          cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
          rawPayload: event,
        };
      }
      default:
        return null;
    }
  }
}
