import "server-only";
import { Resend } from "resend";
import { NotificationPreferenceService } from "./notification-service";
import type { NotificationType } from "@prisma/client";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "InsightHub <notifications@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function getUnsubLink(userId: string, type: NotificationType): Promise<string> {
  const { db } = await import("@/lib/shared/db");
  const pref = await db.notificationPreference.findUnique({
    where: { userId_type: { userId, type } },
    select: { unsubToken: true },
  });
  if (!pref) return "";
  return `${APP_URL}/api/notifications/unsubscribe/${pref.unsubToken}`;
}

export async function sendMentionEmail(
  toEmail: string,
  toUserId: string,
  mentionerName: string,
  excerpt: string,
  resourceUrl: string,
) {
  const enabled = await NotificationPreferenceService.isEmailEnabled(toUserId, "MENTION");
  if (!enabled) return;
  const unsubLink = await getUnsubLink(toUserId, "MENTION");

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `${mentionerName} mentioned you on InsightHub`,
    html: emailTemplate({
      heading: `${mentionerName} mentioned you`,
      body: `<p>${excerpt}</p>`,
      ctaLabel: "View annotation",
      ctaUrl: `${APP_URL}${resourceUrl}`,
      unsubLink,
    }),
  });
}

export async function sendAnnotationReplyEmail(
  toEmail: string,
  toUserId: string,
  replierName: string,
  excerpt: string,
  resourceUrl: string,
) {
  const enabled = await NotificationPreferenceService.isEmailEnabled(toUserId, "ANNOTATION_REPLY");
  if (!enabled) return;
  const unsubLink = await getUnsubLink(toUserId, "ANNOTATION_REPLY");

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `${replierName} replied to your annotation`,
    html: emailTemplate({
      heading: `${replierName} replied to your annotation`,
      body: `<p>${excerpt}</p>`,
      ctaLabel: "View reply",
      ctaUrl: `${APP_URL}${resourceUrl}`,
      unsubLink,
    }),
  });
}

export async function sendRoleChangedEmail(
  toEmail: string,
  toUserId: string,
  workspaceName: string,
  newRole: string,
) {
  const enabled = await NotificationPreferenceService.isEmailEnabled(toUserId, "ROLE_CHANGED");
  if (!enabled) return;
  const unsubLink = await getUnsubLink(toUserId, "ROLE_CHANGED");

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your role in ${workspaceName} has changed`,
    html: emailTemplate({
      heading: "Role updated",
      body: `<p>Your role in <strong>${workspaceName}</strong> has been changed to <strong>${newRole}</strong>.</p>`,
      ctaLabel: "Open workspace",
      ctaUrl: APP_URL,
      unsubLink,
    }),
  });
}

function emailTemplate({
  heading,
  body,
  ctaLabel,
  ctaUrl,
  unsubLink,
}: {
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  unsubLink: string;
}) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;max-width:520px;margin:40px auto;color:#111">
  <h2 style="font-size:18px;margin-bottom:8px">${heading}</h2>
  ${body}
  <a href="${ctaUrl}" style="display:inline-block;margin-top:16px;padding:10px 20px;background:#000;color:#fff;border-radius:6px;text-decoration:none">${ctaLabel}</a>
  ${
    unsubLink
      ? `<p style="font-size:11px;color:#999;margin-top:32px">
    <a href="${unsubLink}" style="color:#999">Unsubscribe from this notification</a>
  </p>`
      : ""
  }
  </body></html>`;
}
