import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { db } from "@/lib/shared/db";
import { semanticSearch, addSearchHistory } from "@/lib/modules/search";
import type { SourceType } from "@prisma/client";

const SOURCE_TYPES: SourceType[] = ["PDF", "DOCX", "URL", "MARKDOWN"];

const querySchema = z.object({
  q: z.string().min(1).max(500),
  workspace: z.string().min(1),
  type: z
    .string()
    .optional()
    .transform((v) =>
      v
        ? v
            .split(",")
            .map((t) => t.trim().toUpperCase())
            .filter((t): t is SourceType => SOURCE_TYPES.includes(t as SourceType))
        : undefined,
    ),
  collection: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { q, workspace: workspaceSlug, type, collection, from, to } = parsed.data;

  const ws = await db.workspace.findFirst({
    where: { slug: workspaceSlug, deletedAt: null },
    include: {
      members: { where: { userId: session.user.id }, select: { role: true } },
    },
  });

  if (!ws || ws.members.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const results = await semanticSearch(ws.id, {
    query: q,
    type,
    collectionId: collection,
    dateFrom: from,
    dateTo: to,
  });

  // Record history fire-and-forget
  addSearchHistory(session.user.id, ws.id, q).catch(() => undefined);

  return NextResponse.json({ results, total: results.length });
}
