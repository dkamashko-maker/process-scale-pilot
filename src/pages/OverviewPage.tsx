import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { RUNS, INTERFACES, getRunForInterface } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Activity, Clock, LineChart, CalendarClock, FileText, AlertTriangle,
  ExternalLink, Database, Shield, CheckCircle2, WifiOff, AlertCircle,
  Gauge, FlaskConical, Wind, Pipette, TestTube, Microscope, Cpu,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { InstrumentInterface } from "@/data/runTypes";

// ── Icon map per interface ──
const INTERFACE_ICONS: Record<string, typeof FlaskConical> = {
  "BR-003-p": FlaskConical,
  "BR-004-p": FlaskConical,
  "BR-005-p": FlaskConical,
  "GAS-MFC-RACK": Wind,
  "PUMP-MODULE": Pipette,
  "METAB-ANALYZER": TestTube,
  "CELL-COUNTER": Microscope,
  "HPLC-01": Cpu,
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

// ── Interface Card ──
function InterfaceCard({
  iface,
  alertCount,
  delay,
  onClick,
}: {
  iface: InstrumentInterface;
  alertCount: number;
  delay: number;
  onClick: () => void;
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
        {/* Header row */}
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

        {/* Category + data types */}
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-[10px]">{iface.category}</Badge>
          <div className="flex items-center gap-1.5">
            {iface.data_types.map((dt) => {
              const cfg = DATA_TYPE_ICONS[dt];
              const DtIcon = cfg.icon;
              return (
                <div key={dt} className="flex items-center gap-0.5 text-muted-foreground" title={cfg.label}>
                  <DtIcon className="h-3 w-3" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: last polled + alerts */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {polledAgo}
          </span>
          {alertCount > 0 ? (
            <span className="flex items-center gap-1 text-destructive font-medium">
              <AlertTriangle className="h-3 w-3" />
              {alertCount} alert{alertCount !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-muted-foreground/60">
              0 alerts
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Drawer Content ──
function InterfaceDrawer({
  iface,
  onClose,
}: {
  iface: InstrumentInterface | null;
  onClose: () => void;
}) {
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
          <SheetTitle className="flex items-center gap-2 text-lg">
            {iface.display_name}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-auto mt-4 space-y-5">
          {/* Status + ID */}
          <div className="flex items-center gap-3">
            <Badge variant={statusCfg.variant} className="gap-1">
              <StatusIcon className="h-3.5 w-3.5" />
              {statusCfg.label}
            </Badge>
            <Badge variant="secondary">{iface.category}</Badge>
            <span className="text-xs font-mono text-muted-foreground ml-auto">{iface.id}</span>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{iface.description}</p>
          </div>

          {/* Equipment Profile */}
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
                    return (
                      <Badge key={dt} variant="outline" className="text-[10px] gap-1">
                        <DtIcon className="h-3 w-3" />
                        {cfg.label}
                      </Badge>
                    );
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

          {/* ALCOA Notes */}
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

          {/* Quick Links */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Quick Links</p>
            <div className="space-y-2">
              {/* Bioreactor: Open Monitoring */}
              {isBioreactor && linkedRun && (
                <Button
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    onClose();
                    navigate(`/run/${linkedRun.run_id}`);
                  }}
                >
                  <Activity className="h-4 w-4" />
                  Open Monitoring — {linkedRun.bioreactor_run}
                </Button>
              )}

              {/* HPLC: View Latest Files */}
              {isHPLC && (
                <Button
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    onClose();
                    navigate("/data-storage?filter=files");
                  }}
                >
                  <FileText className="h-4 w-4" />
                  View Latest Files
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={() => {
                  onClose();
                  navigate(`/data-storage?interface=${iface.id}`);
                }}
              >
                <Database className="h-4 w-4" />
                View Data Storage
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start gap-2"
                disabled
              >
                <ExternalLink className="h-4 w-4" />
                View Interface Details
                <Badge variant="secondary" className="ml-auto text-[9px]">Soon</Badge>
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Main Page ──
export default function OverviewPage() {
  const navigate = useNavigate();
  const { events } = useEvents();
  const [selectedInterface, setSelectedInterface] = useState<InstrumentInterface | null>(null);

  const now = Date.now();

  const activeRuns = useMemo(
    () => RUNS.filter((r) => !r.end_time || new Date(r.end_time).getTime() > now),
    [now],
  );

  const events24h = useMemo(() => {
    const cutoff = now - 24 * 3600000;
    return events.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  }, [events, now]);

  // Group interfaces by category
  const grouped = useMemo(() => {
    const map: Record<string, InstrumentInterface[]> = {};
    for (const iface of INTERFACES) {
      if (!map[iface.category]) map[iface.category] = [];
      map[iface.category].push(iface);
    }
    return map;
  }, []);

  const connectedCount = INTERFACES.filter((i) => i.status === "Connected").length;
  const degradedCount = INTERFACES.filter((i) => i.status === "Degraded").length;
  const offlineCount = INTERFACES.filter((i) => i.status === "Offline").length;

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">General View</h2>
        <InfoTooltip content="Overview of all connected instrument interfaces and their current status." />
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <KpiCard label="Total Interfaces" value={INTERFACES.length} trend="neutral" animationDelay={0} />
        <KpiCard label="Connected" value={connectedCount} trend="neutral" animationDelay={50} />
        <KpiCard label="Degraded" value={degradedCount} trend={degradedCount > 0 ? "down" : "neutral"} animationDelay={100} />
        <KpiCard label="Offline" value={offlineCount} trend={offlineCount > 0 ? "down" : "neutral"} animationDelay={150} />
        <KpiCard label="Events (24h)" value={events24h.length} trend="neutral" animationDelay={200} />
      </div>

      {/* ── Interface Grid by Category ── */}
      {Object.entries(grouped).map(([category, interfaces], catIdx) => (
        <div key={category} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{category}</h3>
            <Badge variant="secondary" className="text-[10px]">{interfaces.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {interfaces.map((iface, idx) => (
              <InterfaceCard
                key={iface.id}
                iface={iface}
                alertCount={iface.status === "Degraded" ? 1 : iface.status === "Offline" ? 2 : 0}
                delay={250 + catIdx * 100 + idx * 60}
                onClick={() => setSelectedInterface(iface)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* ── Interface Detail Drawer ── */}
      <InterfaceDrawer
        iface={selectedInterface}
        onClose={() => setSelectedInterface(null)}
      />
    </div>
  );
}
