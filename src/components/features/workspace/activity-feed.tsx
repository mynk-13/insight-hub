"use client";

import { useState, useEffect, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "@/lib/utils";

type ActivityEvent = {
  id: string;
  action: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  user: { id: string; name: string | null; email: string; image: string | null } | null;
};

type Props = { workspaceSlug: string };

const ACTION_LABELS: Record<string, string> = {
  WORKSPACE_CREATED: "created this workspace",
  WORKSPACE_UPDATED: "updated workspace settings",
  MEMBER_INVITED: "sent an invitation",
  MEMBER_JOINED: "joined the workspace",
  MEMBER_REMOVED: "removed a member",
  ROLE_CHANGED: "changed a member's role",
  OWNERSHIP_TRANSFERRED: "initiated ownership transfer",
  SOURCE_UPLOADED: "uploaded a source",
  SOURCE_DELETED: "deleted a source",
  SUBSCRIPTION_CREATED: "upgraded to Pro",
  SUBSCRIPTION_CANCELED: "canceled subscription",
};

export function ActivityFeed({ workspaceSlug }: Props) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(
    async (cursor?: string) => {
      const url = `/api/workspaces/${workspaceSlug}/activity${cursor ? `?cursor=${cursor}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as { events: ActivityEvent[]; nextCursor?: string };
      return data;
    },
    [workspaceSlug],
  );

  useEffect(() => {
    fetchPage().then((data) => {
      if (data) {
        setEvents(data.events);
        setNextCursor(data.nextCursor);
      }
      setLoading(false);
    });
  }, [fetchPage]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    const data = await fetchPage(nextCursor);
    if (data) {
      setEvents((prev) => [...prev, ...data.events]);
      setNextCursor(data.nextCursor);
    }
    setLoadingMore(false);
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="h-7 w-7 rounded-full bg-muted shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1">
              <div className="h-3 bg-muted rounded w-3/4" />
              <div className="h-2.5 bg-muted rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity yet.</p>;
  }

  return (
    <div className="space-y-4">
      {events.map((event) => {
        const actor = event.user;
        const initials = actor
          ? (actor.name ?? actor.email)
              .split(" ")
              .map((p) => p[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
          : "?";
        const label = ACTION_LABELS[event.action] ?? event.action.toLowerCase().replace(/_/g, " ");

        return (
          <div key={event.id} className="flex items-start gap-3">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={actor?.image ?? undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{actor?.name ?? actor?.email ?? "Someone"}</span>{" "}
                {label}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(event.createdAt))}
              </p>
            </div>
          </div>
        );
      })}
      {nextCursor && (
        <Button
          variant="ghost"
          size="sm"
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full"
        >
          {loadingMore ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
