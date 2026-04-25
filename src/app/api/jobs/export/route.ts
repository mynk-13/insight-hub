import { NextResponse } from "next/server";
import { jobQueue } from "@/lib/shared/queue";
import { processExportJob } from "@/lib/modules/export";
import type { ExportJobPayload } from "@/lib/shared/queue";

// POST /api/jobs/export — Vercel Cron worker.
// Protected by x-cron-secret header (same secret as /api/jobs/reconcile).
export async function POST(req: Request) {
  const cronSecret = req.headers.get("x-cron-secret");
  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const job = await jobQueue.dequeue<ExportJobPayload>("export");
  if (!job) {
    return NextResponse.json({ processed: 0 });
  }

  await processExportJob(job.payload.jobId);

  return NextResponse.json({ processed: 1, jobId: job.payload.jobId });
}
