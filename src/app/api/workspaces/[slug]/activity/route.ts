import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20", 10), 100);

  try {
    const events = await workspaceService.getActivity(workspace.id, session.user.id, cursor, limit);
    const nextCursor = events.length === limit ? events[events.length - 1]?.id : undefined;
    return NextResponse.json({ events, nextCursor });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
