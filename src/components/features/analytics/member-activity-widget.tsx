"use client";

import type { MemberActivityPoint } from "@/lib/modules/analytics/types";

interface Props {
  data: MemberActivityPoint[];
}

export function MemberActivityWidget({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No members yet.</p>;
  }

  return (
    <div className="divide-y">
      {data.map((m) => (
        <div key={m.userId} className="flex items-center justify-between py-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-medium">{m.userName}</p>
            {m.lastActiveAt && (
              <p className="text-xs text-muted-foreground">
                Last seen {new Date(m.lastActiveAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="ml-4 flex shrink-0 gap-4 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">{m.queryCount}</span> chats
            </span>
            <span>
              <span className="font-medium text-foreground">{m.annotationCount}</span> annotations
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
