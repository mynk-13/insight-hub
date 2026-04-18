import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/shared/db";
import { writeAuditLog } from "@/lib/modules/auth/audit";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9-]+$/, "Slug may only contain lowercase letters, numbers, and hyphens"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json();
  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 422 },
    );
  }

  const { name, slug } = parsed.data;
  const userId = session.user.id;

  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json(
      { error: "That workspace URL is already taken. Please choose another." },
      { status: 409 },
    );
  }

  const workspace = await prisma.$transaction(async (tx) => {
    const ws = await tx.workspace.create({
      data: { name, slug, ownerId: userId, tier: "FREE" },
    });
    await tx.member.create({
      data: { workspaceId: ws.id, userId, role: "OWNER" },
    });
    // Create default "Inbox" collection
    await tx.collection.create({
      data: {
        workspaceId: ws.id,
        name: "Inbox",
        isPinned: true,
        sortOrder: 0,
        createdById: userId,
      },
    });
    return ws;
  });

  await writeAuditLog({
    action: "WORKSPACE_CREATED",
    userId,
    workspaceId: workspace.id,
    metadata: { name, slug },
  });

  return NextResponse.json({ id: workspace.id, slug: workspace.slug }, { status: 201 });
}
