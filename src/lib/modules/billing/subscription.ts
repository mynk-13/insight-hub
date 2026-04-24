import "server-only";
import { db } from "@/lib/shared/db";
import { cache } from "@/lib/shared/cache";
import { logger } from "@/lib/shared/logger";
import type { GatewayType, NormalizedSubscriptionEvent } from "./types";
import { DUNNING_DAYS, GRACE_PERIOD_DAYS } from "./types";
import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY!);
  return _resend;
}

const DUNNING_KEY = (subId: string) => `billing:dunning:${subId}` as const;

interface DunningState {
  startedAt: string; // ISO
  emailsSent: number[];
}

export async function handleNormalizedEvent(event: NormalizedSubscriptionEvent): Promise<void> {
  // Idempotency: skip if already processed
  const existing = await db.paymentEvent.findUnique({
    where: {
      gateway_gatewayEventId: { gateway: event.gateway, gatewayEventId: event.gatewayEventId },
    },
  });
  if (existing) return;

  switch (event.type) {
    case "subscription.activated":
      await handleActivated(event);
      break;
    case "payment.succeeded":
      await handlePaymentSucceeded(event);
      break;
    case "payment.failed":
      await handlePaymentFailed(event);
      break;
    case "subscription.updated":
      await handleUpdated(event);
      break;
    case "subscription.canceled":
      await handleCanceled(event);
      break;
  }
}

async function upsertSubscription(
  workspaceId: string,
  data: {
    gateway: GatewayType;
    gatewaySubId: string;
    status?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
    currentPeriodStart?: Date;
    currentPeriodEnd?: Date;
    cancelAtPeriodEnd?: boolean;
    pastDueAt?: Date | null;
  },
) {
  const now = new Date();
  await db.subscription.upsert({
    where: { workspaceId },
    create: {
      workspaceId,
      tier: "PRO",
      gateway: data.gateway,
      gatewaySubId: data.gatewaySubId,
      status: data.status ?? "ACTIVE",
      currentPeriodStart: data.currentPeriodStart ?? now,
      currentPeriodEnd: data.currentPeriodEnd ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? false,
      pastDueAt: data.pastDueAt,
    },
    update: {
      ...(data.status && { status: data.status }),
      ...(data.gateway && { gateway: data.gateway }),
      ...(data.gatewaySubId && { gatewaySubId: data.gatewaySubId }),
      ...(data.currentPeriodStart && { currentPeriodStart: data.currentPeriodStart }),
      ...(data.currentPeriodEnd && { currentPeriodEnd: data.currentPeriodEnd }),
      ...(data.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: data.cancelAtPeriodEnd }),
      ...(data.pastDueAt !== undefined && { pastDueAt: data.pastDueAt }),
    },
  });
}

async function handleActivated(event: NormalizedSubscriptionEvent): Promise<void> {
  if (!event.workspaceId) return;
  await upsertSubscription(event.workspaceId, {
    gateway: event.gateway,
    gatewaySubId: event.gatewaySubId,
    status: "ACTIVE",
    currentPeriodStart: event.currentPeriodStart,
    currentPeriodEnd: event.currentPeriodEnd,
    cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? false,
    pastDueAt: null,
  });
  await db.workspace.update({ where: { id: event.workspaceId }, data: { tier: "PRO" } });
  await recordPaymentEvent(event);
}

async function handlePaymentSucceeded(event: NormalizedSubscriptionEvent): Promise<void> {
  const sub = await db.subscription.findFirst({ where: { gatewaySubId: event.gatewaySubId } });
  if (!sub) return;
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      status: "ACTIVE",
      pastDueAt: null,
      ...(event.currentPeriodStart && { currentPeriodStart: event.currentPeriodStart }),
      ...(event.currentPeriodEnd && { currentPeriodEnd: event.currentPeriodEnd }),
    },
  });
  await db.workspace.update({ where: { id: sub.workspaceId }, data: { tier: "PRO" } });
  // Clear dunning state
  await cache.del(DUNNING_KEY(sub.id));
  await recordPaymentEvent(event, sub.id, sub.workspaceId);
}

async function handlePaymentFailed(event: NormalizedSubscriptionEvent): Promise<void> {
  const sub = await db.subscription.findFirst({ where: { gatewaySubId: event.gatewaySubId } });
  if (!sub) return;
  const now = new Date();
  await db.subscription.update({
    where: { id: sub.id },
    data: { status: "PAST_DUE", pastDueAt: sub.pastDueAt ?? now },
  });
  // Initialize dunning state
  const existing = await cache.get<DunningState>(DUNNING_KEY(sub.id));
  if (!existing) {
    await cache.set<DunningState>(DUNNING_KEY(sub.id), {
      startedAt: now.toISOString(),
      emailsSent: [],
    });
  }
  await recordPaymentEvent(event, sub.id, sub.workspaceId);
}

async function handleUpdated(event: NormalizedSubscriptionEvent): Promise<void> {
  const sub = await db.subscription.findFirst({ where: { gatewaySubId: event.gatewaySubId } });
  if (!sub) return;
  await db.subscription.update({
    where: { id: sub.id },
    data: {
      ...(event.currentPeriodStart && { currentPeriodStart: event.currentPeriodStart }),
      ...(event.currentPeriodEnd && { currentPeriodEnd: event.currentPeriodEnd }),
      ...(event.cancelAtPeriodEnd !== undefined && { cancelAtPeriodEnd: event.cancelAtPeriodEnd }),
    },
  });
  await recordPaymentEvent(event, sub.id, sub.workspaceId);
}

async function handleCanceled(event: NormalizedSubscriptionEvent): Promise<void> {
  const sub = await db.subscription.findFirst({ where: { gatewaySubId: event.gatewaySubId } });
  if (!sub) return;
  await db.subscription.update({ where: { id: sub.id }, data: { status: "CANCELED" } });
  await db.workspace.update({ where: { id: sub.workspaceId }, data: { tier: "FREE" } });
  await recordPaymentEvent(event, sub.id, sub.workspaceId);
}

async function recordPaymentEvent(
  event: NormalizedSubscriptionEvent,
  subscriptionId?: string,
  workspaceId?: string,
): Promise<void> {
  const resolvedSub = subscriptionId
    ? { id: subscriptionId }
    : await db.subscription.findFirst({ where: { gatewaySubId: event.gatewaySubId } });
  if (!resolvedSub) return;
  try {
    await db.paymentEvent.create({
      data: {
        subscriptionId: resolvedSub.id,
        workspaceId: workspaceId ?? event.workspaceId ?? "",
        gateway: event.gateway,
        eventType: event.type,
        gatewayEventId: event.gatewayEventId,
        payload: event.rawPayload as object,
      },
    });
  } catch (err) {
    // Unique constraint violation = already processed (idempotent)
    logger.info("payment_event_duplicate", { gatewayEventId: event.gatewayEventId, err });
  }
}

/** Called nightly by reconciliation cron. Sends dunning emails and downgrades after grace period. */
export async function runDunning(): Promise<void> {
  const pastDueSubs = await db.subscription.findMany({
    where: { status: "PAST_DUE", pastDueAt: { not: null } },
    include: {
      workspace: { include: { members: { where: { role: "OWNER" }, include: { user: true } } } },
    },
  });

  const now = Date.now();

  for (const sub of pastDueSubs) {
    const daysSinceDue = Math.floor((now - sub.pastDueAt!.getTime()) / (1000 * 60 * 60 * 24));
    const ownerEmail = sub.workspace.members[0]?.user?.email;

    // Send dunning emails on days 1, 3, 5
    const dunningState = await cache.get<DunningState>(DUNNING_KEY(sub.id));
    const emailsSent = dunningState?.emailsSent ?? [];

    for (const day of DUNNING_DAYS) {
      if (daysSinceDue >= day && !emailsSent.includes(day) && ownerEmail) {
        await sendDunningEmail(ownerEmail, sub.workspace.name, day, daysSinceDue);
        emailsSent.push(day);
        await cache.set<DunningState>(DUNNING_KEY(sub.id), {
          startedAt: dunningState?.startedAt ?? sub.pastDueAt!.toISOString(),
          emailsSent,
        });
      }
    }

    // Downgrade on day 7
    if (daysSinceDue >= GRACE_PERIOD_DAYS) {
      await db.subscription.update({ where: { id: sub.id }, data: { status: "EXPIRED" } });
      await db.workspace.update({ where: { id: sub.workspaceId }, data: { tier: "FREE" } });
      await cache.del(DUNNING_KEY(sub.id));
      logger.info("dunning_downgrade", { workspaceId: sub.workspaceId, daysSinceDue });
    }
  }
}

/** Reconcile all active Pro workspaces against gateway subscription status. */
export async function runReconciliation(): Promise<void> {
  const activeSubs = await db.subscription.findMany({
    where: { status: "ACTIVE", currentPeriodEnd: { lt: new Date() } },
  });
  for (const sub of activeSubs) {
    logger.info("reconcile_expired_period", {
      subscriptionId: sub.id,
      gatewaySubId: sub.gatewaySubId,
    });
    // Mark past due if period ended and no renewal event received
    await db.subscription.update({
      where: { id: sub.id },
      data: { status: "PAST_DUE", pastDueAt: new Date() },
    });
  }
}

async function sendDunningEmail(
  email: string,
  workspaceName: string,
  day: number,
  _daysSinceDue: number,
) {
  try {
    await getResend().emails.send({
      from: "billing@resend.dev",
      to: email,
      subject: `Action required: InsightHub payment failed for ${workspaceName}`,
      html: `
        <p>Hi,</p>
        <p>Your InsightHub Pro subscription payment for <strong>${workspaceName}</strong> has failed.</p>
        <p>This is reminder ${day === 1 ? "1 of 3" : day === 3 ? "2 of 3" : "3 of 3"}.
        Your workspace will be downgraded to the Free tier in ${7 - day} days if payment is not resolved.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/ws/${workspaceName}/settings/billing">Update payment method →</a></p>
      `,
    });
  } catch (err) {
    logger.error("dunning_email_failed", { email, day, err });
  }
}
