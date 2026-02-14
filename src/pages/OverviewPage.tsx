import { useNavigate } from "react-router-dom";
import { RUNS, PARAMETERS, getTimeseries } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { events } = useEvents();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Run Monitoring Dashboard</h2>
        <InfoTooltip content="Overview of all bioreactor runs. Click 'Monitor' to view detailed process data and event logs." />
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Active Runs" value={RUNS.length} trend="neutral" animationDelay={0} />
        <KpiCard label="Total Events Logged" value={events.length} trend="neutral" animationDelay={50} />
        <KpiCard label="Parameters Monitored" value={PARAMETERS.length} trend="neutral" animationDelay={100} />
        <KpiCard label="Process Strategy" value="Fed-Batch" trend="neutral" animationDelay={150} />
      </div>

      {/* Run Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {RUNS.map((run, idx) => {
          const ts = getTimeseries(run.run_id);
          const lastPoint = ts[ts.length - 1];
          const runEvents = events.filter((e) => e.run_id === run.run_id);
          const totalDays = Math.round(
            (new Date(run.end_time).getTime() - new Date(run.start_time).getTime()) / 86400000
          );

          return (
            <Card
              key={run.run_id}
              className="hover:shadow-md transition-shadow opacity-0 animate-fade-in"
              style={{ animationDelay: `${200 + idx * 100}ms` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{run.bioreactor_run}</CardTitle>
                  <Badge variant="secondary" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Active
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">Reactor {run.reactor_id}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cell Line</span>
                    <p className="font-medium text-xs">{run.cell_line.split("/")[1] || run.cell_line}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration</span>
                    <p className="font-medium">{totalDays} days</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Events Logged</span>
                    <p className="font-medium">{runEvents.length}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Operator</span>
                    <p className="font-medium">{run.operator_id}</p>
                  </div>
                </div>

                {/* Latest readings */}
                {lastPoint && (
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Latest Readings</p>
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div>
                        <span className="text-muted-foreground">Temp</span>
                        <p className="font-mono">{(lastPoint.TEMP as number).toFixed(1)}°C</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">pH</span>
                        <p className="font-mono">{(lastPoint.PH as number).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">DO</span>
                        <p className="font-mono">{(lastPoint.DO as number).toFixed(0)}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">VCD</span>
                        <p className="font-mono">{(lastPoint.VCD as number).toFixed(1)}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => navigate(`/run/${run.run_id}`)}
                >
                  Monitor Run
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
