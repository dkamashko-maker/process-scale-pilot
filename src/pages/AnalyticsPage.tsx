import { useState, useMemo } from "react";
import { RUNS, PARAMETERS, getTimeseries } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import MonitoringCharts from "@/components/monitoring/MonitoringCharts";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, TrendingUp } from "lucide-react";
import type { ParameterDef, TimeseriesPoint } from "@/data/runTypes";

// ── Helpers ──

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

  // Sort by duration descending, take top N
  return episodes
    .sort((a, b) => (b.endH - b.startH) - (a.endH - a.startH))
    .slice(0, limit);
}

// ── Component ──

export default function AnalyticsPage() {
  const { events } = useEvents();
  const [selectedRunId, setSelectedRunId] = useState(RUNS[0]?.run_id ?? "");

  const run = RUNS.find((r) => r.run_id === selectedRunId);
  const timeseries = useMemo(() => (run ? getTimeseries(run.run_id) : []), [run]);

  const runEvents = useMemo(
    () => events.filter((e) => e.run_id === selectedRunId),
    [events, selectedRunId],
  );

  const eventMarkers = useMemo(() => {
    if (!run) return [];
    const runStart = new Date(run.start_time).getTime();
    return runEvents.map((e) => ({ ...e, elapsed_h: (new Date(e.timestamp).getTime() - runStart) / 3600000 }));
  }, [runEvents, run]);

  const deviations = useMemo(() => computeDeviations(timeseries, PARAMETERS), [timeseries]);
  const oorEpisodes = useMemo(() => findOorEpisodes(timeseries, PARAMETERS), [timeseries]);

  const deviatingCount = deviations.filter((d) => d.pctOut > 0).length;

  // Parameter chart selection
  const [selectedParam, setSelectedParam] = useState(PARAMETERS[0]?.parameter_code ?? "");

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">Run Analytics</h2>
          <InfoTooltip content="Deviation analysis and out-of-range episodes per parameter for the selected run." />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Run:</span>
          <Select value={selectedRunId} onValueChange={setSelectedRunId}>
            <SelectTrigger className="w-[280px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RUNS.map((r) => (
                <SelectItem key={r.run_id} value={r.run_id}>{r.bioreactor_run}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Parameters Analyzed</p>
            <p className="text-2xl font-bold mt-1">{PARAMETERS.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">With Deviations</p>
            <p className="text-2xl font-bold mt-1">{deviatingCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Data Points</p>
            <p className="text-2xl font-bold mt-1">{timeseries.length.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">OOR Episodes (Top 5)</p>
            <p className="text-2xl font-bold mt-1">{oorEpisodes.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Deviation Summary Table ── */}
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
                <TableRow
                  key={d.param.parameter_code}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedParam(d.param.parameter_code)}
                >
                  <TableCell className="text-sm font-medium">{d.param.display_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.param.unit}</TableCell>
                  <TableCell className="text-xs font-mono">{d.param.min_value}–{d.param.max_value}</TableCell>
                  <TableCell className="text-xs font-mono">{d.totalPoints.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-mono">{d.outOfRange.toLocaleString()}</TableCell>
                  <TableCell className="text-xs font-mono font-medium">
                    {d.pctOut.toFixed(1)}%
                  </TableCell>
                  <TableCell>
                    {d.pctOut === 0 ? (
                      <Badge variant="secondary" className="text-[10px]">In spec</Badge>
                    ) : d.pctOut < 5 ? (
                      <Badge variant="outline" className="text-[10px] border-yellow-500 text-yellow-600">Minor</Badge>
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

      {/* ── Top 5 OOR Episodes ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Top Out-of-Range Episodes
            <InfoTooltip content="Longest episodes where a parameter exceeded its acceptable range. Sorted by duration." />
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
                <TableRow
                  key={`${ep.param.parameter_code}-${ep.startH}`}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedParam(ep.param.parameter_code)}
                >
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
                  <TableCell className="text-xs font-mono">
                    {ep.peakValue.toFixed(2)} {ep.param.unit}
                  </TableCell>
                </TableRow>
              ))}
              {oorEpisodes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No out-of-range episodes detected.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Parameter Chart View ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Parameter Detail</CardTitle>
            <Select value={selectedParam} onValueChange={setSelectedParam}>
              <SelectTrigger className="w-[220px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARAMETERS.map((p) => (
                  <SelectItem key={p.parameter_code} value={p.parameter_code}>
                    {p.display_name} ({p.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {run && (
        <MonitoringCharts
          timeseries={timeseries}
          events={eventMarkers}
          runStartTime={run.start_time}
          phase="—"
        />
      )}
    </div>
  );
}
