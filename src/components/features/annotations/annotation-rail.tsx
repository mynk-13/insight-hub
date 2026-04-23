"use client";

import { useState, useEffect, useCallback } from "react";
import { AnnotationThread } from "./annotation-thread";
import { AnnotationHighlighter } from "./annotation-highlighter";
import type { AnnotationWithRelations } from "@/lib/modules/annotations";
import type { AnnotationColor } from "@/lib/modules/annotations/types";

interface AnnotationRailState {
  annotations: AnnotationWithRelations[];
  loading: boolean;
  fetch: () => Promise<void>;
  save: (
    anchor: { text: string; start: number; end: number },
    color: AnnotationColor,
    content?: string,
  ) => Promise<void>;
}

function useAnnotations(sourceId: string): AnnotationRailState {
  const [annotations, setAnnotations] = useState<AnnotationWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const res = await globalThis.fetch(`/api/sources/${sourceId}/annotations`);
      if (res.ok) {
        const data = await res.json();
        setAnnotations(data.annotations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [sourceId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const save = useCallback(
    async (
      anchor: { text: string; start: number; end: number },
      color: AnnotationColor,
      content?: string,
    ) => {
      const res = await globalThis.fetch(`/api/sources/${sourceId}/annotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor, color, content }),
      });
      if (res.ok) fetch();
    },
    [sourceId, fetch],
  );

  return { annotations, loading, fetch, save };
}

interface HighlighterProps {
  sourceId: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  canAnnotate: boolean;
  onSave: AnnotationRailState["save"];
}

export function AnnotationHighlighterLayer({
  sourceId: _sourceId,
  contentRef,
  canAnnotate,
  onSave,
}: HighlighterProps) {
  if (!canAnnotate) return null;
  return <AnnotationHighlighter containerRef={contentRef} onSave={onSave} />;
}

interface RailProps {
  sourceId: string;
  workspaceSlug: string;
  currentUserId: string;
  currentUserRole: string;
  onSave: AnnotationRailState["save"];
  annotations: AnnotationWithRelations[];
  loading: boolean;
  onUpdate: () => void;
}

export function AnnotationRailPanel({
  sourceId,
  workspaceSlug,
  currentUserId,
  currentUserRole,
  onSave: _onSave,
  annotations,
  loading,
  onUpdate,
}: RailProps) {
  const canAnnotate = currentUserRole !== "VIEWER";

  return (
    <aside className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Annotations
        {annotations.length > 0 && (
          <span className="ml-2 text-xs font-normal normal-case">({annotations.length})</span>
        )}
      </h2>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border p-3 animate-pulse space-y-2">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : annotations.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
          {canAnnotate
            ? "Select text in the document to highlight and annotate."
            : "No annotations yet."}
        </div>
      ) : (
        <div className="space-y-2">
          {annotations.map((ann) => (
            <AnnotationThread
              key={ann.id}
              annotation={ann}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              workspaceSlug={workspaceSlug}
              sourceId={sourceId}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </aside>
  );
}

// Unified provider that owns state and passes it to both children
interface AnnotationRailProps {
  sourceId: string;
  workspaceSlug: string;
  currentUserId: string;
  currentUserRole: string;
  contentRef: React.RefObject<HTMLDivElement | null>;
  renderContent: (highlighter: React.ReactNode) => React.ReactNode;
}

export function AnnotationRail({
  sourceId,
  workspaceSlug,
  currentUserId,
  currentUserRole,
  contentRef,
  renderContent,
}: AnnotationRailProps) {
  const { annotations, loading, fetch, save } = useAnnotations(sourceId);
  const canAnnotate = currentUserRole !== "VIEWER";

  const highlighter = canAnnotate ? (
    <AnnotationHighlighter containerRef={contentRef} onSave={save} />
  ) : null;

  return (
    <>
      {renderContent(highlighter)}
      <AnnotationRailPanel
        sourceId={sourceId}
        workspaceSlug={workspaceSlug}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onSave={save}
        annotations={annotations}
        loading={loading}
        onUpdate={fetch}
      />
    </>
  );
}
