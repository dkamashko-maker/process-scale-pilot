import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RUNS, INTERFACES, PARAMETERS, getTimeseries, getRunForInterface } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { getAlertCountsByInterface, getAlerts, getAlertCountsBySeverity } from "@/data/alertsEngine";
import { getDataRecords, getRecordCountsByInterface } from "@/data/dataRecords";
import { KpiCard } from "@/components/shared/KpiCard";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Activity, Clock, LineChart, CalendarClock, FileText, AlertTriangle,
  ExternalLink, Database, Shield, CheckCircle2, WifiOff, AlertCircle,
  Gauge, FlaskConical, Wind, Pipette, TestTube, Microscope, Cpu,
  TrendingUp, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { formatDistanceToNow, format } from "date-fns";
import MonitoringCharts from "@/components/monitoring/MonitoringCharts";
import WorkflowVisualization from "@/components/workflow/WorkflowVisualization";
import type { InstrumentInterface, ParameterDef, TimeseriesPoint } from "@/data/runTypes";

// ── Icon map ──
const INTERFACE_ICONS: Record<string, typeof FlaskConical> = {
  "BR-003-p": FlaskConical, "BR-004-p": FlaskConical, "BR-005-p": FlaskConical,
  "GAS-MFC-RACK": Wind, "PUMP-MODULE": Pipette,
  "METAB-ANALYZER": TestTube, "CELL-COUNTER": Microscope, "HPLC-01": Cpu,
};

const STATUS_CONFIG: Record<string, { variant: "default" | "destructive" | "outline" | "secondary"; icon: typeof CheckCircle2; label: string }> = {
  Connected: { variant: "default", icon: CheckCircle2, label: "Connected" },
  Degraded: { variant: "outline", icon: AlertCircle, label: "Degraded" },
  Offline: { variant: "destructive", icon: WifiOff, label: "Offline" },
};

const DATA_TYPE_ICONS: Record<string, { icon: typeof LineChart; label: string }> = {
  timeseries: { icon: LineChart, label: "Timeseries" },
  events: { icon: CalendarClock, label: "Events" },
  files: { icon: FileText, label: "Files" },
};

// ── Deviation helpers ──
interface DeviationSummary { param: ParameterDef; totalPoints: number; outOfRange: number; pctOut: number; }

function computeDeviations(ts: TimeseriesPoint[], params: ParameterDef[]): DeviationSummary[] {
  return params
    .map((param) => {
      const values = ts.map((p) => p[param.parameter_code] as number).filter((v) => typeof v === "number");
      const oor = values.filter((v) => v < param.min_value || v > param.max_value).length;
      return { param, totalPoints: values.length, outOfRange: oor, pctOut: values.length > 0 ? (oor / values.length) * 100 : 0 };
    })
    .sort((a, b) => b.pctOut - a.pctOut);
}

// ── Interface Card (compact) ──
function InterfaceCard({ iface, alertCount, delay, onClick }: {
  iface: InstrumentInterface; alertCount: number; delay: number; onClick: () => void;
}) {
  const statusCfg = STATUS_CONFIG[iface.status];
  const StatusIcon = statusCfg.icon;
  const Icon = INTERFACE_ICONS[iface.id] || Gauge;
  const polledAgo = formatDistanceToNow(new Date(iface.last_polled_at), { addSuffix: true });

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md opacity-0 animate-fade-in group"
      style={{ animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="rounded-md bg-primary/10 p-2 flex-shrink-0 group-hover:bg-primary/15 transition-colors">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{iface.display_name}</h3>
              <p className="text-[10px] text-muted-foreground font-mono">{iface.id}</p>
            </div>
          </div>
          <Badge variant={statusCfg.variant} className="text-[10px] gap-1 flex-shrink-0">
            <StatusIcon className="h-3 w-3" />
            {statusCfg.label}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {iface.data_types.map((dt) => {
              const cfg = DATA_TYPE_ICONS[dt];
              const DtIcon = cfg.icon;
              return <div key={dt} className="flex items-center gap-0.5 text-muted-foreground" title={cfg.label}><DtIcon className="h-3 w-3" /></div>;
            })}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{polledAgo}</span>
          {alertCount > 0 ? (
            <span className="flex items-center gap-1 text-destructive font-medium"><AlertTriangle className="h-3 w-3" />{alertCount} alert{alertCount !== 1 ? "s" : ""}</span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground/60">0 alerts</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Interface Drawer ──
function InterfaceDrawer({ iface, onClose }: { iface: InstrumentInterface | null; onClose: () => void; }) {
  const navigate = useNavigate();
  if (!iface) return null;
  const statusCfg = STATUS_CONFIG[iface.status];
  const StatusIcon = statusCfg.icon;
  const linkedRun = getRunForInterface(iface.id);
  const isBioreactor = !!iface.linked_reactor_id;
  const isHPLC = iface.id === "HPLC-01";

  return (
    <Sheet open={!!iface} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[460px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-lg">{iface.display_name}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-auto mt-4 space-y-5">
          <div className="flex items-center gap-3">
            <Badge variant={statusCfg.variant} className="gap-1"><StatusIcon className="h-3.5 w-3.5" />{statusCfg.label}</Badge>
            <Badge variant="secondary">{iface.category}</Badge>
            <span className="text-xs font-mono text-muted-foreground ml-auto">{iface.id}</span>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{iface.description}</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Equipment Profile</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-md p-2.5">
                <p className="text-[10px] text-muted-foreground">Poll Frequency</p>
                <p className="text-sm font-medium">{iface.poll_frequency_sec}s</p>
              </div>
              <div className="border rounded-md p-2.5">
                <p className="text-[10px] text-muted-foreground">Last Polled</p>
                <p className="text-sm font-medium">{format(new Date(iface.last_polled_at), "HH:mm:ss")}</p>
              </div>
              <div className="border rounded-md p-2.5 col-span-2">
                <p className="text-[10px] text-muted-foreground">Data Types</p>
                <div className="flex gap-2 mt-1">
                  {iface.data_types.map((dt) => {
                    const cfg = DATA_TYPE_ICONS[dt];
                    const DtIcon = cfg.icon;
                    return <Badge key={dt} variant="outline" className="text-[10px] gap-1"><DtIcon className="h-3 w-3" />{cfg.label}</Badge>;
                  })}
                </div>
              </div>
              {linkedRun && (
                <div className="border rounded-md p-2.5 col-span-2">
                  <p className="text-[10px] text-muted-foreground">Linked Run</p>
                  <p className="text-sm font-medium">{linkedRun.bioreactor_run} — {linkedRun.run_id}</p>
                </div>
              )}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-primary" />
              <p className="text-xs font-medium">ALCOA+ Data Integrity Notes</p>
            </div>
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs text-muted-foreground">
              <p><span className="font-medium text-foreground">Attributable:</span> All data records are tagged with interface ID, timestamp, and source instrument.</p>
              <p><span className="font-medium text-foreground">Legible:</span> Data is stored in structured formats (timeseries, events, files) with defined schemas.</p>
              <p><span className="font-medium text-foreground">Contemporaneous:</span> Poll frequency of {iface.poll_frequency_sec}s ensures near-real-time data capture.</p>
              <p><span className="font-medium text-foreground">Original:</span> Raw instrument data is preserved without transformation at the interface layer.</p>
              <p><span className="font-medium text-foreground">Accurate:</span> Data validated against parameter catalog ranges upon ingestion.</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Links</p>
            <div className="space-y-2">
              {isBioreactor && linkedRun && (
                <Button className="w-full justify-start gap-2" onClick={() => { onClose(); navigate(`/run/${linkedRun.run_id}`); }}>
                  <Activity className="h-4 w-4" />Open Monitoring — {linkedRun.bioreactor_run}
                </Button>
              )}
              {isHPLC && (
                <Button className="w-full justify-start gap-2" onClick={() => { onClose(); navigate("/data-storage?filter=files"); }}>
                  <FileText className="h-4 w-4" />View Latest Files
                </Button>
              )}
              <Button variant="outline" className="w-full justify-start gap-2" onClick={() => { onClose(); navigate(`/data-storage?interface=${iface.id}`); }}>
                <Database className="h-4 w-4" />View Data Storage
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Analytical Summary Section ──
function AnalyticalSummarySection() {
  const navigate = useNavigate();
  const allRecords = useMemo(() => getDataRecords(), []);
  const recordsByInterface = useMemo(() => getRecordCountsByInterface(), []);
  const alerts = useMemo(() => getAlerts(), []);
  const alertSeverity = useMemo(() => getAlertCountsBySeverity(), []);

  const analyticalInterfaces = INTERFACES.filter((i) => i.category === "Analytical");
  const analyticalInterfaceIds = new Set(analyticalInterfaces.map((i) => i.id));

  const analyticalRecords = useMemo(
    () => allRecords.filter((r) => analyticalInterfaceIds.has(r.interface_id)),
    [allRecords],
  );
  const analyticalAlerts = useMemo(
    () => alerts.filter((a) => analyticalInterfaceIds.has(a.interface_id)),
    [alerts],
  );

  const ingestionData = analyticalInterfaces.map((iface) => ({
    name: iface.display_name,
    id: iface.id,
    count: recordsByInterface[iface.id] || 0,
  }));

  const fileRecords = analyticalRecords.filter((r) => r.data_type === "file").length;
  const timeseriesRecords = analyticalRecords.filter((r) => r.data_type === "timeseries").length;
  const eventRecords = analyticalRecords.filter((r) => r.data_type === "event").length;

  const oorRecords = analyticalRecords.filter((r) => r.quality_flags.includes("out_of_range")).length;

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiMini label="Total Records" value={analyticalRecords.length.toLocaleString()} />
        <KpiMini label="Timeseries" value={timeseriesRecords.toLocaleString()} />
        <KpiMini label="Events" value={eventRecords.toLocaleString()} />
        <KpiMini label="Files" value={fileRecords.toLocaleString()} />
        <KpiMini label="Out-of-Range" value={oorRecords.toLocaleString()} accent={oorRecords > 0} />
      </div>

      {/* Ingestion by instrument */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Ingestion Volume by Instrument
            <Button variant="ghost" size="sm" className="ml-auto h-6 text-[10px] gap-1" onClick={() => navigate("/data-storage")}>
              <ExternalLink className="h-3 w-3" /> View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={ingestionData} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={160} />
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="count" fill="hsl(173, 58%, 39%)" radius={[0, 4, 4, 0]} cursor="pointer"
                onClick={(d: any) => navigate(`/data-storage?interface=${d.id}`)} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Alert summary for analytical */}
      {analyticalAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Active Alerts — Analytical Equipment
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Interface</TableHead>
                  <TableHead className="text-xs">Message</TableHead>
                  <TableHead className="text-xs">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analyticalAlerts.slice(0, 8).map((a) => (
                  <TableRow key={a.alert_id}>
                    <TableCell>
                      <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "outline" : "secondary"} className="text-[10px]">
                        {a.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{a.interface_id}</TableCell>
                    <TableCell className="text-xs">{a.message}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(a.created_at), "HH:mm")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Bioreactor Section ──
function BioreactorSection() {
  const { events } = useEvents();
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
  const deviatingCount = deviations.filter((d) => d.pctOut > 0).length;

  return (
    <div className="space-y-4">
      {/* Run selector + KPIs */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted-foreground">Run:</span>
        <Select value={selectedRunId} onValueChange={setSelectedRunId}>
          <SelectTrigger className="w-[260px] h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RUNS.map((r) => <SelectItem key={r.run_id} value={r.run_id}>{r.bioreactor_run} — {r.reactor_id}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini label="Parameters" value={String(PARAMETERS.length)} />
        <KpiMini label="With Deviations" value={String(deviatingCount)} accent={deviatingCount > 0} />
        <KpiMini label="Data Points" value={timeseries.length.toLocaleString()} />
        <KpiMini label="Events" value={String(runEvents.length)} />
      </div>

      {/* Deviation table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Parameter Deviation Summary
            <InfoTooltip content="% of data points outside the acceptable range for the selected run." />
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Parameter</TableHead>
                <TableHead className="text-xs">Unit</TableHead>
                <TableHead className="text-xs">Range</TableHead>
                <TableHead className="text-xs">OOR</TableHead>
                <TableHead className="text-xs">% OOR</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deviations.slice(0, 8).map((d) => (
                <TableRow key={d.param.parameter_code}>
                  <TableCell className="text-sm font-medium">{d.param.display_name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.param.unit}</TableCell>
                  <TableCell className="text-xs font-mono">{d.param.min_value}–{d.param.max_value}</TableCell>
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

      {/* Charts */}
      {run && (
        <MonitoringCharts timeseries={timeseries} events={eventMarkers} runStartTime={run.start_time} phase="—" />
      )}
    </div>
  );
}

// ── KPI Mini ──
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

// ── Main Page ──
export default function IntegratedDashboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "bioreactors";
  const { events } = useEvents();
  const [selectedInterface, setSelectedInterface] = useState<InstrumentInterface | null>(null);

  const now = Date.now();
  const alertCounts = useMemo(() => getAlertCountsByInterface(), []);

  const bioreactorInterfaces = INTERFACES.filter((i) => i.category === "Production");
  const analyticalInterfaces = INTERFACES.filter((i) => i.category === "Analytical");

  const connectedCount = INTERFACES.filter((i) => i.status === "Connected").length;
  const events24h = useMemo(() => {
    const cutoff = now - 24 * 3600000;
    return events.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  }, [events, now]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-semibold">Integrated Device Dashboard</h1>
        <InfoTooltip content="Unified view of all bioreactors and analytical equipment with real-time status, analytics, and data summaries." />
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Interfaces" value={INTERFACES.length} trend="neutral" animationDelay={0} />
        <KpiCard label="Connected" value={connectedCount} trend="neutral" animationDelay={50} />
        <KpiCard label="Events (24h)" value={events24h.length} trend="neutral" animationDelay={100} />
        <KpiCard label="Active Runs" value={RUNS.length} trend="neutral" animationDelay={150} />
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="h-11">
          <TabsTrigger value="bioreactors" className="gap-1.5 text-sm px-5 py-2.5">
            <FlaskConical className="h-4 w-4" />
            Bioreactors
          </TabsTrigger>
          <TabsTrigger value="analytical" className="gap-1.5 text-sm px-5 py-2.5">
            <Microscope className="h-4 w-4" />
            Analytical Equipment
          </TabsTrigger>
          <TabsTrigger value="workflow" className="gap-1.5 text-sm px-5 py-2.5">
            <Activity className="h-4 w-4" />
            Sensor Map
          </TabsTrigger>
        </TabsList>

        {/* ═══ BIOREACTORS TAB ═══ */}
        <TabsContent value="bioreactors" className="space-y-6">
          {/* Interface cards */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Production Interfaces</h3>
              <Badge variant="secondary" className="text-[10px]">{bioreactorInterfaces.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {bioreactorInterfaces.map((iface, idx) => (
                <InterfaceCard
                  key={iface.id}
                  iface={iface}
                  alertCount={alertCounts[iface.id] || 0}
                  delay={200 + idx * 60}
                  onClick={() => setSelectedInterface(iface)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Run analytics */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Run Analytics</h3>
            </div>
            <BioreactorSection />
          </div>
        </TabsContent>

        {/* ═══ ANALYTICAL TAB ═══ */}
        <TabsContent value="analytical" className="space-y-6">
          {/* Interface cards */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Analytical Interfaces</h3>
              <Badge variant="secondary" className="text-[10px]">{analyticalInterfaces.length}</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {analyticalInterfaces.map((iface, idx) => (
                <InterfaceCard
                  key={iface.id}
                  iface={iface}
                  alertCount={alertCounts[iface.id] || 0}
                  delay={200 + idx * 60}
                  onClick={() => setSelectedInterface(iface)}
                />
              ))}
            </div>
          </div>

          <Separator />

          {/* Summarized analytical data */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Data Summary</h3>
            </div>
            <AnalyticalSummarySection />
          </div>
        </TabsContent>

        {/* ═══ WORKFLOW TAB ═══ */}
        <TabsContent value="workflow" className="space-y-6">
          <WorkflowVisualization />
        </TabsContent>
      </Tabs>

      <InterfaceDrawer iface={selectedInterface} onClose={() => setSelectedInterface(null)} />
    </div>
  );
}
