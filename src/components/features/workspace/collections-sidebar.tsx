"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderOpen, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CollectionWithCount } from "@/lib/modules/workspace/collection";

type Props = {
  collections: CollectionWithCount[];
  workspaceSlug: string;
  canEdit: boolean;
};

function SortableItem({
  collection,
  workspaceSlug,
  active,
}: {
  collection: CollectionWithCount;
  workspaceSlug: string;
  active: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: collection.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group">
      <span
        {...attributes}
        {...listeners}
        className="p-1 cursor-grab text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-3 w-3" />
      </span>
      <Link
        href={`/ws/${workspaceSlug}/collections/${collection.id}`}
        className={cn(
          "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{collection.name}</span>
        <span className="ml-auto text-muted-foreground/60">{collection._count.sources}</span>
      </Link>
    </div>
  );
}

export function CollectionsSidebar({
  collections: initial,
  workspaceSlug,
  canEdit: _canEdit,
}: Props) {
  const [items, setItems] = useState(initial);
  const pathname = usePathname();
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = items.findIndex((i) => i.id === active.id);
    const newIdx = items.findIndex((i) => i.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    const next = [...items];
    const [moved] = next.splice(oldIdx, 1);
    next.splice(newIdx, 0, moved);
    setItems(next);

    await fetch(`/api/workspaces/${workspaceSlug}/collections/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((i) => i.id) }),
    });
    router.refresh();
  };

  if (items.length === 0) return null;

  return (
    <div className="px-2 mt-1">
      <p className="px-3 py-1 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
        Pinned
      </p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((col) => (
            <SortableItem
              key={col.id}
              collection={col}
              workspaceSlug={workspaceSlug}
              active={pathname.startsWith(`/ws/${workspaceSlug}/collections/${col.id}`)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
