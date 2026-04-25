"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
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

  useEffect(() => {
    fetch(`/api/notifications?workspace=${workspaceSlug}`)
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications ?? []);
        setUnreadCount(data.unreadCount ?? 0);
      })
      .catch(() => {});
  }, [workspaceSlug]);

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
      {/* Full-width row button matching sidebar nav item style */}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : openPanel())}
        className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <span className="relative shrink-0">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </span>
        <span>Notifications</span>
        {unreadCount > 0 && (
          <span className="ml-auto text-[10px] font-semibold text-primary">{unreadCount}</span>
        )}
      </button>

      {/* Panel opens upward and to the right of the sidebar */}
      {open && (
        <div className="absolute left-full bottom-0 ml-2 w-80 bg-popover border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold">Notifications</span>
            <Link
              href={`/ws/${workspaceSlug}/notifications/preferences`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              Preferences
            </Link>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-border/50">
              {notifications.map((n) => {
                const Inner = (
                  <div
                    className={`px-4 py-3 hover:bg-accent/60 transition-colors ${
                      !n.isRead ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-sm mt-0.5 shrink-0">{TYPE_ICONS[n.type]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{n.title}</p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {n.body}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground/70 mt-1">
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
