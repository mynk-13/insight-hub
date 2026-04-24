import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";
import type {
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  NormalizedSubscriptionEvent,
  PaymentGatewayAdapter,
} from "../types";
import { PRO_PRICE_INR as PRICE_INR } from "../types";

let _razorpay: Razorpay | null = null;
function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _razorpay;
}

// Lazily created plan ID — cached in module scope for the process lifetime
let _planId: string | null = null;

async function getOrCreatePlan(): Promise<string> {
  if (_planId) return _planId;
  const rz = getRazorpay();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans = await (rz.plans as any).all({ count: 10 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = plans.items?.find((p: any) => p.item?.name === "InsightHub Pro Monthly");
  if (existing) {
    _planId = existing.id as string;
    return _planId;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plan = await (rz.plans as any).create({
    period: "monthly",
    interval: 1,
    item: {
      name: "InsightHub Pro Monthly",
      amount: PRICE_INR,
      unit_amount: PRICE_INR,
      currency: "INR",
    },
  });
  _planId = plan.id as string;
  return _planId;
}

export class RazorpayAdapter implements PaymentGatewayAdapter {
  readonly gateway = "RAZORPAY" as const;

  async createSubscription(params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
    const isPlaceholder = process.env.RAZORPAY_KEY_ID === "rzp_test_placeholder";
    if (isPlaceholder) {
      return {
        redirectUrl: null,
        gatewaySubId: "rzp_placeholder_sub",
        gatewayKey: "rzp_test_placeholder",
      };
    }
    const rz = getRazorpay();
    const planId = await getOrCreatePlan();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = await (rz.subscriptions as any).create({
      plan_id: planId,
      customer_notify: 1,
      quantity: 1,
      total_count: 120,
      notes: { workspaceId: params.workspaceId, userId: params.userId },
    });
    return {
      redirectUrl: null,
      gatewaySubId: sub.id as string,
      gatewayKey: process.env.RAZORPAY_KEY_ID!,
    };
  }

  async cancelSubscription(gatewaySubId: string): Promise<void> {
    if (gatewaySubId === "rzp_placeholder_sub") return;
    const rz = getRazorpay();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (rz.subscriptions as any).cancel(gatewaySubId, { cancel_at_cycle_end: 1 });
  }

  async getPortalUrl(_gatewaySubId: string, returnUrl: string): Promise<string> {
    // Razorpay has no hosted billing portal; redirect to settings
    return returnUrl;
  }

  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean {
    if (process.env.RAZORPAY_WEBHOOK_SECRET === "razorpay_webhook_placeholder") return true;
    const sig = headers["x-razorpay-signature"];
    if (!sig) return false;
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expected, "hex"));
  }

  normalizeEvent(payload: unknown): NormalizedSubscriptionEvent | null {
    const event = payload as {
      event?: string;
      payload?: {
        subscription?: {
          entity?: {
            id?: string;
            notes?: Record<string, string>;
            current_start?: number;
            current_end?: number;
            cancel_at_cycle_end?: boolean;
          };
        };
        payment?: { entity?: { id?: string } };
      };
    };

    const sub = event.payload?.subscription?.entity;
    if (!sub) return null;

    const gatewayEventId = `rzp_${event.event}_${sub.id}_${Date.now()}`;

    switch (event.event) {
      case "subscription.activated":
        return {
          type: "subscription.activated",
          gateway: "RAZORPAY",
          gatewayEventId,
          gatewaySubId: sub.id!,
          workspaceId: sub.notes?.workspaceId,
          currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : undefined,
          currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
          cancelAtPeriodEnd: sub.cancel_at_cycle_end ?? false,
          rawPayload: payload,
        };
      case "subscription.charged":
        return {
          type: "payment.succeeded",
          gateway: "RAZORPAY",
          gatewayEventId,
          gatewaySubId: sub.id!,
          workspaceId: sub.notes?.workspaceId,
          currentPeriodStart: sub.current_start ? new Date(sub.current_start * 1000) : undefined,
          currentPeriodEnd: sub.current_end ? new Date(sub.current_end * 1000) : undefined,
          rawPayload: payload,
        };
      case "subscription.cancelled":
        return {
          type: "subscription.canceled",
          gateway: "RAZORPAY",
          gatewayEventId,
          gatewaySubId: sub.id!,
          workspaceId: sub.notes?.workspaceId,
          rawPayload: payload,
        };
      case "payment.failed":
        return {
          type: "payment.failed",
          gateway: "RAZORPAY",
          gatewayEventId,
          gatewaySubId: sub.id!,
          workspaceId: sub.notes?.workspaceId,
          rawPayload: payload,
        };
      default:
        return null;
    }
  }
}
