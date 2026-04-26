import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Filter, X, ShieldCheck, FileText, AlertTriangle, ClipboardEdit, Hash, Clock,
  User, Tag, CheckCircle2, Bell, Activity, Triangle, Paperclip, RotateCcw, Waves,
  FlaskConical, Filter as FilterIcon, Microscope,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OverviewHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getDataRecords, createCorrectionRecord, getCorrectionsFor } from "@/data/dataRecords";
import { INTERFACES, RUNS } from "@/data/runData";
import { EQUIPMENT } from "@/data/equipment";
import { getAlerts, type AlertSeverity } from "@/data/alertsEngine";
import type { DataRecord, QualityFlag } from "@/data/runTypes";

// ── Constants ──

const DATA_TYPES = ["timeseries", "event", "file", "correction"] as const;
type DataType = typeof DATA_TYPES[number];

// Type accent — left border + KPI tile icon colour
const TYPE_ACCENT: Record<DataType, { border: string; tone: string; Icon: React.ComponentType<{ className?: string }>; label: string }> = {
  timeseries: { border: "border-l-teal-500",  tone: "text-teal-600",   Icon: Waves,         label: "Timeseries" },
  event:      { border: "border-l-amber-500", tone: "text-amber-600",  Icon: Triangle,      label: "Event" },
  file:       { border: "border-l-blue-500",  tone: "text-blue-600",   Icon: Paperclip,     label: "File" },
  correction: { border: "border-l-red-500",   tone: "text-red-600",    Icon: RotateCcw,     label: "Correction" },
};

const FLAG_PILL: Record<string, string> = {
  in_spec:            "bg-[hsl(var(--pill-success-bg))] text-[hsl(var(--pill-success-fg))]",
  out_of_range:       "bg-[hsl(var(--pill-warning-bg))] text-[hsl(var(--pill-warning-fg))]",
  missing_field:      "bg-[hsl(var(--pill-warning-bg))] text-[hsl(var(--pill-warning-fg))]",
  late_ingestion:     "bg-[hsl(var(--pill-warning-bg))] text-[hsl(var(--pill-warning-fg))]",
  manually_entered:   "bg-[hsl(var(--pill-neutral-bg))] text-[hsl(var(--pill-neutral-fg))]",
  corrected:          "bg-[hsl(var(--pill-neutral-bg))] text-[hsl(var(--pill-neutral-fg))]",
  flagged_for_review: "bg-[hsl(var(--pill-warning-bg))] text-[hsl(var(--pill-warning-fg))]",
};

const PAGE_SIZE = 50;

// Equipment-type icon for "Attributed To"
function attributedIcon(id: string): React.ComponentType<{ className?: string }> {
  const eq = EQUIPMENT.find((e) => e.equipmentId === id);
  if (!eq) return User;
  if (eq.equipmentCategory === "upstream")   return FlaskConical;
  if (eq.equipmentCategory === "downstream") return FilterIcon;
  return Microscope;
}
function attributedName(id: string): string {
  return EQUIPMENT.find((e) => e.equipmentId === id)?.equipmentName ?? id;
}

// ── Component ──

export default function DataStoragePage() {
  const { isManager, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Filters
  const [interfaceFilter, setInterfaceFilter]       = useState<string>(searchParams.get("interface") || "all");
  const [typeFilter, setTypeFilter]                 = useState<string>("all");
  const [runFilter, setRunFilter]                   = useState<string>("all");
  const [sourceFilter, setSourceFilter]             = useState<string>("all");   // entry mode (renamed from "completeness")
  const [flagFilter, setFlagFilter]                 = useState<string>("all");
  const [severityFilter, setSeverityFilter]         = useState<"all" | AlertSeverity>("all");

  // Pagination + drawer
  const [page, setPage] = useState(0);
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [, setTick] = useState(0);

  const allRecords = useMemo(() => getDataRecords(), []);
  const alerts = useMemo(() => getAlerts(), []);

  const interfaceIds = useMemo(() => Array.from(new Set(allRecords.map((r) => r.interface_id))).sort(), [allRecords]);
  const allFlags = useMemo(() => {
    const s = new Set<string>();
    allRecords.forEach((r) => r.quality_flags.forEach((f) => s.add(f)));
    return Array.from(s).sort();
  }, [allRecords]);
  const entryModes = useMemo(() => Array.from(new Set(allRecords.map((r) => r.entry_mode))).sort(), [allRecords]);

  const filtered = useMemo(() => {
    let recs = allRecords;
    if (interfaceFilter !== "all") recs = recs.filter((r) => r.interface_id === interfaceFilter);
    if (typeFilter !== "all")      recs = recs.filter((r) => r.data_type === typeFilter);
    if (runFilter !== "all")       recs = recs.filter((r) => r.linked_run_id === runFilter);
    if (sourceFilter !== "all")    recs = recs.filter((r) => r.entry_mode === sourceFilter);
    if (flagFilter !== "all")      recs = recs.filter((r) => r.quality_flags.includes(flagFilter as QualityFlag));
    return [...recs].sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  }, [allRecords, interfaceFilter, typeFilter, runFilter, sourceFilter, flagFilter]);

  const pageRecords = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const activeFilters: Array<{ key: string; isActive: boolean }> = [
    { key: "interface", isActive: interfaceFilter !== "all" },
    { key: "type",      isActive: typeFilter !== "all" },
    { key: "run",       isActive: runFilter !== "all" },
    { key: "source",    isActive: sourceFilter !== "all" },
    { key: "flag",      isActive: flagFilter !== "all" },
  ];
  const activeFilterCount = activeFilters.filter((f) => f.isActive).length;

  const clearFilters = useCallback(() => {
    setInterfaceFilter("all"); setTypeFilter("all"); setRunFilter("all");
    setSourceFilter("all"); setFlagFilter("all"); setPage(0);
  }, []);

  const handleCorrection = useCallback(() => {
    if (!selectedRecord || !correctionText.trim() || !user) return;
    createCorrectionRecord(selectedRecord.record_id, correctionText.trim(), user.name);
    setCorrectionText("");
    setShowCorrectionForm(false);
    setTick((t) => t + 1);
  }, [selectedRecord, correctionText, user]);

  const corrections = useMemo(
    () => (selectedRecord ? getCorrectionsFor(selectedRecord.record_id) : []),
    [selectedRecord],
  );

  const fmtDate  = (iso: string) => { try { return format(new Date(iso), "yyyy-MM-dd HH:mm:ss"); } catch { return iso; } };
  const fmtShort = (iso: string) => { try { return format(new Date(iso), "MM-dd HH:mm"); } catch { return iso; } };
  const ifaceName = (id: string) => INTERFACES.find((i) => i.id === id)?.display_name || id;

  // KPI counts
  const typeCounts: Record<DataType, number> = {
    timeseries: allRecords.filter((r) => r.data_type === "timeseries").length,
    event:      allRecords.filter((r) => r.data_type === "event").length,
    file:       allRecords.filter((r) => r.data_type === "file").length,
    correction: allRecords.filter((r) => r.data_type === "correction").length,
  };
  const oorCount = allRecords.filter((r) => r.quality_flags.includes("out_of_range")).length;

  const severityCounts: Record<AlertSeverity, number> = {
    critical: alerts.filter((a) => a.severity === "critical").length,
    warning:  alerts.filter((a) => a.severity === "warning").length,
    info:     alerts.filter((a) => a.severity === "info").length,
  };

  const sortedAlerts = useMemo(() => {
    const order: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
    const list = severityFilter === "all" ? alerts : alerts.filter((a) => a.severity === severityFilter);
    return [...list].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [alerts, severityFilter]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 stack-page">
        {/* Header — h1 · subtitle · count chip inline */}
        <OverviewHeader
          title="Data Storage"
          description="Canonical ALCOA data ledger. Records are immutable — corrections create linked records."
          actions={
            <span className="inline-flex items-center px-2.5 h-7 rounded-md bg-secondary text-text-secondary text-[12px] font-mono tabular-nums">
              {filtered.length.toLocaleString()} records
            </span>
          }
        />

        {/* KPI strip — Summary card style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {(DATA_TYPES as readonly DataType[]).map((dt) => {
            const cfg = TYPE_ACCENT[dt];
            const isCorrectionZero = dt === "correction" && typeCounts[dt] === 0;
            return (
              <button
                key={dt}
                onClick={() => { setTypeFilter(dt); setPage(0); }}
                className={`text-left rounded-lg p-4 bg-secondary hover:bg-secondary/70 transition-colors`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[13px] font-normal text-text-secondary capitalize">{cfg.label}</p>
                  <cfg.Icon className={`h-4 w-4 shrink-0 ${isCorrectionZero ? "text-text-secondary" : cfg.tone}`} />
                </div>
                <p className={`tabular-nums leading-none mt-2 ${isCorrectionZero ? "text-[18px] text-text-secondary" : "text-kpi text-foreground"}`}>
                  {typeCounts[dt].toLocaleString()}
                </p>
              </button>
            );
          })}
          {/* Out of Range — amber tile */}
          <button
            onClick={() => { setFlagFilter("out_of_range"); setPage(0); }}
            className="text-left rounded-lg p-4 bg-amber-50 hover:bg-amber-100/70 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-normal text-text-secondary">Out of range</p>
              <AlertTriangle className="h-4 w-4 shrink-0 text-status-warning" />
            </div>
            <p className="text-kpi tabular-nums text-foreground leading-none mt-2">{oorCount}</p>
          </button>
          {/* Total */}
          <div className="rounded-lg p-4 bg-secondary">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[13px] font-normal text-text-secondary">Total records</p>
              <Activity className="h-4 w-4 shrink-0 text-primary" />
            </div>
            <p className="text-kpi tabular-nums text-foreground leading-none mt-2">{allRecords.length.toLocaleString()}</p>
          </div>
        </div>

        <Tabs defaultValue="records" className="stack-page">
          <TabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-3.5 w-3.5" /> Alerts
              <span className="inline-flex items-center gap-1 ml-1 text-[11px] font-medium tabular-nums">
                <span className="h-1.5 w-1.5 rounded-full bg-status-error" /> {severityCounts.critical}
                <span className="text-text-secondary mx-0.5">·</span>
                <span className="h-1.5 w-1.5 rounded-full bg-status-warning" /> {severityCounts.warning}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="stack-card">
            {/* ── Sticky filter bar ── */}
            <div className="sticky top-0 z-10 -mx-6 px-6 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b border-border-tertiary">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Filter className="h-4 w-4 text-text-secondary" />

                {/* Cluster 1: interface · type · run */}
                <div className="flex flex-wrap items-center gap-2">
                  <FilterDropdown
                    active={interfaceFilter !== "all"}
                    value={interfaceFilter}
                    onChange={(v) => { setInterfaceFilter(v); setPage(0); }}
                    placeholder="All Interfaces"
                    width={170}
                    options={[
                      { value: "all", label: "All Interfaces" },
                      ...interfaceIds.map((id) => ({ value: id, label: ifaceName(id) })),
                    ]}
                  />
                  <FilterDropdown
                    active={typeFilter !== "all"}
                    value={typeFilter}
                    onChange={(v) => { setTypeFilter(v); setPage(0); }}
                    placeholder="All Types"
                    width={140}
                    options={[
                      { value: "all", label: "All Types" },
                      ...DATA_TYPES.map((t) => ({ value: t, label: TYPE_ACCENT[t].label })),
                    ]}
                  />
                  <FilterDropdown
                    active={runFilter !== "all"}
                    value={runFilter}
                    onChange={(v) => { setRunFilter(v); setPage(0); }}
                    placeholder="All Runs"
                    width={140}
                    options={[
                      { value: "all", label: "All Runs" },
                      ...RUNS.map((r) => ({ value: r.run_id, label: r.bioreactor_run })),
                    ]}
                  />
                </div>

                {/* 16px gap between clusters */}
                <div className="w-4" aria-hidden />

                {/* Cluster 2: source · flags */}
                <div className="flex flex-wrap items-center gap-2">
                  <FilterDropdown
                    active={sourceFilter !== "all"}
                    value={sourceFilter}
                    onChange={(v) => { setSourceFilter(v); setPage(0); }}
                    placeholder="All Sources"
                    width={150}
                    options={[
                      { value: "all", label: "All Sources" },
                      ...entryModes.map((m) => ({ value: m, label: m.charAt(0).toUpperCase() + m.slice(1) })),
                    ]}
                  />
                  <FilterDropdown
                    active={flagFilter !== "all"}
                    value={flagFilter}
                    onChange={(v) => { setFlagFilter(v); setPage(0); }}
                    placeholder="All Flags"
                    width={170}
                    options={[
                      { value: "all", label: "All Flags" },
                      ...allFlags.map((f) => ({ value: f, label: f.replace(/_/g, " ") })),
                    ]}
                  />
                </div>

                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs gap-1 text-blue-600" onClick={clearFilters}>
                    <X className="h-3 w-3" /> Clear filters ({activeFilterCount})
                  </Button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="card-data overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] w-[120px]">Measured</TableHead>
                      <TableHead className="text-[11px] w-[120px]">Ingested</TableHead>
                      <TableHead className="text-[11px] w-[120px]">Interface</TableHead>
                      <TableHead className="text-[11px] w-[100px]">Type</TableHead>
                      <TableHead className="text-[11px]">Summary</TableHead>
                      <TableHead className="text-[11px] w-[150px]">Attributed To</TableHead>
                      <TableHead className="text-[11px] w-[80px]">Source</TableHead>
                      <TableHead className="text-[11px] w-[180px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageRecords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-text-secondary py-12">No records match filters</TableCell>
                      </TableRow>
                    ) : (
                      pageRecords.map((rec, idx) => {
                        const accent = TYPE_ACCENT[rec.data_type as DataType];
                        const AttrIcon = attributedIcon(rec.attributable_to);
                        const flag = rec.quality_flags[0];
                        const score = rec.completeness_score;
                        return (
                          <TableRow
                            key={rec.record_id}
                            className={`cursor-pointer hover:bg-muted/60 transition-colors border-l-[3px] ${accent.border} ${idx % 2 === 1 ? "bg-secondary/40" : ""}`}
                            onClick={() => { setSelectedRecord(rec); setShowCorrectionForm(false); setCorrectionText(""); }}
                          >
                            <TableCell className="text-[11px] font-mono">{fmtShort(rec.measured_at)}</TableCell>
                            <TableCell className="text-[11px] font-mono text-text-secondary">{fmtShort(rec.ingested_at)}</TableCell>
                            <TableCell className="text-[12px]">{ifaceName(rec.interface_id)}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${accent.tone}`}>
                                <accent.Icon className="h-3.5 w-3.5" /> {accent.label}
                              </span>
                            </TableCell>
                            <TableCell className="text-[12px] max-w-[280px] truncate">{rec.summary}</TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1.5 text-[12px]">
                                    <AttrIcon className="h-3.5 w-3.5 text-text-secondary" />
                                    <span className="font-mono">{rec.attributable_to}</span>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs">{attributedName(rec.attributable_to)}</TooltipContent>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Badge variant="neutral" className="text-[10px]">{rec.entry_mode}</Badge>
                            </TableCell>
                            <TableCell>
                              <StatusCell flag={flag} score={score} />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between text-xs text-text-secondary">
                <span>Page {page + 1} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Alerts Tab ── */}
          <TabsContent value="alerts" className="stack-card">
            {/* Severity filter chips */}
            <div className="flex items-center gap-2 flex-wrap">
              {(["all", "critical", "warning", "info"] as const).map((s) => {
                const isActive = severityFilter === s;
                const count = s === "all" ? alerts.length : severityCounts[s];
                const dot =
                  s === "critical" ? "bg-status-error" :
                  s === "warning"  ? "bg-status-warning" :
                  s === "info"     ? "bg-blue-500" : "";
                return (
                  <button
                    key={s}
                    onClick={() => setSeverityFilter(s)}
                    className={`inline-flex items-center gap-2 h-8 px-3 rounded-full border text-[12px] font-medium transition-colors capitalize
                      ${isActive
                        ? "bg-blue-50 border-blue-200 text-blue-600"
                        : "border-border-tertiary text-text-secondary hover:text-foreground hover:border-foreground/30"}`}
                  >
                    {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
                    {s} <span className="tabular-nums">{count}</span>
                  </button>
                );
              })}
            </div>

            {/* Alerts list */}
            {sortedAlerts.length === 0 ? (
              <div className="card-data p-8 text-center text-text-secondary">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-status-active" />
                <p className="text-sm font-medium">No alerts</p>
                <p className="text-xs">All data integrity checks passed.</p>
              </div>
            ) : (
              <div className="stack-section">
                {sortedAlerts.map((alert) => {
                  const sevBorder = alert.severity === "critical" ? "border-l-red-500"
                                 : alert.severity === "warning"  ? "border-l-amber-500"
                                 : "border-l-blue-500";
                  return (
                    <div key={alert.alert_id} className={`card-operational border-l-[3px] ${sevBorder} flex items-start gap-3 p-3`}>
                      <Badge
                        variant={alert.severity === "critical" ? "danger" : alert.severity === "warning" ? "warning" : "neutral"}
                        className="mt-0.5"
                      >
                        {alert.severity}
                      </Badge>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-[13px] font-medium">{alert.message}</p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-text-secondary">
                          <span className="font-mono">{alert.interface_id}</span>
                          {alert.linked_run_id && (
                            <span>· {RUNS.find((r) => r.run_id === alert.linked_run_id)?.bioreactor_run || alert.linked_run_id}</span>
                          )}
                          <span>· {alert.type.replace(/_/g, " ")}</span>
                          <span>· {alert.affected_record_ids.length} record(s)</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* ALCOA Detail Drawer */}
        <Sheet open={!!selectedRecord} onOpenChange={(open) => { if (!open) setSelectedRecord(null); }}>
          <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
            {selectedRecord && (
              <>
                <SheetHeader>
                  <SheetTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    ALCOA+ Record Detail
                  </SheetTitle>
                </SheetHeader>

                <div className="mt-4 space-y-4">
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-sm font-medium">{selectedRecord.summary}</p>
                    <p className="text-[11px] text-text-secondary mt-1 capitalize">{selectedRecord.data_type} record</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <Field icon={<Hash className="h-3 w-3" />}        label="Record ID"     value={selectedRecord.record_id} mono />
                    <Field icon={<Clock className="h-3 w-3" />}       label="Measured At"   value={fmtDate(selectedRecord.measured_at)} mono />
                    <Field icon={<Clock className="h-3 w-3" />}       label="Ingested At"   value={fmtDate(selectedRecord.ingested_at)} mono />
                    <Field icon={<Activity className="h-3 w-3" />}    label="Interface"     value={ifaceName(selectedRecord.interface_id)} />
                    <Field icon={<User className="h-3 w-3" />}        label="Attributed To" value={attributedName(selectedRecord.attributable_to)} />
                    <Field icon={<Tag className="h-3 w-3" />}         label="Entry Mode"    value={selectedRecord.entry_mode} />
                    <Field icon={<CheckCircle2 className="h-3 w-3" />} label="Completeness"  value={`${selectedRecord.completeness_score}%`} />
                    {selectedRecord.linked_run_id && (
                      <Field icon={<Activity className="h-3 w-3" />} label="Linked Run" value={RUNS.find((r) => r.run_id === selectedRecord.linked_run_id)?.bioreactor_run || selectedRecord.linked_run_id} />
                    )}
                  </div>

                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Data Integrity</p>
                    <Field icon={<FileText className="h-3 w-3" />}    label="Raw Reference"   value={selectedRecord.raw_ref} mono full />
                    <Field icon={<ShieldCheck className="h-3 w-3" />} label="Integrity Hash"  value={selectedRecord.hash} mono full />
                  </div>

                  <Separator />
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Quality Flags</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedRecord.quality_flags.map((f) => (
                        <span key={f} className={`px-2 py-1 rounded text-[10px] font-medium ${FLAG_PILL[f] || "bg-secondary text-text-secondary"}`}>
                          {f.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  </div>

                  {Object.keys(selectedRecord.labels).length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Labels</p>
                        <div className="grid grid-cols-2 gap-1">
                          {Object.entries(selectedRecord.labels).map(([k, v]) => (
                            <div key={k} className="text-[11px]">
                              <span className="text-text-secondary">{k}:</span>{" "}
                              <span className="font-mono">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {corrections.length > 0 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">Corrections ({corrections.length})</p>
                        {corrections.map((c) => (
                          <div key={c.record_id} className="rounded border p-2 text-[11px] space-y-1">
                            <p className="font-medium">{c.summary}</p>
                            <p className="text-text-secondary">By {c.attributable_to} · {fmtDate(c.ingested_at)}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {selectedRecord.corrects_record_id && (
                    <>
                      <Separator />
                      <div className="text-[11px]">
                        <span className="text-text-secondary">Corrects record:</span>{" "}
                        <span className="font-mono">{selectedRecord.corrects_record_id}</span>
                      </div>
                    </>
                  )}

                  <Separator />
                  {selectedRecord.data_type !== "correction" && isManager && (
                    <div className="space-y-2">
                      {!showCorrectionForm ? (
                        <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => setShowCorrectionForm(true)}>
                          <ClipboardEdit className="h-3.5 w-3.5" /> Add Correction
                        </Button>
                      ) : (
                        <>
                          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wide">New Correction</p>
                          <Textarea
                            value={correctionText}
                            onChange={(e) => setCorrectionText(e.target.value)}
                            placeholder="Corrected summary…"
                            className="text-xs min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" className="text-xs flex-1" disabled={!correctionText.trim()} onClick={handleCorrection}>
                              Submit Correction
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setShowCorrectionForm(false); setCorrectionText(""); }}>
                              Cancel
                            </Button>
                          </div>
                          <p className="text-[10px] text-text-secondary">Original record remains immutable. A new correction record will be created and linked.</p>
                        </>
                      )}
                    </div>
                  )}
                  {selectedRecord.data_type !== "correction" && !isManager && (
                    <p className="text-[10px] text-text-secondary italic">Only managers can add corrections.</p>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

// ── Status cell — replaces score + flags columns ──
function StatusCell({ flag, score }: { flag?: string; score: number }) {
  if (flag) {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${FLAG_PILL[flag] || "bg-secondary text-text-secondary"}`}>
        {flag.replace(/_/g, " ")}
      </span>
    );
  }
  if (score < 100) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-status-warning">
        <AlertTriangle className="h-3 w-3" /> {score}
      </span>
    );
  }
  return <CheckCircle2 className="h-3.5 w-3.5 text-status-active opacity-70" aria-label="Perfect record" />;
}

// ── Filter dropdown — active state shows blue label + 2px underline ──
function FilterDropdown({
  active, value, onChange, placeholder, width, options,
}: {
  active: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  width: number;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        style={{ width }}
        className={`h-8 text-xs transition-colors
          ${active ? "text-blue-600 border-b-2 border-b-blue-500 rounded-b-none" : ""}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs capitalize">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Field display ──
function Field({ icon, label, value, mono, full }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="flex items-center gap-1 text-text-secondary mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xs ${mono ? "font-mono" : ""} break-all`}>{value}</p>
    </div>
  );
}
