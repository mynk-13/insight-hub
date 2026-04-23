"use client";

import { useState, useCallback } from "react";
import { REACTION_EMOJI } from "@/lib/modules/annotations/types";
import { MentionInput } from "./mention-input";
import type { AnnotationWithRelations } from "@/lib/modules/annotations";

interface AnnotationThreadProps {
  annotation: AnnotationWithRelations;
  currentUserId: string;
  currentUserRole: string;
  workspaceSlug: string;
  sourceId: string;
  onUpdate: () => void;
}

function formatTime(date: Date | string) {
  return new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ name, image }: { name?: string | null; image?: string | null }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" className="w-6 h-6 rounded-full" />;
  }
  return (
    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-semibold text-primary">
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

function ReactionBar({
  reactions,
  annotationId,
  sourceId,
  onUpdate,
}: {
  reactions: AnnotationWithRelations["reactions"];
  annotationId: string;
  sourceId: string;
  onUpdate: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);

  const grouped = REACTION_EMOJI.map((emoji) => ({
    emoji,
    count: reactions.filter((r) => r.emoji === emoji).length,
  })).filter((g) => g.count > 0);

  async function toggle(emoji: string) {
    setPending(emoji);
    try {
      await fetch(`/api/sources/${sourceId}/annotations/${annotationId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      });
      onUpdate();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {grouped.map(({ emoji, count }) => (
        <button
          key={emoji}
          type="button"
          disabled={!!pending}
          onClick={() => toggle(emoji)}
          className="text-xs border border-border rounded-full px-2 py-0.5 hover:bg-accent disabled:opacity-50 flex items-center gap-1"
        >
          {emoji} <span className="text-muted-foreground">{count}</span>
        </button>
      ))}
      <div className="relative group">
        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground px-1"
          aria-label="Add reaction"
        >
          +
        </button>
        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex bg-popover border border-border rounded-lg shadow p-1 gap-1 z-50">
          {REACTION_EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={!!pending}
              onClick={() => toggle(emoji)}
              className="text-base hover:scale-125 transition-transform disabled:opacity-50"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AnnotationThread({
  annotation,
  currentUserId,
  currentUserRole,
  workspaceSlug,
  sourceId,
  onUpdate,
}: AnnotationThreadProps) {
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const canDelete =
    annotation.userId === currentUserId ||
    currentUserRole === "OWNER" ||
    currentUserRole === "ADMIN";
  const canResolve =
    annotation.userId === currentUserId ||
    currentUserRole === "OWNER" ||
    currentUserRole === "ADMIN" ||
    currentUserRole === "EDITOR";
  const canReply = currentUserRole !== "VIEWER";

  const submitReply = useCallback(async () => {
    if (!replyContent.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sources/${sourceId}/annotations/${annotation.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyContent }),
      });
      if (res.ok) {
        setReplyContent("");
        onUpdate();
      }
    } finally {
      setSubmitting(false);
    }
  }, [replyContent, sourceId, annotation.id, onUpdate]);

  const toggleResolve = useCallback(async () => {
    setResolving(true);
    try {
      await fetch(`/api/sources/${sourceId}/annotations/${annotation.id}/resolve`, {
        method: "PATCH",
      });
      onUpdate();
    } finally {
      setResolving(false);
    }
  }, [sourceId, annotation.id, onUpdate]);

  const deleteAnnotation = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`/api/sources/${sourceId}/annotations/${annotation.id}`, { method: "DELETE" });
      onUpdate();
    } finally {
      setDeleting(false);
    }
  }, [sourceId, annotation.id, onUpdate]);

  return (
    <div
      className={`rounded-lg border p-3 text-xs space-y-2 ${
        annotation.isResolved ? "opacity-60 border-dashed" : "border-border"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Avatar name={annotation.user.name} image={annotation.user.image} />
          <span className="font-medium">{annotation.user.name ?? "Unknown"}</span>
          <span className="text-muted-foreground">{formatTime(annotation.createdAt)}</span>
        </div>
        <div className="flex items-center gap-1">
          {canResolve && (
            <button
              type="button"
              disabled={resolving}
              onClick={toggleResolve}
              className="text-muted-foreground hover:text-foreground disabled:opacity-50 px-1"
              title={annotation.isResolved ? "Unresolve" : "Resolve"}
            >
              {annotation.isResolved ? "↩" : "✓"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={deleteAnnotation}
              className="text-muted-foreground hover:text-destructive disabled:opacity-50 px-1"
              title="Delete"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Highlighted text */}
      <blockquote className="border-l-2 border-primary/40 pl-2 text-muted-foreground italic line-clamp-2">
        {annotation.anchorText}
      </blockquote>

      {/* Comment content */}
      {annotation.content && (
        <p className="leading-relaxed whitespace-pre-wrap">{annotation.content}</p>
      )}

      {/* Reactions */}
      <ReactionBar
        reactions={annotation.reactions}
        annotationId={annotation.id}
        sourceId={sourceId}
        onUpdate={onUpdate}
      />

      {/* Replies */}
      {annotation.replies.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-border/50">
          {annotation.replies.map((reply) => (
            <div key={reply.id} className="flex gap-1.5">
              <Avatar name={reply.user.name} image={reply.user.image} />
              <div className="flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">{reply.user.name ?? "Unknown"}</span>
                  <span className="text-muted-foreground">{formatTime(reply.createdAt)}</span>
                </div>
                <p className="leading-relaxed whitespace-pre-wrap mt-0.5">{reply.content}</p>
                <ReactionBar
                  reactions={reply.reactions}
                  annotationId={reply.id}
                  sourceId={sourceId}
                  onUpdate={onUpdate}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {canReply && !annotation.isResolved && (
        <div className="pt-1 border-t border-border/50">
          <MentionInput
            value={replyContent}
            onChange={setReplyContent}
            workspaceSlug={workspaceSlug}
            placeholder="Reply… (@ to mention)"
            rows={2}
            className="w-full text-xs border border-border rounded px-2 py-1.5 resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {replyContent.trim() && (
            <button
              type="button"
              disabled={submitting}
              onClick={submitReply}
              className="mt-1.5 text-xs bg-primary text-primary-foreground rounded px-2 py-1 disabled:opacity-50"
            >
              {submitting ? "Sending…" : "Reply"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
