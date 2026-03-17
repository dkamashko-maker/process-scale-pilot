import { useState, useMemo, useCallback } from "react";
import { INTERFACES, PARAMETERS } from "@/data/runData";
import { getAlertCountsByInterface, getAlertsForInterface } from "@/data/alertsEngine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertTriangle, CheckCircle2, WifiOff, AlertCircle, Plus, ZoomIn,
  ArrowRight, Settings, Shield, Activity,
} from "lucide-react";
import { format } from "date-fns";
import type { InstrumentInterface, InterfaceCategory, InterfaceStatus } from "@/data/runTypes";

// ── Constants ──
const ICON_MAP: Record<string, typeof FlaskConical> = {
  "BR-003-p": FlaskConical, "BR-004-p": FlaskConical, "BR-005-p": FlaskConical,
  "GAS-MFC-RACK": Wind, "PUMP-MODULE": Pipette,
  "METAB-ANALYZER": TestTube, "CELL-COUNTER": Microscope, "HPLC-01": Cpu,
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; pulse: string }> = {
  Connected: { bg: "bg-emerald-500/10", border: "border-emerald-500/40", text: "text-emerald-600 dark:text-emerald-400", pulse: "" },
  Degraded: { bg: "bg-amber-500/10", border: "border-amber-500/40", text: "text-amber-600 dark:text-amber-400", pulse: "animate-pulse" },
  Offline: { bg: "bg-destructive/10", border: "border-destructive/40", text: "text-destructive", pulse: "" },
};

// ── Pipeline definition (what connects to what) ──
interface PipelineConnection {
  from: string;
  to: string;
  label: string;
  dataType: "timeseries" | "events" | "files" | "control";
}

const CONNECTIONS: PipelineConnection[] = [
  { from: "GAS-MFC-RACK", to: "BR-003-p", label: "Gas supply", dataType: "control" },
  { from: "GAS-MFC-RACK", to: "BR-004-p", label: "Gas supply", dataType: "control" },
  { from: "GAS-MFC-RACK", to: "BR-005-p", label: "Gas supply", dataType: "control" },
  { from: "PUMP-MODULE", to: "BR-003-p", label: "Feed / Base", dataType: "control" },
  { from: "PUMP-MODULE", to: "BR-004-p", label: "Feed / Base", dataType: "control" },
  { from: "PUMP-MODULE", to: "BR-005-p", label: "Feed / Base", dataType: "control" },
  { from: "BR-003-p", to: "METAB-ANALYZER", label: "Samples", dataType: "events" },
  { from: "BR-004-p", to: "METAB-ANALYZER", label: "Samples", dataType: "events" },
  { from: "BR-005-p", to: "METAB-ANALYZER", label: "Samples", dataType: "events" },
  { from: "BR-003-p", to: "CELL-COUNTER", label: "Samples", dataType: "events" },
  { from: "BR-004-p", to: "CELL-COUNTER", label: "Samples", dataType: "events" },
  { from: "BR-005-p", to: "CELL-COUNTER", label: "Samples", dataType: "events" },
  { from: "BR-003-p", to: "HPLC-01", label: "Purification", dataType: "files" },
  { from: "BR-004-p", to: "HPLC-01", label: "Purification", dataType: "files" },
  { from: "BR-005-p", to: "HPLC-01", label: "Purification", dataType: "files" },
];

// ── Layout positions for the workflow nodes ──
interface NodePosition { id: string; x: number; y: number; col: "input" | "reactor" | "output"; }

const NODE_POSITIONS: NodePosition[] = [
  // Input devices (left column)
  { id: "GAS-MFC-RACK", x: 80, y: 120, col: "input" },
  { id: "PUMP-MODULE", x: 80, y: 320, col: "input" },
  // Bioreactors (center)
  { id: "BR-003-p", x: 380, y: 60, col: "reactor" },
  { id: "BR-004-p", x: 380, y: 220, col: "reactor" },
  { id: "BR-005-p", x: 380, y: 380, col: "reactor" },
  // Analytical (right column)
  { id: "METAB-ANALYZER", x: 680, y: 60, col: "output" },
  { id: "CELL-COUNTER", x: 680, y: 220, col: "output" },
  { id: "HPLC-01", x: 680, y: 380, col: "output" },
];

const NODE_WIDTH = 160;
const NODE_HEIGHT = 80;

// ── Connection line component ──
function ConnectionLine({ fromPos, toPos, hasAlert, dataType }: {
  fromPos: NodePosition; toPos: NodePosition; hasAlert: boolean; dataType: string;
}) {
  const x1 = fromPos.x + NODE_WIDTH;
  const y1 = fromPos.y + NODE_HEIGHT / 2;
  const x2 = toPos.x;
  const y2 = toPos.y + NODE_HEIGHT / 2;
  const midX = (x1 + x2) / 2;

  const pathD = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

  const strokeColor = hasAlert
    ? "hsl(var(--destructive))"
    : dataType === "control"
      ? "hsl(var(--chart-3))"
      : "hsl(var(--primary) / 0.35)";

  return (
    <g>
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth={hasAlert ? 2.5 : 1.5}
        strokeDasharray={dataType === "control" ? "6 3" : undefined}
        opacity={0.7}
      />
      {hasAlert && (
        <circle cx={midX} cy={(y1 + y2) / 2} r={4} fill="hsl(var(--destructive))" className="animate-pulse" />
      )}
    </g>
  );
}

// ── Workflow Node ──
function WorkflowNode({ iface, position, alertCount, isSelected, onClick }: {
  iface: InstrumentInterface; position: NodePosition; alertCount: number;
  isSelected: boolean; onClick: () => void;
}) {
  const Icon = ICON_MAP[iface.id] || Gauge;
  const statusCfg = STATUS_COLORS[iface.status];

  return (
    <foreignObject x={position.x} y={position.y} width={NODE_WIDTH} height={NODE_HEIGHT}>
      <div
        className={`h-full rounded-lg border-2 p-2.5 cursor-pointer transition-all hover:shadow-lg ${statusCfg.bg} ${
          isSelected ? "border-primary shadow-md ring-2 ring-primary/20" : statusCfg.border
        } ${statusCfg.pulse}`}
        onClick={onClick}
      >
        <div className="flex items-start justify-between gap-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <Icon className={`h-4 w-4 flex-shrink-0 ${statusCfg.text}`} />
            <span className="text-[11px] font-semibold truncate">{iface.display_name}</span>
          </div>
          {alertCount > 0 && (
            <div className="flex items-center gap-0.5 bg-destructive/15 rounded px-1 py-0.5 flex-shrink-0">
              <AlertTriangle className="h-3 w-3 text-destructive" />
              <span className="text-[9px] font-bold text-destructive">{alertCount}</span>
            </div>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className={`text-[9px] font-mono ${statusCfg.text}`}>{iface.status}</span>
          <span className="text-[9px] text-muted-foreground">·</span>
          <span className="text-[9px] text-muted-foreground">{iface.data_types.join(", ")}</span>
        </div>
        <div className="mt-1 text-[9px] text-muted-foreground font-mono">{iface.id}</div>
      </div>
    </foreignObject>
  );
}

// ── Add Device Dialog ──
function AddDeviceDialog({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void;
  onAdd: (device: InstrumentInterface) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<InterfaceCategory>("Production");
  const [id, setId] = useState("");

  const handleAdd = () => {
    if (!name || !id) return;
    const newDevice: InstrumentInterface = {
      id,
      display_name: name,
      category,
      status: "Offline" as InterfaceStatus,
      last_polled_at: new Date().toISOString(),
      poll_frequency_sec: 60,
      data_types: ["timeseries"],
      description: `User-added ${category.toLowerCase()} interface.`,
    };
    onAdd(newDevice);
    setName("");
    setId("");
    onClose();
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
            <Label>Interface ID</Label>
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="e.g. PH-PROBE-01" className="font-mono" />
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

// ── Device Detail Sheet ──
function DeviceDetailSheet({ iface, onClose }: { iface: InstrumentInterface | null; onClose: () => void; }) {
  const alerts = useMemo(() => (iface ? getAlertsForInterface(iface.id) : []), [iface?.id]);
  if (!iface) return null;
  const statusCfg = STATUS_COLORS[iface.status];
  const isBioreactor = iface.category === "Production" && iface.id.startsWith("BR-");
  const relatedParams = isBioreactor ? PARAMETERS : [];

  const incomingConns = CONNECTIONS.filter((c) => c.to === iface.id);
  const outgoingConns = CONNECTIONS.filter((c) => c.from === iface.id);

  return (
    <Sheet open={!!iface} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-[420px] sm:w-[500px] flex flex-col overflow-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            {iface.display_name}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto mt-4 space-y-5">
          {/* Status & category */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={iface.status === "Connected" ? "default" : iface.status === "Degraded" ? "outline" : "destructive"} className="gap-1 text-xs">
              {iface.status === "Connected" ? <CheckCircle2 className="h-3 w-3" /> : iface.status === "Degraded" ? <AlertCircle className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {iface.status}
            </Badge>
            <Badge variant="secondary" className="text-xs">{iface.category}</Badge>
            <span className="text-xs font-mono text-muted-foreground ml-auto">{iface.id}</span>
          </div>

          <p className="text-sm text-muted-foreground">{iface.description}</p>

          {/* Equipment settings */}
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" /> Equipment Settings
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Card><CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Poll Frequency</p>
                <p className="text-sm font-semibold">{iface.poll_frequency_sec}s</p>
              </CardContent></Card>
              <Card><CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Last Polled</p>
                <p className="text-sm font-semibold">{format(new Date(iface.last_polled_at), "HH:mm:ss")}</p>
              </CardContent></Card>
              <Card className="col-span-2"><CardContent className="p-2.5">
                <p className="text-[10px] text-muted-foreground">Data Types</p>
                <div className="flex gap-1.5 mt-1">{iface.data_types.map((dt) => <Badge key={dt} variant="outline" className="text-[10px]">{dt}</Badge>)}</div>
              </CardContent></Card>
            </div>
          </div>

          {/* Connections */}
          {(incomingConns.length > 0 || outgoingConns.length > 0) && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Connections
              </h4>
              <div className="space-y-1.5">
                {incomingConns.map((c, i) => {
                  const src = INTERFACES.find((ifc) => ifc.id === c.from);
                  return (
                    <div key={`in-${i}`} className="flex items-center gap-2 text-xs rounded-md border p-2">
                      <Badge variant="secondary" className="text-[10px]">IN</Badge>
                      <span className="font-medium">{src?.display_name || c.from}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{c.label}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">{c.dataType}</Badge>
                    </div>
                  );
                })}
                {outgoingConns.map((c, i) => {
                  const dst = INTERFACES.find((ifc) => ifc.id === c.to);
                  return (
                    <div key={`out-${i}`} className="flex items-center gap-2 text-xs rounded-md border p-2">
                      <Badge variant="secondary" className="text-[10px]">OUT</Badge>
                      <span className="font-medium">{dst?.display_name || c.to}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{c.label}</span>
                      <Badge variant="outline" className="text-[9px] ml-auto">{c.dataType}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Alerts */}
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

          {/* Parameters for bioreactors */}
          {isBioreactor && relatedParams.length > 0 && (
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

// ── Column labels ──
function ColumnLabel({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <foreignObject x={x} y={y} width={NODE_WIDTH} height={24}>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest text-center">
        {label}
      </div>
    </foreignObject>
  );
}

// ── Main Component ──
export default function WorkflowVisualization() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [customDevices, setCustomDevices] = useState<InstrumentInterface[]>([]);

  const alertCounts = useMemo(() => getAlertCountsByInterface(), []);
  const allInterfaces = useMemo(() => [...INTERFACES, ...customDevices], [customDevices]);

  const selectedIface = useMemo(
    () => (selectedId ? allInterfaces.find((i) => i.id === selectedId) || null : null),
    [selectedId, allInterfaces],
  );

  // Build positions including custom devices
  const positions = useMemo(() => {
    const base = [...NODE_POSITIONS];
    customDevices.forEach((d, i) => {
      const col = d.category === "Production" ? "input" : "output";
      const x = col === "input" ? 80 : 680;
      const y = 480 + i * 100;
      base.push({ id: d.id, x, y, col });
    });
    return base;
  }, [customDevices]);

  const svgHeight = Math.max(500, ...positions.map((p) => p.y + NODE_HEIGHT + 40));

  const handleAddDevice = useCallback((device: InstrumentInterface) => {
    setCustomDevices((prev) => [...prev, device]);
  }, []);

  // Check if a connection has alerts on either end
  const connectionHasAlert = useCallback((conn: PipelineConnection) => {
    return (alertCounts[conn.from] || 0) > 0 || (alertCounts[conn.to] || 0) > 0;
  }, [alertCounts]);

  const totalAlerts = useMemo(() => Object.values(alertCounts).reduce((s, c) => s + c, 0), [alertCounts]);
  const degradedCount = allInterfaces.filter((i) => i.status === "Degraded").length;
  const offlineCount = allInterfaces.filter((i) => i.status === "Offline").length;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Gauge className="h-4 w-4" />{allInterfaces.length} devices
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <ArrowRight className="h-4 w-4" />{CONNECTIONS.length} connections
          </span>
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
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-primary/35 inline-block" /> Data flow</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 border-t-2 border-dashed border-[hsl(43,96%,56%)] inline-block" /> Control signal</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive inline-block animate-pulse" /> Alert on connection</span>
        <span className="text-muted-foreground/50">Click any device to inspect</span>
      </div>

      {/* SVG Canvas */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-auto">
            <svg width="900" height={svgHeight} className="min-w-[900px]">
              {/* Column labels */}
              <ColumnLabel x={80} y={16} label="Input Systems" />
              <ColumnLabel x={380} y={16} label="Bioreactors" />
              <ColumnLabel x={680} y={16} label="Analytical" />

              {/* Vertical lane separators */}
              <line x1={280} y1={36} x2={280} y2={svgHeight - 10} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
              <line x1={580} y1={36} x2={580} y2={svgHeight - 10} stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />

              {/* Connections */}
              {CONNECTIONS.map((conn, i) => {
                const fromPos = positions.find((p) => p.id === conn.from);
                const toPos = positions.find((p) => p.id === conn.to);
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

              {/* Nodes */}
              {positions.map((pos) => {
                const iface = allInterfaces.find((i) => i.id === pos.id);
                if (!iface) return null;
                return (
                  <WorkflowNode
                    key={pos.id}
                    iface={iface}
                    position={pos}
                    alertCount={alertCounts[iface.id] || 0}
                    isSelected={selectedId === pos.id}
                    onClick={() => setSelectedId(pos.id)}
                  />
                );
              })}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Detail sheet */}
      <DeviceDetailSheet iface={selectedIface} onClose={() => setSelectedId(null)} />

      {/* Add device dialog */}
      <AddDeviceDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} onAdd={handleAddDevice} />
    </div>
  );
}
