import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import {
  AnnotationService,
  NotificationService,
  sendMentionEmail,
} from "@/lib/modules/annotations";
import { ANNOTATION_COLORS } from "@/lib/modules/annotations/types";

const createSchema = z.object({
  anchor: z.object({
    text: z.string().min(1).max(2000),
    start: z.number().int().min(0),
    end: z.number().int().min(0),
    pageNumber: z.number().int().positive().optional(),
  }),
  color: z.enum(ANNOTATION_COLORS).optional(),
  content: z.string().max(5000).optional(),
});

async function getMember(workspaceId: string, userId: string) {
  return db.member.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
}

async function getSourceWorkspace(sourceId: string) {
  return db.source.findFirst({
    where: { id: sourceId, deletedAt: null },
    select: { workspaceId: true, workspace: { select: { slug: true } } },
  });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId } = await params;
  const source = await getSourceWorkspace(sourceId);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await getMember(source.workspaceId, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const annotations = await AnnotationService.list(source.workspaceId, sourceId);
  return NextResponse.json({ annotations });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sourceId } = await params;
  const source = await getSourceWorkspace(sourceId);
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const member = await getMember(source.workspaceId, session.user.id);
  if (!member) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (member.role === "VIEWER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const annotation = await AnnotationService.create(
    source.workspaceId,
    sourceId,
    session.user.id,
    parsed.data,
  );

  // Notify mentioned users
  if (parsed.data.content) {
    const mentionedIds = AnnotationService.parseMentions(parsed.data.content);
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true },
    });
    for (const mentionedId of mentionedIds) {
      if (mentionedId === session.user.id) continue;
      const mentionedMember = await getMember(source.workspaceId, mentionedId);
      if (!mentionedMember) continue;
      await NotificationService.create(mentionedId, source.workspaceId, "MENTION", {
        title: `${user?.name ?? "Someone"} mentioned you`,
        body: parsed.data.content?.slice(0, 200),
        resourceId: annotation.id,
        resourceUrl: `/ws/${source.workspace.slug}/sources/${sourceId}`,
      });
      const mentionedUser = await db.user.findUnique({
        where: { id: mentionedId },
        select: { email: true },
      });
      if (mentionedUser) {
        void sendMentionEmail(
          mentionedUser.email,
          mentionedId,
          user?.name ?? "Someone",
          parsed.data.content?.slice(0, 200) ?? "",
          `/ws/${source.workspace.slug}/sources/${sourceId}`,
        );
      }
    }
  }

  return NextResponse.json({ annotation }, { status: 201 });
}
