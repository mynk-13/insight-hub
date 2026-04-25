import "server-only";
import { cache, redis, CacheKeys } from "@/lib/shared/cache";
import { db } from "@/lib/shared/db";
import type {
  AnalyticsDashboardData,
  TimeSeriesPoint,
  TopCitedSource,
  MemberActivityPoint,
  TokenConsumptionSummary,
} from "./types";

const CACHE_TTL = 60; // 60-second TTL per workspace

export async function getAnalytics(workspaceId: string): Promise<AnalyticsDashboardData> {
  const cacheKey = CacheKeys.analytics(workspaceId);
  const cached = await cache.get<AnalyticsDashboardData>(cacheKey);
  if (cached) return cached;

  const [sourcesOverTime, queryVolume, topCitedSources, memberActivity, tokenConsumption] =
    await Promise.all([
      aggregateSourcesOverTime(workspaceId),
      aggregateQueryVolume(workspaceId),
      aggregateTopCitedSources(workspaceId),
      aggregateMemberActivity(workspaceId),
      aggregateTokenConsumption(workspaceId),
    ]);

  const result: AnalyticsDashboardData = {
    sourcesOverTime,
    queryVolume,
    topCitedSources,
    memberActivity,
    tokenConsumption,
    refreshedAt: new Date().toISOString(),
  };

  await cache.set(cacheKey, result, CACHE_TTL);
  return result;
}

async function aggregateSourcesOverTime(workspaceId: string): Promise<TimeSeriesPoint[]> {
  // Last 30 days, grouped by day
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const sources = await db.source.findMany({
    where: {
      workspaceId,
      deletedAt: null,
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const s of sources) {
    const key = s.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

async function aggregateQueryVolume(workspaceId: string): Promise<TimeSeriesPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - 29);
  since.setHours(0, 0, 0, 0);

  const messages = await db.message.findMany({
    where: {
      workspaceId,
      role: "USER",
      createdAt: { gte: since },
    },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const m of messages) {
    const key = m.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

async function aggregateTopCitedSources(workspaceId: string): Promise<TopCitedSource[]> {
  // Count citation occurrences from ASSISTANT messages' citations JSON array
  const messages = await db.message.findMany({
    where: { workspaceId, role: "ASSISTANT" },
    select: { citations: true },
  });

  const citationCounts = new Map<string, number>();
  for (const msg of messages) {
    const citations = msg.citations as Array<{ sourceId?: string }>;
    if (!Array.isArray(citations)) continue;
    for (const c of citations) {
      if (c.sourceId) {
        citationCounts.set(c.sourceId, (citationCounts.get(c.sourceId) ?? 0) + 1);
      }
    }
  }

  if (citationCounts.size === 0) return [];

  const topIds = Array.from(citationCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  const sources = await db.source.findMany({
    where: { id: { in: topIds }, workspaceId, deletedAt: null },
    select: { id: true, title: true },
  });

  return sources
    .map((s) => ({ sourceId: s.id, title: s.title, citationCount: citationCounts.get(s.id) ?? 0 }))
    .sort((a, b) => b.citationCount - a.citationCount);
}

async function aggregateMemberActivity(workspaceId: string): Promise<MemberActivityPoint[]> {
  const members = await db.member.findMany({
    where: { workspaceId },
    include: { user: { select: { id: true, name: true } } },
  });

  const userIds = members.map((m) => m.userId);

  const [queryCountsRaw, annotationCountsRaw] = await Promise.all([
    db.message.groupBy({
      by: ["workspaceId"],
      where: { workspaceId, role: "USER" },
      _count: { id: true },
    }),
    db.annotation.groupBy({
      by: ["userId"],
      where: { workspaceId, userId: { in: userIds }, deletedAt: null },
      _count: { id: true },
    }),
  ]);

  // Per-user query counts require a different approach
  const chats = await db.chat.findMany({
    where: { workspaceId, userId: { in: userIds } },
    select: { userId: true },
  });
  const chatsByUser = new Map<string, number>();
  for (const c of chats) {
    chatsByUser.set(c.userId, (chatsByUser.get(c.userId) ?? 0) + 1);
  }

  const annotationsByUser = new Map<string, number>();
  for (const row of annotationCountsRaw) {
    annotationsByUser.set(row.userId, row._count.id);
  }

  // Suppress unused warning: queryCountsRaw used for total-level metrics elsewhere
  void queryCountsRaw;

  return members.map((m) => ({
    userId: m.userId,
    userName: m.user.name ?? m.user.id,
    queryCount: chatsByUser.get(m.userId) ?? 0,
    annotationCount: annotationsByUser.get(m.userId) ?? 0,
    lastActiveAt: m.lastVisitedAt?.toISOString() ?? null,
  }));
}

async function aggregateTokenConsumption(workspaceId: string): Promise<TokenConsumptionSummary> {
  const messages = await db.message.findMany({
    where: { workspaceId, role: "ASSISTANT", model: { not: null } },
    select: { model: true, tokensIn: true, tokensOut: true, costUsd: true },
  });

  let totalTokensIn = 0;
  let totalTokensOut = 0;
  let totalCostUsd = 0;
  const modelMap = new Map<string, { tokensIn: number; tokensOut: number; costUsd: number }>();

  for (const m of messages) {
    const model = m.model ?? "unknown";
    const tIn = m.tokensIn ?? 0;
    const tOut = m.tokensOut ?? 0;
    const cost = m.costUsd ? Number(m.costUsd) : 0;

    totalTokensIn += tIn;
    totalTokensOut += tOut;
    totalCostUsd += cost;

    const entry = modelMap.get(model) ?? { tokensIn: 0, tokensOut: 0, costUsd: 0 };
    entry.tokensIn += tIn;
    entry.tokensOut += tOut;
    entry.costUsd += cost;
    modelMap.set(model, entry);
  }

  const byModel = Array.from(modelMap.entries()).map(([model, data]) => ({ model, ...data }));

  return { totalTokensIn, totalTokensOut, totalCostUsd, byModel };
}

/** Invalidate analytics cache for a workspace (call after data-changing operations). */
export async function invalidateAnalyticsCache(workspaceId: string): Promise<void> {
  await redis.del(CacheKeys.analytics(workspaceId));
}
