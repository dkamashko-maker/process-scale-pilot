import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RUNS, PARAMETERS, INTERFACES, getTimeseries } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { getDataRecords, getRecordCountsByInterface, getRecordCountsByType } from "@/data/dataRecords";
import { getAlerts, getAlertCountsBySeverity, type AlertType, type AlertSeverity } from "@/data/alertsEngine";
import { computeCompleteness } from "@/data/labelTemplates";
import MonitoringCharts from "@/components/monitoring/MonitoringCharts";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle, TrendingUp, BarChart3, Database, Tag, Activity,
  ExternalLink, PieChart, Shield,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, Legend,
} from "recharts";
import type { ParameterDef, TimeseriesPoint } from "@/data/runTypes";

// ── Run analytics helpers (reused from original) ──

interface DeviationSummary {
  param: ParameterDef;
  totalPoints: number;
  outOfRange: number;
  pctOut: number;
}

interface OorEpisode {
  param: ParameterDef;
  startH: number;
  endH: number;
  peakValue: number;
  direction: "above" | "below";
}

function computeDeviations(ts: TimeseriesPoint[], params: ParameterDef[]): DeviationSummary[] {
  return params
    .map((param) => {
      const values = ts.map((p) => p[param.parameter_code] as number).filter((v) => typeof v === "number");
      const oor = values.filter((v) => v < param.min_value || v > param.max_value).length;
      return { param, totalPoints: values.length, outOfRange: oor, pctOut: values.length > 0 ? (oor / values.length) * 100 : 0 };
    })
    .sort((a, b) => b.pctOut - a.pctOut);
}

function findOorEpisodes(ts: TimeseriesPoint[], params: ParameterDef[], limit = 5): OorEpisode[] {
  const episodes: OorEpisode[] = [];
  for (const param of params) {
    let inEpisode = false;
    let startH = 0;
    let peak = 0;
    let dir: "above" | "below" = "above";
    for (const point of ts) {
      const v = point[param.parameter_code] as number;
      if (typeof v !== "number") continue;
      const isOut = v < param.min_value || v > param.max_value;
      if (isOut && !inEpisode) {
        inEpisode = true;
        startH = point.elapsed_h;
        peak = v;
        dir = v > param.max_value ? "above" : "below";
      } else if (isOut && inEpisode) {
        if (dir === "above" && v > peak) peak = v;
        if (dir === "below" && v < peak) peak = v;
      } else if (!isOut && inEpisode) {
        episodes.push({ param, startH, endH: point.elapsed_h, peakValue: peak, direction: dir });
        inEpisode = false;
      }
    }
    if (inEpisode) {
      episodes.push({ param, startH, endH: ts[ts.length - 1]?.elapsed_h ?? startH, peakValue: peak, direction: dir });
    }
  }
  return episodes.sort((a, b) => (b.endH - b.startH) - (a.endH - a.startH)).slice(0, limit);
}

// ── Chart colors ──
const CHART_COLORS = [
  "hsl(195, 85%, 45%)",
  "hsl(173, 58%, 39%)",
  "hsl(43, 96%, 56%)",
  "hsl(27, 87%, 67%)",
  "hsl(12, 76%, 61%)",
  "hsl(262, 52%, 55%)",
  "hsl(328, 60%, 55%)",
  "hsl(200, 70%, 50%)",
];

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: "hsl(0, 72%, 51%)",
  warning: "hsl(43, 96%, 56%)",
  info: "hsl(210, 70%, 55%)",
};

// ── Main Component ──

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { events } = useEvents();

  // ── Data Vest analytics data ──
  const allRecords = useMemo(() => getDataRecords(), []);
  const alerts = useMemo(() => getAlerts(), []);
  const alertSeverityCounts = useMemo(() => getAlertCountsBySeverity(), []);

  const ingestionByInterface = useMemo(() => {
    const counts = getRecordCountsByInterface();
    return Object.entries(counts)
      .map(([id, count]) => ({
        name: INTERFACES.find((i) => i.id === id)?.display_name || id,
        id,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, []);

  const typeBreakdown = useMemo(() => {
    const counts = getRecordCountsByType();
    return Object.entries(counts).map(([type, count]) => ({ name: type, value: count }));
  }, []);

  const labelStats = useMemo(() => {
    let labeled = 0;
    let unlabeled = 0;
    for (const r of allRecords) {
      const c = computeCompleteness(r);
      if (c.score === 100) labeled++;
      else unlabeled++;
    }
    return [
      { name: "Labeled (100%)", value: labeled },
      { name: "Incomplete", value: unlabeled },
    ];
  }, [allRecords]);

  const alertsByType = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of alerts) {
      counts[a.type] = (counts[a.type] || 0) + 1;
    }
    return Object.entries(counts).map(([type, count]) => ({
      name: type.replace(/_/g, " "),
      type,
      count,
    }));
  }, [alerts]);

  // OOR trend: per-parameter count of out_of_range records (critical params only)
  const oorByParam = useMemo(() => {
    const criticalCodes = new Set(PARAMETERS.filter((p) => p.is_critical).map((p) => p.parameter_code));
    const counts: Record<string, number> = {};
    for (const r of allRecords) {
      if (r.data_type !== "timeseries") continue;
      if (!r.labels.parameter || !criticalCodes.has(r.labels.parameter)) continue;
      if (!r.quality_flags.includes("out_of_range")) continue;
      const param = PARAMETERS.find((p) => p.parameter_code === r.labels.parameter);
      const name = param?.display_name || r.labels.parameter;
      counts[name] = (counts[name] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [allRecords]);

  // ── Run analytics ──
  const [selectedRunId, setSelectedRunId] = useState(RUNS[0]?.run_id ?? "");
  const run = RUNS.find((r) => r.run_id === selectedRunId);
  const timeseries = useMemo(() => (run ? getTimeseries(run.run_id) : []), [run]);
  const runEvents = useMemo(() => events.filter((e) => e.run_id === selectedRunId), [events, selectedRunId]);
  const eventMarkers = useMemo(() => {
    if (!run) return [];
    const runStart = new Date(run.start_time).getTime();
    return runEvents.map((e) => ({ ...e, elapsed_h: (new Date(e.timestamp).getTime() - runStart) / 3600000 }));
  }, [runEvents, run]);
  const deviations = useMemo(() => computeDeviations(timeseries, PARAMETERS), [timeseries]);
  const oorEpisodes = useMemo(() => findOorEpisodes(timeseries, PARAMETERS), [timeseries]);
  const deviatingCount = deviations.filter((d) => d.pctOut > 0).length;
  const [selectedParam, setSelectedParam] = useState(PARAMETERS[0]?.parameter_code ?? "");

  const goToDataStorage = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    navigate(`/data-storage?${qs}`);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Analytics</h2>
        <InfoTooltip content="Data Vest platform analytics: ingestion, labeling, alerts, and per-run deviation analysis." />
      </div>

      <Tabs defaultValue="platform" className="space-y-6">
        <TabsList>
          <TabsTrigger value="platform">Data Vest Overview</TabsTrigger>
          <TabsTrigger value="run">Run Analytics</TabsTrigger>
        </TabsList>

        {/* ═══════════════ PLATFORM TAB ═══════════════ */}
        <TabsContent value="platform" className="space-y-6">

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiMini label="Total Records" value={allRecords.length.toLocaleString()} onClick={() => goToDataStorage({})} />
            <KpiMini label="Interfaces" value={String(INTERFACES.length)} />
            <KpiMini label="Critical Alerts" value={String(alertSeverityCounts.critical)} accent={alertSeverityCounts.critical > 0} />
            <KpiMini label="Warnings" value={String(alertSeverityCounts.warning)} />
            <KpiMini label="Labeled %" value={`${allRecords.length > 0 ? Math.round((labelStats[0].value / allRecords.length) * 100) : 0}%`} />
          </div>

          {/* Charts row 1: Ingestion by Interface + Record types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Ingestion volume by interface */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Ingestion Volume by Interface
                  <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px] gap-1" onClick={() => goToDataStorage({})}>
                    <ExternalLink className="h-3 w-3" /> View
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={ingestionByInterface} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="hsl(195, 85%, 45%)" radius={[0, 4, 4, 0]} cursor="pointer"
                      onClick={(d: any) => goToDataStorage({ interface: d.id })} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Labeled vs unlabeled */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Labeled vs Incomplete Records
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={240}>
                  <RePieChart>
                    <Pie data={labelStats} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                      <Cell fill="hsl(173, 58%, 39%)" />
                      <Cell fill="hsl(43, 96%, 56%)" />
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Charts row 2: Alerts by type + OOR trend */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Alerts by type */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Alerts by Type
                  <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px] gap-1" onClick={() => goToDataStorage({})}>
                    <ExternalLink className="h-3 w-3" /> Alerts
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertsByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={alertsByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {alertsByType.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No alerts generated</div>
                )}
              </CardContent>
            </Card>

            {/* OOR trend for critical params */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Out-of-Range: Critical Parameters
                  <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px] gap-1" onClick={() => goToDataStorage({ flag: "out_of_range" })}>
                    <ExternalLink className="h-3 w-3" /> View
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {oorByParam.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={oorByParam}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      <Bar dataKey="count" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No OOR records for critical parameters</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Severity breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                Alert Severity Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <RePieChart>
                  <Pie
                    data={[
                      { name: "Critical", value: alertSeverityCounts.critical },
                      { name: "Warning", value: alertSeverityCounts.warning },
                      { name: "Info", value: alertSeverityCounts.info },
                    ].filter((d) => d.value > 0)}
                    cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}
                  >
                    <Cell fill={SEVERITY_COLORS.critical} />
                    <Cell fill={SEVERITY_COLORS.warning} />
                    <Cell fill={SEVERITY_COLORS.info} />
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RePieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

        </TabsContent>

        {/* ═══════════════ RUN ANALYTICS TAB ═══════════════ */}
        <TabsContent value="run" className="space-y-6">

          {/* Run selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Run:</span>
            <Select value={selectedRunId} onValueChange={setSelectedRunId}>
              <SelectTrigger className="w-[280px] h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RUNS.map((r) => <SelectItem key={r.run_id} value={r.run_id}>{r.bioreactor_run}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => goToDataStorage({ run: selectedRunId })}>
              <ExternalLink className="h-3 w-3" /> View records
            </Button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Parameters</p><p className="text-2xl font-bold mt-1">{PARAMETERS.length}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">With Deviations</p><p className="text-2xl font-bold mt-1">{deviatingCount}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Data Points</p><p className="text-2xl font-bold mt-1">{timeseries.length.toLocaleString()}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">OOR Episodes (Top 5)</p><p className="text-2xl font-bold mt-1">{oorEpisodes.length}</p></CardContent></Card>
          </div>

          {/* Deviation table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Deviation Summary
                <InfoTooltip content="Percentage of data points falling outside the acceptable range (min/max) from the parameter catalog." />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Parameter</TableHead>
                    <TableHead className="text-xs">Unit</TableHead>
                    <TableHead className="text-xs">Range</TableHead>
                    <TableHead className="text-xs">Total Points</TableHead>
                    <TableHead className="text-xs">Out of Range</TableHead>
                    <TableHead className="text-xs">% OOR</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deviations.map((d) => (
                    <TableRow key={d.param.parameter_code} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedParam(d.param.parameter_code)}>
                      <TableCell className="text-sm font-medium">{d.param.display_name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{d.param.unit}</TableCell>
                      <TableCell className="text-xs font-mono">{d.param.min_value}–{d.param.max_value}</TableCell>
                      <TableCell className="text-xs font-mono">{d.totalPoints.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono">{d.outOfRange.toLocaleString()}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">{d.pctOut.toFixed(1)}%</TableCell>
                      <TableCell>
                        {d.pctOut === 0 ? (
                          <Badge variant="secondary" className="text-[10px]">In spec</Badge>
                        ) : d.pctOut < 5 ? (
                          <Badge variant="outline" className="text-[10px]">Minor</Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">Significant</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Top OOR episodes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Top Out-of-Range Episodes
                <InfoTooltip content="Longest episodes where a parameter exceeded its acceptable range." />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Parameter</TableHead>
                    <TableHead className="text-xs">Direction</TableHead>
                    <TableHead className="text-xs">Start (h)</TableHead>
                    <TableHead className="text-xs">End (h)</TableHead>
                    <TableHead className="text-xs">Duration (h)</TableHead>
                    <TableHead className="text-xs">Peak Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oorEpisodes.map((ep, i) => (
                    <TableRow key={`${ep.param.parameter_code}-${ep.startH}`} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedParam(ep.param.parameter_code)}>
                      <TableCell className="text-xs font-mono">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{ep.param.display_name}</TableCell>
                      <TableCell>
                        <Badge variant={ep.direction === "above" ? "destructive" : "outline"} className="text-[10px]">
                          {ep.direction === "above" ? "Above max" : "Below min"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{ep.startH.toFixed(1)}</TableCell>
                      <TableCell className="text-xs font-mono">{ep.endH.toFixed(1)}</TableCell>
                      <TableCell className="text-xs font-mono font-medium">{(ep.endH - ep.startH).toFixed(1)}</TableCell>
                      <TableCell className="text-xs font-mono">{ep.peakValue.toFixed(2)} {ep.param.unit}</TableCell>
                    </TableRow>
                  ))}
                  {oorEpisodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">No out-of-range episodes detected.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Parameter chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Parameter Detail</CardTitle>
                <Select value={selectedParam} onValueChange={setSelectedParam}>
                  <SelectTrigger className="w-[220px] h-8"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PARAMETERS.map((p) => <SelectItem key={p.parameter_code} value={p.parameter_code}>{p.display_name} ({p.unit})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
          </Card>

          {run && (
            <MonitoringCharts timeseries={timeseries} events={eventMarkers} runStartTime={run.start_time} phase="—" />
          )}

        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── KPI mini card ──

function KpiMini({ label, value, accent, onClick }: { label: string; value: string; accent?: boolean; onClick?: () => void }) {
  return (
    <Card className={`${onClick ? "cursor-pointer hover:border-primary/40" : ""} transition-colors`} onClick={onClick}>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${accent ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
