"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FolderOpen, Pin, PinOff, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { CollectionWithCount } from "@/lib/modules/workspace/collection";

type Props = {
  collection: CollectionWithCount;
  workspaceSlug: string;
  canEdit: boolean;
};

export function CollectionCard({ collection, workspaceSlug, canEdit }: Props) {
  const router = useRouter();

  const togglePin = async (e: React.MouseEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/workspaces/${workspaceSlug}/collections/${collection.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: true }),
    });
    if (res.status === 422) {
      toast.error("Maximum 5 pinned collections reached");
      return;
    }
    if (!res.ok) {
      toast.error("Failed to update");
      return;
    }
    router.refresh();
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete "${collection.name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/workspaces/${workspaceSlug}/collections/${collection.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("Failed to delete");
      return;
    }
    toast.success("Collection deleted");
    router.refresh();
  };

  return (
    <Link
      href={`/ws/${workspaceSlug}/collections/${collection.id}`}
      className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 hover:bg-accent/50 transition-colors group"
    >
      <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{collection.name}</span>
          {collection.isPinned && (
            <Badge variant="secondary" className="text-xs shrink-0">
              Pinned
            </Badge>
          )}
        </div>
        {collection.description && (
          <p className="text-xs text-muted-foreground truncate">{collection.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {collection._count.sources} source{collection._count.sources !== 1 ? "s" : ""}
        </p>
      </div>
      {canEdit && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={togglePin}
            title={collection.isPinned ? "Unpin" : "Pin to sidebar"}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            {collection.isPinned ? (
              <PinOff className="h-3.5 w-3.5" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            onClick={handleDelete}
            title="Delete collection"
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </Link>
  );
}
