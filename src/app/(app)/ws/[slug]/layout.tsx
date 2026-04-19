import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { WorkspaceNav } from "@/components/features/workspace/workspace-nav";

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

async function WorkspaceSidebar({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug } = await params;
  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) notFound();

  void workspaceService.touchLastVisited(workspace.id, session.user.id);

  return <WorkspaceNav workspace={workspace} userId={session.user.id} />;
}

export default function WorkspaceLayout({ children, params }: Props) {
  return (
    <div className="flex min-h-screen">
      <Suspense fallback={<aside className="w-56 border-r bg-muted/30 shrink-0 animate-pulse" />}>
        <WorkspaceSidebar params={params} />
      </Suspense>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
