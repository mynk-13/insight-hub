import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/shared/db";
import { getSearchHistory, clearSearchHistory } from "@/lib/modules/search";

const querySchema = z.object({ workspace: z.string().min(1) });

async function resolveWorkspace(slug: string, userId: string) {
  return db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId }, select: { role: true } } },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Missing workspace" }, { status: 400 });

  const ws = await resolveWorkspace(parsed.data.workspace, session.user.id);
  if (!ws || ws.members.length === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const history = await getSearchHistory(session.user.id, ws.id);
  return NextResponse.json({ history });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Missing workspace" }, { status: 400 });

  const ws = await resolveWorkspace(parsed.data.workspace, session.user.id);
  if (!ws || ws.members.length === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  await clearSearchHistory(session.user.id, ws.id);
  return NextResponse.json({ ok: true });
}
