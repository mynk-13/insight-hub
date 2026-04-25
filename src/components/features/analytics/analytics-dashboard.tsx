"use client";

import { useState } from "react";
import { BarChart2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourcesOverTimeWidget } from "./sources-over-time-widget";
import { QueryVolumeWidget } from "./query-volume-widget";
import { TopCitedSourcesWidget } from "./top-cited-sources-widget";
import { MemberActivityWidget } from "./member-activity-widget";
import { TokenConsumptionWidget } from "./token-consumption-widget";
import type { AnalyticsDashboardData } from "@/lib/modules/analytics/types";

interface Props {
  data: AnalyticsDashboardData;
  workspaceSlug: string;
}

interface WidgetCardProps {
  title: string;
  widgetKey: string;
  exporting: string | null;
  onExport: (key: string) => void;
  children: React.ReactNode;
}

function WidgetCard({ title, widgetKey, exporting, onExport, children }: WidgetCardProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-medium text-sm">{title}</h3>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => onExport(widgetKey)}
          disabled={exporting === widgetKey}
        >
          <Download className="h-3 w-3" />
          {exporting === widgetKey ? "Exporting…" : "CSV"}
        </Button>
      </div>
      {children}
    </div>
  );
}

export function AnalyticsDashboard({ data, workspaceSlug }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportCsv(widget: string) {
    setExporting(widget);
    try {
      const res = await fetch(`/api/workspaces/${workspaceSlug}/analytics/export?widget=${widget}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${widget}-${workspaceSlug}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Analytics</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          Refreshed {new Date(data.refreshedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <WidgetCard
          title="Sources Added (30d)"
          widgetKey="sourcesOverTime"
          exporting={exporting}
          onExport={exportCsv}
        >
          <SourcesOverTimeWidget data={data.sourcesOverTime} />
        </WidgetCard>

        <WidgetCard
          title="Query Volume (30d)"
          widgetKey="queryVolume"
          exporting={exporting}
          onExport={exportCsv}
        >
          <QueryVolumeWidget data={data.queryVolume} />
        </WidgetCard>
      </div>

      <WidgetCard
        title="Top Cited Sources"
        widgetKey="topCitedSources"
        exporting={exporting}
        onExport={exportCsv}
      >
        <TopCitedSourcesWidget data={data.topCitedSources} />
      </WidgetCard>

      <div className="grid gap-4 md:grid-cols-2">
        <WidgetCard
          title="Member Activity"
          widgetKey="memberActivity"
          exporting={exporting}
          onExport={exportCsv}
        >
          <MemberActivityWidget data={data.memberActivity} />
        </WidgetCard>

        <WidgetCard
          title="Token Consumption"
          widgetKey="tokenConsumption"
          exporting={exporting}
          onExport={exportCsv}
        >
          <TokenConsumptionWidget data={data.tokenConsumption} />
        </WidgetCard>
      </div>
    </div>
  );
}
