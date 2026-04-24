import "server-only";
import { CircuitBreaker } from "@/lib/shared/circuit-breaker";
import { cache } from "@/lib/shared/cache";
import { CacheKeys } from "@/lib/shared/cache";
import type { PaymentGatewayAdapter, GatewayHealth } from "./types";
import { StripeAdapter } from "./adapters/stripe";
import { RazorpayAdapter } from "./adapters/razorpay";
import { PayPalAdapter } from "./adapters/paypal";
import { BillDeskAdapter } from "./adapters/billdesk";

const adapters: Record<string, PaymentGatewayAdapter> = {
  STRIPE: new StripeAdapter(),
  RAZORPAY: new RazorpayAdapter(),
  PAYPAL: new PayPalAdapter(),
  BILLDESK: new BillDeskAdapter(),
};

const breakers: Record<string, CircuitBreaker<unknown>> = {
  STRIPE: new CircuitBreaker("stripe", { failureThreshold: 3, successThreshold: 2, timeout: 5000 }),
  RAZORPAY: new CircuitBreaker("razorpay", {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 5000,
  }),
  PAYPAL: new CircuitBreaker("paypal", { failureThreshold: 3, successThreshold: 2, timeout: 5000 }),
};

export function getAdapter(gateway: string): PaymentGatewayAdapter {
  const adapter = adapters[gateway];
  if (!adapter) throw new Error(`Unknown gateway: ${gateway}`);
  return adapter;
}

export function getBreaker(gateway: string): CircuitBreaker<unknown> {
  return breakers[gateway] ?? breakers["STRIPE"];
}

async function isHealthy(gateway: string): Promise<boolean> {
  const key = CacheKeys.gatewayHealth(gateway);
  const cached = await cache.get<GatewayHealth>(key);
  if (cached !== null) return cached.healthy;
  // Default to healthy if no cached state
  return true;
}

export async function markUnhealthy(gateway: string): Promise<void> {
  const key = CacheKeys.gatewayHealth(gateway);
  await cache.set<GatewayHealth>(key, { healthy: false, checkedAt: Date.now() });
}

export async function markHealthy(gateway: string): Promise<void> {
  const key = CacheKeys.gatewayHealth(gateway);
  await cache.set<GatewayHealth>(key, { healthy: true, checkedAt: Date.now() });
}

/**
 * Select the best gateway for the given country code.
 * India → Razorpay (primary), PayPal (fallback)
 * Others → Stripe (primary), PayPal (fallback)
 * Falls back through the chain until a healthy gateway is found.
 */
export async function selectGateway(countryCode?: string): Promise<string> {
  const isIndia = countryCode === "IN";
  const chain = isIndia ? ["RAZORPAY", "PAYPAL", "STRIPE"] : ["STRIPE", "PAYPAL"];

  for (const gw of chain) {
    if (await isHealthy(gw)) return gw;
  }
  // All unhealthy — return primary anyway and let the circuit breaker handle it
  return chain[0];
}
