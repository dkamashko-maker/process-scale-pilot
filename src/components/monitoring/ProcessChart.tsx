import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from "recharts";
import type { ParameterDef, ProcessEvent, TimeseriesPoint } from "@/data/runTypes";

/**
 * Canonical per-parameter colour map. Used by both the chart and the
 * parameter picker checkboxes so the visual link is unambiguous.
 */
export const PARAM_COLOR: Record<string, string> = {
  TEMP:    "#ef4444",
  PH:      "#3b82f6",
  VOLUME:  "#f97316",
  DO:      "#10b981",
  AGIT:    "#8b5cf6",
  AIR_VVM: "#06b6d4",
  O2_PCT:  "#f59e0b",
  GLU:     "#84cc16",
  OSMO:    "#0ea5e9",
  N2_PCT:  "#64748b",
  CO2_PCT: "#ec4899",
  VCD:     "#14b8a6",
  VIAB:    "#6366f1",
  LAC:     "#a855f7",
};

export function colorFor(code: string): string {
  return PARAM_COLOR[code] ?? "#64748b";
}

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

function isInRange(raw: number, param: ParameterDef): boolean {
  return raw >= param.min_value && raw <= param.max_value;
}

/** Scientific tooltip — name, absolute value+unit, hours, in/out-of-range dot. */
function ChartTooltip({ active, payload, label, parameters }: any) {
  if (!active || !payload?.length) return null;
  const hours = typeof label === "number" ? label.toFixed(1) : label;
  return (
    <div className="card-data px-3 py-2 shadow-md text-[12px] min-w-[180px]">
      <p className="text-text-secondary mb-1.5">
        Hour <span className="text-foreground font-medium tabular-nums">{hours}</span>
      </p>
      <div className="space-y-1">
        {payload.map((entry: any) => {
          const code = entry.dataKey as string;
          const param = parameters.find((p: ParameterDef) => p.parameter_code === code);
          if (!param) return null;
          const raw = entry.payload[`${code}_raw`];
          const ok = typeof raw === "number" ? isInRange(raw, param) : true;
          return (
            <div key={code} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: ok ? "#10b981" : "#ef4444" }}
                  title={ok ? "Within range" : "Out of range"}
                />
                <span className="truncate text-foreground">{param.display_name}</span>
              </span>
              <span className="tabular-nums text-foreground font-medium whitespace-nowrap">
                {typeof raw === "number" ? raw.toFixed(2) : "—"}{" "}
                <span className="text-text-secondary font-normal">{param.unit}</span>
              </span>
            </div>
          );
        })}
      </div>
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
      const row: Record<string, number | string> = {
        elapsed_h: point.elapsed_h,
        timestamp: point.timestamp,
      };
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
  const visibleParams = selectedParams
    .map((code) => parameters.find((p) => p.parameter_code === code))
    .filter((p): p is ParameterDef => Boolean(p));

  return (
    <div className="space-y-3">
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border-tertiary))" />
          <XAxis
            dataKey="elapsed_h"
            label={{ value: "Hours", position: "bottom", offset: 0, style: { fontSize: 11, fill: "hsl(var(--text-secondary))" } }}
            tick={{ fontSize: 11, fill: "hsl(var(--text-secondary))" }}
            stroke="hsl(var(--border-tertiary))"
          />
          <YAxis
            domain={[-10, 110]}
            tick={{ fontSize: 11, fill: "hsl(var(--text-secondary))" }}
            stroke="hsl(var(--border-tertiary))"
            width={40}
          />
          <Tooltip content={<ChartTooltip parameters={parameters} />} cursor={{ stroke: "hsl(var(--border))", strokeDasharray: "3 3" }} />

          {/* Per-parameter range bands — overlay tinted with the line colour */}
          {showRangeBands && visibleParams.map((param) => (
            <ReferenceArea
              key={`band-${param.parameter_code}`}
              y1={0}
              y2={100}
              fill={colorFor(param.parameter_code)}
              fillOpacity={0.08}
              stroke="none"
              ifOverflow="hidden"
            />
          ))}

          {/* Parameter lines */}
          {selectedParams.map((code) => {
            const param = parameters.find((p) => p.parameter_code === code);
            return (
              <Line
                key={code}
                type="monotone"
                dataKey={code}
                stroke={colorFor(code)}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                name={param?.display_name || code}
              />
            );
          })}

          {/* Event markers */}
          {eventMarkers
            .filter((e) => e.elapsed_h >= 0 && e.elapsed_h <= maxH)
            .map((e, i) => (
              <ReferenceLine
                key={i}
                x={Math.round(e.elapsed_h)}
                stroke="hsl(var(--text-tertiary))"
                strokeDasharray="3 3"
                strokeOpacity={0.4}
              />
            ))}

          {highlightedEventH !== null && (
            <ReferenceLine
              x={Math.round(highlightedEventH)}
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              strokeOpacity={0.8}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Compact horizontal legend, beneath the chart */}
      {visibleParams.length > 0 && (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1">
          {visibleParams.map((p) => (
            <li key={p.parameter_code} className="flex items-center gap-1.5 text-[13px] text-text-secondary">
              <span
                className="h-0.5 w-3 rounded-full"
                style={{ backgroundColor: colorFor(p.parameter_code) }}
                aria-hidden
              />
              <span>{p.display_name}</span>
              <span className="text-text-tertiary text-[11px]">{p.unit}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
