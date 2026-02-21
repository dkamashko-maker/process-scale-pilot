import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import type { ParameterDef, ProcessEvent } from "@/data/runTypes";
import type { TimeseriesPoint } from "@/data/runTypes";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "#6366f1", "#ec4899",
  "#14b8a6", "#f97316", "#8b5cf6", "#06b6d4", "#84cc16", "#ef4444", "#a855f7",
];

interface ProcessChartProps {
  timeseries: TimeseriesPoint[];
  selectedParams: string[];
  parameters: ParameterDef[];
  eventMarkers: (ProcessEvent & { elapsed_h: number })[];
  highlightedEventH: number | null;
  showRangeBands: boolean;
}

function normalize(value: number, param: ParameterDef) {
  const range = param.max_value - param.min_value;
  if (range === 0) return 50;
  return ((value - param.min_value) / range) * 100;
}

function CustomTooltip({ active, payload, label, parameters }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border rounded-lg p-3 shadow-lg text-sm max-w-xs">
      <p className="font-medium mb-1">Hour {label}</p>
      {payload.map((entry: any) => {
        const code = entry.dataKey as string;
        const param = parameters.find((p: ParameterDef) => p.parameter_code === code);
        const raw = entry.payload[`${code}_raw`];
        return (
          <p key={code} style={{ color: entry.color }}>
            {param?.display_name}: {typeof raw === "number" ? raw.toFixed(2) : "—"} {param?.unit}
          </p>
        );
      })}
    </div>
  );
}

export function ProcessChart({
  timeseries,
  selectedParams,
  parameters,
  eventMarkers,
  highlightedEventH,
  showRangeBands,
}: ProcessChartProps) {
  const chartData = useMemo(() => {
    return timeseries.map((point) => {
      const row: Record<string, number | string> = { elapsed_h: point.elapsed_h, timestamp: point.timestamp };
      selectedParams.forEach((code) => {
        const param = parameters.find((p) => p.parameter_code === code);
        if (param) {
          row[code] = normalize(point[code] as number, param);
          row[`${code}_raw`] = point[code] as number;
        }
      });
      return row;
    });
  }, [timeseries, selectedParams, parameters]);

  const maxH = timeseries.length > 0 ? timeseries[timeseries.length - 1].elapsed_h : 100;

  return (
    <ResponsiveContainer width="100%" height={420}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis dataKey="elapsed_h" label={{ value: "Hours", position: "bottom", offset: -5 }} className="text-xs" />
        <YAxis domain={[-10, 110]} label={{ value: "% of range", angle: -90, position: "insideLeft" }} className="text-xs" />
        <Tooltip content={<CustomTooltip parameters={parameters} />} />
        <Legend />

        {/* Range bands: 0–100% = in-spec zone */}
        {showRangeBands && (
          <>
            <ReferenceArea y1={0} y2={100} fill="hsl(var(--primary))" fillOpacity={0.04} />
            <ReferenceLine y={0} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeOpacity={0.3} label={{ value: "Min", position: "left", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
            <ReferenceLine y={100} stroke="hsl(var(--primary))" strokeDasharray="6 3" strokeOpacity={0.3} label={{ value: "Max", position: "left", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          </>
        )}

        {/* Parameter lines */}
        {selectedParams.map((code, i) => {
          const param = parameters.find((p) => p.parameter_code === code);
          return (
            <Line key={code} type="monotone" dataKey={code}
              stroke={COLORS[i % COLORS.length]} strokeWidth={1.5} dot={false}
              name={param?.display_name || code} />
          );
        })}

        {/* Event markers */}
        {eventMarkers.filter((e) => e.elapsed_h >= 0 && e.elapsed_h <= maxH).map((e, i) => (
          <ReferenceLine key={i} x={Math.round(e.elapsed_h)}
            stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" strokeOpacity={0.4} />
        ))}

        {/* Highlighted event */}
        {highlightedEventH !== null && (
          <ReferenceLine x={Math.round(highlightedEventH)}
            stroke="hsl(var(--destructive))" strokeWidth={2} strokeOpacity={0.8} />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
