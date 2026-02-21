import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { Database, Filter, X, ShieldCheck, FileText, Activity, AlertTriangle, ClipboardEdit, Hash, Clock, User, Tag, CheckCircle2, Bell } from "lucide-react";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { getDataRecords, createCorrectionRecord, getCorrectionsFor } from "@/data/dataRecords";
import { INTERFACES, RUNS } from "@/data/runData";
import { getAlerts, type Alert, type AlertSeverity } from "@/data/alertsEngine";
import type { DataRecord, QualityFlag } from "@/data/runTypes";

// ── Constants ──

const DATA_TYPES = ["timeseries", "event", "file", "correction"] as const;

const FLAG_COLORS: Record<string, string> = {
  in_spec: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  out_of_range: "bg-destructive/15 text-destructive",
  missing_field: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  late_ingestion: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  manually_entered: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  corrected: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300",
  flagged_for_review: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  timeseries: <Activity className="h-3.5 w-3.5" />,
  event: <AlertTriangle className="h-3.5 w-3.5" />,
  file: <FileText className="h-3.5 w-3.5" />,
  correction: <ClipboardEdit className="h-3.5 w-3.5" />,
};

const PAGE_SIZE = 50;

const SEVERITY_COLORS: Record<AlertSeverity, string> = {
  critical: "bg-destructive/15 text-destructive",
  warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
};

// ── Component ──

export default function DataStoragePage() {
  const { isManager, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Filters
  const [interfaceFilter, setInterfaceFilter] = useState<string>(searchParams.get("interface") || "all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [runFilter, setRunFilter] = useState<string>("all");
  const [completenessFilter, setCompletenessFilter] = useState<string>("all");
  const [flagFilter, setFlagFilter] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState(0);

  // Drawer
  const [selectedRecord, setSelectedRecord] = useState<DataRecord | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);

  // Force re-render after correction
  const [, setTick] = useState(0);

  const allRecords = useMemo(() => getDataRecords(), []);
  const alerts = useMemo(() => getAlerts(), []);

  // Unique interface ids from records
  const interfaceIds = useMemo(() => {
    const s = new Set(allRecords.map((r) => r.interface_id));
    return Array.from(s).sort();
  }, [allRecords]);

  // Unique quality flags
  const allFlags = useMemo(() => {
    const s = new Set<string>();
    allRecords.forEach((r) => r.quality_flags.forEach((f) => s.add(f)));
    return Array.from(s).sort();
  }, [allRecords]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let recs = allRecords;

    if (interfaceFilter !== "all") recs = recs.filter((r) => r.interface_id === interfaceFilter);
    if (typeFilter !== "all") recs = recs.filter((r) => r.data_type === typeFilter);
    if (runFilter !== "all") recs = recs.filter((r) => r.linked_run_id === runFilter);
    if (completenessFilter === "complete") recs = recs.filter((r) => r.completeness_score === 100);
    if (completenessFilter === "incomplete") recs = recs.filter((r) => r.completeness_score < 100);
    if (flagFilter !== "all") recs = recs.filter((r) => r.quality_flags.includes(flagFilter as QualityFlag));

    // chronological descending
    return [...recs].sort((a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime());
  }, [allRecords, interfaceFilter, typeFilter, runFilter, completenessFilter, flagFilter]);

  const pageRecords = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const activeFilterCount = [interfaceFilter, typeFilter, runFilter, completenessFilter, flagFilter].filter((v) => v !== "all").length;

  const clearFilters = useCallback(() => {
    setInterfaceFilter("all");
    setTypeFilter("all");
    setRunFilter("all");
    setCompletenessFilter("all");
    setFlagFilter("all");
    setPage(0);
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

  const fmtDate = (iso: string) => {
    try { return format(new Date(iso), "yyyy-MM-dd HH:mm:ss"); } catch { return iso; }
  };
  const fmtShort = (iso: string) => {
    try { return format(new Date(iso), "MM-dd HH:mm"); } catch { return iso; }
  };

  const ifaceName = (id: string) => INTERFACES.find((i) => i.id === id)?.display_name || id;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Database className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Data Storage</h2>
        <InfoTooltip content="Canonical ALCOA data ledger. Records are immutable — corrections create linked records." />
        <span className="ml-auto text-xs text-muted-foreground font-mono">{filtered.length.toLocaleString()} records</span>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {DATA_TYPES.map((dt) => {
          const count = allRecords.filter((r) => r.data_type === dt).length;
          return (
            <Card key={dt} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => { setTypeFilter(dt); setPage(0); }}>
              <CardContent className="p-3 flex items-center gap-2">
                <span className="text-muted-foreground">{TYPE_ICONS[dt]}</span>
                <div>
                  <p className="text-lg font-bold leading-none">{count.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">{dt}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        <Card className="cursor-pointer hover:border-destructive/40 transition-colors" onClick={() => { setFlagFilter("out_of_range"); setPage(0); }}>
          <CardContent className="p-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
            <div>
              <p className="text-lg font-bold leading-none">{allRecords.filter((r) => r.quality_flags.includes("out_of_range")).length}</p>
              <p className="text-[10px] text-muted-foreground">Out of Range</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="alerts" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Alerts
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-[9px] px-1.5 py-0 ml-1 h-4">{alerts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />

        <Select value={interfaceFilter} onValueChange={(v) => { setInterfaceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Interface" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Interfaces</SelectItem>
            {interfaceIds.map((id) => (
              <SelectItem key={id} value={id} className="text-xs">{ifaceName(id)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Data Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {DATA_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs capitalize">{t}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={runFilter} onValueChange={(v) => { setRunFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Run" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Runs</SelectItem>
            {RUNS.map((r) => <SelectItem key={r.run_id} value={r.run_id} className="text-xs">{r.bioreactor_run}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={completenessFilter} onValueChange={(v) => { setCompletenessFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Completeness" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="complete">Complete (100)</SelectItem>
            <SelectItem value="incomplete">Incomplete (&lt;100)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={flagFilter} onValueChange={(v) => { setFlagFilter(v); setPage(0); }}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Quality Flag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Flags</SelectItem>
            {allFlags.map((f) => <SelectItem key={f} value={f} className="text-xs">{f.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={clearFilters}>
            <X className="h-3 w-3" /> Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[11px] w-[110px]">Measured</TableHead>
                <TableHead className="text-[11px] w-[110px]">Ingested</TableHead>
                <TableHead className="text-[11px] w-[100px]">Interface</TableHead>
                <TableHead className="text-[11px] w-[80px]">Type</TableHead>
                <TableHead className="text-[11px]">Summary</TableHead>
                <TableHead className="text-[11px] w-[90px]">Attributed To</TableHead>
                <TableHead className="text-[11px] w-[60px]">Mode</TableHead>
                <TableHead className="text-[11px] w-[40px]">Score</TableHead>
                <TableHead className="text-[11px]">Flags</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-12">No records match filters</TableCell>
                </TableRow>
              ) : (
                pageRecords.map((rec) => (
                  <TableRow
                    key={rec.record_id}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => { setSelectedRecord(rec); setShowCorrectionForm(false); setCorrectionText(""); }}
                  >
                    <TableCell className="text-[11px] font-mono">{fmtShort(rec.measured_at)}</TableCell>
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{fmtShort(rec.ingested_at)}</TableCell>
                    <TableCell className="text-[11px]">{ifaceName(rec.interface_id)}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-[11px] capitalize text-muted-foreground">
                        {TYPE_ICONS[rec.data_type]} {rec.data_type}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs max-w-[260px] truncate">{rec.summary}</TableCell>
                    <TableCell className="text-[11px]">{rec.attributable_to}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] font-normal">{rec.entry_mode}</Badge>
                    </TableCell>
                    <TableCell className="text-[11px] font-mono text-center">{rec.completeness_score}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {rec.quality_flags.map((f) => (
                          <span key={f} className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${FLAG_COLORS[f] || "bg-muted text-muted-foreground"}`}>
                            {f.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Page {page + 1} of {totalPages}</span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
        </TabsContent>

        {/* ── Alerts Tab ── */}
        <TabsContent value="alerts" className="space-y-4">
          {/* Severity summary */}
          <div className="grid grid-cols-3 gap-3">
            {(["critical", "warning", "info"] as AlertSeverity[]).map((sev) => {
              const count = alerts.filter((a) => a.severity === sev).length;
              return (
                <Card key={sev}>
                  <CardContent className="p-3 flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${sev === "critical" ? "text-destructive" : sev === "warning" ? "text-amber-500" : "text-blue-500"}`} />
                    <div>
                      <p className="text-lg font-bold leading-none">{count}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{sev}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Alerts list */}
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No alerts</p>
                <p className="text-xs">All data integrity checks passed.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <Card key={alert.alert_id} className="overflow-hidden">
                  <CardContent className="p-3 flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${SEVERITY_COLORS[alert.severity]}`}>
                      {alert.severity}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs font-medium">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="font-mono">{alert.interface_id}</span>
                        {alert.linked_run_id && (
                          <span>· {RUNS.find((r) => r.run_id === alert.linked_run_id)?.bioreactor_run || alert.linked_run_id}</span>
                        )}
                        <span>· {alert.type.replace(/_/g, " ")}</span>
                        <span>· {alert.affected_record_ids.length} record(s)</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
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
                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{selectedRecord.summary}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 capitalize">{selectedRecord.data_type} record</p>
                </div>

                {/* Core fields */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <Field icon={<Hash className="h-3 w-3" />} label="Record ID" value={selectedRecord.record_id} mono />
                  <Field icon={<Clock className="h-3 w-3" />} label="Measured At" value={fmtDate(selectedRecord.measured_at)} mono />
                  <Field icon={<Clock className="h-3 w-3" />} label="Ingested At" value={fmtDate(selectedRecord.ingested_at)} mono />
                  <Field icon={<Activity className="h-3 w-3" />} label="Interface" value={ifaceName(selectedRecord.interface_id)} />
                  <Field icon={<User className="h-3 w-3" />} label="Attributed To" value={selectedRecord.attributable_to} />
                  <Field icon={<Tag className="h-3 w-3" />} label="Entry Mode" value={selectedRecord.entry_mode} />
                  <Field icon={<CheckCircle2 className="h-3 w-3" />} label="Completeness" value={`${selectedRecord.completeness_score}%`} />
                  {selectedRecord.linked_run_id && (
                    <Field icon={<Activity className="h-3 w-3" />} label="Linked Run" value={RUNS.find((r) => r.run_id === selectedRecord.linked_run_id)?.bioreactor_run || selectedRecord.linked_run_id} />
                  )}
                </div>

                <Separator />

                {/* Integrity */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Data Integrity</p>
                  <Field icon={<FileText className="h-3 w-3" />} label="Raw Reference" value={selectedRecord.raw_ref} mono full />
                  <Field icon={<ShieldCheck className="h-3 w-3" />} label="Integrity Hash" value={selectedRecord.hash} mono full />
                </div>

                <Separator />

                {/* Quality Flags */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Quality Flags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRecord.quality_flags.map((f) => (
                      <span key={f} className={`px-2 py-1 rounded text-[10px] font-medium ${FLAG_COLORS[f] || "bg-muted text-muted-foreground"}`}>
                        {f.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Labels */}
                {Object.keys(selectedRecord.labels).length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Labels</p>
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(selectedRecord.labels).map(([k, v]) => (
                          <div key={k} className="text-[11px]">
                            <span className="text-muted-foreground">{k}:</span>{" "}
                            <span className="font-mono">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Corrections chain */}
                {corrections.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Corrections ({corrections.length})</p>
                      {corrections.map((c) => (
                        <div key={c.record_id} className="rounded border p-2 text-[11px] space-y-1">
                          <p className="font-medium">{c.summary}</p>
                          <p className="text-muted-foreground">By {c.attributable_to} · {fmtDate(c.ingested_at)}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Corrects link */}
                {selectedRecord.corrects_record_id && (
                  <>
                    <Separator />
                    <div className="text-[11px]">
                      <span className="text-muted-foreground">Corrects record:</span>{" "}
                      <span className="font-mono">{selectedRecord.corrects_record_id}</span>
                    </div>
                  </>
                )}

                <Separator />

                {/* Add Correction (Manager only) */}
                {selectedRecord.data_type !== "correction" && isManager && (
                  <div className="space-y-2">
                    {!showCorrectionForm ? (
                      <Button variant="outline" size="sm" className="w-full text-xs gap-1.5" onClick={() => setShowCorrectionForm(true)}>
                        <ClipboardEdit className="h-3.5 w-3.5" /> Add Correction
                      </Button>
                    ) : (
                      <>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">New Correction</p>
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
                        <p className="text-[10px] text-muted-foreground">Original record remains immutable. A new correction record will be created and linked.</p>
                      </>
                    )}
                  </div>
                )}

                {selectedRecord.data_type !== "correction" && !isManager && (
                  <p className="text-[10px] text-muted-foreground italic">Only managers can add corrections.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Small field display ──

function Field({ icon, label, value, mono, full }: { icon: React.ReactNode; label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="flex items-center gap-1 text-muted-foreground mb-0.5">
        {icon}
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-xs ${mono ? "font-mono" : ""} break-all`}>{value}</p>
    </div>
  );
}
