import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { canPerform } from "@/lib/modules/workspace/permission";

const CreateChatSchema = z.object({
  workspaceId: z.string().cuid(),
  contextType: z.enum(["WORKSPACE", "COLLECTION", "SOURCE"]).default("WORKSPACE"),
  contextId: z.string().cuid().optional(),
  title: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

  const member = await db.member.findFirst({
    where: { workspaceId, userId: session.user.id },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const chats = await db.chat.findMany({
    where: { workspaceId, userId: session.user.id, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      contextType: true,
      contextId: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { messages: true } },
    },
  });

  return NextResponse.json({ chats });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = CreateChatSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { workspaceId, contextType, contextId, title } = parsed.data;

  const member = await db.member.findFirst({
    where: { workspaceId, userId: session.user.id },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!canPerform(member.role, "chat:query")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const chat = await db.chat.create({
    data: {
      workspaceId,
      userId: session.user.id,
      contextType,
      contextId,
      title,
    },
    select: { id: true, contextType: true, contextId: true, createdAt: true },
  });

  return NextResponse.json({ chat }, { status: 201 });
}
