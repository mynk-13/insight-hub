import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/shared/db";
import { CollectionService } from "@/lib/modules/workspace/collection";
import { canPerform } from "@/lib/modules/workspace/permission";

async function getWorkspaceAndRole(slug: string, userId: string) {
  const ws = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId }, select: { role: true } } },
  });
  if (!ws || ws.members.length === 0) return null;
  return { ws, role: ws.members[0].role };
}

type RouteParams = { params: Promise<{ slug: string; id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const ctx = await getWorkspaceAndRole(slug, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const collection = await CollectionService.get(id, ctx.ws.id);
  if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ collection });
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  pin: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const ctx = await getWorkspaceAndRole(slug, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(ctx.role, "sources:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { pin, ...rest } = parsed.data;

  try {
    let collection;
    if (pin !== undefined) {
      collection = await CollectionService.togglePin(id, ctx.ws.id);
    } else {
      collection = await CollectionService.update(id, ctx.ws.id, rest);
    }
    return NextResponse.json({ collection });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === "MAX_PINNED_EXCEEDED") {
      return NextResponse.json({ error: "Maximum 5 pinned collections allowed" }, { status: 422 });
    }
    throw err;
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug, id } = await params;
  const ctx = await getWorkspaceAndRole(slug, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(ctx.role, "sources:delete")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await CollectionService.softDelete(id, ctx.ws.id);
  return NextResponse.json({ ok: true });
}
