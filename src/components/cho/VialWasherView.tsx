import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Link2, FileCode2 } from "lucide-react";
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

function MaterialLink({ id, tooltip }: { id: string; tooltip: string }) {
  return (
    <UITooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-primary/10 text-primary font-mono text-[12px] hover:bg-primary/15"
        >
          <Link2 className="h-3 w-3" />
          {id}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-[260px] text-[11px]">
        {tooltip}
      </TooltipContent>
    </UITooltip>
  );
}

function VWMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>
        <MetadataField label="Equipment ID">VW-03</MetadataField>
        <MetadataField label="Operator Name">J. Smith</MetadataField>
        <MetadataField label="Start Time">
          <span className="tabular-nums">2025-04-24 08:32 UTC</span>
        </MetadataField>
        <MetadataField label="End Time">
          <span className="tabular-nums">2025-04-24 10:45 UTC</span>
        </MetadataField>
        <MetadataField label="Vial Lot Number">
          <MaterialLink
            id="VL-9876"
            tooltip="Materials DB · 12,000 borosilicate vials · supplier lot VL-9876. Lot also processed by DPY-01, FP-02, LPZ-03."
          />
        </MetadataField>
        <MetadataField label="Number of Vials Processed">
          <span className="tabular-nums">12,000</span>
        </MetadataField>
        <MetadataField label="Wash Program ID">
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-secondary text-foreground font-mono text-[12px] hover:bg-secondary/80"
              >
                <FileCode2 className="h-3 w-3" />
                P3-HighBio
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[260px] text-[11px]">
              <span className="font-medium">Method DB reference</span>
              <div className="mt-0.5">Programme P3-HighBio · v2.1</div>
              <div className="text-text-secondary">
                High-bioburden wash recipe · WFI rinse · qualified for FSH fill-finish.
              </div>
            </TooltipContent>
          </UITooltip>
        </MetadataField>
        <MetadataField label="Rinse Water Lot">
          <MaterialLink
            id="WFI-042-25"
            tooltip="Materials DB · WFI batch WFI-042-25 · conductivity 0.35 µS/cm at point of use."
          />
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Process parameter cards (setpoint vs actual)
   ========================================================================= */
type Param = {
  label: string;
  setpoint: string;
  actual: string;
  unit: string;
  range: string;
  ok: boolean;
};

const PROCESS_PARAMS: Param[] = [
  { label: "Wash water temperature",  setpoint: "70",  actual: "72.5", unit: "°C",        range: "65 – 80",  ok: true },
  { label: "Wash water pressure",     setpoint: "2.8", actual: "2.8",  unit: "bar",       range: "2.0 – 3.5", ok: true },
  { label: "Drying air temperature",  setpoint: "125", actual: "125",  unit: "°C",        range: "110 – 140", ok: true },
  { label: "Drying air flow rate",    setpoint: "180", actual: "180",  unit: "m³/h",      range: "150 – 220", ok: true },
  { label: "Conveyor belt speed",     setpoint: "300", actual: "300",  unit: "vials/min", range: "200 – 400", ok: true },
];

function ParamCard({ p }: { p: Param }) {
  return (
    <div className="rounded-md border border-border-tertiary bg-background p-3 flex flex-col gap-2">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium leading-tight">
        {p.label}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-text-secondary">Setpoint</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] text-foreground tabular-nums">{p.setpoint}</span>
            <span className="text-[11px] text-text-secondary">{p.unit}</span>
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-text-secondary">Actual</div>
          <div className="flex items-baseline gap-1">
            <span className="text-[18px] text-foreground tabular-nums">{p.actual}</span>
            <span className="text-[11px] text-text-secondary">{p.unit}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-text-secondary">Range {p.range}</span>
        <Badge variant={p.ok ? "success" : "danger"} className="gap-1">
          <Check className="h-2.5 w-2.5" />
          Within range
        </Badge>
      </div>
    </div>
  );
}

function ProcessParametersPanel() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Process Parameters</h3>
          <p className="text-[12px] text-text-secondary">Setpoint vs actual measured values</p>
        </div>
        <Badge variant="success">5 of 5 within range</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {PROCESS_PARAMS.map((p) => <ParamCard key={p.label} p={p} />)}
      </div>

      {/* Sensor-only parameter */}
      <div className="mt-4 pt-4 border-t border-border-tertiary">
        <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-2">
          Sensor-Only Parameter
        </div>
        <div className="rounded-md border border-border-tertiary bg-background p-3 max-w-md">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                Rinse water conductivity
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[22px] text-foreground tabular-nums">0.35</span>
                <span className="text-[12px] text-text-secondary">µS/cm</span>
              </div>
              <div className="text-[11px] text-text-secondary mt-1">Range 0.1 – 0.8 µS/cm</div>
            </div>
            <Badge variant="success" className="gap-1">
              <Check className="h-2.5 w-2.5" />
              Within range
            </Badge>
          </div>
          <div className="mt-2 text-[11px] text-text-secondary leading-relaxed">
            Unit: <span className="font-mono">µS/cm</span> (WFI quality scale — not{" "}
            <span className="font-mono">mS/cm</span> used in UF/DF).
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Calculated parameters
   ========================================================================= */
function CalculatedParameters() {
  return (
    <Card kind="operational" className="p-4">
      <div className="mb-3">
        <h3 className="text-[14px] font-medium text-foreground">Calculated Parameters</h3>
        <p className="text-[12px] text-text-secondary">Derived from cycle event log</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-md border border-border-tertiary bg-background p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Wash cycle duration
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[22px] text-foreground tabular-nums">45</span>
            <span className="text-[12px] text-text-secondary">seconds</span>
          </div>
        </div>
        <div className="rounded-md border border-border-tertiary bg-background p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Final rinse duration
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[22px] text-foreground tabular-nums">25</span>
            <span className="text-[12px] text-text-secondary">seconds</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Quality result
   ========================================================================= */
function QualityResult() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Quality Result</h3>
          <p className="text-[12px] text-text-secondary">Source: Automated vision system</p>
        </div>
        <Badge variant="success">PASS</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Visual inspection pass rate
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[28px] text-foreground tabular-nums">99.2</span>
            <span className="text-[12px] text-text-secondary">%</span>
          </div>
          <div className="text-[12px] text-text-secondary mt-1">Specification: ≥ 98 %</div>

          {/* Pass/reject bar */}
          <div className="mt-3 h-2 w-full rounded-full bg-accent/40 overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: "99.2%" }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-text-secondary tabular-nums">
            <span>11,904 passed</span>
            <span>96 rejected</span>
          </div>
        </div>

        <div className="text-[12px] text-foreground leading-relaxed">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-1">
            Calculation
          </div>
          <p>
            <span className="tabular-nums">99.2 %</span> ={" "}
            <span className="tabular-nums">11,904</span> passed /{" "}
            <span className="tabular-nums">12,000</span> processed.{" "}
            <span className="tabular-nums">96</span> vials rejected (cracks / residues / foreign matter).
          </p>
          <p className="mt-2 text-text-secondary">
            Reject reason breakdown:{" "}
            <span className="italic">placeholder for Phase 2 reject classification data.</span>
          </p>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */
export function VialWasherView() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <ProcessParametersPanel />
          <CalculatedParameters />
          <QualityResult />
        </div>
        <VWMetadataPanel />
      </div>
    </TooltipProvider>
  );
}
