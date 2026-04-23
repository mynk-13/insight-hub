import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { CollectionService } from "@/lib/modules/workspace/collection";
import { canPerform } from "@/lib/modules/workspace/permission";
import { CollectionList } from "@/components/features/collections/collection-list";

type PageProps = { params: Promise<{ slug: string }> };

async function Inner({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug } = await params;
  const ws = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId: session.user.id }, select: { role: true } } },
  });
  if (!ws || ws.members.length === 0) redirect("/dashboard");

  const role = ws.members[0].role;
  const collections = await CollectionService.list(ws.id);

  return (
    <div className="px-6 py-6 max-w-3xl">
      <CollectionList
        collections={collections}
        workspaceSlug={slug}
        canEdit={canPerform(role, "sources:upload")}
      />
    </div>
  );
}

export default function CollectionsPage(props: PageProps) {
  return (
    <Suspense>
      <Inner {...props} />
    </Suspense>
  );
}
