"use client";

import { useRef } from "react";
import { AnnotationRail } from "./annotation-rail";

interface Chunk {
  id: string;
  chunkIndex: number;
  pageNumber: number | null;
  tokenCount: number;
  content: string;
}

interface SourceData {
  status: string;
  chunks: Chunk[];
  _count: { chunks: number };
}

interface AnnotationRailWrapperProps {
  sourceId: string;
  workspaceSlug: string;
  currentUserId: string;
  currentUserRole: string;
  source: SourceData;
}

export function AnnotationRailWrapper({
  sourceId,
  workspaceSlug,
  currentUserId,
  currentUserRole,
  source,
}: AnnotationRailWrapperProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      <AnnotationRail
        sourceId={sourceId}
        workspaceSlug={workspaceSlug}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        contentRef={contentRef}
        renderContent={(highlighter) => (
          <div className="relative">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
              Content Preview
            </h2>
            {/* Highlighter floats absolutely within this container */}
            {highlighter}
            <div ref={contentRef} className="select-text space-y-3">
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
                <>
                  {source.chunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      className="rounded-lg border bg-muted/30 px-4 py-3 text-sm leading-relaxed"
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">
                          #{chunk.chunkIndex + 1}
                        </span>
                        {chunk.pageNumber && (
                          <span className="text-xs text-muted-foreground">
                            p.{chunk.pageNumber}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {chunk.tokenCount} tokens
                        </span>
                      </div>
                      <p className="leading-relaxed">{chunk.content}</p>
                    </div>
                  ))}
                  {source._count.chunks > 20 && (
                    <p className="text-xs text-muted-foreground text-center">
                      Showing 20 of {source._count.chunks} chunks
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
