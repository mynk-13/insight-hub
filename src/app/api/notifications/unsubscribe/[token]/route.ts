import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { NotificationPreferenceService } from "@/lib/modules/annotations";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    await NotificationPreferenceService.unsubscribeByToken(token);
    return NextResponse.redirect(new URL("/notifications/unsubscribed", _req.url));
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }
}
