"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/modules/rag/types";

type Props = {
  citations: Citation[];
  activeCitationIndex: number | null;
  onClose: () => void;
};

export function CitationSidecar({ citations, activeCitationIndex, onClose }: Props) {
  const sortedCitations = [...citations].sort((a, b) => a.index - b.index);

  return (
    <aside className="flex h-full w-80 flex-col border-l bg-muted/30">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold">Sources ({citations.length})</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
          aria-label="Close sources panel"
        >
          ×
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {sortedCitations.length === 0 ? (
          <p className="text-sm text-muted-foreground p-2">No sources retrieved.</p>
        ) : (
          sortedCitations.map((c) => (
            <div
              key={c.chunkId}
              id={`citation-${c.index}`}
              className={cn(
                "rounded-lg border bg-card p-3 text-sm transition-colors",
                activeCitationIndex === c.index && "border-primary bg-primary/5",
              )}
            >
              <div className="flex items-start gap-2 mb-2">
                <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded bg-primary text-primary-foreground text-xs font-bold">
                  {c.index}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs truncate">{c.sourceName}</p>
                  {c.pageNumber && (
                    <p className="text-xs text-muted-foreground">Page {c.pageNumber}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                {c.content}
              </p>
              {c.sourceUrl && (
                <a
                  href={c.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 block text-xs text-primary hover:underline truncate"
                >
                  {c.sourceUrl}
                </a>
              )}
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
