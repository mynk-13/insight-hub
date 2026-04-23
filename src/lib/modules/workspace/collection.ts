import "server-only";
import { db } from "@/lib/shared/db";

const MAX_PINNED = 5;

export type CollectionWithCount = {
  id: string;
  name: string;
  description: string | null;
  isPinned: boolean;
  sortOrder: number;
  createdAt: Date;
  _count: { sources: number };
};

export const CollectionService = {
  async list(workspaceId: string): Promise<CollectionWithCount[]> {
    return db.collection.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { sources: true } } },
    });
  },

  async get(id: string, workspaceId: string) {
    return db.collection.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: { _count: { select: { sources: true } } },
    });
  },

  async create(workspaceId: string, userId: string, name: string, description?: string) {
    const maxOrder = await db.collection.aggregate({
      where: { workspaceId, deletedAt: null },
      _max: { sortOrder: true },
    });
    return db.collection.create({
      data: {
        workspaceId,
        createdById: userId,
        name,
        description,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { _count: { select: { sources: true } } },
    });
  },

  async update(id: string, workspaceId: string, data: { name?: string; description?: string }) {
    return db.collection.update({
      where: { id, workspaceId },
      data,
      include: { _count: { select: { sources: true } } },
    });
  },

  async softDelete(id: string, workspaceId: string): Promise<void> {
    await db.collection.update({
      where: { id, workspaceId },
      data: { deletedAt: new Date() },
    });
  },

  async togglePin(id: string, workspaceId: string) {
    const col = await db.collection.findFirstOrThrow({
      where: { id, workspaceId, deletedAt: null },
    });

    if (!col.isPinned) {
      const pinnedCount = await db.collection.count({
        where: { workspaceId, isPinned: true, deletedAt: null },
      });
      if (pinnedCount >= MAX_PINNED) {
        throw new Error(`MAX_PINNED_EXCEEDED`);
      }
    }

    return db.collection.update({
      where: { id },
      data: { isPinned: !col.isPinned },
      include: { _count: { select: { sources: true } } },
    });
  },

  async addSource(collectionId: string, sourceId: string, workspaceId: string): Promise<void> {
    // Verify both belong to workspace
    const [col, src] = await Promise.all([
      db.collection.findFirst({ where: { id: collectionId, workspaceId, deletedAt: null } }),
      db.source.findFirst({ where: { id: sourceId, workspaceId, deletedAt: null } }),
    ]);
    if (!col || !src) throw new Error("NOT_FOUND");

    await db.sourceCollection.upsert({
      where: { sourceId_collectionId: { sourceId, collectionId } },
      create: { sourceId, collectionId },
      update: {},
    });
  },

  async removeSource(collectionId: string, sourceId: string, workspaceId: string): Promise<void> {
    const col = await db.collection.findFirst({ where: { id: collectionId, workspaceId } });
    if (!col) throw new Error("NOT_FOUND");

    await db.sourceCollection.delete({
      where: { sourceId_collectionId: { sourceId, collectionId } },
    });
  },

  async listSources(collectionId: string, workspaceId: string) {
    return db.source.findMany({
      where: {
        deletedAt: null,
        collections: { some: { collectionId } },
        workspaceId,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async reorder(workspaceId: string, orderedIds: string[]): Promise<void> {
    await db.$transaction(
      orderedIds.map((id, index) =>
        db.collection.update({
          where: { id, workspaceId },
          data: { sortOrder: index },
        }),
      ),
    );
  },

  async listPinned(workspaceId: string): Promise<CollectionWithCount[]> {
    return db.collection.findMany({
      where: { workspaceId, isPinned: true, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { sources: true } } },
    });
  },
};
