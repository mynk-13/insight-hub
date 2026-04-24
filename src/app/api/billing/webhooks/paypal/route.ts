import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getAdapter,
  handleNormalizedEvent,
  markHealthy,
  markUnhealthy,
} from "@/lib/modules/billing";
import { logger } from "@/lib/shared/logger";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    headers[k] = v;
  });

  const adapter = getAdapter("PAYPAL");
  if (!adapter.verifyWebhookSignature(rawBody, headers)) {
    logger.warn("paypal_webhook_invalid_signature");
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
      await markHealthy("PAYPAL");
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("paypal_webhook_error", { err });
    await markUnhealthy("PAYPAL");
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
