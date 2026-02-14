import { useState, useMemo, useCallback, useEffect } from "react";
import { PARAMETERS } from "@/data/runData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine, BarChart, Bar, Area, AreaChart,
  ComposedChart,
} from "recharts";
import type { ParameterDef, ProcessEvent, TimeseriesPoint } from "@/data/runTypes";

// ── Constants ──
const PARAM_COLORS: Record<string, string> = {
  PH: "#3b82f6", TEMP: "#ef4444", DO: "#10b981", AGIT: "#8b5cf6",
  AIR_VVM: "#06b6d4", O2_PCT: "#f59e0b", N2_PCT: "#64748b", CO2_PCT: "#ec4899",
  VOLUME: "#f97316", VCD: "#14b8a6", VIAB: "#6366f1", GLU: "#84cc16",
  LAC: "#a855f7", OSMO: "#0ea5e9",
};

const EVENT_COLORS: Record<string, string> = {
  FEED: "#22c55e", BASE_ADDITION: "#3b82f6", ANTIFOAM: "#a855f7",
  INDUCER: "#f59e0b", ADDITIVE: "#ec4899", HARVEST: "#ef4444",
  GAS: "#64748b", SAMPLE: "#06b6d4", NOTE: "#9ca3af",
};

const OVERLAY_EVENT_TYPES = ["FEED", "BASE_ADDITION", "ANTIFOAM", "INDUCER", "ADDITIVE", "HARVEST", "GAS"];

const TIME_WINDOWS = [
  { label: "Last 24h", hours: 24 },
  { label: "Last 72h", hours: 72 },
  { label: "Last 7d", hours: 168 },
  { label: "Full Run", hours: Infinity },
] as const;

const PRIORITY_ORDER: Record<string, number> = { Critical: 0, Important: 1, Monitored: 2 };

// ── Downsampling ──
function downsample(data: TimeseriesPoint[], targetPoints: number): TimeseriesPoint[] {
  if (data.length <= targetPoints) return data;
  const step = Math.ceil(data.length / targetPoints);
  const result: TimeseriesPoint[] = [];
  for (let i = 0; i < data.length; i += step) {
    // Take max/min envelope within each bucket for better fidelity
    const bucket = data.slice(i, Math.min(i + step, data.length));
    result.push(bucket[0]); // use first point of bucket
  }
  // Always include last point
  if (result[result.length - 1] !== data[data.length - 1]) {
    result.push(data[data.length - 1]);
  }
  return result;
}

// ── Sort parameters by priority ──
function sortedParams(): ParameterDef[] {
  return [...PARAMETERS].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.type_priority] ?? 3;
    const pb = PRIORITY_ORDER[b.type_priority] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.is_critical !== b.is_critical) return a.is_critical ? -1 : 1;
    return a.display_name.localeCompare(b.display_name);
  });
}

// ── Props ──
interface MonitoringChartsProps {
  timeseries: TimeseriesPoint[];
  events: (ProcessEvent & { elapsed_h: number })[];
  runStartTime: string;
  phase: string;
  highlightedEventId?: string | null;
  centerOnHour?: number | null;
}

// ── Individual Parameter Chart ──
function ParameterChart({
  param,
  data,
  events,
  showRanges,
  showEvents,
  highlightedEventId,
}: {
  param: ParameterDef;
  data: TimeseriesPoint[];
  events: (ProcessEvent & { elapsed_h: number })[];
  showRanges: boolean;
  showEvents: boolean;
  highlightedEventId?: string | null;
}) {
  const color = PARAM_COLORS[param.parameter_code] || "hsl(var(--chart-1))";

  const chartData = useMemo(() =>
    data.map((p) => ({
      elapsed_h: p.elapsed_h,
      value: p[param.parameter_code] as number,
      min: param.min_value,
      max: param.max_value,
    })),
    [data, param]
  );

  const yMin = useMemo(() => {
    const vals = chartData.map((d) => d.value).filter((v) => typeof v === "number");
    const dataMin = Math.min(...vals, param.min_value);
    return Math.floor(dataMin * 0.95 * 10) / 10;
  }, [chartData, param]);

  const yMax = useMemo(() => {
    const vals = chartData.map((d) => d.value).filter((v) => typeof v === "number");
    const dataMax = Math.max(...vals, param.max_value);
    return Math.ceil(dataMax * 1.05 * 10) / 10;
  }, [chartData, param]);

  const relevantEvents = useMemo(() =>
    showEvents ? events.filter((e) => OVERLAY_EVENT_TYPES.includes(e.event_type)) : [],
    [events, showEvents]
  );

  return (
    <Card className="animate-fade-in">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {param.display_name}
            {param.is_critical && <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">Critical</Badge>}
          </CardTitle>
          <span className="text-xs text-muted-foreground">{param.unit} · {param.min_value}–{param.max_value}</span>
        </div>
      </CardHeader>
      <CardContent className="p-1 pb-2">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.5} />
            <XAxis dataKey="elapsed_h" tick={{ fontSize: 10 }} tickCount={8} />
            <YAxis domain={[yMin, yMax]} tick={{ fontSize: 10 }} width={45} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const val = payload[0]?.value;
                return (
                  <div className="bg-card border rounded p-2 shadow-lg text-xs">
                    <p className="font-medium">Hour {label}</p>
                    <p style={{ color }}>{param.display_name}: {typeof val === "number" ? val.toFixed(2) : "—"} {param.unit}</p>
                  </div>
                );
              }}
            />
            {/* Range band */}
            {showRanges && (
              <ReferenceArea
                y1={param.min_value} y2={param.max_value}
                fill={color} fillOpacity={0.08}
                stroke={color} strokeOpacity={0.2} strokeDasharray="3 3"
              />
            )}
            {/* Event markers */}
            {relevantEvents.map((e, i) => {
              const isHighlighted = highlightedEventId === e.id;
              return (
                <ReferenceLine
                  key={i} x={Math.round(e.elapsed_h)}
                  stroke={isHighlighted ? "#facc15" : (EVENT_COLORS[e.event_type] || "#9ca3af")}
                  strokeWidth={isHighlighted ? 3 : 1.5} strokeDasharray={isHighlighted ? undefined : "4 2"}
                  label={{ value: e.event_type[0], position: "top", fontSize: 9, fill: isHighlighted ? "#facc15" : (EVENT_COLORS[e.event_type] || "#9ca3af") }}
                />
              );
            })}
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} dot={false} name={param.display_name} />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Feed Status Chart ──
function FeedStatusChart({
  events,
  totalHours,
  showEvents,
}: {
  events: (ProcessEvent & { elapsed_h: number })[];
  totalHours: number;
  showEvents: boolean;
}) {
  const feedEvents = useMemo(() =>
    events.filter((e) => e.event_type === "FEED" && e.amount != null),
    [events]
  );

  const chartData = useMemo(() => {
    let cumulative = 0;
    return feedEvents.map((e) => {
      cumulative += e.amount || 0;
      return {
        elapsed_h: Math.round(e.elapsed_h * 10) / 10,
        amount: e.amount || 0,
        cumulative,
        label: e.subtype || "Feed",
      };
    });
  }, [feedEvents]);

  const nonFeedEvents = useMemo(() =>
    showEvents ? events.filter((e) => OVERLAY_EVENT_TYPES.includes(e.event_type) && e.event_type !== "FEED") : [],
    [events, showEvents]
  );

  if (feedEvents.length === 0) {
    return (
      <Card className="animate-fade-in">
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Feed Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          No feed events recorded yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="py-2 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Feed Status
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {feedEvents.length} feeds · {chartData[chartData.length - 1]?.cumulative.toFixed(1)} {feedEvents[0]?.amount_unit || "mL"} total
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-1 pb-2">
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" opacity={0.5} />
            <XAxis dataKey="elapsed_h" tick={{ fontSize: 10 }} domain={[0, totalHours]} />
            <YAxis yAxisId="bar" orientation="left" tick={{ fontSize: 10 }} width={40} />
            <YAxis yAxisId="line" orientation="right" tick={{ fontSize: 10 }} width={40} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-card border rounded p-2 shadow-lg text-xs">
                    <p className="font-medium">Hour {d?.elapsed_h}</p>
                    <p className="text-green-600">Feed: {d?.amount} {feedEvents[0]?.amount_unit || "mL"}</p>
                    <p className="text-blue-600">Cumulative: {d?.cumulative?.toFixed(1)} {feedEvents[0]?.amount_unit || "mL"}</p>
                  </div>
                );
              }}
            />
            <Bar yAxisId="bar" dataKey="amount" fill="#22c55e" fillOpacity={0.6} barSize={8} name="Feed Volume" />
            <Line yAxisId="line" type="monotone" dataKey="cumulative" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} name="Cumulative" />
            {nonFeedEvents.map((e, i) => (
              <ReferenceLine
                key={i} x={Math.round(e.elapsed_h)} yAxisId="bar"
                stroke={EVENT_COLORS[e.event_type] || "#9ca3af"}
                strokeWidth={1} strokeDasharray="4 2"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ── Main Monitoring Charts Component ──
export default function MonitoringCharts({ timeseries, events, runStartTime, phase, highlightedEventId, centerOnHour }: MonitoringChartsProps) {
  const [criticalOnly, setCriticalOnly] = useState(false);
  const [showRanges, setShowRanges] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [timeWindowIdx, setTimeWindowIdx] = useState(0); // default: last 24h

  // When centerOnHour changes, switch to a window that includes it
  useEffect(() => {
    if (centerOnHour == null) return;
    const total = timeseries.length > 0 ? timeseries[timeseries.length - 1].elapsed_h : 0;
    // Find smallest window that includes the hour
    for (let i = 0; i < TIME_WINDOWS.length; i++) {
      const tw = TIME_WINDOWS[i];
      if (tw.hours === Infinity || centerOnHour >= total - tw.hours) {
        setTimeWindowIdx(i);
        break;
      }
    }
  }, [centerOnHour, timeseries]);

  const totalHours = timeseries.length > 0 ? timeseries[timeseries.length - 1].elapsed_h : 0;
  const timeWindow = TIME_WINDOWS[timeWindowIdx];

  // Filter + downsample timeseries
  const processedData = useMemo(() => {
    let filtered = timeseries;

    // Time window filter
    if (timeWindow.hours !== Infinity && totalHours > timeWindow.hours) {
      const startH = totalHours - timeWindow.hours;
      filtered = filtered.filter((p) => p.elapsed_h >= startH);
    }

    // Downsample: 5-min intervals for full run, 1-min for ≤72h
    const maxPoints = timeWindow.hours <= 72 ? 1500 : 600;
    return downsample(filtered, maxPoints);
  }, [timeseries, timeWindow, totalHours]);

  // Filter events to time window
  const windowedEvents = useMemo(() => {
    if (timeWindow.hours === Infinity) return events;
    const startH = totalHours - timeWindow.hours;
    return events.filter((e) => e.elapsed_h >= startH);
  }, [events, timeWindow, totalHours]);

  // Sort parameters
  const allSorted = useMemo(() => sortedParams(), []);
  const visibleParams = useMemo(
    () => criticalOnly ? allSorted.filter((p) => p.is_critical) : allSorted,
    [allSorted, criticalOnly]
  );

  // Priority charts: pH, TEMP always first, then other critical
  const priorityParams = useMemo(() => {
    const phParam = PARAMETERS.find((p) => p.parameter_code === "PH");
    const tempParam = PARAMETERS.find((p) => p.parameter_code === "TEMP");
    const others = visibleParams.filter((p) => p.parameter_code !== "PH" && p.parameter_code !== "TEMP");
    const result: ParameterDef[] = [];
    if (phParam && visibleParams.some((p) => p.parameter_code === "PH")) result.push(phParam);
    if (tempParam && visibleParams.some((p) => p.parameter_code === "TEMP")) result.push(tempParam);
    result.push(...others);
    return result;
  }, [visibleParams]);

  return (
    <div className="space-y-3">
      {/* ── Controls Bar ── */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Toggles */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-2">
                <Switch id="critical-only" checked={criticalOnly} onCheckedChange={setCriticalOnly} className="h-4 w-8" />
                <Label htmlFor="critical-only" className="text-xs cursor-pointer">Critical only</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-ranges" checked={showRanges} onCheckedChange={setShowRanges} className="h-4 w-8" />
                <Label htmlFor="show-ranges" className="text-xs cursor-pointer">Show ranges</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch id="show-events" checked={showEvents} onCheckedChange={setShowEvents} className="h-4 w-8" />
                <Label htmlFor="show-events" className="text-xs cursor-pointer">Show events</Label>
              </div>
              <InfoTooltip content="Ranges shade the acceptable min/max band per parameter catalog. Events overlay markers for FEED, BASE, ANTIFOAM, INDUCER, ADDITIVE, HARVEST, and GAS types." />
            </div>

            {/* Time window selector */}
            <div className="flex items-center gap-1">
              {TIME_WINDOWS.map((tw, i) => (
                <Button
                  key={tw.label}
                  variant={timeWindowIdx === i ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs px-3"
                  onClick={() => setTimeWindowIdx(i)}
                >
                  {tw.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Event legend */}
          {showEvents && (
            <div className="flex flex-wrap gap-3 mt-2 pt-2 border-t">
              {OVERLAY_EVENT_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-1 text-[10px]">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: EVENT_COLORS[t] }} />
                  {t}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Subtitle ── */}
      <p className="text-xs text-muted-foreground px-1">
        Phase: <strong>{phase}</strong> ·
        Showing {processedData.length} points ({timeWindow.label.toLowerCase()}) ·
        {visibleParams.length} parameter{visibleParams.length !== 1 ? "s" : ""}
        {criticalOnly && " (critical only)"}
      </p>

      {/* ── Priority Charts: pH, TEMP, Feed ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {priorityParams.slice(0, 2).map((param) => (
          <ParameterChart
            key={param.parameter_code}
            param={param}
            data={processedData}
            events={windowedEvents}
            showRanges={showRanges}
            showEvents={showEvents}
            highlightedEventId={highlightedEventId}
          />
        ))}
        <FeedStatusChart events={windowedEvents} totalHours={totalHours} showEvents={showEvents} />
      </div>

      {/* ── Remaining Parameter Charts ── */}
      {priorityParams.length > 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {priorityParams.slice(2).map((param) => (
            <ParameterChart
              key={param.parameter_code}
              param={param}
              data={processedData}
              events={windowedEvents}
              showRanges={showRanges}
              showEvents={showEvents}
              highlightedEventId={highlightedEventId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
