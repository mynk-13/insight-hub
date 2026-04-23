import { Suspense } from "react";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { CollectionService } from "@/lib/modules/workspace/collection";
import { canPerform } from "@/lib/modules/workspace/permission";
import { CollectionSources } from "@/components/features/collections/collection-sources";
import { ChevronLeft, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type PageProps = { params: Promise<{ slug: string; id: string }> };

async function Inner({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug, id } = await params;
  const ws = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId: session.user.id }, select: { role: true } } },
  });
  if (!ws || ws.members.length === 0) redirect("/dashboard");

  const role = ws.members[0].role;
  const [collection, sources] = await Promise.all([
    CollectionService.get(id, ws.id),
    CollectionService.listSources(id, ws.id),
  ]);
  if (!collection) notFound();

  return (
    <div className="px-6 py-6 max-w-3xl space-y-6">
      <div>
        <Link
          href={`/ws/${slug}/collections`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="h-4 w-4" /> Collections
        </Link>
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">{collection.name}</h1>
          {collection.isPinned && <Badge variant="secondary">Pinned</Badge>}
        </div>
        {collection.description && (
          <p className="text-sm text-muted-foreground mt-1">{collection.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {collection._count.sources} source{collection._count.sources !== 1 ? "s" : ""}
        </p>
      </div>

      <CollectionSources
        collectionId={id}
        workspaceSlug={slug}
        sources={sources}
        canEdit={canPerform(role, "sources:upload")}
      />

      <div className="pt-4 border-t">
        <Link
          href={`/ws/${slug}/search?collection=${id}`}
          className="text-sm text-primary hover:underline flex items-center gap-1"
        >
          Search within this collection →
        </Link>
      </div>
    </div>
  );
}

export default function CollectionDetailPage(props: PageProps) {
  return (
    <Suspense>
      <Inner {...props} />
    </Suspense>
  );
}
