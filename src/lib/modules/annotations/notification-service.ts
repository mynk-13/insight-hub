import "server-only";
import { db } from "@/lib/shared/db";
import type { NotificationType } from "@prisma/client";

const MAX_NOTIFICATIONS = 50;

export const NotificationService = {
  async create(
    userId: string,
    workspaceId: string,
    type: NotificationType,
    payload: { title: string; body?: string; resourceId?: string; resourceUrl?: string },
  ) {
    return db.notification.create({
      data: { userId, workspaceId, type, ...payload },
    });
  },

  async list(userId: string, workspaceId: string) {
    return db.notification.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: "desc" },
      take: MAX_NOTIFICATIONS,
    });
  },

  async unreadCount(userId: string, workspaceId: string) {
    return db.notification.count({ where: { userId, workspaceId, isRead: false } });
  },

  async markRead(id: string, userId: string) {
    return db.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },

  async markAllRead(userId: string, workspaceId: string) {
    return db.notification.updateMany({
      where: { userId, workspaceId, isRead: false },
      data: { isRead: true },
    });
  },
};

export const NotificationPreferenceService = {
  async getAll(userId: string) {
    const types: NotificationType[] = [
      "MENTION",
      "INVITE_ACCEPTED",
      "ROLE_CHANGED",
      "ANNOTATION_REPLY",
      "ANNOTATION_RESOLVED",
    ];

    const existing = await db.notificationPreference.findMany({ where: { userId } });
    const existingMap = new Map(existing.map((p) => [p.type, p]));

    const missing = types.filter((t) => !existingMap.has(t));
    if (missing.length > 0) {
      await db.notificationPreference.createMany({
        data: missing.map((type) => ({ userId, type })),
        skipDuplicates: true,
      });
      const refreshed = await db.notificationPreference.findMany({ where: { userId } });
      return refreshed;
    }

    return existing;
  },

  async update(userId: string, type: NotificationType, data: { inApp?: boolean; email?: boolean }) {
    return db.notificationPreference.upsert({
      where: { userId_type: { userId, type } },
      create: { userId, type, ...data },
      update: data,
    });
  },

  async unsubscribeByToken(token: string) {
    const pref = await db.notificationPreference.findUnique({
      where: { unsubToken: token },
    });
    if (!pref) throw new Error("NOT_FOUND");
    return db.notificationPreference.update({
      where: { unsubToken: token },
      data: { email: false },
    });
  },

  async isEmailEnabled(userId: string, type: NotificationType): Promise<boolean> {
    const pref = await db.notificationPreference.findUnique({
      where: { userId_type: { userId, type } },
    });
    return pref?.email ?? true;
  },
};
