import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService, invitationService } from "@/lib/modules/workspace";
import { writeAuditLog } from "@/lib/modules/auth/audit";
import { Role } from "@prisma/client";

const InviteSchema = z.object({
  email: z.string().email(),
  role: z.nativeEnum(Role).refine((r) => r !== "OWNER", {
    message: "Use /transfer endpoint for ownership transfer",
  }),
});

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const invitations = await invitationService.listPending(workspace.id, session.user.id);
    return NextResponse.json(invitations);
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = InviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  try {
    await invitationService.send(
      workspace.id,
      session.user.id,
      parsed.data.email,
      parsed.data.role,
    );
    await writeAuditLog({
      action: "MEMBER_INVITED",
      userId: session.user.id,
      workspaceId: workspace.id,
      metadata: { email: parsed.data.email, role: parsed.data.role },
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
