import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Link2, Tag } from "lucide-react";
import {
  Tooltip as UITooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";

/* =========================================================================
   Metadata panel
   ========================================================================= */
function MetadataField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">{label}</dt>
      <dd className="text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

function MaterialBadge({
  id, color = "primary", tooltip,
}: { id: string; color?: "primary" | "amber"; tooltip?: React.ReactNode }) {
  const cls =
    color === "amber"
      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/15"
      : "bg-primary/10 text-primary hover:bg-primary/15";
  const btn = (
    <button
      type="button"
      className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[12px] ${cls}`}
    >
      <Link2 className="h-3 w-3" />
      {id}
    </button>
  );
  if (!tooltip) return btn;
  return (
    <UITooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="left" className="max-w-[280px] text-[11px]">
        {tooltip}
      </TooltipContent>
    </UITooltip>
  );
}

function CAPMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>
        <MetadataField label="Equipment ID">CAP-01</MetadataField>
        <MetadataField label="Operator Name">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>M.v. Sidorov</span>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-amber-600 dark:text-amber-400">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[260px] text-[11px]">
                <span className="font-medium">Operator change at this step</span>
                <div className="mt-1 text-text-secondary">
                  Previous fill-finish steps (FP-02, LPZ-03) were operated by{" "}
                  <span className="text-foreground">J. Smith</span>.
                </div>
              </TooltipContent>
            </UITooltip>
          </div>
        </MetadataField>
        <MetadataField label="Recipe Name">
          <span className="font-mono text-[12px]">FSH_CapLabel_2R_v2</span>
        </MetadataField>
        <MetadataField label="Cap Lot Number">
          <MaterialBadge
            id="CAP_LOT_5647"
            tooltip={
              <>
                <span className="font-medium">Cap material lot</span>
                <div className="mt-1">Aluminium flip-off · 13 mm crimp</div>
                <div>QC released · CoA on file</div>
              </>
            }
          />
        </MetadataField>
        <MetadataField label="Label Lot Number">
          <MaterialBadge
            id="LBL_FSH_1024"
            color="amber"
            tooltip={
              <>
                <span className="font-medium inline-flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Label lot
                </span>
                <div className="mt-1">
                  Contains batch number <span className="font-mono">FSH-2025-042</span>,
                  expiry date, and barcode.
                </div>
                <div className="mt-1 text-amber-700 dark:text-amber-400">
                  Incorrect labels are a critical GxP traceability event.
                </div>
              </>
            }
          />
        </MetadataField>
        <MetadataField label="Timestamp Start">
          <span className="tabular-nums">2024-10-17 15:00 UTC</span>
        </MetadataField>
        <MetadataField label="Timestamp End">
          <span className="tabular-nums">2024-10-17 16:30 UTC</span>
          <span className="ml-2 text-[11px] text-text-secondary">(1 h 30 min)</span>
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Deviation event (converted from free-text comment)
   ========================================================================= */
function DeviationEvent() {
  return (
    <Card kind="operational" className="p-4 border-amber-500/40 bg-amber-50/50 dark:bg-amber-900/10">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-amber-500/15 p-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[14px] font-medium text-foreground">
              Deviation event — in-process cap rejection
            </span>
            <Badge variant="warning">Deviation</Badge>
            <Badge variant="neutral">Converted from free-text comment</Badge>
          </div>
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1.5 text-[12px]">
            <dt className="text-text-secondary">Type</dt>
            <dd className="text-foreground">In-process rejection — cap defect</dd>
            <dt className="text-text-secondary">Description</dt>
            <dd className="text-foreground">3 caps rejected due to skewed crimp</dd>
            <dt className="text-text-secondary">Detected by</dt>
            <dd className="text-foreground">Operator visual check</dd>
            <dt className="text-text-secondary">Action taken</dt>
            <dd className="text-foreground">Rejected vials removed from batch</dd>
            <dt className="text-text-secondary">Operator</dt>
            <dd className="text-foreground">M.v. Sidorov</dd>
          </dl>
          <p className="mt-3 text-[11px] text-text-secondary border-t border-amber-500/20 pt-2">
            Original source comment: <span className="italic">"Rejected 3 caps due to skewed crimp"</span>{" "}
            — restructured as a traceable ALCOA+ event.
          </p>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Process parameters
   ========================================================================= */
type Param = {
  name: string;
  value: string;
  range: string;
  ok: boolean;
};

function ParamCard({ p }: { p: Param }) {
  return (
    <div className="rounded-md border border-border-tertiary bg-background p-3">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
        {p.name}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[18px] text-foreground tabular-nums">{p.value}</span>
        {p.ok && <Badge variant="success">In range</Badge>}
      </div>
      <div className="mt-1 text-[11px] text-text-secondary">Setpoint range: {p.range}</div>
    </div>
  );
}

function ProcessParameters() {
  const params: Param[] = [
    { name: "Cap Feeding Rate", value: "200 caps/min", range: "50–400", ok: true },
    { name: "Crimping Head Rotation", value: "360°", range: "180–720°", ok: true },
    { name: "Conveyor Belt Speed", value: "8 m/min", range: "2–20", ok: true },
    { name: "Label Dispenser Speed", value: "50 mm/s", range: "10–100", ok: true },
  ];
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-medium text-foreground">Process Parameters</h3>
        <span className="text-[11px] text-text-secondary">Throughput &amp; synchronisation</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {params.map((p) => <ParamCard key={p.name} p={p} />)}
      </div>
    </Card>
  );
}

/* =========================================================================
   Inspection signals (aggregated stats)
   ========================================================================= */
function InspectionStat({
  name, rate, detail, count,
}: { name: string; rate: string; detail: string; count?: string }) {
  const pct = parseFloat(rate);
  const isFull = pct === 100;
  return (
    <div className="rounded-md border border-border-tertiary bg-background p-3">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">{name}</div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[20px] text-foreground tabular-nums">{rate}</span>
        <Badge variant={isFull ? "success" : "warning"}>{isFull ? "PASS" : "Within tol."}</Badge>
      </div>
      <div className="mt-1 text-[11px] text-text-secondary">{detail}</div>
      {count && (
        <div className="mt-2 text-[11px] text-foreground tabular-nums">{count}</div>
      )}
      <div className="mt-2 h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full ${isFull ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InspectionSignals() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Inspection Signals</h3>
          <p className="text-[12px] text-text-secondary">Aggregated per-vial statistics</p>
        </div>
        <Badge variant="neutral">Reject gate total: 12 vials</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <InspectionStat
          name="Label Sensor"
          rate="99.9%"
          detail="12 failures detected → reject gate"
        />
        <InspectionStat
          name="Cap Presence Sensor"
          rate="99.9%"
          detail="3 deviation rejections + 9 automated"
          count="12 total rejections"
        />
        <InspectionStat
          name="Print Quality Verification"
          rate="100%"
          detail="All barcodes readable"
        />
      </div>
      <div className="mt-3 flex items-start gap-2 rounded-md border border-border-tertiary bg-muted/30 px-3 py-2">
        <Info className="h-3.5 w-3.5 mt-0.5 text-text-secondary shrink-0" />
        <p className="text-[11px] text-text-secondary">
          Per-vial inspection signals operate at up to 400 vials/min. Individual pass
          records are aggregated. Only failure events are stored as individual ledger
          records.
        </p>
      </div>
    </Card>
  );
}

/* =========================================================================
   Quality results
   ========================================================================= */
function QualityResults() {
  const items = [
    {
      name: "Crimp Seal Integrity",
      result: "No visible gaps, cap rotates < 90° under finger torque",
      method: "Visual + torque tester (every 100 vials)",
      qualitative: true,
    },
    {
      name: "Label Adhesion",
      result: "No lifting or wrinkling after 1 hour at room temperature",
      method: "Peel test / visual inspection",
      qualitative: true,
    },
    {
      name: "Barcode Readability",
      result: "100% readable",
      method: "Automated in-line verifier",
    },
  ];
  return (
    <Card kind="operational" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border-tertiary flex items-baseline justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Quality Results</h3>
          <p className="text-[12px] text-text-secondary">Source: Quality metrics sheet</p>
        </div>
        <Badge variant="success">PASS</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-tertiary">
        {items.map((it) => (
          <div key={it.name} className="p-4">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                {it.name}
              </span>
              {it.qualitative && <Badge variant="neutral" className="ml-1">Qualitative</Badge>}
            </div>
            <div className="mt-1.5 text-[13px] text-foreground">{it.result}</div>
            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-[12px]">
              <dt className="text-text-secondary">Method</dt>
              <dd className="text-foreground">{it.method}</dd>
              <dt className="text-text-secondary">Status</dt>
              <dd><Badge variant="success">PASS</Badge></dd>
            </dl>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */
export function CappingLabelingView() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <DeviationEvent />
          <ProcessParameters />
          <InspectionSignals />
          <QualityResults />
        </div>
        <CAPMetadataPanel />
      </div>
    </TooltipProvider>
  );
}
