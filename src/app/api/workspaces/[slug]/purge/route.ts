import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { hardPurgeWorkspace } from "@/lib/modules/export";
import { writeAuditLog } from "@/lib/modules/auth/audit";

const PurgeBodySchema = z.object({
  confirmation: z.string(),
});

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (workspace.role !== "OWNER") {
    return NextResponse.json(
      { error: "Only the workspace owner can permanently delete." },
      { status: 403 },
    );
  }

  if (!workspace.deletedAt) {
    return NextResponse.json({ error: "Workspace must be soft-deleted first." }, { status: 422 });
  }

  const body: unknown = await req.json();
  const parsed = PurgeBodySchema.safeParse(body);
  if (!parsed.success || parsed.data.confirmation !== workspace.slug) {
    return NextResponse.json(
      { error: "Type the workspace slug to confirm permanent deletion." },
      { status: 422 },
    );
  }

  await writeAuditLog({
    action: "WORKSPACE_DELETED",
    userId: session.user.id,
    workspaceId: workspace.id,
    metadata: { slug, purge: true },
  });

  await hardPurgeWorkspace(workspace.id);

  return new NextResponse(null, { status: 204 });
}
