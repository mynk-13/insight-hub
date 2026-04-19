import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceService, invitationService } from "@/lib/modules/workspace";

type Params = { params: Promise<{ slug: string; invitationId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, invitationId } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await invitationService.revoke(invitationId, workspace.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "FORBIDDEN")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (err.message === "NOT_FOUND")
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (err.message === "INVITATION_INVALID") {
        return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 409 });
      }
    }
    throw err;
  }
}
