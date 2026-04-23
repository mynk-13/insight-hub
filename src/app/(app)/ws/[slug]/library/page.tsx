import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/shared/db";
import { UploadDropzone } from "@/components/features/sources/upload-dropzone";
import { UrlIngestForm } from "@/components/features/sources/url-ingest-form";
import { SourceCard } from "@/components/features/sources/source-card";
import { Separator } from "@/components/ui/separator";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function LibraryContent({ paramsPromise }: { paramsPromise: Promise<{ slug: string }> }) {
  const { slug } = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const workspace = await db.workspace.findUnique({
    where: { slug, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  if (!workspace) redirect("/dashboard");

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) redirect("/dashboard");

  const sources = await db.source.findMany({
    where: { workspaceId: workspace.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      url: true,
      sizeBytes: true,
      pageCount: true,
      wordCount: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
  });

  const canUpload = ["OWNER", "ADMIN", "EDITOR"].includes(member.role);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {sources.length} source{sources.length !== 1 ? "s" : ""} in {workspace.name}
        </p>
      </div>

      {canUpload && (
        <div className="space-y-4">
          <UploadDropzone workspaceId={workspace.id} userId={session.user.id} />
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">or ingest from URL</span>
            <Separator className="flex-1" />
          </div>
          <UrlIngestForm workspaceId={workspace.id} />
        </div>
      )}

      {sources.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <p className="text-sm">No sources yet. Upload a file or add a URL to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((source: (typeof sources)[number]) => (
            <SourceCard
              key={source.id}
              source={{ ...source, createdAt: source.createdAt.toISOString() }}
              workspaceSlug={slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function LibraryPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Loading library…
        </div>
      }
    >
      <LibraryContent paramsPromise={params} />
    </Suspense>
  );
}
