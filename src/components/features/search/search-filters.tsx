"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { X } from "lucide-react";
import type { SourceType } from "@prisma/client";

const SOURCE_TYPES: SourceType[] = ["PDF", "DOCX", "URL", "MARKDOWN"];

export function SearchFilters({ workspaceSlug: _workspaceSlug }: { workspaceSlug: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  const activeTypes = (searchParams.get("type") ?? "")
    .split(",")
    .filter((t) => SOURCE_TYPES.includes(t as SourceType)) as SourceType[];

  const toggleType = (type: SourceType) => {
    const next = activeTypes.includes(type)
      ? activeTypes.filter((t) => t !== type)
      : [...activeTypes, type];
    updateParam("type", next.length > 0 ? next.join(",") : null);
  };

  const dateFrom = searchParams.get("from") ?? "";
  const dateTo = searchParams.get("to") ?? "";
  const hasFilters = activeTypes.length > 0 || dateFrom || dateTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium">Filter:</span>
      {SOURCE_TYPES.map((type) => (
        <button
          key={type}
          onClick={() => toggleType(type)}
          className={`text-xs px-2 py-1 rounded-full border transition-colors ${
            activeTypes.includes(type)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border hover:bg-muted"
          }`}
        >
          {type}
        </button>
      ))}
      <div className="flex items-center gap-1 ml-2">
        <label className="text-xs text-muted-foreground">From</label>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => updateParam("from", e.target.value || null)}
          className="text-xs border rounded px-1.5 py-0.5 bg-background"
        />
        <label className="text-xs text-muted-foreground">To</label>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => updateParam("to", e.target.value || null)}
          className="text-xs border rounded px-1.5 py-0.5 bg-background"
        />
      </div>
      {hasFilters && (
        <button
          onClick={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("type");
            params.delete("from");
            params.delete("to");
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3" /> Clear filters
        </button>
      )}
    </div>
  );
}
