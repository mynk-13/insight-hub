import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/shared/db";

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const ws = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId: session.user.id }, select: { role: true } } },
  });
  if (!ws || ws.members.length === 0)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  // eslint-disable-next-line no-restricted-syntax
  const rows = await db.$queryRaw<{ tag: string }[]>(
    Prisma.sql`
      SELECT DISTINCT unnest(tags) AS tag
      FROM sources
      WHERE "workspaceId" = ${ws.id}
        AND "deletedAt" IS NULL
        AND array_length(tags, 1) > 0
      ORDER BY tag
      LIMIT 100
    `,
  );

  return NextResponse.json({ tags: rows.map((r) => r.tag) });
}
