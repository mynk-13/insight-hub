import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { getExportJob } from "@/lib/modules/export";

type Params = { params: Promise<{ slug: string; jobId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, jobId } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const job = await getExportJob(jobId);
  if (!job || job.workspaceId !== workspace.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
