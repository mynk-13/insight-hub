import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const members = await workspaceService.listMembers(workspace.id, session.user.id);
    return NextResponse.json(members);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
