"use client";

import { useState, useCallback } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AuditAction } from "@prisma/client";

interface AuditLogEntry {
  id: string;
  action: AuditAction;
  createdAt: string;
  ipAddress: string | null;
  metadata: Record<string, unknown>;
  user: { id: string; name: string | null; email: string } | null;
}

interface Props {
  workspaceSlug: string;
  initialLogs: AuditLogEntry[];
  initialCursor: string | null;
}

const ACTION_COLORS: Partial<Record<AuditAction, string>> = {
  WORKSPACE_DELETED: "destructive",
  MEMBER_REMOVED: "destructive",
  SIGN_IN_FAILED: "destructive",
  SOURCE_DELETED: "destructive",
  SUBSCRIPTION_CANCELED: "secondary",
};

export function AuditLogViewer({ workspaceSlug, initialLogs, initialCursor }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialLogs);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState("");

  const fetchLogs = useCallback(
    async (reset: boolean) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (actionFilter) params.set("action", actionFilter);
        if (!reset && cursor) params.set("cursor", cursor);

        const res = await fetch(`/api/workspaces/${workspaceSlug}/audit-logs?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as { items: AuditLogEntry[]; nextCursor: string | null };
        setLogs(reset ? data.items : (prev) => [...prev, ...data.items]);
        setCursor(data.nextCursor);
      } finally {
        setLoading(false);
      }
    },
    [workspaceSlug, actionFilter, cursor],
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Filter by action (e.g. SIGN_IN)"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value.toUpperCase())}
          />
        </div>
        <Button variant="outline" onClick={() => fetchLogs(true)} disabled={loading}>
          Apply
        </Button>
      </div>

      <div className="rounded-lg border divide-y">
        {logs.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">No audit logs found.</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="flex items-start gap-3 p-3 text-sm">
            <Badge
              variant={
                (ACTION_COLORS[log.action] as "destructive" | "secondary" | undefined) ?? "outline"
              }
              className="mt-0.5 shrink-0 text-xs"
            >
              {log.action.replace(/_/g, " ")}
            </Badge>
            <div className="min-w-0 flex-1">
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  {log.user?.name ?? log.user?.email ?? "System"}
                </span>{" "}
                · {new Date(log.createdAt).toLocaleString()}
                {log.ipAddress && <span className="text-xs"> · {log.ipAddress}</span>}
              </p>
            </div>
          </div>
        ))}
      </div>

      {cursor && (
        <Button
          variant="outline"
          className="w-full gap-1"
          onClick={() => fetchLogs(false)}
          disabled={loading}
        >
          <ChevronDown className="h-4 w-4" />
          {loading ? "Loading…" : "Load more"}
        </Button>
      )}
    </div>
  );
}
