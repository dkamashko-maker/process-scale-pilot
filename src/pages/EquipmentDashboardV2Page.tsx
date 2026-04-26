import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { OverviewHeader } from "@/components/shared/PageHeader";
import { KpiCard } from "@/components/shared/KpiCard";
import {
  EQUIPMENT, getFleetKpis, getRecentAlertsForEquipment,
  type Equipment, type EquipmentCategory, type EquipmentStatus,
} from "@/data/equipment";
import { getRunForEquipmentId } from "@/data/runData";
import {
  Activity, AlertTriangle, Search, Wifi, WifiOff, CircleDot,
  FileText, BookOpen, LineChart, Bell, Database, ScrollText, UploadCloud, Cable,
  Hash, Layers, Clock, ArrowUpRight, ArrowDownRight, X,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { EquipmentTooltip } from "@/components/equipment/EquipmentTooltip";

// ── Category accent (subtle — used for tab + 3px left card border only) ──
const CATEGORY: Record<
  EquipmentCategory,
  { label: string; short: string; border: string; activeTab: string }
> = {
  upstream: {
    label: "Upstream Process Equipment",
    short: "Upstream",
    border: "border-l-blue-500",
    // Full class strings so Tailwind JIT sees them literally
    activeTab:
      "data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:border-blue-200",
  },
  downstream: {
    label: "Downstream Process Equipment",
    short: "Downstream",
    border: "border-l-teal-500",
    activeTab:
      "data-[state=active]:bg-teal-50 data-[state=active]:text-teal-700 data-[state=active]:border-teal-200",
  },
  analytical: {
    label: "Analytical Equipment & Assays",
    short: "Analytical",
    border: "border-l-amber-500",
    activeTab:
      "data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700 data-[state=active]:border-amber-200",
  },
};

// ── Small visual helpers ────────────────────────────────────────────────

function StatusBadge({ status }: { status: EquipmentStatus }) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "error")  return <Badge variant="danger">Alerting</Badge>;
  return <Badge variant="neutral">Idle</Badge>;
}

function ConnectionLine({ health }: { health: Equipment["connectionHealth"] }) {
  const cfg = {
    connected: { Icon: Wifi,      cls: "text-status-active",  label: "Connected" },
    degraded:  { Icon: CircleDot, cls: "text-status-warning", label: "Degraded" },
    offline:   { Icon: WifiOff,   cls: "text-status-error",   label: "Offline" },
  }[health];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${cfg.cls}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

/** Severity breakdown chip — "1 critical · 1 warning" style */
function AlertBreakdown({ count, critical }: { count: number; critical: boolean }) {
  if (count === 0) {
    return (
      <span className="text-[11px] text-text-secondary inline-flex items-center gap-1">
        <Bell className="h-3 w-3" /> No alerts
      </span>
    );
  }
  const criticals = critical ? 1 : 0;
  const warnings = count - criticals;
  const parts: string[] = [];
  if (criticals) parts.push(`${criticals} critical`);
  if (warnings)  parts.push(`${warnings} warning${warnings > 1 ? "s" : ""}`);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
        critical ? "bg-[hsl(var(--pill-danger-bg))] text-[hsl(var(--pill-danger-fg))]"
                 : "bg-[hsl(var(--pill-warning-bg))] text-[hsl(var(--pill-warning-fg))]"
      }`}
    >
      <AlertTriangle className="h-3 w-3" />
      {parts.join(" · ")}
    </span>
  );
}

function Sparkline({ data, label }: { data: number[]; label?: string }) {
  if (!data?.length) return null;
  const w = 96, h = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  return (
    <div className="flex items-center justify-between rounded-md bg-secondary px-2.5 py-1.5">
      {label && (
        <span className="text-[10px] uppercase tracking-wide text-text-secondary">{label}</span>
      )}
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
    </div>
  );
}

// ── Operational equipment card ──────────────────────────────────────────

function EquipmentCard({
  eq,
  onOpen,
  onCta,
}: {
  eq: Equipment;
  onOpen: () => void;
  onCta: () => void;
}) {
  const cat = CATEGORY[eq.equipmentCategory];
  const isActive = eq.status === "active" || eq.status === "error";
  const isAnalytical = eq.equipmentCategory === "analytical";
  const isManual = eq.integrationMode === "manual";
  const cta = isActive ? "View run" : "Start run";

  // Card chrome — Operational card type from design system
  return (
    <EquipmentTooltip equipment={eq}>
      <div
        onClick={onOpen}
        className={`group relative card-operational border-l-[3px] ${cat.border} cursor-pointer transition-colors hover:border-primary hover:border-l-[3px]`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              {isAnalytical ? (isManual ? "Manual upload" : "Analytical") : cat.short}
            </div>
            <div className="text-[14px] font-medium leading-tight truncate text-foreground">
              {eq.equipmentName}
            </div>
            <div className="text-[11px] text-text-secondary mt-0.5 font-mono">{eq.equipmentId}</div>
          </div>
          <StatusBadge status={eq.status} />
        </div>

        {/* Body — varies by category and state */}
        <div className="space-y-2.5">
          {isAnalytical ? (
            <>
              <div className="flex items-start gap-1.5 text-[12px]">
                <Layers className="h-3 w-3 mt-0.5 text-text-secondary shrink-0" />
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-wide text-text-secondary">Method</div>
                  <div className="truncate">{eq.methodName ?? "—"}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div className="flex items-start gap-1.5">
                  <Hash className="h-3 w-3 mt-0.5 text-text-secondary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">Batch</div>
                    <div className="font-mono truncate">{eq.currentBatch ?? "—"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <Clock className="h-3 w-3 mt-0.5 text-text-secondary shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-text-secondary">Last data</div>
                    <div className="truncate">{format(new Date(eq.lastDataReceivedAt), "MMM d, HH:mm")}</div>
                  </div>
                </div>
              </div>
            </>
          ) : isActive ? (
            <>
              <div className="grid grid-cols-2 gap-2 text-[12px]">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-text-secondary">Batch</div>
                  <div className="font-mono truncate">{eq.currentBatch ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-text-secondary">Phase</div>
                  <div className="truncate">{eq.processPhase}</div>
                </div>
              </div>
              {eq.trendPreview && (
                <Sparkline data={eq.trendPreview} label="Temp · 7d" />
              )}
            </>
          ) : (
            <div className="rounded-md bg-secondary px-2.5 py-2">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">Last operation</div>
              <div className="text-[12px]">{format(new Date(eq.lastOperationAt), "MMM d, HH:mm")}</div>
              <div className="text-[11px] text-text-secondary italic mt-0.5">No active run</div>
            </div>
          )}

          {/* Footer: connection + alert breakdown + hover CTA */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-border-tertiary">
            <ConnectionLine health={eq.connectionHealth} />
            <AlertBreakdown count={eq.alertCount} critical={eq.criticalAlert} />
          </div>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCta(); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
          >
            {cta} <ArrowUpRight className="h-3 w-3" />
          </button>
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
            <StatusBadge status={equipment.status} />
          </div>
          <SheetDescription className="font-mono text-xs">{equipment.equipmentId}</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-text-secondary">Connection</div>
              <ConnectionLine health={equipment.connectionHealth} />
            </div>
            <div>
              <div className="text-xs text-text-secondary">Mode</div>
              <div className="capitalize text-xs">{equipment.integrationMode}</div>
            </div>
          </div>

          <Separator />

          {isAnalytical ? (
            <div className="space-y-2">
              <div>
                <div className="text-xs text-text-secondary">Last result received</div>
                <div className="text-sm">
                  {format(new Date(equipment.lastDataReceivedAt), "MMM d, yyyy HH:mm")}
                  <span className="text-text-secondary ml-2">
                    ({formatDistanceToNow(new Date(equipment.lastDataReceivedAt), { addSuffix: true })})
                  </span>
                </div>
              </div>
              <div>
                <div className="text-xs text-text-secondary">Latest batch / series</div>
                <div className="font-mono text-xs">{equipment.currentBatch ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-text-secondary">Method</div>
                <div className="text-sm">{equipment.methodName ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-text-secondary">Upload mode</div>
                <Badge variant={equipment.integrationMode === "manual" ? "neutral" : "success"} className="gap-1 mt-0.5">
                  {equipment.integrationMode === "manual"
                    ? <><UploadCloud className="h-3 w-3" /> Manual load</>
                    : <><Cable className="h-3 w-3" /> Online-integrated</>}
                </Badge>
              </div>
              <div>
                <div className="text-xs text-text-secondary">File / result reference</div>
                <div className="font-mono text-xs">{equipment.latestEvidenceRef ?? "—"}</div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <div className="text-xs text-text-secondary">Assigned batch</div>
                <div className="font-mono text-xs">{equipment.currentBatch ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-text-secondary">Process phase</div>
                <div className="text-sm">{equipment.processPhase}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-text-secondary">Last operation</div>
                  <div className="text-xs">{format(new Date(equipment.lastOperationAt), "MMM d, HH:mm")}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary">Last data received</div>
                  <div className="text-xs">{format(new Date(equipment.lastDataReceivedAt), "MMM d, HH:mm")}</div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          <div>
            <div className="text-xs text-text-secondary mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Recent alerts
            </div>
            {alerts.length === 0 ? (
              <p className="text-xs text-text-secondary">No recent alerts.</p>
            ) : (
              <ul className="space-y-2">
                {alerts.map((a) => (
                  <li key={a.id} className="text-xs border-l-2 pl-2"
                      style={{ borderColor: a.severity === "critical" ? "hsl(var(--destructive))" : a.severity === "warning" ? "hsl(38 92% 50%)" : "hsl(var(--muted-foreground))" }}>
                    <div className="font-medium">{a.message}</div>
                    <div className="text-text-secondary">{format(new Date(a.timestamp), "MMM d, HH:mm")}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Separator />

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
const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "All statuses", active: "Active", idle: "Idle", error: "Alerting",
};

export default function EquipmentDashboardV2Page() {
  const navigate = useNavigate();
  const kpis = useMemo(() => getFleetKpis(), []);
  const [tab, setTab] = useState<EquipmentCategory>("upstream");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Equipment | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openCard = (eq: Equipment) => { setSelected(eq); setDrawerOpen(true); };

  const handleCta = (eq: Equipment) => {
    if (eq.status === "active" || eq.status === "error") {
      const run = getRunForEquipmentId(eq.equipmentId);
      navigate(run ? `/run/${run.run_id}` : "/equipment");
    } else {
      openCard(eq);
    }
  };

  const filteredFor = (cat: EquipmentCategory) =>
    EQUIPMENT.filter((e) => e.equipmentCategory === cat).filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(
          e.equipmentName.toLowerCase().includes(q) ||
          e.equipmentId.toLowerCase().includes(q)
        )) return false;
      }
      return true;
    });

  // Trend stubs (no historical series in fixture data — render only when meaningful)
  const connectedTrend: "up" | "down" | undefined = kpis.connected > 0 ? "up" : undefined;
  const activeTrend: "up" | "down" | undefined = kpis.active > 0 ? "up" : undefined;

  return (
    <div className="p-6 stack-page">
      <OverviewHeader
        title="Equipment Dashboard"
        description="Operational equipment, assays and connection status across the fleet."
      />

      {/* KPI summary strip — Summary card style */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryTile
          label="Connected"
          value={kpis.connected}
          Icon={Wifi}
          tone="primary"
          trend={connectedTrend}
        />
        <SummaryTile
          label="Active"
          value={kpis.active}
          Icon={Activity}
          tone="active"
          trend={activeTrend}
        />
        <SummaryTile label="Idle" value={kpis.idle} Icon={CircleDot} tone="idle" />
        <SummaryTile
          label="With alerts"
          value={kpis.withAlerts}
          Icon={AlertTriangle}
          tone="warning"
          highlight={kpis.withAlerts > 0 ? "warning" : undefined}
        />
        <SummaryTile
          label="Uploads today"
          value={kpis.analyticalUploadsToday}
          Icon={UploadCloud}
          tone="primary"
          demoted={kpis.analyticalUploadsToday === 0}
        />
      </div>

      {/* Category tabs + inline search/filter */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as EquipmentCategory)}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <TabsList className="h-auto bg-transparent p-0 gap-2 flex-wrap">
            {(Object.keys(CATEGORY) as EquipmentCategory[]).map((value) => {
              const meta = CATEGORY[value];
              const count = filteredFor(value).length;
              return (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={`h-9 px-3.5 rounded-full border text-[13px] font-medium gap-2 transition-colors
                    border-border-tertiary text-text-secondary
                    hover:text-foreground hover:border-foreground/30
                    ${meta.activeTab}`}
                >
                  <span>{meta.label}</span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-background/70 border border-current/20 text-[11px] tabular-nums">
                    {count}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Search + status — right-aligned */}
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-text-secondary" />
              <Input
                placeholder="Search by name or ID…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9 w-[220px]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-2.5 text-text-secondary hover:text-foreground"
                  aria-label="Clear search"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {statusFilter === "all" ? (
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
                <SelectTrigger className="w-[140px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="idle">Idle</SelectItem>
                  <SelectItem value="error">Alerting</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="inline-flex items-center gap-1.5 h-9 pl-3 pr-1.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 text-[13px] font-medium">
                {STATUS_LABEL[statusFilter]}
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className="h-6 w-6 inline-flex items-center justify-center rounded-sm hover:bg-blue-100"
                  aria-label="Clear status filter"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {(["upstream", "downstream", "analytical"] as EquipmentCategory[]).map((cat) => (
          <TabsContent key={cat} value={cat} className="mt-5">
            <CardGrid
              items={filteredFor(cat)}
              renderCard={(eq) => (
                <EquipmentCard
                  key={eq.equipmentId}
                  eq={eq}
                  onOpen={() => openCard(eq)}
                  onCta={() => handleCta(eq)}
                />
              )}
            />
          </TabsContent>
        ))}
      </Tabs>

      <EquipmentDrawer equipment={selected} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}

// ── Summary tile (KPI) ──────────────────────────────────────────────────

type KpiTone = "primary" | "active" | "idle" | "warning" | "error";

function SummaryTile({
  label, value, Icon, tone = "primary", trend, highlight, demoted,
}: {
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
  trend?: "up" | "down";
  highlight?: "warning";
  demoted?: boolean;
}) {
  const TONE_ICON: Record<KpiTone, string> = {
    primary: "text-primary",
    active:  "text-status-active",
    idle:    "text-text-secondary",
    warning: "text-status-warning",
    error:   "text-status-error",
  };
  const bg = highlight === "warning"
    ? "bg-amber-50"
    : "bg-secondary";
  const valueCls = demoted
    ? "text-[18px] text-text-secondary"
    : "text-kpi text-foreground";

  return (
    <div className={`rounded-lg p-4 ${bg}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-normal text-text-secondary">{label}</p>
        <Icon className={`h-4 w-4 shrink-0 ${TONE_ICON[tone]}`} />
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <p className={`tabular-nums leading-none ${valueCls}`}>{value}</p>
        {trend && !demoted && (
          trend === "up"
            ? <ArrowUpRight className="h-3.5 w-3.5 text-status-active" />
            : <ArrowDownRight className="h-3.5 w-3.5 text-status-error" />
        )}
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
      <div className="card-data p-10 text-center text-sm text-text-secondary border-dashed">
        <ScrollText className="h-6 w-6 mx-auto mb-2 opacity-50" />
        No equipment matches the current filters.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {items.map(renderCard)}
    </div>
  );
}
