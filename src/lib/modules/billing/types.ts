import type { GatewayType } from "@prisma/client";

export type { GatewayType };

export const PRO_PRICE_USD = 19_00; // cents
export const PRO_PRICE_INR = 1499_00; // paise

export const DUNNING_DAYS = [1, 3, 5] as const;
export const GRACE_PERIOD_DAYS = 7;

export interface CreateSubscriptionParams {
  workspaceId: string;
  workspaceSlug: string;
  userEmail: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateSubscriptionResult {
  /** URL to redirect the user to (Stripe/PayPal) or null if modal-based (Razorpay) */
  redirectUrl: string | null;
  /** Razorpay subscription ID for client-side modal */
  gatewaySubId: string | null;
  /** Razorpay key for client-side modal */
  gatewayKey: string | null;
}

export type NormalizedEventType =
  | "subscription.activated"
  | "subscription.updated"
  | "subscription.canceled"
  | "payment.succeeded"
  | "payment.failed";

export interface NormalizedSubscriptionEvent {
  type: NormalizedEventType;
  gatewayEventId: string;
  gateway: GatewayType;
  gatewaySubId: string;
  workspaceId?: string;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd?: boolean;
  rawPayload: unknown;
}

export interface PaymentGatewayAdapter {
  readonly gateway: GatewayType;
  createSubscription(params: CreateSubscriptionParams): Promise<CreateSubscriptionResult>;
  cancelSubscription(gatewaySubId: string): Promise<void>;
  getPortalUrl(gatewaySubId: string, returnUrl: string): Promise<string>;
  verifyWebhookSignature(rawBody: string, headers: Record<string, string>): boolean;
  normalizeEvent(payload: unknown): NormalizedSubscriptionEvent | null;
}

export interface GatewayHealth {
  healthy: boolean;
  checkedAt: number;
}
