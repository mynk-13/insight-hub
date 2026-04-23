import "server-only";
import { db } from "@/lib/shared/db";

const FREE_TIER_LIMIT = 10;

export async function checkSourceQuota(workspaceId: string): Promise<void> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { tier: true, _count: { select: { sources: { where: { deletedAt: null } } } } },
  });

  if (!workspace) throw new Error("Workspace not found");
  if (workspace.tier === "PRO") return;

  if (workspace._count.sources >= FREE_TIER_LIMIT) {
    throw new Error(
      `Free tier limit reached (${FREE_TIER_LIMIT} sources). Upgrade to Pro for unlimited sources.`,
    );
  }
}
