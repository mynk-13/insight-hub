import "server-only";
import { prisma } from "@/lib/shared/db";
import { Resend } from "resend";
import { canPerform } from "./permission";
import type { Role } from "@prisma/client";

const resend = new Resend(process.env.RESEND_API_KEY);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const FROM = "InsightHub <onboarding@resend.dev>";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const TRANSFER_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

export class InvitationService {
  async send(
    workspaceId: string,
    invitedById: string,
    email: string,
    role: Role,
  ): Promise<{ token: string }> {
    const actorMember = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: invitedById } },
    });
    if (!actorMember || !canPerform(actorMember.role, "members:invite")) {
      throw new Error("FORBIDDEN");
    }

    // OWNER role is reserved for ownership transfer — use dedicated method
    if (role === "OWNER") throw new Error("INVALID_ROLE");

    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

    // Revoke any existing pending invitation for this email in this workspace
    await prisma.invitation.updateMany({
      where: { workspaceId, email, status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const invitation = await prisma.invitation.create({
      data: {
        workspaceId,
        email,
        role,
        invitedById,
        expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      },
    });

    const inviterUser = await prisma.user.findUniqueOrThrow({
      where: { id: invitedById },
      select: { name: true, email: true },
    });

    const acceptUrl = `${APP_URL}/invitations/${invitation.token}`;

    await resend.emails.send({
      from: FROM,
      to: email,
      subject: `You've been invited to ${workspace.name} on InsightHub`,
      html: buildInviteEmail({
        inviterName: inviterUser.name ?? inviterUser.email,
        workspaceName: workspace.name,
        role,
        acceptUrl,
        expiresInDays: 7,
      }),
    });

    return { token: invitation.token };
  }

  async accept(token: string, userId: string): Promise<{ workspaceId: string; slug: string }> {
    const invitation = await prisma.invitation.findUnique({ where: { token } });
    if (!invitation) throw new Error("NOT_FOUND");
    if (invitation.status !== "PENDING") throw new Error("INVITATION_INVALID");
    if (invitation.expiresAt < new Date()) {
      await prisma.invitation.update({ where: { token }, data: { status: "EXPIRED" } });
      throw new Error("INVITATION_EXPIRED");
    }

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });

    // Email must match the invitation (case-insensitive)
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("EMAIL_MISMATCH");
    }

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: invitation.workspaceId },
    });

    // Check if user is already a member
    const existing = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
    });

    await prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { token },
        data: { status: "ACCEPTED", respondedAt: new Date() },
      });

      if (invitation.role === "OWNER") {
        // Ownership transfer: demote previous owner to ADMIN, promote new owner
        await tx.member.update({
          where: {
            workspaceId_userId: { workspaceId: invitation.workspaceId, userId: workspace.ownerId },
          },
          data: { role: "ADMIN" },
        });
        if (existing) {
          await tx.member.update({
            where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
            data: { role: "OWNER" },
          });
        } else {
          await tx.member.create({
            data: { workspaceId: invitation.workspaceId, userId, role: "OWNER" },
          });
        }
        await tx.workspace.update({
          where: { id: invitation.workspaceId },
          data: { ownerId: userId },
        });
      } else {
        if (existing) {
          await tx.member.update({
            where: { workspaceId_userId: { workspaceId: invitation.workspaceId, userId } },
            data: { role: invitation.role },
          });
        } else {
          await tx.member.create({
            data: { workspaceId: invitation.workspaceId, userId, role: invitation.role },
          });
        }
      }
    });

    return { workspaceId: invitation.workspaceId, slug: workspace.slug };
  }

  async decline(token: string, userId: string): Promise<void> {
    const invitation = await prisma.invitation.findUnique({ where: { token } });
    if (!invitation || invitation.status !== "PENDING") throw new Error("INVITATION_INVALID");

    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("EMAIL_MISMATCH");
    }

    await prisma.invitation.update({
      where: { token },
      data: { status: "DECLINED", respondedAt: new Date() },
    });
  }

  async revoke(invitationId: string, workspaceId: string, actorId: string): Promise<void> {
    const actorMember = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorId } },
    });
    if (!actorMember || !canPerform(actorMember.role, "invitations:manage")) {
      throw new Error("FORBIDDEN");
    }

    const invitation = await prisma.invitation.findUnique({ where: { id: invitationId } });
    if (!invitation || invitation.workspaceId !== workspaceId) throw new Error("NOT_FOUND");
    if (invitation.status !== "PENDING") throw new Error("INVITATION_INVALID");

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "REVOKED" },
    });
  }

  async listPending(workspaceId: string, actorId: string) {
    const actorMember = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: actorId } },
    });
    if (!actorMember || !canPerform(actorMember.role, "invitations:manage")) {
      throw new Error("FORBIDDEN");
    }

    return prisma.invitation.findMany({
      where: { workspaceId, status: "PENDING", expiresAt: { gt: new Date() } },
      include: { invitedBy: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async initiateOwnershipTransfer(
    workspaceId: string,
    ownerId: string,
    targetUserId: string,
  ): Promise<void> {
    const ownerMember = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: ownerId } },
    });
    if (!ownerMember || ownerMember.role !== "OWNER") throw new Error("FORBIDDEN");

    const targetMember = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    });
    if (!targetMember) throw new Error("TARGET_NOT_MEMBER");

    const targetUser = await prisma.user.findUniqueOrThrow({
      where: { id: targetUserId },
      select: { email: true, name: true },
    });

    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const owner = await prisma.user.findUniqueOrThrow({
      where: { id: ownerId },
      select: { name: true, email: true },
    });

    // Revoke any existing pending ownership transfer for this workspace
    await prisma.invitation.updateMany({
      where: { workspaceId, role: "OWNER", status: "PENDING" },
      data: { status: "REVOKED" },
    });

    const invitation = await prisma.invitation.create({
      data: {
        workspaceId,
        email: targetUser.email,
        role: "OWNER",
        invitedById: ownerId,
        expiresAt: new Date(Date.now() + TRANSFER_TTL_MS),
      },
    });

    const acceptUrl = `${APP_URL}/invitations/${invitation.token}`;

    await resend.emails.send({
      from: FROM,
      to: targetUser.email,
      subject: `Ownership of ${workspace.name} is being transferred to you`,
      html: buildTransferEmail({
        ownerName: owner.name ?? owner.email,
        targetName: targetUser.name ?? targetUser.email,
        workspaceName: workspace.name,
        acceptUrl,
      }),
    });
  }

  async cancelOwnershipTransfer(workspaceId: string, ownerId: string): Promise<void> {
    const ownerMember = await prisma.member.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: ownerId } },
    });
    if (!ownerMember || ownerMember.role !== "OWNER") throw new Error("FORBIDDEN");

    await prisma.invitation.updateMany({
      where: { workspaceId, role: "OWNER", status: "PENDING" },
      data: { status: "REVOKED" },
    });
  }

  async getByToken(token: string) {
    return prisma.invitation.findUnique({
      where: { token },
      include: {
        workspace: { select: { name: true, slug: true, avatarUrl: true } },
        invitedBy: { select: { name: true, email: true, image: true } },
      },
    });
  }
}

export const invitationService = new InvitationService();

// ─── Email builders ────────────────────────────────────────────────────────────

function buildInviteEmail(opts: {
  inviterName: string;
  workspaceName: string;
  role: Role;
  acceptUrl: string;
  expiresInDays: number;
}): string {
  const roleLabel = opts.role.charAt(0) + opts.role.slice(1).toLowerCase();
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px; color: #111;">
  <h2 style="margin-bottom: 8px;">You've been invited to <strong>${opts.workspaceName}</strong></h2>
  <p style="color: #555;">${opts.inviterName} has invited you to join as <strong>${roleLabel}</strong>.</p>
  <p style="margin: 24px 0;">
    <a href="${opts.acceptUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Accept Invitation
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">This invitation expires in ${opts.expiresInDays} days. If you didn't expect this, you can ignore this email.</p>
</body>
</html>`;
}

function buildTransferEmail(opts: {
  ownerName: string;
  targetName: string;
  workspaceName: string;
  acceptUrl: string;
}): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 16px; color: #111;">
  <h2 style="margin-bottom: 8px;">Workspace ownership transfer</h2>
  <p style="color: #555;">Hi ${opts.targetName}, <strong>${opts.ownerName}</strong> wants to transfer ownership of <strong>${opts.workspaceName}</strong> to you.</p>
  <p style="margin: 24px 0;">
    <a href="${opts.acceptUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
      Accept Ownership
    </a>
  </p>
  <p style="color: #888; font-size: 13px;">This offer expires in 48 hours. If you did not expect this, you can safely ignore this email.</p>
</body>
</html>`;
}
