import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/shared/queue";
import { runIngestionPipeline } from "@/lib/modules/ingestion";
import type { IngestionJobPayload } from "@/lib/shared/queue";

// Called by Vercel Cron (configured in vercel.json) or manually via POST.
// Processes one job per invocation — Vercel cron calls this every minute.
export async function POST(request: Request): Promise<Response> {
  // Verify cron secret to prevent unauthenticated trigger
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await jobQueue.dequeue<IngestionJobPayload>("ingestion");
  if (!job) return NextResponse.json({ processed: 0 });

  const { sourceId, workspaceId } = job.payload;

  try {
    await runIngestionPipeline(sourceId, workspaceId);
    return NextResponse.json({ processed: 1, sourceId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // DUPLICATE errors are handled inside the pipeline — not a worker failure
    if (message.startsWith("DUPLICATE:")) {
      return NextResponse.json({ processed: 1, duplicate: true, sourceId });
    }
    return NextResponse.json({ processed: 1, error: message, sourceId }, { status: 500 });
  }
}
