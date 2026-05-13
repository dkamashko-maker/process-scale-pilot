import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Link2, Wrench, Check, ShieldCheck } from "lucide-react";
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

function FPMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>
        <MetadataField label="Equipment ID">FP-02</MetadataField>
        <MetadataField label="Operator Name">J. Smith</MetadataField>
        <MetadataField label="Recipe Name">
          <span className="font-mono text-[12px]">FSH_Fill_2R_v4_1</span>
        </MetadataField>
        <MetadataField label="Sterilized Tubing Set ID">
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[12px] hover:bg-amber-500/15 border border-amber-500/30"
              >
                <ShieldCheck className="h-3 w-3" />
                TUBE_241014_03
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[280px] text-[11px]">
              <span className="font-medium">GxP prerequisite record — sterilisation must be confirmed before batch processing begins.</span>
              <div className="mt-1 text-text-secondary">Autoclave 2024-10-14 · 121 °C / 30 min</div>
              <div className="text-text-secondary">BI: PASS · Cycle qualified</div>
            </TooltipContent>
          </UITooltip>
        </MetadataField>
        <MetadataField label="Filling Needle Inner Diameter">
          <span className="tabular-nums">1.2 mm</span>
        </MetadataField>
        <MetadataField label="Needle Configuration">
          8 needles · 2R vial
        </MetadataField>
        <MetadataField label="Time Start">
          <span className="tabular-nums">2024-10-15 06:00 UTC</span>
        </MetadataField>
        <MetadataField label="Time End">
          <span className="tabular-nums">2024-10-15 07:45 UTC</span>
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Intervention event (converted from free-text comment)
   ========================================================================= */
function InterventionEventCard() {
  return (
    <Card
      kind="operational"
      className="p-4 border-amber-300/60 bg-amber-50/60 dark:bg-amber-900/15"
    >
      <div className="flex items-start gap-3">
        <div className="h-8 w-8 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 flex items-center justify-center shrink-0">
          <Wrench className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wide text-amber-700 dark:text-amber-300 font-medium">
              Intervention Event
            </span>
            <Badge variant="warning">Converted from free-text comment</Badge>
          </div>
          <div className="text-[14px] text-foreground mt-1 font-medium">
            Equipment intervention — needle change
          </div>
          <dl className="mt-2 grid grid-cols-[140px_1fr] gap-y-1 text-[12px]">
            <dt className="text-text-secondary">Trigger</dt>
            <dd className="text-foreground">After 15,000 vials filled</dd>
            <dt className="text-text-secondary">Estimated time</dt>
            <dd className="text-foreground tabular-nums">2024-10-15 ~06:45 UTC <span className="text-text-secondary">(calculated from fill rate)</span></dd>
            <dt className="text-text-secondary">Operator</dt>
            <dd className="text-foreground">J. Smith</dd>
          </dl>
          <div className="mt-3 rounded-md border border-border-tertiary bg-background px-3 py-2 text-[11px] text-text-secondary leading-relaxed">
            Source data captured this as a free-text comment. DataVest structured it as an
            intervention event for ALCOA traceability.
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Process parameters
   ========================================================================= */
function ProcessParametersPanel() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-[14px] font-medium text-foreground">Process Parameters</h3>
        <Badge variant="success">Within range</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_1fr] gap-3">
        {/* Target Fill Volume — prominent dose-defining parameter */}
        <div className="rounded-md border-2 border-primary/40 bg-primary/[0.04] p-4 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-primary font-medium">
              Target Fill Volume
            </span>
            <Badge variant="success">Dose-defining</Badge>
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[32px] text-foreground tabular-nums leading-none">1.0</span>
            <span className="text-[13px] text-text-secondary">mL</span>
          </div>
          <div className="text-[11px] text-text-secondary mt-auto pt-1">
            Defines the delivered drug dose per vial.
          </div>
        </div>

        <div className="rounded-md border border-border-tertiary bg-background p-3 flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Pump Speed
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] text-foreground tabular-nums">60</span>
            <span className="text-[12px] text-text-secondary">RPM</span>
          </div>
        </div>

        <div className="rounded-md border border-border-tertiary bg-background p-3 flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Liquid Temperature
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[22px] text-foreground tabular-nums">6</span>
            <span className="text-[12px] text-text-secondary">°C</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-auto">
            <span className="text-text-secondary">Range 2 – 12 °C</span>
            <Badge variant="success" className="gap-1">
              <Check className="h-2.5 w-2.5" />
              OK
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Vials counter + material balance alert
   ========================================================================= */
function VialsCounter() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex flex-wrap items-end gap-6">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Vials Filled
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[40px] text-foreground tabular-nums leading-none">12,500</span>
            <span className="text-[12px] text-text-secondary">vials</span>
          </div>
        </div>
        <div className="text-[12px] text-text-secondary">
          Run window:{" "}
          <span className="text-foreground tabular-nums">2024-10-15 06:00 → 07:45 UTC</span>
          <div className="mt-0.5">
            Avg fill rate:{" "}
            <span className="text-foreground tabular-nums">~119 vials / min</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-300 shrink-0" />
        <div className="text-[12px] text-foreground leading-relaxed">
          <div className="font-medium uppercase tracking-wide text-[11px] text-amber-700 dark:text-amber-300">
            Material balance alert
          </div>
          <div className="mt-1">
            <span className="tabular-nums font-medium">12,500</span> vials filled vs.{" "}
            <span className="tabular-nums">12,000</span> vials processed by{" "}
            <span className="font-mono">VW-03</span> (Vial Washer) and{" "}
            <span className="font-mono">LPZ-03</span> (Lyophilizer).
          </div>
          <div className="mt-1">
            Discrepancy:{" "}
            <span className="tabular-nums font-medium text-amber-700 dark:text-amber-300">+500 vials</span>.
            Possible cause: additional vials from supplementary wash batch or count error.{" "}
            <span className="font-medium">Requires investigation.</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   In-process QC checks
   ========================================================================= */
type QCCheck = { n: number; range: string; vol: string; sd: string };

const CHECKS: QCCheck[] = [
  { n: 1, range: "1 – 100",          vol: "1.001", sd: "3.2" },
  { n: 2, range: "101 – 200",        vol: "0.999", sd: "3.5" },
  { n: 3, range: "201 – 300",        vol: "1.002", sd: "3.1" },
  { n: 4, range: "1,500 – 1,600",    vol: "1.000", sd: "3.8" },
  { n: 5, range: "7,500 – 7,600",    vol: "0.998", sd: "3.6" },
  { n: 6, range: "10,000 – 10,100",  vol: "1.003", sd: "4.1" },
  { n: 7, range: "12,000 – 12,100",  vol: "1.001", sd: "3.5" },
  { n: 8, range: "12,400 – 12,500",  vol: "1.000", sd: "3.4" },
];

function InProcessQC() {
  return (
    <Card kind="operational" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border-tertiary flex items-baseline justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Fill Volume In-Process Checks</h3>
          <p className="text-[12px] text-text-secondary">Periodic gravimetric checks every 100 vials</p>
        </div>
        <Badge variant="success">8 of 8 PASS</Badge>
      </div>

      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-secondary border-b border-border-tertiary">
            <th className="text-left font-medium px-4 py-2 w-16">Check #</th>
            <th className="text-left font-medium px-4 py-2">Vial Range</th>
            <th className="text-left font-medium px-4 py-2">Fill Volume (mL)</th>
            <th className="text-left font-medium px-4 py-2">Weight SD (mg)</th>
            <th className="text-left font-medium px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {CHECKS.map((c) => (
            <tr key={c.n} className="border-b border-border-tertiary last:border-b-0">
              <td className="px-4 py-2.5 text-foreground tabular-nums">{c.n}</td>
              <td className="px-4 py-2.5 text-foreground tabular-nums">{c.range}</td>
              <td className="px-4 py-2.5 text-foreground tabular-nums">{c.vol}</td>
              <td className="px-4 py-2.5 text-foreground tabular-nums">{c.sd}</td>
              <td className="px-4 py-2.5"><Badge variant="success">PASS</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="px-4 py-3 border-t border-border-tertiary bg-emerald-50/40 dark:bg-emerald-900/10 text-[12px] text-foreground flex items-center gap-2">
        <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
        All 8 in-process checks PASS. Fill uniformity maintained throughout run.
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */
export function FillingPumpView() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <ProcessParametersPanel />
          <VialsCounter />
          <InterventionEventCard />
          <InProcessQC />
        </div>
        <FPMetadataPanel />
      </div>
    </TooltipProvider>
  );
}
