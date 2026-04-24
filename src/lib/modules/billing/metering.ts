import "server-only";
import { redis } from "@/lib/shared/cache";
import { db } from "@/lib/shared/db";

type MeterType = "queries" | "sources";

function periodKey(workspaceId: string, type: MeterType, period: string): string {
  return `usage:${workspaceId}:${period}:${type}`;
}

function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function incrementUsage(workspaceId: string, type: MeterType): Promise<number> {
  const key = periodKey(workspaceId, type, currentPeriod());
  const count = await redis.incr(key);
  // Set expiry to 45 days on first write so keys auto-expire
  if (count === 1) {
    await redis.expire(key, 45 * 24 * 3600);
  }
  return count;
}

export async function getUsage(workspaceId: string, type: MeterType): Promise<number> {
  const key = periodKey(workspaceId, type, currentPeriod());
  const val = await redis.get<number>(key);
  return val ?? 0;
}

/** Check if usage is within quota. Returns true if allowed. */
export async function checkQuota(workspaceId: string, type: MeterType): Promise<boolean> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { tier: true },
  });
  if (!workspace) return false;
  if (workspace.tier === "PRO") return true;

  const usage = await getUsage(workspaceId, type);
  const limit = FREE_LIMITS[type];
  return usage < limit;
}

const FREE_LIMITS: Record<MeterType, number> = {
  queries: 50,
  sources: 10,
};
