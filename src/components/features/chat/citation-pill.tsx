"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/modules/rag/types";

type Props = {
  index: number;
  citations: Citation[];
  onSelect: (citation: Citation) => void;
  isActive?: boolean;
};

export function CitationPill({ index, citations, onSelect, isActive = false }: Props) {
  const citation = citations.find((c) => c.index === index);

  return (
    <button
      type="button"
      title={citation ? `Source: ${citation.sourceName}` : `Citation ${index}`}
      onClick={() => citation && onSelect(citation)}
      className={cn(
        "inline-flex items-center justify-center rounded px-1 py-0.5 text-xs font-semibold leading-none",
        "border transition-colors cursor-pointer align-middle",
        isActive
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20",
      )}
    >
      {index}
    </button>
  );
}
