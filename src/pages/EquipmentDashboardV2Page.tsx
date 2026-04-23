import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiCard } from "@/components/shared/KpiCard";
import {
  EQUIPMENT, METHOD_MAPPINGS, getFleetCounts,
  type Equipment, type EquipmentCategory,
} from "@/data/equipment";
import {
  FlaskConical, Beaker, Microscope, Activity, AlertTriangle,
  Wifi, WifiOff, CircleDot, Search,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_META: Record<EquipmentCategory, { label: string; icon: typeof FlaskConical }> = {
  upstream:   { label: "Upstream",   icon: FlaskConical },
  downstream: { label: "Downstream", icon: Beaker },
  analytical: { label: "Analytical", icon: Microscope },
};

function statusBadge(s: Equipment["status"]) {
  const map = {
    active: { variant: "default" as const, label: "Active" },
    idle:   { variant: "secondary" as const, label: "Idle" },
    error:  { variant: "destructive" as const, label: "Error" },
  };
  return <Badge variant={map[s].variant}>{map[s].label}</Badge>;
}

function healthBadge(h: Equipment["connectionHealth"]) {
  const cfg = {
    connected: { icon: Wifi,    cls: "text-primary",          label: "Connected" },
    degraded:  { icon: CircleDot, cls: "text-amber-500",      label: "Degraded" },
    offline:   { icon: WifiOff, cls: "text-destructive",      label: "Offline" },
  }[h];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs ${cfg.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {cfg.label}
    </span>
  );
}

function EquipmentTable({ items }: { items: Equipment[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground p-6 text-center">No equipment matches the current filter.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Equipment</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Connection</TableHead>
          <TableHead>Mode</TableHead>
          <TableHead>Current Batch</TableHead>
          <TableHead>Phase / Method</TableHead>
          <TableHead>Last Data</TableHead>
          <TableHead className="text-right">Alerts</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((e) => (
          <TableRow key={e.equipmentId}>
            <TableCell>
              <div className="font-medium">{e.equipmentName}</div>
              <div className="text-[11px] text-muted-foreground">{e.equipmentId}</div>
            </TableCell>
            <TableCell>{statusBadge(e.status)}</TableCell>
            <TableCell>{healthBadge(e.connectionHealth)}</TableCell>
            <TableCell className="capitalize text-sm">{e.integrationMode}</TableCell>
            <TableCell className="text-sm">{e.currentBatch ?? <span className="text-muted-foreground">—</span>}</TableCell>
            <TableCell className="text-sm">
              <div>{e.processPhase}</div>
              {e.methodName && <div className="text-[11px] text-muted-foreground">{e.methodName}</div>}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(e.lastDataReceivedAt), { addSuffix: true })}
            </TableCell>
            <TableCell className="text-right">
              {e.alertCount > 0 ? (
                <Badge variant={e.criticalAlert ? "destructive" : "outline"}>{e.alertCount}</Badge>
              ) : (
                <span className="text-muted-foreground text-sm">0</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function EquipmentDashboardV2Page() {
  const counts = useMemo(() => getFleetCounts(), []);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<EquipmentCategory | "all">("all");

  const filtered = useMemo(() => {
    return EQUIPMENT.filter((e) => {
      if (tab !== "all" && e.equipmentCategory !== tab) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        e.equipmentName.toLowerCase().includes(q) ||
        e.equipmentId.toLowerCase().includes(q) ||
        (e.currentBatch?.toLowerCase().includes(q) ?? false) ||
        (e.methodName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [query, tab]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipment Dashboard v2</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Unified view of the upstream, downstream and analytical equipment fleet.
          Read-only monitoring — no control actions.
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <KpiCard label="Total"      value={counts.total}      icon={Activity} />
        <KpiCard label="Upstream"   value={counts.upstream}   icon={FlaskConical} />
        <KpiCard label="Downstream" value={counts.downstream} icon={Beaker} />
        <KpiCard label="Analytical" value={counts.analytical} icon={Microscope} />
        <KpiCard label="Active"     value={counts.active}     icon={CircleDot} />
        <KpiCard label="Alerts"     value={counts.alerts}     icon={AlertTriangle} />
      </div>

      {/* Method ↔ Equipment mapping reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Analytical Method → Equipment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {METHOD_MAPPINGS.map((m) => (
              <Badge key={m.methodCode} variant="outline" className="font-normal">
                <span className="font-mono mr-1">({m.methodCode})</span>
                {m.methodName} → <span className="ml-1 font-medium">{m.equipmentId}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fleet table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="text-sm">Equipment Fleet</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment, batch, method…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="all">All ({counts.total})</TabsTrigger>
              <TabsTrigger value="upstream">Upstream ({counts.upstream})</TabsTrigger>
              <TabsTrigger value="downstream">Downstream ({counts.downstream})</TabsTrigger>
              <TabsTrigger value="analytical">Analytical ({counts.analytical})</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} className="mt-4">
              <EquipmentTable items={filtered} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
