import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/lib/shared/db";

const TERMINAL_STATUSES = new Set(["INDEXED", "FAILED"]);
const POLL_INTERVAL_MS = 1500;
const MAX_WAIT_MS = 5 * 60 * 1000; // 5 minutes

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const source = await db.source.findUnique({
    where: { id, deletedAt: null },
    select: { workspaceId: true, status: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: source.workspaceId, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const startedAt = Date.now();

      // If already terminal, emit once and close
      if (TERMINAL_STATUSES.has(source.status)) {
        send({ status: source.status, sourceId: id });
        controller.close();
        return;
      }

      send({ status: source.status, sourceId: id });

      while (Date.now() - startedAt < MAX_WAIT_MS) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const current = await db.source.findUnique({
          where: { id },
          select: { status: true },
        });

        if (!current) break;

        send({ status: current.status, sourceId: id });

        if (TERMINAL_STATUSES.has(current.status)) break;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
