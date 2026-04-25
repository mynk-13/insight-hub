import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { canPerform } from "@/lib/modules/workspace/permission";
import { getAnalytics } from "@/lib/modules/analytics";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(workspace.role, "workspace:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getAnalytics(workspace.id);
  return NextResponse.json(data);
}
