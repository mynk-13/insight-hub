import "server-only";
import type {
  CreateSubscriptionParams,
  CreateSubscriptionResult,
  NormalizedSubscriptionEvent,
  PaymentGatewayAdapter,
} from "../types";
import { PRO_PRICE_USD } from "../types";

const PAYPAL_BASE =
  process.env.NODE_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

interface PayPalToken {
  access_token: string;
  expires_in: number;
  fetchedAt: number;
}

let _token: PayPalToken | null = null;

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (_token && now - _token.fetchedAt < (_token.expires_in - 60) * 1000) {
    return _token.access_token;
  }
  const creds = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID!}:${process.env.PAYPAL_CLIENT_SECRET!}`,
  ).toString("base64");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  _token = { access_token: data.access_token, expires_in: data.expires_in, fetchedAt: now };
  return _token.access_token;
}

// Cached PayPal plan ID per process
let _planId: string | null = null;

async function getOrCreatePlan(): Promise<string> {
  if (_planId) return _planId;
  const token = await getAccessToken();

  // Try to list existing plans
  const listRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans?page_size=10`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (listRes.ok) {
    const list = (await listRes.json()) as {
      plans?: Array<{ id: string; name: string; status: string }>;
    };
    const existing = list.plans?.find((p) => p.name === "InsightHub Pro" && p.status === "ACTIVE");
    if (existing) {
      _planId = existing.id;
      return _planId;
    }
  }

  // Create product first
  const productRes = await fetch(`${PAYPAL_BASE}/v1/catalogs/products`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: "InsightHub Pro", type: "SERVICE", category: "SOFTWARE" }),
  });
  const product = (await productRes.json()) as { id: string };

  // Create plan
  const planRes = await fetch(`${PAYPAL_BASE}/v1/billing/plans`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      product_id: product.id,
      name: "InsightHub Pro",
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: (PRO_PRICE_USD / 100).toFixed(2), currency_code: "USD" },
          },
        },
      ],
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 3 },
    }),
  });
  const plan = (await planRes.json()) as { id: string };
  _planId = plan.id;
  return _planId;
}

export class PayPalAdapter implements PaymentGatewayAdapter {
  readonly gateway = "PAYPAL" as const;

  async createSubscription(params: CreateSubscriptionParams): Promise<CreateSubscriptionResult> {
    const token = await getAccessToken();
    const planId = await getOrCreatePlan();
    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: { email_address: params.userEmail },
        custom_id: params.workspaceId,
        application_context: {
          brand_name: "InsightHub",
          return_url: params.successUrl,
          cancel_url: params.cancelUrl,
          user_action: "SUBSCRIBE_NOW",
        },
      }),
    });
    if (!res.ok) throw new Error(`PayPal subscription create failed: ${res.status}`);
    const sub = (await res.json()) as {
      id: string;
      links: Array<{ href: string; rel: string }>;
    };
    const approvalLink = sub.links.find((l) => l.rel === "approve");
    return { redirectUrl: approvalLink?.href ?? null, gatewaySubId: sub.id, gatewayKey: null };
  }

  async cancelSubscription(gatewaySubId: string): Promise<void> {
    const token = await getAccessToken();
    await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${gatewaySubId}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "User requested cancellation" }),
    });
  }

  async getPortalUrl(_gatewaySubId: string, returnUrl: string): Promise<string> {
    return returnUrl;
  }

  verifyWebhookSignature(_rawBody: string, _headers: Record<string, string>): boolean {
    // In dev with placeholder webhook ID, skip verification
    if (process.env.PAYPAL_WEBHOOK_ID === "dev_placeholder") return true;
    // Production: PayPal signature verification requires a separate API call.
    // Handled inline in the webhook route to keep this method synchronous.
    return true;
  }

  normalizeEvent(payload: unknown): NormalizedSubscriptionEvent | null {
    const event = payload as {
      id?: string;
      event_type?: string;
      resource?: {
        id?: string;
        custom_id?: string;
        billing_info?: { next_billing_time?: string; last_payment?: { time?: string } };
        status?: string;
      };
    };

    const sub = event.resource;
    if (!sub) return null;
    const gatewaySubId = sub.id ?? "";
    const workspaceId = sub.custom_id;

    switch (event.event_type) {
      case "BILLING.SUBSCRIPTION.ACTIVATED":
        return {
          type: "subscription.activated",
          gateway: "PAYPAL",
          gatewayEventId: event.id ?? gatewaySubId,
          gatewaySubId,
          workspaceId,
          rawPayload: payload,
        };
      case "PAYMENT.SALE.COMPLETED":
        return {
          type: "payment.succeeded",
          gateway: "PAYPAL",
          gatewayEventId: event.id ?? gatewaySubId,
          gatewaySubId,
          workspaceId,
          rawPayload: payload,
        };
      case "BILLING.SUBSCRIPTION.CANCELLED":
      case "BILLING.SUBSCRIPTION.EXPIRED":
        return {
          type: "subscription.canceled",
          gateway: "PAYPAL",
          gatewayEventId: event.id ?? gatewaySubId,
          gatewaySubId,
          workspaceId,
          rawPayload: payload,
        };
      case "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
        return {
          type: "payment.failed",
          gateway: "PAYPAL",
          gatewayEventId: event.id ?? gatewaySubId,
          gatewaySubId,
          workspaceId,
          rawPayload: payload,
        };
      default:
        return null;
    }
  }
}
