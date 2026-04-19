import { Suspense } from "react";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { notFound } from "next/navigation";
import { WorkspaceSettingsForm } from "@/components/features/workspace/workspace-settings-form";
import { canPerform } from "@/lib/modules/workspace/permission";

type Props = { params: Promise<{ slug: string }> };

export const metadata = { title: "Settings — InsightHub" };

async function SettingsContent({ params }: Props) {
  const session = await auth();
  const { slug } = await params;
  if (!session?.user?.id) return null;

  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) notFound();

  return (
    <div className="px-6 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Workspace Settings</h1>
      <WorkspaceSettingsForm
        workspace={workspace}
        canEdit={canPerform(workspace.role, "workspace:update")}
        canDelete={canPerform(workspace.role, "workspace:delete")}
        canTransfer={canPerform(workspace.role, "workspace:transfer")}
      />
    </div>
  );
}

export default function WorkspaceSettingsPage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <SettingsContent {...props} />
    </Suspense>
  );
}
