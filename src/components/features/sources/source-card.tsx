"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SourceCardProps {
  source: {
    id: string;
    title: string;
    type: string;
    status: string;
    url?: string | null;
    sizeBytes?: number | null;
    pageCount?: number | null;
    wordCount?: number | null;
    createdAt: string | Date;
    _count?: { chunks: number };
  };
  workspaceSlug: string;
}

const STATUS_COLORS: Record<string, string> = {
  INDEXED: "bg-green-500/10 text-green-700 border-green-500/20",
  PENDING: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  EXTRACTING: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  OCR_RUNNING: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  CHUNKING: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  EMBEDDING: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  FAILED: "bg-destructive/10 text-destructive border-destructive/20",
};

const TYPE_ICONS: Record<string, string> = {
  PDF: "📄",
  DOCX: "📝",
  URL: "🔗",
  MARKDOWN: "📋",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SourceCard({ source, workspaceSlug }: SourceCardProps) {
  const isProcessing = !["INDEXED", "FAILED", "PENDING"].includes(source.status);

  return (
    <Link
      href={`/ws/${workspaceSlug}/sources/${source.id}`}
      className="group flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg" aria-hidden>
            {TYPE_ICONS[source.type] ?? "📄"}
          </span>
          <span className="truncate font-medium text-sm">{source.title}</span>
        </div>
        <Badge variant="outline" className={cn("shrink-0 text-xs", STATUS_COLORS[source.status])}>
          {isProcessing ? (
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
              {source.status.charAt(0) + source.status.slice(1).toLowerCase().replace("_", " ")}
            </span>
          ) : (
            source.status.charAt(0) + source.status.slice(1).toLowerCase()
          )}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {source.pageCount && <span>{source.pageCount} pages</span>}
        {source.wordCount && <span>{source.wordCount.toLocaleString()} words</span>}
        {source.sizeBytes && <span>{formatBytes(source.sizeBytes)}</span>}
        {source._count?.chunks ? <span>{source._count.chunks} chunks</span> : null}
      </div>
    </Link>
  );
}
