"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { FileText, Globe, FileType, FileCode } from "lucide-react";
import type { SearchResultItem } from "@/lib/modules/search/types";
import type { SourceType } from "@prisma/client";

const TYPE_ICON: Record<SourceType, React.ComponentType<{ className?: string }>> = {
  PDF: FileText,
  DOCX: FileType,
  URL: Globe,
  MARKDOWN: FileCode,
};

const TYPE_COLOR: Record<SourceType, string> = {
  PDF: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  DOCX: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  URL: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  MARKDOWN: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

type Props = {
  result: SearchResultItem;
  workspaceSlug: string;
};

export function SearchResult({ result, workspaceSlug }: Props) {
  const Icon = TYPE_ICON[result.sourceType];

  return (
    <Link
      href={`/ws/${workspaceSlug}/sources/${result.sourceId}`}
      className="block rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-medium text-sm truncate">{result.sourceTitle}</span>
            <span
              className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLOR[result.sourceType]}`}
            >
              {result.sourceType}
            </span>
          </div>
          {result.snippet && (
            <p
              className="text-xs text-muted-foreground line-clamp-2 leading-relaxed"
              // snippet contains <mark> tags for highlighting — safe: built server-side from DB content
              dangerouslySetInnerHTML={{ __html: result.snippet }}
            />
          )}
          {result.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {result.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
