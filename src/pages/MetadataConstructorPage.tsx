import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  Construction, Tag, CheckCircle2, AlertTriangle, Filter, X,
  ChevronRight, FileText, Activity, ClipboardEdit, Layers,
} from "lucide-react";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { getDataRecords } from "@/data/dataRecords";
import { INTERFACES, RUNS } from "@/data/runData";
import {
  LABEL_TEMPLATES,
  computeCompleteness,
  applyLabels,
  bulkApplyLabels,
  getTemplateForRecord,
  type LabelTemplate,
  type CompletenessResult,
} from "@/data/labelTemplates";
import type { DataRecord } from "@/data/runTypes";

const PAGE_SIZE = 40;

const TYPE_ICONS: Record<string, React.ReactNode> = {
  timeseries: <Activity className="h-3.5 w-3.5" />,
  event: <AlertTriangle className="h-3.5 w-3.5" />,
  file: <FileText className="h-3.5 w-3.5" />,
  correction: <ClipboardEdit className="h-3.5 w-3.5" />,
};

export default function MetadataConstructorPage() {
  const { toast } = useToast();
  const [, setTick] = useState(0);

  // Filters for labeling tab
  const [interfaceFilter, setInterfaceFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [completenessFilter, setCompletenessFilter] = useState("all");
  const [page, setPage] = useState(0);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Bulk label form
  const [bulkLabels, setBulkLabels] = useState<Record<string, string>>({});

  // Detail drawer
  const [detailRecord, setDetailRecord] = useState<DataRecord | null>(null);
  const [singleLabels, setSingleLabels] = useState<Record<string, string>>({});

  const allRecords = useMemo(() => getDataRecords(), []);

  const interfaceIds = useMemo(() => {
    const s = new Set(allRecords.map((r) => r.interface_id));
    return Array.from(s).sort();
  }, [allRecords]);

  // Compute completeness for all records
  const recordsWithCompleteness = useMemo(() => {
    return allRecords.map((r) => ({ record: r, completeness: computeCompleteness(r) }));
  }, [allRecords]);

  // Stats
  const stats = useMemo(() => {
    const complete = recordsWithCompleteness.filter((r) => r.completeness.score === 100).length;
    const incomplete = recordsWithCompleteness.filter((r) => r.completeness.score < 100).length;
    const noTemplate = recordsWithCompleteness.filter((r) => !r.completeness.template).length;
    return { complete, incomplete, noTemplate, total: allRecords.length };
  }, [recordsWithCompleteness, allRecords]);

  // Filtered records
  const filtered = useMemo(() => {
    let recs = recordsWithCompleteness;
    if (interfaceFilter !== "all") recs = recs.filter((r) => r.record.interface_id === interfaceFilter);
    if (typeFilter !== "all") recs = recs.filter((r) => r.record.data_type === typeFilter);
    if (completenessFilter === "complete") recs = recs.filter((r) => r.completeness.score === 100);
    if (completenessFilter === "incomplete") recs = recs.filter((r) => r.completeness.score < 100);
    return recs;
  }, [recordsWithCompleteness, interfaceFilter, typeFilter, completenessFilter]);

  const pageRecords = useMemo(() => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [filtered, page]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const ifaceName = (id: string) => INTERFACES.find((i) => i.id === id)?.display_name || id;
  const fmtShort = (iso: string) => { try { return format(new Date(iso), "MM-dd HH:mm"); } catch { return iso; } };

  // Selection helpers
  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selected.size === pageRecords.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pageRecords.map((r) => r.record.record_id)));
    }
  }, [pageRecords, selected]);

  // Collect union of fields needed by selected records
  const selectedTemplateFields = useMemo(() => {
    const required = new Set<string>();
    const optional = new Set<string>();
    for (const id of selected) {
      const rec = allRecords.find((r) => r.record_id === id);
      if (!rec) continue;
      const tpl = getTemplateForRecord(rec);
      if (!tpl) continue;
      tpl.required_fields.forEach((f) => required.add(f));
      tpl.optional_fields.forEach((f) => optional.add(f));
    }
    return { required: Array.from(required), optional: Array.from(optional) };
  }, [selected, allRecords]);

  // Bulk apply
  const handleBulkApply = useCallback(() => {
    const recs = allRecords.filter((r) => selected.has(r.record_id));
    const nonEmpty = Object.fromEntries(Object.entries(bulkLabels).filter(([, v]) => v.trim()));
    if (Object.keys(nonEmpty).length === 0) return;
    const count = bulkApplyLabels(recs, nonEmpty);
    toast({ title: "Labels applied", description: `Updated ${count} records.` });
    setBulkLabels({});
    setSelected(new Set());
    setTick((t) => t + 1);
  }, [allRecords, selected, bulkLabels, toast]);

  // Single record label apply
  const handleSingleApply = useCallback(() => {
    if (!detailRecord) return;
    const nonEmpty = Object.fromEntries(Object.entries(singleLabels).filter(([, v]) => v.trim()));
    applyLabels(detailRecord, nonEmpty);
    toast({ title: "Labels updated", description: `Record ${detailRecord.record_id} updated.` });
    setSingleLabels({});
    setTick((t) => t + 1);
  }, [detailRecord, singleLabels, toast]);

  // Open detail
  const openDetail = useCallback((rec: DataRecord) => {
    setDetailRecord(rec);
    setSingleLabels({});
  }, []);

  const detailCompleteness = useMemo(
    () => (detailRecord ? computeCompleteness(detailRecord) : null),
    [detailRecord],
  );

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Construction className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Metadata Constructor</h2>
        <InfoTooltip content="Define label templates, apply metadata to records, and track completeness scores." />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini icon={<Layers className="h-4 w-4" />} label="Total Records" value={stats.total} />
        <KpiMini icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />} label="Complete" value={stats.complete} onClick={() => { setCompletenessFilter("complete"); setPage(0); }} />
        <KpiMini icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Incomplete" value={stats.incomplete} onClick={() => { setCompletenessFilter("incomplete"); setPage(0); }} />
        <KpiMini icon={<Tag className="h-4 w-4 text-muted-foreground" />} label="Templates" value={LABEL_TEMPLATES.length} />
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Label Templates</TabsTrigger>
          <TabsTrigger value="labeling">Bulk Labeling</TabsTrigger>
        </TabsList>

        {/* ─── Templates Tab ─── */}
        <TabsContent value="templates" className="space-y-4">
          {LABEL_TEMPLATES.map((tpl) => (
            <TemplateCard key={tpl.template_id} template={tpl} />
          ))}
        </TabsContent>

        {/* ─── Labeling Tab ─── */}
        <TabsContent value="labeling" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={interfaceFilter} onValueChange={(v) => { setInterfaceFilter(v); setPage(0); setSelected(new Set()); }}>
              <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Interface" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Interfaces</SelectItem>
                {interfaceIds.map((id) => <SelectItem key={id} value={id} className="text-xs">{ifaceName(id)}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); setSelected(new Set()); }}>
              <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="timeseries">Timeseries</SelectItem>
                <SelectItem value="event">Event</SelectItem>
                <SelectItem value="file">File</SelectItem>
                <SelectItem value="correction">Correction</SelectItem>
              </SelectContent>
            </Select>
            <Select value={completenessFilter} onValueChange={(v) => { setCompletenessFilter(v); setPage(0); setSelected(new Set()); }}>
              <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue placeholder="Completeness" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="complete">Complete (100)</SelectItem>
                <SelectItem value="incomplete">Incomplete</SelectItem>
              </SelectContent>
            </Select>
            {(interfaceFilter !== "all" || typeFilter !== "all" || completenessFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setInterfaceFilter("all"); setTypeFilter("all"); setCompletenessFilter("all"); setPage(0); setSelected(new Set()); }}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">{filtered.length} records · {selected.size} selected</span>
          </div>

          {/* Bulk label panel */}
          {selected.size > 0 && selectedTemplateFields.required.length + selectedTemplateFields.optional.length > 0 && (
            <Card className="border-primary/30">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bulk Apply Labels to {selected.size} records</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[...selectedTemplateFields.required, ...selectedTemplateFields.optional].map((field) => (
                    <div key={field}>
                      <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                        {field}
                        {selectedTemplateFields.required.includes(field) && <span className="text-destructive">*</span>}
                      </Label>
                      <Input
                        className="h-7 text-xs mt-0.5"
                        placeholder={field}
                        value={bulkLabels[field] || ""}
                        onChange={(e) => setBulkLabels((prev) => ({ ...prev, [field]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
                <Button size="sm" className="text-xs" onClick={handleBulkApply}
                  disabled={Object.values(bulkLabels).every((v) => !v.trim())}>
                  Apply Labels
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Records table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox checked={selected.size === pageRecords.length && pageRecords.length > 0} onCheckedChange={toggleAll} />
                    </TableHead>
                    <TableHead className="text-[11px]">Measured</TableHead>
                    <TableHead className="text-[11px]">Interface</TableHead>
                    <TableHead className="text-[11px]">Type</TableHead>
                    <TableHead className="text-[11px]">Summary</TableHead>
                    <TableHead className="text-[11px] w-[60px]">Score</TableHead>
                    <TableHead className="text-[11px]">Missing Fields</TableHead>
                    <TableHead className="text-[11px] w-[30px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRecords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12">No records match filters</TableCell>
                    </TableRow>
                  ) : (
                    pageRecords.map(({ record, completeness }) => (
                      <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <Checkbox checked={selected.has(record.record_id)} onCheckedChange={() => toggleSelect(record.record_id)} />
                        </TableCell>
                        <TableCell className="text-[11px] font-mono">{fmtShort(record.measured_at)}</TableCell>
                        <TableCell className="text-[11px]">{ifaceName(record.interface_id)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 text-[11px] capitalize text-muted-foreground">
                            {TYPE_ICONS[record.data_type]} {record.data_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs max-w-[200px] truncate">{record.summary}</TableCell>
                        <TableCell>
                          <ScoreBadge score={completeness.score} />
                        </TableCell>
                        <TableCell>
                          {completeness.missing.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {completeness.missing.map((f) => (
                                <span key={f} className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                                  {f}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => openDetail(record)}>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
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
      </Tabs>

      {/* Detail Drawer */}
      <Sheet open={!!detailRecord} onOpenChange={(open) => { if (!open) setDetailRecord(null); }}>
        <SheetContent className="w-[420px] sm:w-[480px] overflow-y-auto">
          {detailRecord && detailCompleteness && (
            <>
              <SheetHeader>
                <SheetTitle className="text-sm flex items-center gap-2">
                  <Tag className="h-4 w-4 text-primary" />
                  Record Labels
                </SheetTitle>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                {/* Summary */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-medium">{detailRecord.summary}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{detailRecord.record_id}</p>
                </div>

                {/* Completeness */}
                <div className="flex items-center gap-3">
                  <ScoreBadge score={detailCompleteness.score} large />
                  <div>
                    <p className="text-xs font-medium">
                      {detailCompleteness.score === 100 ? "All required fields present" : `${detailCompleteness.missing.length} required field(s) missing`}
                    </p>
                    {detailCompleteness.template && (
                      <p className="text-[10px] text-muted-foreground">Template: {detailCompleteness.template.name}</p>
                    )}
                  </div>
                </div>

                {/* Missing fields warning */}
                {detailCompleteness.missing.length > 0 && (
                  <div className="rounded border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-3">
                    <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 mb-1">Missing Required Fields</p>
                    <div className="flex flex-wrap gap-1.5">
                      {detailCompleteness.missing.map((f) => (
                        <Badge key={f} variant="outline" className="text-[10px] border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-300">{f}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Current labels */}
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Current Labels</p>
                  {Object.keys(detailRecord.labels).length > 0 ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      {Object.entries(detailRecord.labels).map(([k, v]) => (
                        <div key={k} className="text-[11px] bg-muted/50 rounded px-2 py-1">
                          <span className="text-muted-foreground">{k}:</span>{" "}
                          <span className="font-mono">{v}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground italic">No labels set</p>
                  )}
                </div>

                <Separator />

                {/* Add/edit labels */}
                {detailCompleteness.template && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Add / Update Labels</p>
                    {[...detailCompleteness.template.required_fields, ...detailCompleteness.template.optional_fields].map((field) => {
                      const isRequired = detailCompleteness.template!.required_fields.includes(field);
                      const current = detailRecord.labels[field];
                      return (
                        <div key={field}>
                          <Label className="text-[10px] uppercase text-muted-foreground flex items-center gap-1">
                            {field}
                            {isRequired && <span className="text-destructive">*</span>}
                            {current && <span className="text-emerald-500 ml-1">✓</span>}
                          </Label>
                          <Input
                            className="h-7 text-xs mt-0.5"
                            placeholder={current || field}
                            value={singleLabels[field] || ""}
                            onChange={(e) => setSingleLabels((prev) => ({ ...prev, [field]: e.target.value }))}
                          />
                        </div>
                      );
                    })}
                    <Button size="sm" className="text-xs w-full" onClick={handleSingleApply}
                      disabled={Object.values(singleLabels).every((v) => !v.trim())}>
                      Apply Labels
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Sub-components ──

function TemplateCard({ template }: { template: LabelTemplate }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          {template.name}
          <Badge variant="outline" className="text-[10px] font-normal ml-auto">{template.template_id}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-[11px] text-muted-foreground">
          Applies to: <span className="font-mono">{template.applies_to.interface_id}</span> / <span className="capitalize">{template.applies_to.data_type}</span>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Required Fields</p>
          <div className="flex flex-wrap gap-1.5">
            {template.required_fields.length > 0 ? template.required_fields.map((f) => (
              <Badge key={f} variant="default" className="text-[10px]">{f}</Badge>
            )) : <span className="text-[11px] text-muted-foreground italic">None</span>}
          </div>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Optional Fields</p>
          <div className="flex flex-wrap gap-1.5">
            {template.optional_fields.length > 0 ? template.optional_fields.map((f) => (
              <Badge key={f} variant="outline" className="text-[10px]">{f}</Badge>
            )) : <span className="text-[11px] text-muted-foreground italic">None</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score, large }: { score: number; large?: boolean }) {
  const cls = score === 100
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : score >= 50
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-destructive/15 text-destructive";
  return (
    <span className={`inline-flex items-center justify-center rounded font-mono font-bold ${cls} ${large ? "px-3 py-1.5 text-sm" : "px-1.5 py-0.5 text-[10px]"}`}>
      {score}%
    </span>
  );
}

function KpiMini({ icon, label, value, onClick }: { icon: React.ReactNode; label: string; value: number; onClick?: () => void }) {
  return (
    <Card className={onClick ? "cursor-pointer hover:border-primary/40 transition-colors" : ""} onClick={onClick}>
      <CardContent className="p-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <div>
          <p className="text-lg font-bold leading-none">{value.toLocaleString()}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
