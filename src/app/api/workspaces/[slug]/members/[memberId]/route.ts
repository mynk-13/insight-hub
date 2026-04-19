import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { writeAuditLog } from "@/lib/modules/auth/audit";
import { Role } from "@prisma/client";

const PatchSchema = z.object({
  role: z.nativeEnum(Role),
});

type Params = { params: Promise<{ slug: string; memberId: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, memberId } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  try {
    await workspaceService.changeMemberRole(
      workspace.id,
      session.user.id,
      memberId,
      parsed.data.role,
    );
    await writeAuditLog({
      action: "ROLE_CHANGED",
      userId: session.user.id,
      workspaceId: workspace.id,
      metadata: { memberId, newRole: parsed.data.role },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "FORBIDDEN")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (err.message === "NOT_FOUND")
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      if (err.message === "CANNOT_CHANGE_OWNER_ROLE") {
        return NextResponse.json(
          { error: "Cannot change the workspace owner's role" },
          { status: 422 },
        );
      }
    }
    throw err;
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, memberId } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await workspaceService.removeMember(workspace.id, session.user.id, memberId);
    await writeAuditLog({
      action: "MEMBER_REMOVED",
      userId: session.user.id,
      workspaceId: workspace.id,
      metadata: { memberId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "FORBIDDEN")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (err.message === "NOT_FOUND")
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
      if (err.message === "CANNOT_REMOVE_OWNER") {
        return NextResponse.json({ error: "Cannot remove the workspace owner" }, { status: 422 });
      }
    }
    throw err;
  }
}
