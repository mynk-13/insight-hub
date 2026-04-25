import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { canPerform } from "@/lib/modules/workspace/permission";
import { getAnalytics } from "@/lib/modules/analytics";
import type { WidgetKey } from "@/lib/modules/analytics/types";

const ExportQuerySchema = z.object({
  widget: z.enum([
    "sourcesOverTime",
    "queryVolume",
    "topCitedSources",
    "memberActivity",
    "tokenConsumption",
  ] as const),
});

type Params = { params: Promise<{ slug: string }> };

export async function GET(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canPerform(workspace.role, "workspace:read")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const parsed = ExportQuerySchema.safeParse({ widget: url.searchParams.get("widget") });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid widget parameter" }, { status: 422 });
  }

  const data = await getAnalytics(workspace.id);
  const widget = parsed.data.widget as WidgetKey;
  const csv = buildCsv(widget, data[widget]);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${widget}-${workspace.slug}.csv"`,
    },
  });
}

function buildCsv(widget: WidgetKey, rawData: unknown): string {
  if (widget === "sourcesOverTime" || widget === "queryVolume") {
    const rows = rawData as Array<{ date: string; count: number }>;
    const lines = ["date,count", ...rows.map((r) => `${r.date},${r.count}`)];
    return lines.join("\n");
  }

  if (widget === "topCitedSources") {
    const rows = rawData as Array<{ sourceId: string; title: string; citationCount: number }>;
    const lines = [
      "sourceId,title,citationCount",
      ...rows.map((r) => `${r.sourceId},"${r.title.replace(/"/g, '""')}",${r.citationCount}`),
    ];
    return lines.join("\n");
  }

  if (widget === "memberActivity") {
    const rows = rawData as Array<{
      userId: string;
      userName: string;
      queryCount: number;
      annotationCount: number;
      lastActiveAt: string | null;
    }>;
    const lines = [
      "userId,userName,queryCount,annotationCount,lastActiveAt",
      ...rows.map(
        (r) =>
          `${r.userId},"${r.userName.replace(/"/g, '""')}",${r.queryCount},${r.annotationCount},${r.lastActiveAt ?? ""}`,
      ),
    ];
    return lines.join("\n");
  }

  // tokenConsumption
  const data = rawData as {
    totalTokensIn: number;
    totalTokensOut: number;
    totalCostUsd: number;
    byModel: Array<{ model: string; tokensIn: number; tokensOut: number; costUsd: number }>;
  };
  const lines = [
    "model,tokensIn,tokensOut,costUsd",
    `_total,${data.totalTokensIn},${data.totalTokensOut},${data.totalCostUsd.toFixed(6)}`,
    ...data.byModel.map((r) => `${r.model},${r.tokensIn},${r.tokensOut},${r.costUsd.toFixed(6)}`),
  ];
  return lines.join("\n");
}
