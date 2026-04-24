import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { runDunning, runReconciliation } from "@/lib/modules/billing";
import { logger } from "@/lib/shared/logger";

export async function POST(req: NextRequest) {
  // Validate internal cron secret to prevent external invocation
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await runReconciliation();
    await runDunning();
    logger.info("reconcile_cron_success");
    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error("reconcile_cron_error", { err });
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
