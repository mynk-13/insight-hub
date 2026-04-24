import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/modules/billing";
import { handleNormalizedEvent } from "@/lib/modules/billing";
import { markUnhealthy, markHealthy } from "@/lib/modules/billing";
import { logger } from "@/lib/shared/logger";

export const config = { api: { bodyParser: false } };

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  const adapter = getAdapter("STRIPE");
  if (!adapter.verifyWebhookSignature(rawBody, headers)) {
    logger.warn("stripe_webhook_invalid_signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const event = adapter.normalizeEvent(payload);
    if (event) {
      await handleNormalizedEvent(event);
      await markHealthy("STRIPE");
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("stripe_webhook_error", { err });
    await markUnhealthy("STRIPE");
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
