import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { NotificationPreferenceService } from "@/lib/modules/annotations";
import type { NotificationType } from "@prisma/client";

const updateSchema = z.object({
  type: z.enum([
    "MENTION",
    "INVITE_ACCEPTED",
    "ROLE_CHANGED",
    "ANNOTATION_REPLY",
    "ANNOTATION_RESOLVED",
  ]),
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const preferences = await NotificationPreferenceService.getAll(session.user.id);
  return NextResponse.json({ preferences });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const preference = await NotificationPreferenceService.update(
    session.user.id,
    parsed.data.type as NotificationType,
    { inApp: parsed.data.inApp, email: parsed.data.email },
  );
  return NextResponse.json({ preference });
}
