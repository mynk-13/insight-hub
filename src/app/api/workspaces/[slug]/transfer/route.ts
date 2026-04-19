import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService, invitationService } from "@/lib/modules/workspace";
import { writeAuditLog } from "@/lib/modules/auth/audit";

const InitiateSchema = z.object({ targetUserId: z.string().cuid() });

type Params = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = InitiateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  try {
    await invitationService.initiateOwnershipTransfer(
      workspace.id,
      session.user.id,
      parsed.data.targetUserId,
    );
    await writeAuditLog({
      action: "OWNERSHIP_TRANSFERRED",
      userId: session.user.id,
      workspaceId: workspace.id,
      metadata: { targetUserId: parsed.data.targetUserId, status: "initiated" },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "FORBIDDEN")
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      if (err.message === "TARGET_NOT_MEMBER") {
        return NextResponse.json(
          { error: "Target user is not a member of this workspace" },
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

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await invitationService.cancelOwnershipTransfer(workspace.id, session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
