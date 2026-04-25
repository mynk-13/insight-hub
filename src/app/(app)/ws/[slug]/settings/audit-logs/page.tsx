import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { workspaceService } from "@/lib/modules/workspace";
import { canPerform } from "@/lib/modules/workspace/permission";
import { db } from "@/lib/shared/db";
import { AuditLogViewer } from "@/components/features/analytics/audit-log-viewer";

type Props = { params: Promise<{ slug: string }> };

export default function AuditLogsPage({ params }: Props) {
  return (
    <Suspense>
      <AuditLogsContent params={params} />
    </Suspense>
  );
}

async function AuditLogsContent({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) redirect("/dashboard");

  if (!canPerform(workspace.role, "analytics:read")) redirect(`/ws/${slug}`);

  const logs = await db.auditLog.findMany({
    where: { workspaceId: workspace.id },
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 51,
  });

  const hasMore = logs.length > 50;
  const raw = hasMore ? logs.slice(0, 50) : logs;
  const nextCursor = hasMore ? (raw[raw.length - 1]?.id ?? null) : null;

  const items = raw.map((log) => ({
    ...log,
    createdAt: log.createdAt.toISOString(),
    metadata: log.metadata as Record<string, unknown>,
  }));

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-xl font-semibold mb-1">Audit Log</h1>
      <p className="text-sm text-muted-foreground mb-6">
        All workspace events ordered by most recent.
      </p>
      <AuditLogViewer workspaceSlug={slug} initialLogs={items} initialCursor={nextCursor} />
    </div>
  );
}
