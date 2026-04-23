import { Suspense } from "react";
import { auth } from "@/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/shared/db";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string; id: string }>;
}

const STATUS_COLORS: Record<string, string> = {
  INDEXED: "bg-green-500/10 text-green-700 border-green-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
};

async function SourceReaderContent({
  paramsPromise,
}: {
  paramsPromise: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await paramsPromise;
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const workspace = await db.workspace.findUnique({
    where: { slug, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!workspace) redirect("/dashboard");

  const member = await db.member.findUnique({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: session.user.id } },
    select: { role: true },
  });
  if (!member) redirect("/dashboard");

  const source = await db.source.findUnique({
    where: { id, workspaceId: workspace.id, deletedAt: null },
    include: {
      chunks: { orderBy: { chunkIndex: "asc" }, take: 20 },
      _count: { select: { chunks: true, annotations: true } },
    },
  });
  if (!source) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/ws/${slug}/library`} className="hover:text-foreground transition-colors">
            Library
          </Link>
          <span>/</span>
          <span className="text-foreground">{source.title}</span>
        </div>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{source.title}</h1>
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-muted-foreground hover:underline mt-1 block truncate max-w-md"
              >
                {source.url}
              </a>
            )}
          </div>
          <Badge variant="outline" className={STATUS_COLORS[source.status] ?? ""}>
            {source.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Type: {source.type}</span>
          {source.pageCount && <span>{source.pageCount} pages</span>}
          {source.wordCount && <span>{source.wordCount.toLocaleString()} words</span>}
          <span>{source._count.chunks} chunks indexed</span>
          <span>{source._count.annotations} annotations</span>
          <span>Added {new Date(source.createdAt).toLocaleDateString()}</span>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Content / Chunk Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Content Preview
          </h2>
          {source.status !== "INDEXED" ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              {source.status === "FAILED"
                ? "Ingestion failed. Please delete and re-upload this source."
                : "This source is still being processed. Check back shortly."}
            </div>
          ) : source.chunks.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No chunks found.
            </div>
          ) : (
            <div className="space-y-3">
              {source.chunks.map((chunk: (typeof source.chunks)[number]) => (
                <div
                  key={chunk.id}
                  className="rounded-lg border bg-muted/30 px-4 py-3 text-sm leading-relaxed"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono">
                      #{chunk.chunkIndex + 1}
                    </span>
                    {chunk.pageNumber && (
                      <span className="text-xs text-muted-foreground">p.{chunk.pageNumber}</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {chunk.tokenCount} tokens
                    </span>
                  </div>
                  <p className="line-clamp-4">{chunk.content}</p>
                </div>
              ))}
              {source._count.chunks > 20 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing 20 of {source._count.chunks} chunks
                </p>
              )}
            </div>
          )}
        </div>

        {/* Annotations rail (placeholder) */}
        <aside className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Annotations
          </h2>
          <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
            Annotations will appear here once you highlight text in a source.
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function SourceReaderPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
          Loading source…
        </div>
      }
    >
      <SourceReaderContent paramsPromise={params} />
    </Suspense>
  );
}
