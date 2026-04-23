import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/shared/db";
import { canPerform } from "@/lib/modules/workspace/permission";
import { checkSourceQuota, validateUrl } from "@/lib/modules/ingestion";
import { jobQueue } from "@/lib/shared/queue";
import type { IngestionJobPayload } from "@/lib/shared/queue";

const Schema = z.object({
  workspaceId: z.string().min(1),
  url: z.string().url(),
});

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { workspaceId, url } = parsed.data;
  const userId = session.user.id;

  // RBAC
  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!member || !canPerform(member.role, "sources:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // SSRF validation (throws on invalid)
  try {
    validateUrl(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid URL" },
      { status: 400 },
    );
  }

  // Quota check
  try {
    await checkSourceQuota(workspaceId);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Quota exceeded" },
      { status: 402 },
    );
  }

  // Duplicate check by URL
  const existing = await db.source.findFirst({
    where: { workspaceId, url, deletedAt: null },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json(
      { error: "URL already ingested", sourceId: existing.id },
      { status: 409 },
    );
  }

  // Create source record
  const source = await db.source.create({
    data: {
      workspaceId,
      createdById: userId,
      title: new URL(url).hostname,
      type: "URL",
      url,
      status: "PENDING",
    },
    select: { id: true },
  });

  // Enqueue ingestion job
  await jobQueue.enqueue<IngestionJobPayload>("ingestion", "source:ingest", {
    sourceId: source.id,
    workspaceId,
    userId,
  });

  return NextResponse.json({ sourceId: source.id }, { status: 201 });
}
