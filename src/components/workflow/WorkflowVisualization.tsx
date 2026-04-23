import { useState, useMemo, useCallback } from "react";
import { INTERFACES, PARAMETERS } from "@/data/runData";
import { EQUIPMENT, METHOD_MAPPINGS, type Equipment } from "@/data/equipment";
import { getAlertCountsByInterface, getAlertsForInterface } from "@/data/alertsEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FlaskConical, Wind, Pipette, TestTube, Microscope, Cpu, Gauge,
  AlertTriangle, CheckCircle2, WifiOff, AlertCircle, Plus,
  ArrowRight, Settings, Shield, Activity, Beaker, Filter, Droplets,
  Snowflake, Package, FileText,
} from "lucide-react";
import { format } from "date-fns";
import type { InstrumentInterface, InterfaceCategory, InterfaceStatus } from "@/data/runTypes";

// ── Icon map (covers full equipment fleet) ──
const ICON_MAP: Record<string, typeof FlaskConical> = {
  // Upstream
  "UP-001": FlaskConical, "UP-002": FlaskConical,
  // Downstream
  "DS-101": Filter, "DS-102": Filter,
  "DS-201": Droplets, "DS-202": Droplets,
  "DS-301": Beaker, "DS-302": Wind,
  "DS-401": Snowflake, "DS-402": Pipette, "DS-403": Package,
  // Analytical
  "AN-101": Cpu, "AN-102": Cpu, "AN-103": Cpu, "AN-104": TestTube,
  "AN-105": Microscope, "AN-106": Cpu, "AN-107": TestTube,
  "AN-108": FileText, "AN-109": Microscope, "AN-110": Cpu, "AN-111": Cpu,
};

const STATUS_TONE: Record<string, { bg: string; border: string; text: string; pulse: string }> = {
  active:    { bg: "bg-emerald-500/10",  border: "border-emerald-500/40",  text: "text-emerald-600 dark:text-emerald-400",  pulse: "" },
  idle:      { bg: "bg-muted/40",        border: "border-border",          text: "text-muted-foreground",                   pulse: "" },
  error:     { bg: "bg-destructive/10",  border: "border-destructive/40",  text: "text-destructive",                        pulse: "animate-pulse" },
};

const HEALTH_TONE: Record<string, { text: string; label: string; Icon: typeof CheckCircle2 }> = {
  connected: { text: "text-emerald-600 dark:text-emerald-400", label: "Connected", Icon: CheckCircle2 },
  degraded:  { text: "text-amber-600 dark:text-amber-400",     label: "Degraded",  Icon: AlertCircle },
  offline:   { text: "text-destructive",                        label: "Offline",   Icon: WifiOff },
};

// ── Pipeline definition: Upstream → Downstream → Analytical ──
interface PipelineConnection {
  from: string;
  to: string;
  label: string;
  dataType: "process" | "sample" | "result";
}

const CONNECTIONS: PipelineConnection[] = [
  // Upstream → Downstream (material flow)
  { from: "UP-001", to: "UP-002", label: "Seed transfer",   dataType: "process" },
  { from: "UP-002", to: "DS-101", label: "Harvest",         dataType: "process" },
  { from: "DS-101", to: "DS-201", label: "Clarified bulk",  dataType: "process" },
  { from: "DS-201", to: "DS-202", label: "Eluate",          dataType: "process" },
  { from: "DS-202", to: "DS-401", label: "Concentrated DS", dataType: "process" },
  { from: "DS-301", to: "DS-302", label: "Washed vials",    dataType: "process" },
  { from: "DS-302", to: "DS-402", label: "Depyro vials",    dataType: "process" },
  { from: "DS-401", to: "DS-402", label: "Lyo cake",        dataType: "process" },
  { from: "DS-402", to: "DS-403", label: "Filled vials",    dataType: "process" },

  // Upstream → Analytical (in-process samples)
  { from: "UP-002", to: "AN-109", label: "VCD sample",      dataType: "sample" },

  // Downstream → Analytical (release / IPC samples)
  { from: "DS-201", to: "AN-101", label: "SEC sample",      dataType: "sample" },
  { from: "DS-201", to: "AN-102", label: "IEX sample",      dataType: "sample" },
  { from: "DS-202", to: "AN-104", label: "CE-SDS sample",   dataType: "sample" },
  { from: "DS-202", to: "AN-105", label: "HCP sample",      dataType: "sample" },
  { from: "DS-202", to: "AN-107", label: "HCD sample",      dataType: "sample" },
  { from: "DS-202", to: "AN-106", label: "Surfactant",      dataType: "sample" },
  { from: "DS-401", to: "AN-110", label: "Glycan sample",   dataType: "sample" },
  { from: "DS-401", to: "AN-111", label: "Sialic sample",   dataType: "sample" },
  { from: "DS-403", to: "AN-103", label: "Potency",         dataType: "sample" },
  { from: "DS-403", to: "AN-108", label: "Endotoxin",       dataType: "sample" },
];

// ── Layout ──
interface NodePosition { id: string; x: number; y: number; col: "upstream" | "downstream" | "analytical"; }

const NODE_WIDTH = 170;
const NODE_HEIGHT = 76;
const COL_X = { upstream: 60, downstream: 360, analytical: 720 } as const;

const NODE_POSITIONS: NodePosition[] = [
  // Upstream (left)
  { id: "UP-001", x: COL_X.upstream, y: 60,  col: "upstream" },
  { id: "UP-002", x: COL_X.upstream, y: 170, col: "upstream" },

  // Downstream (center) — process train top, fill/finish below
  { id: "DS-101", x: COL_X.downstream, y: 60,   col: "downstream" },
  { id: "DS-102", x: COL_X.downstream, y: 160,  col: "downstream" },
  { id: "DS-201", x: COL_X.downstream, y: 260,  col: "downstream" },
  { id: "DS-202", x: COL_X.downstream, y: 360,  col: "downstream" },
  { id: "DS-301", x: COL_X.downstream, y: 470,  col: "downstream" },
  { id: "DS-302", x: COL_X.downstream, y: 570,  col: "downstream" },
  { id: "DS-401", x: COL_X.downstream, y: 670,  col: "downstream" },
  { id: "DS-402", x: COL_X.downstream, y: 770,  col: "downstream" },
  { id: "DS-403", x: COL_X.downstream, y: 870,  col: "downstream" },

  // Analytical (right)
  { id: "AN-101", x: COL_X.analytical, y: 60,   col: "analytical" },
  { id: "AN-102", x: COL_X.analytical, y: 150,  col: "analytical" },
  { id: "AN-103", x: COL_X.analytical, y: 240,  col: "analytical" },
  { id: "AN-104", x: COL_X.analytical, y: 330,  col: "analytical" },
  { id: "AN-105", x: COL_X.analytical, y: 420,  col: "analytical" },
  { id: "AN-106", x: COL_X.analytical, y: 510,  col: "analytical" },
  { id: "AN-107", x: COL_X.analytical, y: 600,  col: "analytical" },
  { id: "AN-108", x: COL_X.analytical, y: 690,  col: "analytical" },
  { id: "AN-109", x: COL_X.analytical, y: 780,  col: "analytical" },
  { id: "AN-110", x: COL_X.analytical, y: 870,  col: "analytical" },
  { id: "AN-111", x: COL_X.analytical, y: 960,  col: "analytical" },
];

// ── Connection line ──
function ConnectionLine({ fromPos, toPos, hasAlert, dataType }: {
  fromPos: NodePosition; toPos: NodePosition; hasAlert: boolean; dataType: PipelineConnection["dataType"];
}) {
  const x1 = fromPos.x + NODE_WIDTH;
  const y1 = fromPos.y + NODE_HEIGHT / 2;
  const x2 = toPos.x;
  const y2 = toPos.y + NODE_HEIGHT / 2;
  const midX = (x1 + x2) / 2;
  const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  const stroke = hasAlert
    ? "hsl(var(--destructive))"
    : dataType === "process"
      ? "hsl(var(--primary) / 0.55)"
      : dataType === "sample"
        ? "hsl(var(--chart-3))"
        : "hsl(var(--muted-foreground) / 0.4)";

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth={hasAlert ? 2.5 : 1.5}
        strokeDasharray={dataType === "sample" ? "5 3" : undefined}
        opacity={0.75}
      />
      {hasAlert && (
        <circle cx={midX} cy={(y1 + y2) / 2} r={4} fill="hsl(var(--destructive))" className="animate-pulse" />
      )}
    </g>
  );
}

// ── Node ──
function WorkflowNode({ eq, position, alertCount, isSelected, onClick }: {
  eq: Equipment; position: NodePosition; alertCount: number;
  isSelected: boolean; onClick: () => void;
}) {
  const Icon = ICON_MAP[eq.equipmentId] || Gauge;
  const tone = STATUS_TONE[eq.status];
  const health = HEALTH_TONE[eq.connectionHealth];

  return (
    <foreignObject x={position.x} y={position.y} width={NODE_WIDTH} height={NODE_HEIGHT}>
      <div
        className={`h-full rounded-lg border-2 p-2.5 cursor-pointer transition-all hover:shadow-lg ${tone.bg} ${
          isSelected ? "border-primary shadow-md ring-2 ring-primary/20" : tone.border
        } ${tone.pulse}`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className={`h-4 w-4 flex-shrink-0 ${tone.text}`} />
            <span className="text-[11px] font-semibold truncate">{eq.equipmentName}</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-0.5 bg-destructive/15 rounded px-1 py-0.5 flex-shrink-0">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[9px] font-bold text-destructive">{alertCount}</span>
            </div>
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className={`text-[9px] font-mono uppercase ${tone.text}`}>{eq.status}</span>
          <span className="text-[9px] text-muted-foreground">·</span>
          <health.Icon className={`h-2.5 w-2.5 ${health.text}`} />
          <span className={`text-[9px] ${health.text}`}>{health.label}</span>
        </div>
        <div className="mt-0.5 text-[9px] text-muted-foreground font-mono">{eq.equipmentId}</div>
      </div>
    </foreignObject>
  );
}

// ── Add Device Dialog (registers a new INTERFACES entry for prototyping) ──
function AddDeviceDialog({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (device: InstrumentInterface) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InterfaceCategory>("Production");
  const [id, setId] = useState("");

  const handleAdd = () => {
    if (!name || !id) return;
    onAdd({
      id, display_name: name, category,
      status: "Offline" as InterfaceStatus,
      last_polled_at: new Date().toISOString(),
      poll_frequency_sec: 60,
      data_types: ["timeseries"],
      description: `User-added ${category.toLowerCase()} interface.`,
    });
    setName(""); setId(""); onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" />Add Device to Pipeline</DialogTitle>
          <DialogDescription>Register a new instrument interface in the workflow.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Device Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. pH Probe Module" />
          </div>
          <div className="space-y-2">
            <Label>Equipment ID</Label>
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. AN-112" className="font-mono" />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as InterfaceCategory)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Production">Production</SelectItem>
                <SelectItem value="Analytical">Analytical</SelectItem>
                <SelectItem value="System">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={!name || !id}>Add Device</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Detail sheet ──
function DeviceDetailSheet({ eq, onClose }: { eq: Equipment | null; onClose: () => void; }) {
  const alerts = useMemo(() => (eq ? getAlertsForInterface(eq.equipmentId) : []), [eq?.equipmentId]);
  if (!eq) return null;
  const tone = STATUS_TONE[eq.status];
  const health = HEALTH_TONE[eq.connectionHealth];
  const isUpstream = eq.equipmentCategory === "upstream";
  const relatedParams = isUpstream ? PARAMETERS : [];

  const incomingConns = CONNECTIONS.filter((c) => c.to === eq.equipmentId);
  const outgoingConns = CONNECTIONS.filter((c) => c.from === eq.equipmentId);
  const methodLink = METHOD_MAPPINGS.find((m) => m.equipmentId === eq.equipmentId);

  return (
    <Sheet open={!!eq} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[500px] flex flex-col overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {eq.equipmentName}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto mt-4 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={eq.status === "active" ? "default" : eq.status === "error" ? "destructive" : "secondary"} className="gap-1 text-xs uppercase">
              {eq.status}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <health.Icon className={`h-3 w-3 ${health.text}`} />
              {health.label}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">{eq.equipmentCategory}</Badge>
            <span className="text-xs font-mono text-muted-foreground ml-auto">{eq.equipmentId}</span>
          </div>

          {/* Operational state */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Operational State
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {eq.status !== "idle" && eq.currentBatch && (
                <Card><CardContent className="p-2.5">
                  <p className="text-[10px] text-muted-foreground">Current Batch</p>
                  <p className="text-sm font-semibold font-mono">{eq.currentBatch}</p>
                </CardContent></Card>
              )}
              {eq.status !== "idle" && eq.processPhase && (
                <Card><CardContent className="p-2.5">
                  <p className="text-[10px] text-muted-foreground">Process Phase</p>
                  <p className="text-sm font-semibold">{eq.processPhase}</p>
                </CardContent></Card>
              )}
              <Card><CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Last Operation</p>
                <p className="text-sm font-semibold">{format(new Date(eq.lastOperationAt), "MMM d HH:mm")}</p>
              </CardContent></Card>
              <Card><CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Last Data Received</p>
                <p className="text-sm font-semibold">{format(new Date(eq.lastDataReceivedAt), "MMM d HH:mm")}</p>
              </CardContent></Card>
              {eq.methodName && (
                <Card className="col-span-2"><CardContent className="p-2.5">
                  <p className="text-[10px] text-muted-foreground">Method / Program</p>
                  <p className="text-sm font-semibold">{eq.methodName}</p>
                  {methodLink && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">Method code: <span className="font-mono">{methodLink.methodCode}</span></p>
                  )}
                </CardContent></Card>
              )}
              <Card className="col-span-2"><CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Integration Mode</p>
                <Badge variant={eq.integrationMode === "online" ? "default" : "outline"} className="text-[10px] mt-1">
                  {eq.integrationMode === "online" ? "Online-integrated" : "Manual upload"}
                </Badge>
              </CardContent></Card>
            </div>
          </div>

          {/* Connections */}
          {(incomingConns.length > 0 || outgoingConns.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5" /> Pipeline Connections
              </h4>
              <div className="space-y-1.5">
                {incomingConns.map((c, i) => {
                  const src = EQUIPMENT.find((e) => e.equipmentId === c.from);
                  return (
                    <div key={`in-${i}`} className="flex items-center gap-2 text-xs rounded-md border p-2">
                      <Badge variant="secondary" className="text-[10px]">IN</Badge>
                      <span className="font-medium truncate">{src?.equipmentName || c.from}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{c.label}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto capitalize">{c.dataType}</Badge>
                    </div>
                  );
                })}
                {outgoingConns.map((c, i) => {
                  const dst = EQUIPMENT.find((e) => e.equipmentId === c.to);
                  return (
                    <div key={`out-${i}`} className="flex items-center gap-2 text-xs rounded-md border p-2">
                      <Badge variant="secondary" className="text-[10px]">OUT</Badge>
                      <span className="font-medium truncate">{dst?.equipmentName || c.to}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground truncate">{c.label}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto capitalize">{c.dataType}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {alerts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> Active Alerts ({alerts.length})
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Severity</TableHead>
                    <TableHead className="text-[10px]">Type</TableHead>
                    <TableHead className="text-[10px]">Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((a) => (
                    <TableRow key={a.alert_id}>
                      <TableCell>
                        <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "outline" : "secondary"} className="text-[9px]">
                          {a.severity}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-[10px] font-mono">{a.type}</TableCell>
                      <TableCell className="text-[10px]">{a.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {isUpstream && relatedParams.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" /> Monitored Parameters
              </h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px]">Parameter</TableHead>
                    <TableHead className="text-[10px]">Unit</TableHead>
                    <TableHead className="text-[10px]">Range</TableHead>
                    <TableHead className="text-[10px]">Critical</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {relatedParams.map((p) => (
                    <TableRow key={p.parameter_code}>
                      <TableCell className="text-xs font-medium">{p.display_name}</TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">{p.unit}</TableCell>
                      <TableCell className="text-[10px] font-mono">{p.min_value}–{p.max_value}</TableCell>
                      <TableCell>
                        {p.is_critical ? <Badge variant="destructive" className="text-[9px]">Yes</Badge> : <Badge variant="secondary" className="text-[9px]">No</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Column label ──
function ColumnLabel({ x, label, count }: { x: number; label: string; count: number }) {
  return (
    <foreignObject x={x} y={12} width={NODE_WIDTH} height={28}>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">
        {label} <span className="text-muted-foreground/60">({count})</span>
      </div>
    </foreignObject>
  );
}

// ── Main ──
export default function WorkflowVisualization() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [customDevices, setCustomDevices] = useState<InstrumentInterface[]>([]);

  const alertCounts = useMemo(() => getAlertCountsByInterface(), []);
  const selectedEq = useMemo(
    () => (selectedId ? EQUIPMENT.find((e) => e.equipmentId === selectedId) || null : null),
    [selectedId],
  );

  const upstreamCount = EQUIPMENT.filter((e) => e.equipmentCategory === "upstream").length;
  const downstreamCount = EQUIPMENT.filter((e) => e.equipmentCategory === "downstream").length;
  const analyticalCount = EQUIPMENT.filter((e) => e.equipmentCategory === "analytical").length;

  const svgHeight = Math.max(500, ...NODE_POSITIONS.map((p) => p.y + NODE_HEIGHT + 40));
  const svgWidth = COL_X.analytical + NODE_WIDTH + 60;

  const handleAddDevice = useCallback((device: InstrumentInterface) => {
    setCustomDevices((prev) => [...prev, device]);
  }, []);

  const connectionHasAlert = useCallback(
    (conn: PipelineConnection) => (alertCounts[conn.from] || 0) > 0 || (alertCounts[conn.to] || 0) > 0,
    [alertCounts],
  );

  const totalAlerts = useMemo(
    () => EQUIPMENT.reduce((s, e) => s + (alertCounts[e.equipmentId] || e.alertCount || 0), 0),
    [alertCounts],
  );
  const degradedCount = EQUIPMENT.filter((e) => e.connectionHealth === "degraded").length;
  const offlineCount = EQUIPMENT.filter((e) => e.connectionHealth === "offline").length;
  const errorCount = EQUIPMENT.filter((e) => e.status === "error").length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Gauge className="h-4 w-4" />{EQUIPMENT.length + customDevices.length} equipment
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />{CONNECTIONS.length} connections
          </span>
          {errorCount > 0 && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />{errorCount} in error
            </span>
          )}
          {totalAlerts > 0 && (
            <span className="flex items-center gap-1.5 text-destructive font-medium">
              <AlertTriangle className="h-4 w-4" />{totalAlerts} alert{totalAlerts !== 1 ? "s" : ""}
            </span>
          )}
          {degradedCount > 0 && (
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-4 w-4" />{degradedCount} degraded
            </span>
          )}
          {offlineCount > 0 && (
            <span className="flex items-center gap-1.5 text-destructive">
              <WifiOff className="h-4 w-4" />{offlineCount} offline
            </span>
          )}
        </div>
        <div className="ml-auto">
          <Button size="sm" className="gap-1.5" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Device
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary/55 inline-block" /> Process flow</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-dashed border-[hsl(var(--chart-3))] inline-block" /> Sample / IPC</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block animate-pulse" /> Alert on connection</span>
        <span className="text-muted-foreground/50">Click any equipment to inspect</span>
      </div>

      {/* SVG Canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <svg width={svgWidth} height={svgHeight} className="min-w-[1000px]">
              <ColumnLabel x={COL_X.upstream}    label="Upstream"    count={upstreamCount} />
              <ColumnLabel x={COL_X.downstream}  label="Downstream"  count={downstreamCount} />
              <ColumnLabel x={COL_X.analytical}  label="Analytical"  count={analyticalCount} />

              <line x1={COL_X.downstream - 40} y1={36} x2={COL_X.downstream - 40} y2={svgHeight - 10} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
              <line x1={COL_X.analytical - 40}  y1={36} x2={COL_X.analytical - 40}  y2={svgHeight - 10} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />

              {CONNECTIONS.map((conn, i) => {
                const fromPos = NODE_POSITIONS.find((p) => p.id === conn.from);
                const toPos = NODE_POSITIONS.find((p) => p.id === conn.to);
                if (!fromPos || !toPos) return null;
                return (
                  <ConnectionLine
                    key={i}
                    fromPos={fromPos}
                    toPos={toPos}
                    hasAlert={connectionHasAlert(conn)}
                    dataType={conn.dataType}
                  />
                );
              })}

              {NODE_POSITIONS.map((pos) => {
                const eq = EQUIPMENT.find((e) => e.equipmentId === pos.id);
                if (!eq) return null;
                return (
                  <WorkflowNode
                    key={pos.id}
                    eq={eq}
                    position={pos}
                    alertCount={alertCounts[eq.equipmentId] || eq.alertCount || 0}
                    isSelected={selectedId === pos.id}
                    onClick={() => setSelectedId(pos.id)}
                  />
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      <DeviceDetailSheet eq={selectedEq} onClose={() => setSelectedId(null)} />
      <AddDeviceDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onAdd={handleAddDevice} />
    </div>
  );
}
