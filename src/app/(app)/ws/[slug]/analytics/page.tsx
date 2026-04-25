import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { workspaceService } from "@/lib/modules/workspace";
import { canPerform } from "@/lib/modules/workspace/permission";
import { getAnalytics } from "@/lib/modules/analytics";
import { AnalyticsDashboard } from "@/components/features/analytics/analytics-dashboard";

type Props = { params: Promise<{ slug: string }> };

export default function AnalyticsPage({ params }: Props) {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <AnalyticsContent params={params} />
    </Suspense>
  );
}

async function AnalyticsContent({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) redirect("/dashboard");

  if (!canPerform(workspace.role, "workspace:read")) redirect(`/ws/${slug}`);

  const data = await getAnalytics(workspace.id);

  return (
    <div className="p-6">
      <AnalyticsDashboard data={data} workspaceSlug={slug} />
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="p-6 space-y-4 animate-pulse">
      <div className="h-7 w-40 rounded bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 rounded-lg bg-muted" />
        <div className="h-56 rounded-lg bg-muted" />
      </div>
      <div className="h-64 rounded-lg bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-56 rounded-lg bg-muted" />
        <div className="h-56 rounded-lg bg-muted" />
      </div>
    </div>
  );
}
