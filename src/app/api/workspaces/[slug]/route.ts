import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { writeAuditLog } from "@/lib/modules/auth/audit";

const UpdateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(workspace);
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body: unknown = await req.json();
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  }

  try {
    const updated = await workspaceService.update(workspace.id, session.user.id, parsed.data);
    await writeAuditLog({
      action: "WORKSPACE_UPDATED",
      userId: session.user.id,
      workspaceId: workspace.id,
      metadata: parsed.data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof Error && err.message === "SLUG_TAKEN") {
      return NextResponse.json({ error: "That workspace URL is already taken." }, { status: 409 });
    }
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
    await workspaceService.softDelete(workspace.id, session.user.id);
    await writeAuditLog({
      action: "WORKSPACE_DELETED",
      userId: session.user.id,
      workspaceId: workspace.id,
      metadata: { slug },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (err instanceof Error && err.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }
}
