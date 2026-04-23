"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollectionCard } from "./collection-card";
import { CollectionForm } from "./collection-form";
import type { CollectionWithCount } from "@/lib/modules/workspace/collection";

type Props = {
  collections: CollectionWithCount[];
  workspaceSlug: string;
  canEdit: boolean;
};

export function CollectionList({ collections, workspaceSlug, canEdit }: Props) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Collections</h2>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => setShowForm((v) => !v)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New collection
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-lg border bg-card p-4">
          <CollectionForm workspaceSlug={workspaceSlug} onSuccess={() => setShowForm(false)} />
        </div>
      )}

      {collections.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed py-12 text-center text-muted-foreground">
          <p className="text-sm">No collections yet</p>
          {canEdit && <p className="text-xs mt-1">Create a collection to group related sources</p>}
        </div>
      )}

      <div className="space-y-2">
        {collections.map((col) => (
          <CollectionCard
            key={col.id}
            collection={col}
            workspaceSlug={workspaceSlug}
            canEdit={canEdit}
          />
        ))}
      </div>
    </div>
  );
}
