"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import type { TopCitedSource } from "@/lib/modules/analytics/types";

interface Props {
  data: TopCitedSource[];
}

export function TopCitedSourcesWidget({ data }: Props) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-muted-foreground py-8">No citations yet.</p>;
  }

  const top = data.slice(0, 8).map((s) => ({
    name: s.title.length > 30 ? `${s.title.slice(0, 30)}…` : s.title,
    citations: s.citationCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
        <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tick={{ fontSize: 10 }}
          tickLine={false}
        />
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [v, "Citations"]} />
        <Bar dataKey="citations" radius={[0, 2, 2, 0]}>
          {top.map((_, i) => (
            <Cell key={i} fill={`hsl(var(--primary) / ${1 - i * 0.07})`} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
