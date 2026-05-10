import { useMemo, useState } from "react";
import {
  Waves, Triangle, ClipboardEdit, RotateCcw, Eye, AlertTriangle, CheckCircle2,
  CornerDownRight, FlaskConical, Filter as FilterIcon, Droplets, FileText,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

/* =========================================================================
   Synthetic campaign ledger
   ========================================================================= */

type RecordType = "timeseries" | "event" | "qc" | "correction";
type Status = "in_range" | "pass" | "oos" | "info" | "complete";
type Instrument = "BR-003-p" | "CFG-003" | "UF-03";

interface CampaignRecord {
  id: string;
  type: RecordType;
  instrument: Instrument;
  parameter: string;
  timestamp: string; // ISO or labelled
  displayTime: string; // "2025-03-11 12:00" or "Day 4 · 08:00"
  value: string;
  status: Status;
  operator: string;
  sop?: string;
  campaignBatchTag: string;
  notes?: string;
  // Correction linkage
  correctsId?: string; // for type === "correction"
  superseded?: boolean; // original after correction
}

const INSTRUMENT_BATCH: Record<Instrument, string> = {
  "BR-003-p": "CHO-r-hFSG-456-250308-2",
  "CFG-003": "FSH-B042-24",
  "UF-03": "FSH-2025-042",
};

const RECORDS: CampaignRecord[] = [
  // ── Timeseries (3) ──
  {
    id: "REC-TS-0001",
    type: "timeseries",
    instrument: "BR-003-p",
    parameter: "Temperature",
    timestamp: "2025-03-11T12:00:00Z",
    displayTime: "2025-03-11 12:00",
    value: "33.1 °C",
    status: "in_range",
    operator: "Auto-pull · Sensor",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
    notes: "Within Phase 4 band 32.5–33.5 °C",
  },
  {
    id: "REC-TS-0002",
    type: "timeseries",
    instrument: "BR-003-p",
    parameter: "DO",
    timestamp: "2025-03-11T12:00:00Z",
    displayTime: "2025-03-11 12:00",
    value: "38 %",
    status: "in_range",
    operator: "Auto-pull · Sensor",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
    notes: "Above 30 % setpoint floor",
  },
  {
    id: "REC-TS-0003",
    type: "timeseries",
    instrument: "UF-03",
    parameter: "Conductivity",
    timestamp: "2025-05-04T11:30:00Z",
    displayTime: "2025-05-04 11:30",
    value: "0.8 mS/cm",
    status: "in_range",
    operator: "Auto-pull · Sensor",
    campaignBatchTag: INSTRUMENT_BATCH["UF-03"],
    notes: "Diafiltration buffer exchange progressing",
  },

  // ── Events (6) ──
  {
    id: "REC-EVT-0101",
    type: "event",
    instrument: "BR-003-p",
    parameter: "Temperature Shift",
    timestamp: "2025-03-11T14:00:00Z",
    displayTime: "Day 3 · 14:00",
    value: "37 °C → 33 °C",
    status: "info",
    operator: "20-456",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-EVT-0102",
    type: "event",
    instrument: "BR-003-p",
    parameter: "Additive Addition",
    timestamp: "2025-03-11T14:05:00Z",
    displayTime: "Day 3 · 14:05",
    value: "Sodium Butyrate 2 mM",
    status: "info",
    operator: "20-456",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-EVT-0103",
    type: "event",
    instrument: "BR-003-p",
    parameter: "Feed Media Addition",
    timestamp: "2025-03-12T08:00:00Z",
    displayTime: "Day 4 · 08:00",
    value: "50 mL EfficientFeed C+ 2X",
    status: "info",
    operator: "20-456",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-EVT-0104",
    type: "event",
    instrument: "BR-003-p",
    parameter: "Additive Addition",
    timestamp: "2025-03-13T09:00:00Z",
    displayTime: "Day 5 · 09:00",
    value: "Z-VAD-fmk 20 µM",
    status: "info",
    operator: "20-456",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-EVT-0105",
    type: "event",
    instrument: "BR-003-p",
    parameter: "Harvest",
    timestamp: "2025-03-22T08:00:00Z",
    displayTime: "Day 14 · 08:00",
    value: "1.225 L",
    status: "complete",
    operator: "20-456",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-EVT-0106",
    type: "event",
    instrument: "CFG-003",
    parameter: "Cycle Complete",
    timestamp: "2024-11-22T10:30:00Z",
    displayTime: "2024-11-22 10:30",
    value: "Run FSH-B042-24-C1",
    status: "complete",
    operator: "J. Smith",
    campaignBatchTag: INSTRUMENT_BATCH["CFG-003"],
  },

  // ── QC results (3) ──
  {
    id: "REC-QC-0201",
    type: "qc",
    instrument: "BR-003-p",
    parameter: "Titer",
    timestamp: "2025-03-23T09:00:00Z",
    displayTime: "2025-03-23 09:00",
    value: "3.2 g/L",
    status: "pass",
    operator: "QC Lab · 30-118",
    sop: "SOP-AN-001",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-QC-0202",
    type: "qc",
    instrument: "BR-003-p",
    parameter: "HMW Aggregates",
    timestamp: "2025-03-23T09:00:00Z",
    displayTime: "2025-03-23 09:00",
    value: "0.5 %",
    status: "pass",
    operator: "QC Lab · 30-118",
    sop: "SOP-AN-101",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
  },
  {
    id: "REC-QC-0203",
    type: "qc",
    instrument: "BR-003-p",
    parameter: "Glycation",
    timestamp: "2025-03-23T09:00:00Z",
    displayTime: "2025-03-23 09:00",
    value: "0.03",
    status: "oos",
    operator: "QC Lab · 30-118",
    sop: "SOP-AN-303",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
    superseded: false,
  },

  // ── Correction (linked to REC-QC-0203) ──
  {
    id: "REC-CORR-0204",
    type: "correction",
    instrument: "BR-003-p",
    parameter: "Glycation — Investigation",
    timestamp: "2025-03-23T11:30:00Z",
    displayTime: "2025-03-23 11:30",
    value: "Investigation note appended",
    status: "info",
    operator: "Supervisor 10-032",
    sop: "SOP-AN-303",
    campaignBatchTag: INSTRUMENT_BATCH["BR-003-p"],
    notes:
      "OOS under investigation. Root cause: potential media glucose excess driving glycation. Harvest time review initiated.",
    correctsId: "REC-QC-0203",
  },
];

/* =========================================================================
   Type & status tokens
   ========================================================================= */

const TYPE_META: Record<RecordType, { label: string; tone: string; Icon: React.ComponentType<{ className?: string }>; border: string }> = {
  timeseries: { label: "Timeseries", tone: "text-teal-600", Icon: Waves, border: "border-l-teal-500" },
  event:      { label: "Event",      tone: "text-amber-600", Icon: Triangle, border: "border-l-amber-500" },
  qc:         { label: "QC Result",  tone: "text-violet-600", Icon: ClipboardEdit, border: "border-l-violet-500" },
  correction: { label: "Correction", tone: "text-red-600", Icon: RotateCcw, border: "border-l-red-500" },
};

const INSTRUMENT_ICON: Record<Instrument, React.ComponentType<{ className?: string }>> = {
  "BR-003-p": FlaskConical,
  "CFG-003": FilterIcon,
  "UF-03": Droplets,
};

function StatusBadge({ status }: { status: Status }) {
  switch (status) {
    case "in_range":
    case "pass":
    case "complete":
      return (
        <Badge variant="success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status === "in_range" ? "Within range" : status === "pass" ? "PASS" : "Complete"}
        </Badge>
      );
    case "oos":
      return (
        <Badge variant="danger">
          <AlertTriangle className="h-3 w-3 mr-1" />
          OOS
        </Badge>
      );
    case "info":
    default:
      return <Badge variant="neutral">Logged</Badge>;
  }
}

/* =========================================================================
   Evidence drawer
   ========================================================================= */

function EvidenceDrawer({
  record, onOpenChange,
}: { record: CampaignRecord | null; onOpenChange: (o: boolean) => void }) {
  return (
    <Sheet open={!!record} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <SheetTitle className="text-[15px]">Record Evidence</SheetTitle>
          </div>
          <SheetDescription className="text-[12px]">
            Immutable ledger entry. Corrections create linked records, never overwrite.
          </SheetDescription>
        </SheetHeader>

        {record && (
          <div className="mt-5 space-y-4">
            <div className="rounded-md border border-border-tertiary p-3">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="neutral" className="font-mono">{record.id}</Badge>
                <span className={cn("inline-flex items-center gap-1 text-[12px] font-medium", TYPE_META[record.type].tone)}>
                  {(() => {
                    const I = TYPE_META[record.type].Icon;
                    return <I className="h-3.5 w-3.5" />;
                  })()}
                  {TYPE_META[record.type].label}
                </span>
                <span className="ml-auto"><StatusBadge status={record.status} /></span>
              </div>
              <dl className="grid grid-cols-[120px_1fr] gap-y-1.5 text-[12px]">
                <dt className="text-text-secondary">Instrument</dt>
                <dd className="font-mono text-foreground">{record.instrument}</dd>
                <dt className="text-text-secondary">Parameter</dt>
                <dd className="text-foreground">{record.parameter}</dd>
                <dt className="text-text-secondary">Timestamp</dt>
                <dd className="font-mono text-foreground">{record.displayTime}</dd>
                <dt className="text-text-secondary">Value</dt>
                <dd className="text-foreground">{record.value}</dd>
                <dt className="text-text-secondary">Operator</dt>
                <dd className="text-foreground">{record.operator}</dd>
                {record.sop && (
                  <>
                    <dt className="text-text-secondary">SOP</dt>
                    <dd className="font-mono text-foreground">{record.sop}</dd>
                  </>
                )}
                <dt className="text-text-secondary">Batch Tag</dt>
                <dd className="font-mono text-foreground">{record.campaignBatchTag}</dd>
                <dt className="text-text-secondary">Campaign</dt>
                <dd className="font-mono text-foreground">FSH-Campaign-042</dd>
              </dl>
              {record.notes && (
                <div className="mt-3 pt-3 border-t border-border-tertiary text-[12px] text-foreground">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">
                    Note
                  </div>
                  {record.notes}
                </div>
              )}
              {record.correctsId && (
                <div className="mt-3 pt-3 border-t border-border-tertiary text-[12px]">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary mb-1">
                    Corrects
                  </div>
                  <span className="font-mono text-foreground">{record.correctsId}</span>
                </div>
              )}
            </div>

            <div className="text-[11px] text-text-secondary">
              ALCOA+ ledger: original entries are preserved verbatim. Annotations are appended as
              new immutable correction records linked to the original Record ID.
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* =========================================================================
   Public panel
   ========================================================================= */

const CAMPAIGNS = [
  { id: "FSH-Campaign-042", label: "FSH-Campaign-042 (rhFSH)" },
  { id: "ALL", label: "All campaigns" },
];

export function CampaignLedgerPanel() {
  const [campaign, setCampaign] = useState("FSH-Campaign-042");
  const [open, setOpen] = useState<CampaignRecord | null>(null);

  // Build display order: keep originals followed by their corrections
  const ordered = useMemo(() => {
    const list = campaign === "ALL" ? RECORDS : RECORDS;
    // Group by base id (original or correctsId)
    const corrections = list.filter((r) => r.type === "correction");
    const originals = list.filter((r) => r.type !== "correction");
    const result: CampaignRecord[] = [];
    for (const o of originals) {
      result.push(o);
      const linked = corrections.filter((c) => c.correctsId === o.id);
      result.push(...linked);
    }
    // Append any orphaned corrections last
    for (const c of corrections) {
      if (!result.includes(c)) result.push(c);
    }
    return result;
  }, [campaign]);

  const counts = useMemo(() => ({
    total: RECORDS.length,
    timeseries: RECORDS.filter((r) => r.type === "timeseries").length,
    event: RECORDS.filter((r) => r.type === "event").length,
    qc: RECORDS.filter((r) => r.type === "qc").length,
    correction: RECORDS.filter((r) => r.type === "correction").length,
    oos: RECORDS.filter((r) => r.status === "oos").length,
  }), []);

  return (
    <Card kind="operational" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border-tertiary flex items-center gap-3 flex-wrap">
        <div>
          <h3 className="text-section text-foreground">Campaign Ledger</h3>
          <p className="text-[12px] text-text-secondary">
            Immutable records for the selected campaign · sourced across BR-003-p, CFG-003, UF-03
          </p>
        </div>
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <Badge variant="neutral">{counts.total} records</Badge>
          <Badge variant="neutral">{counts.timeseries} TS</Badge>
          <Badge variant="neutral">{counts.event} events</Badge>
          <Badge variant="neutral">{counts.qc} QC</Badge>
          {counts.oos > 0 && <Badge variant="danger">{counts.oos} OOS</Badge>}
          <Badge variant="neutral">{counts.correction} corrections</Badge>
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              Campaign
            </span>
            <Select value={campaign} onValueChange={setCampaign}>
              <SelectTrigger className="h-8 w-[260px] text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGNS.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[12px]">{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px] text-[11px]">Record ID</TableHead>
              <TableHead className="w-[120px] text-[11px]">Type</TableHead>
              <TableHead className="w-[120px] text-[11px]">Instrument</TableHead>
              <TableHead className="w-[200px] text-[11px]">Parameter</TableHead>
              <TableHead className="w-[150px] text-[11px]">Timestamp</TableHead>
              <TableHead className="text-[11px]">Value</TableHead>
              <TableHead className="w-[140px] text-[11px]">Status</TableHead>
              <TableHead className="w-[60px] text-[11px] text-right">Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ordered.map((r) => {
              const T = TYPE_META[r.type];
              const InstIcon = INSTRUMENT_ICON[r.instrument];
              const isCorrection = r.type === "correction";
              const isSupersededOriginal =
                r.type === "qc" && RECORDS.some((c) => c.correctsId === r.id);

              return (
                <TableRow
                  key={r.id}
                  className={cn(
                    "border-l-[3px] cursor-pointer hover:bg-accent/30 transition-colors",
                    T.border,
                    isCorrection && "bg-red-50/40",
                  )}
                  onClick={() => setOpen(r)}
                >
                  <TableCell className="font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      {isCorrection && (
                        <CornerDownRight className="h-3.5 w-3.5 text-red-500 ml-3" />
                      )}
                      <span className={cn(isSupersededOriginal && "text-text-secondary")}>
                        {r.id}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-medium", T.tone)}>
                      <T.Icon className="h-3.5 w-3.5" /> {T.label}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 text-[12px]">
                      <InstIcon className="h-3.5 w-3.5 text-text-secondary" />
                      <span className="font-mono">{r.instrument}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-[12px]">{r.parameter}</TableCell>
                  <TableCell className="font-mono text-[11px] text-text-secondary">
                    {r.displayTime}
                  </TableCell>
                  <TableCell className="text-[12px]">
                    <span
                      className={cn(
                        isSupersededOriginal && "line-through text-text-secondary decoration-red-500/70",
                      )}
                    >
                      {r.value}
                    </span>
                    {isSupersededOriginal && (
                      <span className="ml-2 text-[11px] text-red-600">
                        — investigation appended
                      </span>
                    )}
                    {isCorrection && r.notes && (
                      <div className="mt-1 text-[11px] text-text-secondary italic max-w-[440px]">
                        “{r.notes}”
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      className="text-text-secondary hover:text-foreground"
                      onClick={(e) => { e.stopPropagation(); setOpen(r); }}
                      aria-label="Open evidence"
                    >
                      <Eye className="h-4 w-4 inline" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="px-4 py-2 border-t border-border-tertiary text-[11px] text-text-secondary">
        ALCOA+ append-only ledger · the OOS Glycation entry remains visible with strikethrough;
        its correction is shown indented immediately below.
      </div>

      <EvidenceDrawer record={open} onOpenChange={(o) => !o && setOpen(null)} />
    </Card>
  );
}
