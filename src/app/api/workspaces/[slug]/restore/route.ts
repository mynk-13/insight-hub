import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/shared/db";
import { canPerform } from "@/lib/modules/workspace/permission";
import { restoreWorkspace } from "@/lib/modules/export";

type Params = { params: Promise<{ slug: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;

  // Include deleted workspaces in this lookup so Owner can restore
  const workspace = await prisma.workspace.findFirst({ where: { slug } });
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await prisma.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(member.role, "workspace:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await restoreWorkspace(workspace.id);
    return NextResponse.json({ restored: true });
  } catch (err) {
    if (err instanceof Error && err.message === "RESTORE_WINDOW_EXPIRED") {
      return NextResponse.json(
        { error: "The 30-day restore window has expired." },
        { status: 422 },
      );
    }
    if (err instanceof Error && err.message === "WORKSPACE_NOT_DELETED") {
      return NextResponse.json({ error: "Workspace is not deleted." }, { status: 422 });
    }
    throw err;
  }
}
