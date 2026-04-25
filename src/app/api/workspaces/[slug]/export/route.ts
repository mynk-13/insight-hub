import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { canPerform } from "@/lib/modules/workspace/permission";
import { createExportJob } from "@/lib/modules/export";
import { jobQueue } from "@/lib/shared/queue";
import type { ExportJobPayload } from "@/lib/shared/queue";

const ExportBodySchema = z.object({
  format: z.enum(["zip", "md", "notion"]),
});

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(workspace.role, "workspace:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body: unknown = await req.json();
  const parsed = ExportBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  const jobId = await createExportJob(workspace.id, session.user.id, parsed.data.format);

  const payload: ExportJobPayload = {
    jobId,
    workspaceId: workspace.id,
    userId: session.user.id,
    format: parsed.data.format,
  };
  await jobQueue.enqueue<ExportJobPayload>("export", "export:workspace", payload);

  return NextResponse.json({ jobId }, { status: 202 });
}
