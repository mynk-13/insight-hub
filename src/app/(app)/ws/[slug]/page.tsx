import { Suspense } from "react";
import { auth } from "@/auth";
import { workspaceService } from "@/lib/modules/workspace";
import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/features/workspace/activity-feed";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  return { title: `${slug} — InsightHub` };
}

async function WorkspaceContent({ params }: Props) {
  const session = await auth();
  const { slug } = await params;
  if (!session?.user?.id) return null;

  const workspace = await workspaceService.getBySlug(slug, session.user.id);
  if (!workspace) notFound();

  return (
    <div className="px-6 py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">{workspace.name}</h1>
      {workspace.description && (
        <p className="text-muted-foreground mb-6">{workspace.description}</p>
      )}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Recent Activity
        </h2>
        <ActivityFeed workspaceSlug={slug} />
      </section>
    </div>
  );
}

export default function WorkspacePage(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="px-6 py-8">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
      }
    >
      <WorkspaceContent {...props} />
    </Suspense>
  );
}
