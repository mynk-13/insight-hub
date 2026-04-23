"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, FileText, Globe, FileType, FileCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { Source, SourceType } from "@prisma/client";

const TYPE_ICON: Record<SourceType, React.ComponentType<{ className?: string }>> = {
  PDF: FileText,
  DOCX: FileType,
  URL: Globe,
  MARKDOWN: FileCode,
};

type Props = {
  collectionId: string;
  workspaceSlug: string;
  sources: Source[];
  canEdit: boolean;
};

export function CollectionSources({ collectionId, workspaceSlug, sources, canEdit }: Props) {
  const [addingId, setAddingId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingId.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/workspaces/${workspaceSlug}/collections/${collectionId}/sources`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: addingId.trim() }),
        },
      );
      if (!res.ok) {
        toast.error("Source not found or already in collection");
        return;
      }
      setAddingId("");
      toast.success("Source added");
      router.refresh();
    } catch {
      toast.error("Failed to add source");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (sourceId: string) => {
    const res = await fetch(
      `/api/workspaces/${workspaceSlug}/collections/${collectionId}/sources/${sourceId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      toast.error("Failed to remove");
      return;
    }
    toast.success("Source removed");
    router.refresh();
  };

  return (
    <div className="space-y-3">
      {canEdit && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={addingId}
            onChange={(e) => setAddingId(e.target.value)}
            placeholder="Paste source ID to add"
            className="text-sm"
          />
          <Button type="submit" size="sm" disabled={loading || !addingId.trim()}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      )}
      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No sources in this collection yet
        </p>
      ) : (
        <div className="space-y-2">
          {sources.map((src) => {
            const Icon = TYPE_ICON[src.type];
            return (
              <div
                key={src.id}
                className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <Link
                  href={`/ws/${workspaceSlug}/sources/${src.id}`}
                  className="flex-1 min-w-0 text-sm font-medium truncate hover:underline"
                >
                  {src.title}
                </Link>
                {canEdit && (
                  <button
                    onClick={() => handleRemove(src.id)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    title="Remove from collection"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
