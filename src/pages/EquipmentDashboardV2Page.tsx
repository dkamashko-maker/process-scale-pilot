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
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

// ── Small visual helpers ────────────────────────────────────────────────

function StatusChip({ status }: { status: EquipmentStatus }) {
  const map = {
    active: { variant: "default" as const, label: "Active" },
    idle:   { variant: "secondary" as const, label: "Idle" },
    error:  { variant: "destructive" as const, label: "Error" },
  };
  return <Badge variant={map[status].variant}>{map[status].label}</Badge>;
}

function ConnectionDot({ health }: { health: Equipment["connectionHealth"] }) {
  const cfg = {
    connected: { Icon: Wifi,      cls: "text-primary",     label: "Connected" },
    degraded:  { Icon: CircleDot, cls: "text-amber-500",   label: "Degraded" },
    offline:   { Icon: WifiOff,   cls: "text-destructive", label: "Offline" },
  }[health];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${cfg.cls}`} title={cfg.label}>
      <cfg.Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}

function AlertChip({ count, critical }: { count: number; critical: boolean }) {
  if (count === 0) {
    return <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1"><Bell className="h-3 w-3" /> No alerts</span>;
  }
  return (
    <Badge variant={critical ? "destructive" : "outline"} className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      {count} alert{count > 1 ? "s" : ""}
    </Badge>
  );
}

function Sparkline({ data }: { data: number[] }) {
  if (!data?.length) return null;
  const w = 80, h = 22;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="text-primary">
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ── Cards (one component per category) ──────────────────────────────────

function UpstreamCard({ eq, onOpen }: { eq: Equipment; onOpen: () => void }) {
  const showBatchPhase = eq.status === "active" || eq.status === "error";
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md" onClick={onOpen}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{eq.equipmentName}</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{eq.equipmentId}</p>
          </div>
          <StatusChip status={eq.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {showBatchPhase ? (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Current batch</div>
            <div className="font-mono text-xs">{eq.currentBatch ?? "—"}</div>
            <div className="text-xs text-muted-foreground mt-1">Phase</div>
            <div className="text-xs">{eq.processPhase}</div>
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Last operation</div>
            <div className="text-xs">{format(new Date(eq.lastOperationAt), "MMM d, HH:mm")}</div>
          </div>
        )}
        {eq.trendPreview && (
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Temperature trend</span>
            <Sparkline data={eq.trendPreview} />
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between">
          <ConnectionDot health={eq.connectionHealth} />
          <AlertChip count={eq.alertCount} critical={eq.criticalAlert} />
        </div>
      </CardContent>
    </Card>
  );
}

function DownstreamCard({ eq, onOpen }: { eq: Equipment; onOpen: () => void }) {
  const showBatch = eq.status === "active" || eq.status === "error";
  return (
    <Card className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-md" onClick={onOpen}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm">{eq.equipmentName}</CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{eq.equipmentId}</p>
          </div>
          <StatusChip status={eq.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {showBatch ? (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Current batch</div>
            <div className="font-mono text-xs">{eq.currentBatch ?? "—"}</div>
          </div>
        ) : (
          <div className="space-y-0.5">
            <div className="text-xs text-muted-foreground">Last operation</div>
            <div className="text-xs">{format(new Date(eq.lastOperationAt), "MMM d, HH:mm")}</div>
          </div>
        )}
        <Separator />
        <div className="flex items-center justify-between">
          <ConnectionDot health={eq.connectionHealth} />
          <AlertChip count={eq.alertCount} critical={eq.criticalAlert} />
        </div>
      </CardContent>
    </Card>
  );
}

function AnalyticalCard({ eq, onOpen }: { eq: Equipment; onOpen: () => void }) {
  const isManual = eq.integrationMode === "manual";
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-md ${
        isManual ? "bg-muted/30 border-dashed hover:border-muted-foreground/50" : "hover:border-primary/50"
      }`}
      onClick={onOpen}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className={`text-sm ${isManual ? "text-muted-foreground" : ""}`}>
              {eq.equipmentName}
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{eq.equipmentId}</p>
          </div>
          <Badge
            variant={isManual ? "outline" : "secondary"}
            className={`gap-1 text-[10px] ${isManual ? "text-muted-foreground" : ""}`}
          >
            {isManual ? <UploadCloud className="h-3 w-3" /> : <Cable className="h-3 w-3" />}
            {isManual ? "Manual load" : "Online"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <div className="text-muted-foreground">Method</div>
          <div className="text-foreground">{eq.methodName ?? "—"}</div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-muted-foreground">Batch / series</div>
            <div className="font-mono">{eq.currentBatch ?? "—"}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Last data</div>
            <div>{format(new Date(eq.lastDataReceivedAt), "MMM d, HH:mm")}</div>
          </div>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <ConnectionDot health={eq.connectionHealth} />
          <AlertChip count={eq.alertCount} critical={eq.criticalAlert} />
        </div>
      </CardContent>
    </Card>
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
      <div>
        <h1 className="text-2xl font-bold">Equipment Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Operational equipment and assay status overview
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiTile label="Connected"               value={kpis.connected}               Icon={Wifi} />
        <KpiTile label="Active"                  value={kpis.active}                  Icon={Activity} />
        <KpiTile label="Idle"                    value={kpis.idle}                    Icon={CircleDot} />
        <KpiTile label="With alerts"             value={kpis.withAlerts}              Icon={AlertTriangle} />
        <KpiTile label="Analytical uploads today" value={kpis.analyticalUploadsToday} Icon={UploadCloud} />
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

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as EquipmentCategory)}>
        <TabsList>
          <TabsTrigger value="upstream">Upstream Process Equipment</TabsTrigger>
          <TabsTrigger value="downstream">Downstream Process Equipment</TabsTrigger>
          <TabsTrigger value="analytical">Analytical Equipment &amp; Assays</TabsTrigger>
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

function KpiTile({ label, value, Icon }: { label: string; value: number; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold mt-0.5">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-muted-foreground" />
      </div>
    </Card>
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
