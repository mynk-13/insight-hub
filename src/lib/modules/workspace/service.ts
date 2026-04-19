import "server-only";
import { prisma } from "@/lib/shared/db";
import { cache, CacheKeys } from "@/lib/shared/cache";
import { canPerform, canAssignRole, type WorkspaceAction } from "./permission";
import type { Role, Workspace, Member } from "@prisma/client";

export type WorkspaceWithRole = Workspace & { role: Role };

export type MemberWithUser = Member & {
  user: { id: string; name: string | null; email: string; image: string | null };
};

export class WorkspaceService {
  async create(
    userId: string,
    data: { name: string; slug: string },
  ): Promise<{ id: string; slug: string }> {
    const existing = await prisma.workspace.findUnique({ where: { slug: data.slug } });
    if (existing) throw new Error("SLUG_TAKEN");

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: { name: data.name, slug: data.slug, ownerId: userId, tier: "FREE" },
      });
      await tx.member.create({
        data: { workspaceId: ws.id, userId, role: "OWNER" },
      });
      await tx.collection.create({
        data: {
          workspaceId: ws.id,
          name: "Inbox",
          isPinned: true,
          sortOrder: 0,
          createdById: userId,
        },
      });
      return ws;
    });

    return { id: workspace.id, slug: workspace.slug };
  }

  async getBySlug(slug: string, userId: string): Promise<WorkspaceWithRole | null> {
    const workspace = await prisma.workspace.findFirst({
      where: { slug, deletedAt: null },
    });
    if (!workspace) return null;

    const member = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId } },
    });
    if (!member) return null;

    return { ...workspace, role: member.role };
  }

  async listByUser(userId: string): Promise<WorkspaceWithRole[]> {
    const members = await prisma.member.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { lastVisitedAt: { sort: "desc", nulls: "last" } },
    });

    return members
      .filter((m) => m.workspace.deletedAt === null)
      .map((m) => ({ ...m.workspace, role: m.role }));
  }

  async update(
    workspaceId: string,
    userId: string,
    data: { name?: string; slug?: string; description?: string; avatarUrl?: string },
  ): Promise<Workspace> {
    await this.assertPermission(workspaceId, userId, "workspace:update");

    if (data.slug) {
      const conflict = await prisma.workspace.findFirst({
        where: { slug: data.slug, id: { not: workspaceId }, deletedAt: null },
      });
      if (conflict) throw new Error("SLUG_TAKEN");
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data,
    });

    await cache.del(CacheKeys.workspaceMeta(workspaceId));
    return updated;
  }

  async softDelete(workspaceId: string, userId: string): Promise<void> {
    await this.assertPermission(workspaceId, userId, "workspace:delete");

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { deletedAt: new Date() },
    });

    await cache.del(CacheKeys.workspaceMeta(workspaceId));
  }

  async touchLastVisited(workspaceId: string, userId: string): Promise<void> {
    await prisma.member.update({
      where: { workspaceId_userId: { workspaceId, userId } },
      data: { lastVisitedAt: new Date() },
    });
  }

  async listMembers(workspaceId: string, userId: string): Promise<MemberWithUser[]> {
    await this.assertPermission(workspaceId, userId, "members:read");

    return prisma.member.findMany({
      where: { workspaceId },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { joinedAt: "asc" },
    });
  }

  async changeMemberRole(
    workspaceId: string,
    actorId: string,
    targetMemberId: string,
    newRole: Role,
  ): Promise<void> {
    const actorMember = await this.requireMember(workspaceId, actorId);

    if (!canAssignRole(actorMember.role, newRole)) {
      throw new Error("FORBIDDEN");
    }

    const targetMember = await prisma.member.findUnique({ where: { id: targetMemberId } });
    if (!targetMember || targetMember.workspaceId !== workspaceId) throw new Error("NOT_FOUND");

    // Protect the workspace owner from role changes
    if (targetMember.role === "OWNER") throw new Error("CANNOT_CHANGE_OWNER_ROLE");

    await prisma.member.update({ where: { id: targetMemberId }, data: { role: newRole } });

    // Signal sessions to refresh (no-ops until Phase 4 wires Redis)
    await cache.set(CacheKeys.roleChanged(targetMember.userId, workspaceId), true, 300);
  }

  async removeMember(workspaceId: string, actorId: string, targetMemberId: string): Promise<void> {
    await this.assertPermission(workspaceId, actorId, "members:remove");

    const targetMember = await prisma.member.findUnique({ where: { id: targetMemberId } });
    if (!targetMember || targetMember.workspaceId !== workspaceId) throw new Error("NOT_FOUND");

    if (targetMember.role === "OWNER") throw new Error("CANNOT_REMOVE_OWNER");

    await prisma.$transaction([
      // Tombstone this member's annotations in the workspace
      prisma.annotation.updateMany({
        where: { workspaceId, userId: targetMember.userId },
        data: { deletedAt: new Date() },
      }),
      prisma.member.delete({ where: { id: targetMemberId } }),
    ]);

    // Signal session kick (no-ops until Phase 4 wires Redis)
    await cache.set(CacheKeys.sessionKick(targetMember.userId), workspaceId, 300);
  }

  async getActivity(workspaceId: string, userId: string, cursor?: string, limit = 20) {
    await this.assertPermission(workspaceId, userId, "activity:read");

    return prisma.auditLog.findMany({
      where: {
        workspaceId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 100),
    });
  }

  private async assertPermission(
    workspaceId: string,
    userId: string,
    action: WorkspaceAction,
  ): Promise<Member> {
    const member = await this.requireMember(workspaceId, userId);
    if (!canPerform(member.role, action)) throw new Error("FORBIDDEN");
    return member;
  }

  private async requireMember(workspaceId: string, userId: string): Promise<Member> {
    const member = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!member) throw new Error("FORBIDDEN");
    return member;
  }
}

export const workspaceService = new WorkspaceService();
