import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RUNS } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity, FlaskConical, Droplets, Beaker } from "lucide-react";
import { format } from "date-fns";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { events } = useEvents();

  const now = Date.now();

  const activeRuns = useMemo(
    () => RUNS.filter((r) => !r.end_time || new Date(r.end_time).getTime() > now),
    [now],
  );

  const events24h = useMemo(() => {
    const cutoff = now - 24 * 3600000;
    return events.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  }, [events, now]);

  // Per-run at-a-glance stats
  const runStats = useMemo(() => {
    return RUNS.map((run) => {
      const re = events.filter((e) => e.run_id === run.run_id);
      return {
        run,
        total: re.length,
        feeds: re.filter((e) => e.event_type === "FEED").length,
        bases: re.filter((e) => e.event_type === "BASE_ADDITION").length,
        additives: re.filter((e) =>
          ["ADDITIVE", "INDUCER", "ANTIFOAM"].includes(e.event_type),
        ).length,
        days: Math.round(
          (new Date(run.end_time || new Date()).getTime() -
            new Date(run.start_time).getTime()) /
            86400000,
        ),
      };
    });
  }, [events]);

  const totalFeeds = runStats.reduce((s, r) => s + r.feeds, 0);
  const totalBases = runStats.reduce((s, r) => s + r.bases, 0);
  const totalAdditives = runStats.reduce((s, r) => s + r.additives, 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Runs Overview</h2>
        <InfoTooltip content="Summary of all bioreactor runs and logged process events." />
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Active Runs"
          value={activeRuns.length > 0 ? activeRuns.length : `${RUNS.length} demo runs`}
          trend="neutral"
          animationDelay={0}
        />
        <KpiCard
          label="Events (Last 24h)"
          value={events24h.length}
          trend="neutral"
          animationDelay={50}
        />
        <KpiCard
          label="Total Events"
          value={events.length}
          trend="neutral"
          animationDelay={100}
        />
        <KpiCard
          label="Runs Tracked"
          value={RUNS.length}
          trend="neutral"
          animationDelay={150}
        />
      </div>

      {/* ── At-a-Glance Widgets ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "200ms" }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-green-500/10 p-2">
              <FlaskConical className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalFeeds}</p>
              <p className="text-xs text-muted-foreground">Total Feed Events</p>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "250ms" }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-blue-500/10 p-2">
              <Beaker className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalBases}</p>
              <p className="text-xs text-muted-foreground">Total Base Additions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-purple-500/10 p-2">
              <Droplets className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAdditives}</p>
              <p className="text-xs text-muted-foreground">Total Additives / Inducers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Compact Runs Table ── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">All Runs</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Run</TableHead>
                <TableHead className="text-xs">Reactor</TableHead>
                <TableHead className="text-xs">Cell Line</TableHead>
                <TableHead className="text-xs">Operator</TableHead>
                <TableHead className="text-xs">Duration</TableHead>
                <TableHead className="text-xs">Feeds</TableHead>
                <TableHead className="text-xs">Bases</TableHead>
                <TableHead className="text-xs">Additives</TableHead>
                <TableHead className="text-xs">Events</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runStats.map(({ run, total, feeds, bases, additives, days }, idx) => (
                <TableRow
                  key={run.run_id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors opacity-0 animate-fade-in"
                  style={{ animationDelay: `${350 + idx * 60}ms` }}
                  onClick={() => navigate(`/experiments/${run.run_id}`)}
                >
                  <TableCell className="font-medium text-sm text-primary hover:underline">
                    {run.bioreactor_run}
                  </TableCell>
                  <TableCell className="text-xs">{run.reactor_id}</TableCell>
                  <TableCell className="text-xs">{run.cell_line.split("/")[1] || run.cell_line}</TableCell>
                  <TableCell className="text-xs">{run.operator_id}</TableCell>
                  <TableCell className="text-xs">{days}d</TableCell>
                  <TableCell className="text-xs font-mono">{feeds}</TableCell>
                  <TableCell className="text-xs font-mono">{bases}</TableCell>
                  <TableCell className="text-xs font-mono">{additives}</TableCell>
                  <TableCell className="text-xs font-mono">{total}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <Activity className="h-3 w-3" />
                      {!run.end_time || new Date(run.end_time).getTime() > Date.now() ? "Active" : "Complete"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
