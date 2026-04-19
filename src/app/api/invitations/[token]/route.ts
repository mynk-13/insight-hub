import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { invitationService } from "@/lib/modules/workspace";
import { writeAuditLog } from "@/lib/modules/auth/audit";

const ActionSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

type Params = { params: Promise<{ token: string }> };

// GET — preview invitation details (unauthenticated OK for rendering the accept page)
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const invitation = await invitationService.getByToken(token);

  if (!invitation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Don't expose internal IDs or sensitive fields
  return NextResponse.json({
    workspaceName: invitation.workspace.name,
    workspaceSlug: invitation.workspace.slug,
    workspaceAvatar: invitation.workspace.avatarUrl,
    inviterName: invitation.invitedBy.name ?? invitation.invitedBy.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
  });
}

// POST — accept or decline
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { token } = await params;
  const body: unknown = await req.json();
  const parsed = ActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  try {
    if (parsed.data.action === "accept") {
      const result = await invitationService.accept(token, session.user.id);
      await writeAuditLog({
        action: "MEMBER_JOINED",
        userId: session.user.id,
        workspaceId: result.workspaceId,
        metadata: { via: "invitation" },
      });
      return NextResponse.json({ slug: result.slug });
    } else {
      await invitationService.decline(token, session.user.id);
      return new NextResponse(null, { status: 204 });
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND")
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (err.message === "INVITATION_INVALID") {
        return NextResponse.json({ error: "This invitation is no longer valid" }, { status: 409 });
      }
      if (err.message === "INVITATION_EXPIRED") {
        return NextResponse.json({ error: "This invitation has expired" }, { status: 410 });
      }
      if (err.message === "EMAIL_MISMATCH") {
        return NextResponse.json(
          { error: "This invitation was sent to a different email address" },
          { status: 403 },
        );
      }
    }
    throw err;
  }
}
