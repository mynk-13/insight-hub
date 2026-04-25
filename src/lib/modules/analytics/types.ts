export interface TimeSeriesPoint {
  date: string; // YYYY-MM-DD
  count: number;
}

export interface TopCitedSource {
  sourceId: string;
  title: string;
  citationCount: number;
}

export interface MemberActivityPoint {
  userId: string;
  userName: string;
  queryCount: number;
  annotationCount: number;
  lastActiveAt: string | null;
}

export interface TokenConsumptionSummary {
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  byModel: Array<{ model: string; tokensIn: number; tokensOut: number; costUsd: number }>;
}

export interface AnalyticsDashboardData {
  sourcesOverTime: TimeSeriesPoint[];
  queryVolume: TimeSeriesPoint[];
  topCitedSources: TopCitedSource[];
  memberActivity: MemberActivityPoint[];
  tokenConsumption: TokenConsumptionSummary;
  refreshedAt: string;
}

export type WidgetKey = keyof Omit<AnalyticsDashboardData, "refreshedAt">;
