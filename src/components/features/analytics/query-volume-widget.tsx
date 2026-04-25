"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import type { TimeSeriesPoint } from "@/lib/modules/analytics/types";

interface Props {
  data: TimeSeriesPoint[];
}

export function QueryVolumeWidget({ data }: Props) {
  if (data.every((d) => d.count === 0)) {
    return <p className="text-center text-sm text-muted-foreground py-8">No queries yet.</p>;
  }

  const formatted = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} interval={6} />
        <YAxis tick={{ fontSize: 10 }} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v) => [v, "Queries"]} />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
