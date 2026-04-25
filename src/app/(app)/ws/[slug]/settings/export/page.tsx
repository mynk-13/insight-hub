import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { workspaceService } from "@/lib/modules/workspace";
import { canPerform } from "@/lib/modules/workspace/permission";
import { WorkspaceExportPanel } from "@/components/features/export/workspace-export-panel";

type Props = { params: Promise<{ slug: string }> };

export default function ExportPage({ params }: Props) {
  return (
    <Suspense>
      <ExportContent params={params} />
    </Suspense>
  );
}

async function ExportContent({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) redirect("/dashboard");

  if (!canPerform(workspace.role, "workspace:read")) redirect(`/ws/${slug}`);

  return (
    <div className="p-6 max-w-2xl space-y-2">
      <h1 className="text-xl font-semibold">Export &amp; Data</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Export your workspace data or permanently delete it.
      </p>
      <WorkspaceExportPanel
        workspaceSlug={slug}
        workspaceName={workspace.name}
        isDeleted={!!workspace.deletedAt}
      />
    </div>
  );
}
