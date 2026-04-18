import { prisma } from "@/lib/shared/db";
import type { Prisma } from "@prisma/client";
import { type AuditAction } from "@prisma/client";

interface AuditParams {
  action: AuditAction;
  userId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function writeAuditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: params.action,
        userId: params.userId,
        workspaceId: params.workspaceId,
        metadata: (params.metadata ?? {}) as Prisma.InputJsonValue,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch {
    // Audit log failures must never interrupt the primary operation
  }
}
