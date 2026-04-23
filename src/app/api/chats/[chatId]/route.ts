import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";

export async function GET(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;

  const chat = await db.chat.findFirst({
    where: { id: chatId, userId: session.user.id, deletedAt: null },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          citations: true,
          model: true,
          tokensIn: true,
          tokensOut: true,
          retrievalMs: true,
          generationMs: true,
          createdAt: true,
        },
      },
    },
  });

  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ chat });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ chatId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { chatId } = await params;

  const chat = await db.chat.findFirst({
    where: { id: chatId, userId: session.user.id, deletedAt: null },
    select: { id: true },
  });
  if (!chat) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.chat.update({
    where: { id: chatId },
    data: { deletedAt: new Date() },
  });

  return new NextResponse(null, { status: 204 });
}
