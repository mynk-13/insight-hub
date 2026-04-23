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

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const ctx = await getWorkspaceAndRole(slug, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const collections = await CollectionService.list(ctx.ws.id);
  return NextResponse.json({ collections });
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const ctx = await getWorkspaceAndRole(slug, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(ctx.role, "sources:upload")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const collection = await CollectionService.create(
    ctx.ws.id,
    session.user.id,
    parsed.data.name,
    parsed.data.description,
  );
  return NextResponse.json({ collection }, { status: 201 });
}
