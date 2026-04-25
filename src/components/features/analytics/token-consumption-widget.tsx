"use client";

import type { TokenConsumptionSummary } from "@/lib/modules/analytics/types";

interface Props {
  data: TokenConsumptionSummary;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function TokenConsumptionWidget({ data }: Props) {
  const total = data.totalTokensIn + data.totalTokensOut;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-xl font-bold">{fmt(data.totalTokensIn)}</p>
          <p className="text-xs text-muted-foreground">Input tokens</p>
        </div>
        <div>
          <p className="text-xl font-bold">{fmt(data.totalTokensOut)}</p>
          <p className="text-xs text-muted-foreground">Output tokens</p>
        </div>
        <div>
          <p className="text-xl font-bold">${data.totalCostUsd.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Cost (USD)</p>
        </div>
      </div>

      {data.byModel.length > 0 && (
        <div className="space-y-1.5">
          {data.byModel.map((m) => {
            const pct = total > 0 ? ((m.tokensIn + m.tokensOut) / total) * 100 : 0;
            return (
              <div key={m.model}>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="truncate font-medium">{m.model}</span>
                  <span className="text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {total === 0 && (
        <p className="text-center text-sm text-muted-foreground">No token usage yet.</p>
      )}
    </div>
  );
}
