import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  EQUIPMENT, getFleetKpis, getRecentAlertsForEquipment,
  type Equipment, type EquipmentCategory, type EquipmentStatus,
} from "@/data/equipment";
import { getRunForEquipmentId } from "@/data/runData";
import {
  Activity, AlertTriangle, Search, Wifi, WifiOff, CircleDot,
  FileText, BookOpen, LineChart, Bell, Database, ScrollText, UploadCloud, Cable,
  Hash, Layers, Clock, FlaskConical, Filter as FilterIcon, Microscope,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { EquipmentTooltip } from "@/components/equipment/EquipmentTooltip";

// ── Small visual helpers ────────────────────────────────────────────────

function StatusChip({ status }: { status: EquipmentStatus }) {
  const cfg = {
    active: {
      cls: "bg-status-active/15 text-status-active border-status-active/30",
      dot: "bg-status-active animate-pulse",
      label: "Active",
    },
    idle: {
      cls: "bg-status-idle/10 text-status-idle border-status-idle/25",
      dot: "bg-status-idle",
      label: "Idle",
    },
    error: {
      cls: "bg-status-error/15 text-status-error border-status-error/30",
      dot: "bg-status-error animate-pulse",
      label: "Error",
    },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function ConnectionDot({ health }: { health: Equipment["connectionHealth"] }) {
  const cfg = {
    connected: { Icon: Wifi,      cls: "text-status-active",  label: "Connected" },
    degraded:  { Icon: CircleDot, cls: "text-status-warning", label: "Degraded" },
    offline:   { Icon: WifiOff,   cls: "text-status-error",   label: "Offline" },
  }[health];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cfg.cls}`} title={cfg.label}>
      <cfg.Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function AlertChip({ count, critical }: { count: number; critical: boolean }) {
  if (count === 0) {
    return (
      <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
        <Bell className="h-3 w-3" /> No alerts
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${
        critical
          ? "bg-status-error/15 text-status-error border-status-error/30"
          : "bg-status-warning/15 text-status-warning border-status-warning/30"
      }`}
    >
      <AlertTriangle className="h-3 w-3" />
      {count} alert{count > 1 ? "s" : ""}
    </span>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (!data?.length) return null;
  const w = 96, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <svg width={w} height={h} className="text-primary overflow-visible">
      <defs>
        <linearGradient id="spark-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon fill="url(#spark-fill)" points={area} />
      <polyline fill="none" stroke="currentColor" strokeWidth="1.75" points={pts} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Tile shell ──
function tileShell(status: EquipmentStatus, manual = false): string {
  const base =
    "group cursor-pointer rounded-lg border transition-all duration-200 shadow-tile hover:shadow-tile-hover hover:-translate-y-0.5";
  if (manual) return `${base} bg-muted/30 border-dashed border-border hover:border-muted-foreground/40`;
  if (status === "error")  return `${base} bg-tile-error border-status-error/30 hover:border-status-error/60`;
  if (status === "active") return `${base} bg-tile-active border-border hover:border-primary/50`;
  return `${base} bg-tile-idle border-border hover:border-primary/40`;
}

// ── Cards (one component per category) ──────────────────────────────────

function UpstreamCard({ eq, onOpen }: { eq: Equipment; onOpen: () => void }) {
  const showBatchPhase = eq.status === "active" || eq.status === "error";
  return (
    <EquipmentTooltip equipment={eq}>
      <div className={tileShell(eq.status)} onClick={onOpen}>
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Bioreactor</div>
              <div className="text-base font-semibold leading-tight truncate">{eq.equipmentName}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{eq.equipmentId}</div>
            </div>
            <StatusChip status={eq.status} />
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2.5">
          {showBatchPhase ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Batch</div>
                <div className="font-mono text-xs truncate">{eq.currentBatch ?? "—"}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Phase</div>
                <div className="text-xs truncate">{eq.processPhase}</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last operation</div>
              <div className="text-xs">{format(new Date(eq.lastOperationAt), "MMM d, HH:mm")}</div>
            </div>
          )}
          {eq.trendPreview && (
            <div className="flex items-center justify-between rounded-md bg-muted/40 px-2.5 py-1.5">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Temp trend</span>
              <Sparkline data={eq.trendPreview} />
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t">
            <ConnectionDot health={eq.connectionHealth} />
            <AlertChip count={eq.alertCount} critical={eq.criticalAlert} />
          </div>
        </div>
      </div>
    </EquipmentTooltip>
  );
}

function DownstreamCard({ eq, onOpen }: { eq: Equipment; onOpen: () => void }) {
  const showBatch = eq.status === "active" || eq.status === "error";
  return (
    <EquipmentTooltip equipment={eq}>
      <div className={tileShell(eq.status)} onClick={onOpen}>
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Operational</div>
              <div className="text-base font-semibold leading-tight truncate">{eq.equipmentName}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{eq.equipmentId}</div>
            </div>
            <StatusChip status={eq.status} />
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2.5">
          {showBatch ? (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Batch</div>
              <div className="font-mono text-xs truncate">{eq.currentBatch ?? "—"}</div>
            </div>
          ) : (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last operation</div>
              <div className="text-xs">{format(new Date(eq.lastOperationAt), "MMM d, HH:mm")}</div>
            </div>
          )}
          <div className="flex items-center justify-between pt-1 border-t">
            <ConnectionDot health={eq.connectionHealth} />
            <AlertChip count={eq.alertCount} critical={eq.criticalAlert} />
          </div>
        </div>
      </div>
    </EquipmentTooltip>
  );
}

function AnalyticalCard({ eq, onOpen }: { eq: Equipment; onOpen: () => void }) {
  const isManual = eq.integrationMode === "manual";
  return (
    <EquipmentTooltip equipment={eq}>
      <div className={tileShell(eq.status, isManual)} onClick={onOpen}>
        <div className="p-4 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                {isManual ? "Manual upload" : "Analytical"}
              </div>
              <div className={`text-base font-semibold leading-tight truncate ${isManual ? "text-muted-foreground" : ""}`}>
                {eq.equipmentName}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">{eq.equipmentId}</div>
            </div>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${
                isManual
                  ? "bg-muted text-muted-foreground border-border"
                  : "bg-primary/10 text-primary border-primary/25"
              }`}
            >
              {isManual ? <UploadCloud className="h-3 w-3" /> : <Cable className="h-3 w-3" />}
              {isManual ? "Manual" : "Online"}
            </span>
          </div>
        </div>
        <div className="px-4 pb-4 space-y-2 text-xs">
          <div className="flex items-start gap-1.5">
            <Layers className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Method</div>
              <div className="truncate">{eq.methodName ?? "—"}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-start gap-1.5">
              <Hash className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Batch</div>
                <div className="font-mono truncate">{eq.currentBatch ?? "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-1.5">
              <Clock className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Last data</div>
                <div className="truncate">{format(new Date(eq.lastDataReceivedAt), "MMM d, HH:mm")}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1 border-t">
            <ConnectionDot health={eq.connectionHealth} />
            <AlertChip count={eq.alertCount} critical={eq.criticalAlert} />
          </div>
        </div>
      </div>
    </EquipmentTooltip>
  );
}

// ── Drawer ──────────────────────────────────────────────────────────────

function EquipmentDrawer({
  equipment,
  open,
  onOpenChange,
}: {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  if (!equipment) return null;
  const isAnalytical = equipment.equipmentCategory === "analytical";
  const alerts = getRecentAlertsForEquipment(equipment.equipmentId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between gap-2">
            <SheetTitle>{equipment.equipmentName}</SheetTitle>
            <StatusChip status={equipment.status} />
          </div>
          <SheetDescription className="font-mono text-xs">{equipment.equipmentId}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          {/* Status block */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Connection</div>
                <ConnectionDot health={equipment.connectionHealth} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Mode</div>
                <div className="capitalize text-xs">{equipment.integrationMode}</div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Category-specific block */}
          {isAnalytical ? (
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Last result received</div>
                <div className="text-sm">
                  {format(new Date(equipment.lastDataReceivedAt), "MMM d, yyyy HH:mm")}
                  <span className="text-muted-foreground ml-2">
                    ({formatDistanceToNow(new Date(equipment.lastDataReceivedAt), { addSuffix: true })})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Latest batch / series</div>
                <div className="font-mono text-xs">{equipment.currentBatch ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Method</div>
                <div className="text-sm">{equipment.methodName ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Upload mode</div>
                <Badge variant={equipment.integrationMode === "manual" ? "outline" : "secondary"} className="gap-1 text-[10px] mt-0.5">
                  {equipment.integrationMode === "manual"
                    ? <><UploadCloud className="h-3 w-3" /> Manual load</>
                    : <><Cable className="h-3 w-3" /> Online-integrated</>}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">File / result reference</div>
                <div className="font-mono text-xs">{equipment.latestEvidenceRef ?? "—"}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="text-xs text-muted-foreground">Assigned batch</div>
                <div className="font-mono text-xs">{equipment.currentBatch ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Process phase</div>
                <div className="text-sm">{equipment.processPhase}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Last operation</div>
                  <div className="text-xs">{format(new Date(equipment.lastOperationAt), "MMM d, HH:mm")}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Last data received</div>
                  <div className="text-xs">{format(new Date(equipment.lastDataReceivedAt), "MMM d, HH:mm")}</div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Alerts */}
          <div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Recent alerts
            </div>
            {alerts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent alerts.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.id} className="text-xs border-l-2 pl-2"
                      style={{ borderColor: a.severity === "critical" ? "hsl(var(--destructive))" : a.severity === "warning" ? "hsl(38 92% 50%)" : "hsl(var(--muted-foreground))" }}>
                    <div className="font-medium">{a.message}</div>
                    <div className="text-muted-foreground">{format(new Date(a.timestamp), "MMM d, HH:mm")}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="grid grid-cols-1 gap-2">
            <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate("/data-storage")}>
              <Database className="h-4 w-4 mr-2" /> View ledger records
            </Button>
            {!isAnalytical && (
              <Button
                variant="outline"
                size="sm"
                className="justify-start"
                onClick={() => {
                  const run = getRunForEquipmentId(equipment.equipmentId);
                  navigate(run ? `/run/${run.run_id}` : "/equipment");
                }}
              >
                <LineChart className="h-4 w-4 mr-2" /> Open monitoring view
              </Button>
            )}
            <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate("/events")}>
              <Bell className="h-4 w-4 mr-2" /> View alerts
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate("/metadata")}>
              <BookOpen className="h-4 w-4 mr-2" /> Open metadata
            </Button>
            <Button variant="outline" size="sm" className="justify-start" onClick={() => navigate("/reports")}>
              <FileText className="h-4 w-4 mr-2" /> View report evidence
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────

type StatusFilter = "all" | EquipmentStatus;

export default function EquipmentDashboardV2Page() {
  const kpis = useMemo(() => getFleetKpis(), []);
  const [tab, setTab] = useState<EquipmentCategory>("upstream");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openCard = (eq: Equipment) => { setSelected(eq); setDrawerOpen(true); };

  const filteredFor = (cat: EquipmentCategory) => {
    return EQUIPMENT.filter((e) => e.equipmentCategory === cat).filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (alertsOnly && e.alertCount === 0) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(
          e.equipmentName.toLowerCase().includes(q) ||
          e.equipmentId.toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Operational equipment, assays and connection status across the fleet.
          </p>
        </div>
      </div>

      {/* KPI strip — polished, scannable, commercial */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Connected"               value={kpis.connected}               Icon={Wifi}           tone="primary" />
        <KpiTile label="Active"                  value={kpis.active}                  Icon={Activity}       tone="active" />
        <KpiTile label="Idle"                    value={kpis.idle}                    Icon={CircleDot}      tone="idle" />
        <KpiTile label="With alerts"             value={kpis.withAlerts}              Icon={AlertTriangle}  tone={kpis.withAlerts > 0 ? "warning" : "idle"} />
        <KpiTile label="Uploads today"           value={kpis.analyticalUploadsToday}  Icon={UploadCloud}    tone="primary" />
      </div>

      {/* Utility controls */}
      <Card>
        <CardContent className="py-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px] max-w-xs">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or ID…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 ml-auto">
            <Switch id="alerts-only" checked={alertsOnly} onCheckedChange={setAlertsOnly} />
            <Label htmlFor="alerts-only" className="text-sm">Alerts only</Label>
          </div>
        </CardContent>
      </Card>

      {/* Category tabs — primary navigation */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as EquipmentCategory)}>
        <TabsList className="h-auto w-full flex flex-wrap gap-2 bg-muted/50 p-1.5">
          <TabsTrigger
            value="upstream"
            className="flex-1 min-w-[200px] text-base font-semibold py-3 px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Upstream Process Equipment
          </TabsTrigger>
          <TabsTrigger
            value="downstream"
            className="flex-1 min-w-[200px] text-base font-semibold py-3 px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Downstream Process Equipment
          </TabsTrigger>
          <TabsTrigger
            value="analytical"
            className="flex-1 min-w-[200px] text-base font-semibold py-3 px-5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            Analytical Equipment &amp; Assays
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upstream" className="mt-4">
          <CardGrid
            items={filteredFor("upstream")}
            renderCard={(eq) => <UpstreamCard key={eq.equipmentId} eq={eq} onOpen={() => openCard(eq)} />}
          />
        </TabsContent>
        <TabsContent value="downstream" className="mt-4">
          <CardGrid
            items={filteredFor("downstream")}
            renderCard={(eq) => <DownstreamCard key={eq.equipmentId} eq={eq} onOpen={() => openCard(eq)} />}
          />
        </TabsContent>
        <TabsContent value="analytical" className="mt-4">
          <CardGrid
            items={filteredFor("analytical")}
            renderCard={(eq) => <AnalyticalCard key={eq.equipmentId} eq={eq} onOpen={() => openCard(eq)} />}
          />
        </TabsContent>
      </Tabs>

      <EquipmentDrawer equipment={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}

// ── Tiny supporting components ───────────────────────────────────────────

type KpiTone = "primary" | "active" | "idle" | "warning" | "error";

function KpiTile({
  label, value, Icon, tone = "primary",
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
}) {
  const toneCfg: Record<KpiTone, { iconBg: string; iconCls: string; ring: string }> = {
    primary: { iconBg: "bg-primary/10",        iconCls: "text-primary",        ring: "hover:border-primary/40" },
    active:  { iconBg: "bg-status-active/15",  iconCls: "text-status-active",  ring: "hover:border-status-active/50" },
    idle:    { iconBg: "bg-status-idle/15",    iconCls: "text-status-idle",    ring: "hover:border-status-idle/40" },
    warning: { iconBg: "bg-status-warning/15", iconCls: "text-status-warning", ring: "hover:border-status-warning/50" },
    error:   { iconBg: "bg-status-error/15",   iconCls: "text-status-error",   ring: "hover:border-status-error/50" },
  };
  const cfg = toneCfg[tone];
  return (
    <div className={`rounded-lg border bg-card p-4 shadow-tile transition-all ${cfg.ring}`}>
      <div className="flex items-center gap-3">
        <div className={`h-10 w-10 rounded-md flex items-center justify-center ${cfg.iconBg}`}>
          <Icon className={`h-5 w-5 ${cfg.iconCls}`} />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium truncate">{label}</div>
          <div className="text-2xl font-bold leading-tight tabular-nums">{value}</div>
        </div>
      </div>
    </div>
  );
}

function CardGrid({
  items,
  renderCard,
}: {
  items: Equipment[];
  renderCard: (eq: Equipment) => React.ReactNode;
}) {
  if (items.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground border-dashed">
        <ScrollText className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No equipment matches the current filters.
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(renderCard)}
    </div>
  );
}
