import "server-only";
import type {
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  NormalizedSubscriptionEvent,
  PaymentGatewayAdapter,
} from "../types";

/**
 * BillDesk adapter stub — full interface implemented, no live integration.
 * BillDesk requires Indian business registration and partner onboarding.
 * Replace credentials in env vars and remove this comment when credentials are available.
 */
export class BillDeskAdapter implements PaymentGatewayAdapter {
  readonly gateway = "BILLDESK" as const;

  async createSubscription(_params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
    throw new Error(
      "BillDesk integration requires partner onboarding. Use Razorpay for India payments.",
    );
  }

  async cancelSubscription(_gatewaySubId: string): Promise<void> {
    throw new Error("BillDesk not configured.");
  }

  async getPortalUrl(_gatewaySubId: string, returnUrl: string): Promise<string> {
    return returnUrl;
  }

  verifyWebhookSignature(_rawBody: string, _headers: Record<string, string>): boolean {
    return false;
  }

  normalizeEvent(_payload: unknown): NormalizedSubscriptionEvent | null {
    return null;
  }
}
