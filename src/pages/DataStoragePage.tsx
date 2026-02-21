import { useMemo } from "react";
import { RUNS } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Database, HardDrive, FileText, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function DataStoragePage() {
  const { events } = useEvents();

  const runStorage = useMemo(() => {
    return RUNS.map((run) => {
      const runEvents = events.filter((e) => e.run_id === run.run_id);
      return {
        run,
        eventCount: runEvents.length,
        lastEvent: runEvents.length > 0
          ? format(new Date(runEvents[runEvents.length - 1].timestamp), "yyyy-MM-dd HH:mm")
          : "—",
      };
    });
  }, [events]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Data Storage</h2>
        <InfoTooltip content="Overview of stored instrumental data and recorded process events per run." />
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Prototype Demonstration</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Data shown is session-based demo data. In production, this would connect to a validated data lake with full traceability.
              This system records log entries only — it does not send commands to instruments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Storage Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <HardDrive className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{RUNS.length}</p>
              <p className="text-xs text-muted-foreground">Stored Runs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{events.length}</p>
              <p className="text-xs text-muted-foreground">Total Recorded Events</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Runs Data Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Run Data Inventory</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Run</TableHead>
                <TableHead className="text-xs">Reactor</TableHead>
                <TableHead className="text-xs">Operator</TableHead>
                <TableHead className="text-xs">Start</TableHead>
                <TableHead className="text-xs">End</TableHead>
                <TableHead className="text-xs">Recorded Events</TableHead>
                <TableHead className="text-xs">Last Event</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runStorage.map(({ run, eventCount, lastEvent }) => (
                <TableRow key={run.run_id}>
                  <TableCell className="font-medium text-sm">{run.bioreactor_run}</TableCell>
                  <TableCell className="text-xs">{run.reactor_id}</TableCell>
                  <TableCell className="text-xs">{run.operator_id}</TableCell>
                  <TableCell className="text-xs">{format(new Date(run.start_time), "yyyy-MM-dd")}</TableCell>
                  <TableCell className="text-xs">{run.end_time ? format(new Date(run.end_time), "yyyy-MM-dd") : "Ongoing"}</TableCell>
                  <TableCell className="text-xs font-mono">{eventCount}</TableCell>
                  <TableCell className="text-xs">{lastEvent}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-[10px]">
                      {!run.end_time || new Date(run.end_time).getTime() > Date.now() ? "Active" : "Archived"}
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
