"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NotificationType } from "@prisma/client";

interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  resourceUrl: string | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<NotificationType, string> = {
  MENTION: "@",
  INVITE_ACCEPTED: "✓",
  ROLE_CHANGED: "⚙",
  ANNOTATION_REPLY: "💬",
  ANNOTATION_RESOLVED: "✓",
};

function formatTime(date: string) {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

interface NotificationBellProps {
  workspaceSlug: string;
}

export function NotificationBell({ workspaceSlug }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Initial load on mount
  useEffect(() => {
    fetch(`/api/notifications?workspace=${workspaceSlug}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, [workspaceSlug]);

  // Poll every 30s when panel is closed
  useEffect(() => {
    if (open) return;
    const id = setInterval(() => {
      fetch(`/api/notifications?workspace=${workspaceSlug}`)
        .then((r) => r.json())
        .then((data) => {
          setNotifications(data.notifications ?? []);
          setUnreadCount(data.unreadCount ?? 0);
        })
        .catch(() => {});
    }, 30_000);
    return () => clearInterval(id);
  }, [open, workspaceSlug]);

  const openPanel = useCallback(async () => {
    setOpen(true);
    const res = await fetch(`/api/notifications?workspace=${workspaceSlug}`);
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
    }
    if (unreadCount > 0) {
      await fetch(`/api/notifications?workspace=${workspaceSlug}`, { method: "PATCH" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }, [workspaceSlug, unreadCount]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="relative flex items-center justify-center w-8 h-8 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 1a5.5 5.5 0 0 0-5.5 5.5v2.836l-.832 1.386A.5.5 0 0 0 2.1 11.5h11.8a.5.5 0 0 0 .432-.778L13.5 9.336V6.5A5.5 5.5 0 0 0 8 1zM6.5 13a1.5 1.5 0 0 0 3 0H6.5z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-popover border border-border rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs font-semibold">Notifications</span>
            <Link
              href={`/ws/${workspaceSlug}/notifications/preferences`}
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(false)}
            >
              Preferences
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-border/50">
              {notifications.map((n) => {
                const Inner = (
                  <div className={`px-3 py-2.5 hover:bg-accent ${!n.isRead ? "bg-accent/30" : ""}`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{TYPE_ICONS[n.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatTime(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                      )}
                    </div>
                  </div>
                );

                return (
                  <li key={n.id}>
                    {n.resourceUrl ? (
                      <Link href={n.resourceUrl} onClick={() => setOpen(false)}>
                        {Inner}
                      </Link>
                    ) : (
                      Inner
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
