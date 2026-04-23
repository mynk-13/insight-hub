import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/shared/db";
import { semanticSearch } from "@/lib/modules/search/searcher";
import { addSearchHistory } from "@/lib/modules/search/history";
import { SearchFilters } from "@/components/features/search/search-filters";
import { SearchResult } from "@/components/features/search/search-result";
import { SearchSkeleton } from "@/components/features/search/search-skeleton";
import type { SearchResultItem } from "@/lib/modules/search/types";
import type { SourceType } from "@prisma/client";

const SOURCE_TYPES: SourceType[] = ["PDF", "DOCX", "URL", "MARKDOWN"];

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    collection?: string;
    from?: string;
    to?: string;
  }>;
};

async function SearchResults({
  workspaceId,
  userId,
  slug,
  q,
  type,
  collection,
  from,
  to,
}: {
  workspaceId: string;
  userId: string;
  slug: string;
  q: string;
  type?: string;
  collection?: string;
  from?: string;
  to?: string;
}) {
  const parsedTypes = type
    ? type
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter((t): t is SourceType => SOURCE_TYPES.includes(t as SourceType))
    : undefined;

  const results: SearchResultItem[] = await semanticSearch(workspaceId, {
    query: q,
    type: parsedTypes,
    collectionId: collection,
    dateFrom: from,
    dateTo: to,
  });

  // Record history asynchronously — fire-and-forget
  addSearchHistory(userId, workspaceId, q).catch(() => undefined);

  if (results.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground">
        <p className="text-sm font-medium">No results for &ldquo;{q}&rdquo;</p>
        <p className="text-xs mt-1">Try broader terms, check spelling, or remove filters</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        {results.length} result{results.length !== 1 ? "s" : ""}
      </p>
      {results.map((r) => (
        <SearchResult key={r.sourceId} result={r} workspaceSlug={slug} />
      ))}
    </div>
  );
}

async function InnerSearch({ params, searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { slug } = await params;
  const { q, type, collection, from, to } = await searchParams;

  const ws = await db.workspace.findFirst({
    where: { slug, deletedAt: null },
    include: { members: { where: { userId: session.user.id }, select: { role: true } } },
  });
  if (!ws || ws.members.length === 0) redirect("/dashboard");

  return (
    <div className="flex flex-col h-full">
      <div className="border-b px-6 py-4 space-y-3">
        <h1 className="text-xl font-semibold">Search</h1>
        <form method="GET" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search sources…"
            autoFocus
            className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {type && <input type="hidden" name="type" value={type} />}
          {collection && <input type="hidden" name="collection" value={collection} />}
          {from && <input type="hidden" name="from" value={from} />}
          {to && <input type="hidden" name="to" value={to} />}
          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
          >
            Search
          </button>
        </form>
        <Suspense>
          <SearchFilters workspaceSlug={slug} />
        </Suspense>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {q ? (
          <Suspense fallback={<SearchSkeleton />}>
            <SearchResults
              workspaceId={ws.id}
              userId={session.user.id}
              slug={slug}
              q={q}
              type={type}
              collection={collection}
              from={from}
              to={to}
            />
          </Suspense>
        ) : (
          <div className="py-16 text-center text-muted-foreground">
            <p className="text-sm">Enter a query above to search your workspace</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage(props: PageProps) {
  return (
    <Suspense>
      <InnerSearch {...props} />
    </Suspense>
  );
}
