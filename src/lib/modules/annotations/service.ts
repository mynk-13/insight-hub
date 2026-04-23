import "server-only";
import { db } from "@/lib/shared/db";
import type { CreateAnnotationInput, CreateReplyInput, ReactionEmoji } from "./types";

export const AnnotationService = {
  async create(
    workspaceId: string,
    sourceId: string,
    userId: string,
    input: CreateAnnotationInput,
  ) {
    return db.annotation.create({
      data: {
        workspaceId,
        sourceId,
        userId,
        type: input.content ? "COMMENT" : "HIGHLIGHT",
        color: input.color ?? "yellow",
        content: input.content ?? null,
        anchorText: input.anchor.text,
        anchorStart: input.anchor.start,
        anchorEnd: input.anchor.end,
        pageNumber: input.anchor.pageNumber ?? null,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, image: true } },
            reactions: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  },

  async list(workspaceId: string, sourceId: string) {
    return db.annotation.findMany({
      where: { workspaceId, sourceId, parentId: null, deletedAt: null },
      orderBy: { anchorStart: "asc" },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, image: true } },
            reactions: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  },

  async getById(id: string, workspaceId: string) {
    return db.annotation.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
        replies: {
          where: { deletedAt: null },
          orderBy: { createdAt: "asc" },
          include: {
            user: { select: { id: true, name: true, image: true } },
            reactions: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });
  },

  async update(
    id: string,
    workspaceId: string,
    userId: string,
    data: { content?: string; color?: string },
  ) {
    const annotation = await db.annotation.findFirst({
      where: { id, workspaceId, userId, deletedAt: null },
    });
    if (!annotation) throw new Error("NOT_FOUND");
    return db.annotation.update({
      where: { id },
      data,
      include: { user: { select: { id: true, name: true, image: true } } },
    });
  },

  async softDelete(id: string, workspaceId: string, userId: string, role: string) {
    const annotation = await db.annotation.findFirst({
      where: { id, workspaceId, deletedAt: null },
    });
    if (!annotation) throw new Error("NOT_FOUND");
    const isOwner = annotation.userId === userId;
    const canForceDelete = role === "OWNER" || role === "ADMIN";
    if (!isOwner && !canForceDelete) throw new Error("FORBIDDEN");
    return db.annotation.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async toggleResolve(id: string, workspaceId: string, userId: string, role: string) {
    const annotation = await db.annotation.findFirst({
      where: { id, workspaceId, parentId: null, deletedAt: null },
    });
    if (!annotation) throw new Error("NOT_FOUND");
    const isOwner = annotation.userId === userId;
    const canResolve = role === "OWNER" || role === "ADMIN" || role === "EDITOR";
    if (!isOwner && !canResolve) throw new Error("FORBIDDEN");
    return db.annotation.update({
      where: { id },
      data: { isResolved: !annotation.isResolved },
    });
  },

  async createReply(
    parentId: string,
    workspaceId: string,
    sourceId: string,
    userId: string,
    input: CreateReplyInput,
  ) {
    const parent = await db.annotation.findFirst({
      where: { id: parentId, workspaceId, parentId: null, deletedAt: null },
    });
    if (!parent) throw new Error("NOT_FOUND");

    const replyCount = await db.annotation.count({
      where: { parentId, deletedAt: null },
    });
    if (replyCount >= 100) throw new Error("REPLY_LIMIT");

    return db.annotation.create({
      data: {
        workspaceId,
        sourceId,
        userId,
        parentId,
        type: "COMMENT",
        content: input.content,
        anchorText: parent.anchorText,
        anchorStart: parent.anchorStart,
        anchorEnd: parent.anchorEnd,
        pageNumber: parent.pageNumber,
      },
      include: {
        user: { select: { id: true, name: true, image: true } },
        reactions: { include: { user: { select: { id: true, name: true } } } },
      },
    });
  },

  async toggleReaction(annotationId: string, workspaceId: string, userId: string, emoji: string) {
    const annotation = await db.annotation.findFirst({
      where: { id: annotationId, workspaceId, deletedAt: null },
    });
    if (!annotation) throw new Error("NOT_FOUND");

    const existing = await db.reaction.findUnique({
      where: { annotationId_userId: { annotationId, userId } },
    });

    if (existing) {
      if (existing.emoji === emoji) {
        await db.reaction.delete({ where: { annotationId_userId: { annotationId, userId } } });
        return { action: "removed" as const };
      }
      await db.reaction.update({
        where: { annotationId_userId: { annotationId, userId } },
        data: { emoji },
      });
      return { action: "updated" as const };
    }

    await db.reaction.create({ data: { annotationId, userId, emoji } });
    return { action: "added" as const };
  },

  parseMentions(content: string): string[] {
    const matches = content.match(/@\[([^\]]+)\]\(([^)]+)\)/g) ?? [];
    return matches
      .map((m) => {
        const idMatch = m.match(/\(([^)]+)\)/);
        return idMatch ? idMatch[1] : "";
      })
      .filter(Boolean);
  },
} satisfies Record<string, unknown>;

export type AnnotationWithRelations = Awaited<ReturnType<typeof AnnotationService.list>>[number];
export type ReactionEmoji_ = ReactionEmoji;
