import {
  AlertTriangle, ArrowRight, CheckCircle2, FlaskConical,
  Filter as FilterIcon, Droplets, ExternalLink, FileWarning, BellRing,
  Beaker, Package, Snowflake, Tag, Layers, Info, ShieldCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OverviewHeader } from "@/components/shared/PageHeader";
import {
  Tooltip as UITooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";

/* =========================================================================
   Linked batches & instrument chain
   ========================================================================= */

const LINKED_BATCHES = [
  { source: "Bioreactor (BR-003-p)", id: "CHO-r-hFSG-456-250308-2" },
  { source: "Centrifuge (CFG-003)", id: "FSH-B042-24" },
  { source: "Downstream / Fill-Finish", id: "FSH-2025-042" },
];

type ChainStep = {
  instrument: string;
  runId: string;
  description: string;
  alerts: number;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const DRUG_SUBSTANCE: ChainStep[] = [
  { instrument: "BR-003-p", runId: "Bioreactor Run R-456", description: "Fed-batch cultivation",
    alerts: 0, Icon: FlaskConical, href: "/cho-production-line/bioreactor" },
  { instrument: "CFG-003", runId: "Centrifuge FSH-B042-24-C1", description: "Cell removal / clarification",
    alerts: 0, Icon: FilterIcon, href: "/cho-production-line/centrifuge" },
  { instrument: "UF-03", runId: "UF/DF FSH-2025-042", description: "Concentration / Diafiltration",
    alerts: 0, Icon: Droplets, href: "/cho-production-line/ultrafiltration" },
  { instrument: "FPLC-01", runId: "Anion Exchange Run", description: "Anion exchange purification",
    alerts: 0, Icon: Beaker, href: "/cho-production-line/fplc" },
];

const CONTAINER_PREP: ChainStep[] = [
  { instrument: "VW-03", runId: "Wash Cycle P3-HighBio", description: "WFI rinse / cleaning",
    alerts: 0, Icon: Droplets, href: "/cho-production-line/vial-washer" },
  { instrument: "DPY-01", runId: "DP-250-30", description: "Dry-heat depyrogenation",
    alerts: 0, Icon: Layers, href: "/cho-production-line/depyrogenation" },
];

const FILL_FINISH: ChainStep[] = [
  { instrument: "FP-02", runId: "FSH_Fill_2R_v4_1", description: "Aseptic filling",
    alerts: 1, Icon: Package, href: "/cho-production-line/filling-pump" },
  { instrument: "LPZ-03", runId: "FSH_Cycle_3", description: "Lyophilization",
    alerts: 0, Icon: Snowflake, href: "/cho-production-line/lyophilizer" },
  { instrument: "CAP-01", runId: "FSH_CapLabel_2R_v2", description: "Capping & labelling",
    alerts: 0, Icon: Tag, href: "/cho-production-line/capping-labeling" },
];

/* =========================================================================
   Yield funnel data — protein mass basis
   ========================================================================= */

type FunnelStep = {
  label: string;
  volume: string;
  detail: string;
  proteinG: number;
  basisNote?: string;
};

const FUNNEL: FunnelStep[] = [
  { label: "1. Bioreactor harvest", volume: "1.225 L",
    detail: "Titer 3.2 g/L × 1.225 L", proteinG: 3.93 },
  { label: "2. Post-centrifuge centrate", volume: "1.16 L",
    detail: "Recovery 94.2 %", proteinG: 3.70 },
  { label: "3. Post-UF/DF retentate", volume: "~0.20 L",
    detail: "Cumulative 89.7 %", proteinG: 3.50 },
  { label: "4. Post-FPLC pool", volume: "Pool fraction",
    detail: "Chromatography recovery 85.6 %", proteinG: 0.0385 },
  { label: "5. Filled vials", volume: "12,500 × 1.0 mL",
    detail: "12,500 vials × 1.0 mL × 1.9 mg/mL",
    proteinG: 23.75,
    basisNote: "Post-formulation basis — diluted into formulation buffer (different basis from steps 1–4)" },
];

const MAX_PROTEIN = Math.max(...FUNNEL.map((f) => f.proteinG));
const POOL_MG = FUNNEL[3].proteinG * 1000;       // 38.5 mg
const HARVEST_MG = FUNNEL[0].proteinG * 1000;    // 3930 mg
const PROTEIN_YIELD_PCT = (POOL_MG / HARVEST_MG) * 100;
const SPECIFIC_YIELD = POOL_MG / 1.225;          // mg/L culture

/* =========================================================================
   Helpers
   ========================================================================= */

function ChainCard({ step }: { step: ChainStep }) {
  const navigate = useNavigate();
  return (
    <Card
      kind="operational"
      className={"p-3 flex-1 min-w-[180px] cursor-pointer hover:bg-accent/30 transition-colors " +
        (step.alerts > 0 ? "border-amber-500/50" : "")}
      onClick={() => navigate(step.href)}
    >
      <div className="flex items-start gap-2.5">
        <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <step.Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-foreground">{step.instrument}</span>
            <Badge variant="success">Complete</Badge>
          </div>
          <div className="text-[12px] text-foreground mt-0.5 truncate">{step.runId}</div>
          <div className="text-[11px] text-text-secondary truncate">{step.description}</div>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-secondary">
            {step.alerts > 0 ? (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span className="text-amber-700 dark:text-amber-400">{step.alerts} open alert</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span>0 open alerts</span>
              </>
            )}
            <ExternalLink className="h-3 w-3 ml-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function ChainStream({ title, steps }: { title: string; steps: ChainStep[] }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-2">
        {title}
      </div>
      <div className="flex items-stretch gap-2 flex-wrap lg:flex-nowrap">
        {steps.map((step, i) => (
          <div key={step.instrument} className="contents">
            <ChainCard step={step} />
            {i < steps.length - 1 && (
              <div className="hidden lg:flex items-center text-text-secondary shrink-0">
                <ArrowRight className="h-4 w-4" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FunnelRow({ step, isHighlight }: { step: FunnelStep; isHighlight: boolean }) {
  const pct = Math.max(2, (step.proteinG / MAX_PROTEIN) * 100);
  const showMg = step.proteinG < 0.5;
  return (
    <div className="grid grid-cols-[210px_1fr_160px] items-center gap-4 py-2.5">
      <div>
        <div className="text-[13px] text-foreground">{step.label}</div>
        <div className="text-[11px] text-text-secondary">{step.volume}</div>
      </div>
      <div>
        <div className="h-7 rounded-md bg-accent/40 overflow-hidden relative">
          <div
            className={"h-full " + (isHighlight ? "bg-primary" : "bg-primary/70")}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-0 flex items-center px-3">
            <span className="text-[11px] text-text-secondary">{step.detail}</span>
          </div>
        </div>
        {step.basisNote && (
          <div className="mt-1 text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <Info className="h-3 w-3" />
            {step.basisNote}
          </div>
        )}
      </div>
      <div className="text-right">
        {showMg ? (
          <>
            <span className="text-[14px] tabular-nums text-foreground">
              {(step.proteinG * 1000).toFixed(1)}
            </span>
            <span className="text-[11px] text-text-secondary ml-1">mg</span>
          </>
        ) : (
          <>
            <span className="text-[14px] tabular-nums text-foreground">
              {step.proteinG.toFixed(2)}
            </span>
            <span className="text-[11px] text-text-secondary ml-1">g</span>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================================
   Impurity clearance row
   ========================================================================= */

type ClearanceRow = {
  instrument: string;
  parameter: string;
  value: string;
  spec: string;
  status: "PASS" | "INFO";
};

const CLEARANCE: ClearanceRow[] = [
  { instrument: "VW-03", parameter: "Rinse water conductivity", value: "0.35 µS/cm",
    spec: "WFI purity indicator (≤ 1.3 µS/cm)", status: "INFO" },
  { instrument: "DPY-01", parameter: "Endotoxin LRV", value: "3.2",
    spec: "≥ 3.0 LRV required", status: "PASS" },
  { instrument: "FPLC-01", parameter: "Endotoxin in DS pool", value: "0.8 EU/mg",
    spec: "≤ 5.0 EU/mg", status: "PASS" },
];

/* =========================================================================
   Page
   ========================================================================= */

export default function CHOCampaignAnalyticsPage() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="px-8 py-8">
        <OverviewHeader
          title="Campaign Analytics"
          description="End-to-end summary of FSH-Campaign-042 across drug substance and container preparation streams converging at fill-finish."
        />

        {/* Campaign header */}
        <Card kind="operational" className="p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-x-8 gap-y-4">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                Campaign ID
              </div>
              <div className="text-[15px] text-foreground mt-1 font-mono">FSH-Campaign-042</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                Product
              </div>
              <div className="text-[15px] text-foreground mt-1">Recombinant human FSH (rhFSH)</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                Cell Line
              </div>
              <div className="text-[13px] text-foreground mt-1 font-mono">
                CHO-DG44/r-hFSHβ-α-clone_127
              </div>
            </div>
            <div className="md:text-right">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                Overall Status
              </div>
              <div className="mt-1.5">
                <Badge variant="warning" withDot>In Progress</Badge>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-border-tertiary">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-2">
              Linked Batch IDs
            </div>
            <div className="flex flex-wrap gap-3">
              {LINKED_BATCHES.map((b) => (
                <div key={b.id} className="px-3 py-1.5 rounded-md border border-border-tertiary bg-background">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary">{b.source}</div>
                  <div className="text-[12px] font-mono text-foreground">{b.id}</div>
                </div>
              ))}
              <div className="self-center text-[11px] text-text-secondary italic">
                Source files use different batch number formats — all belong to this campaign.
              </div>
            </div>
          </div>
        </Card>

        {/* Material balance alert */}
        <Card kind="operational" className="p-4 mb-6 border-l-[3px] border-l-amber-500 bg-amber-500/[0.05]">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-medium text-foreground">
                  Material Balance Review Required
                </span>
                <Badge variant="warning">HIGH</Badge>
                <Badge variant="neutral">Investigation open</Badge>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
                <div className="rounded-md border border-border-tertiary bg-background px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary">VW-03 processed</div>
                  <div className="text-[15px] text-foreground tabular-nums">12,000 vials</div>
                </div>
                <div className="rounded-md border border-amber-500/40 bg-background px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-amber-700 dark:text-amber-400">FP-02 filled</div>
                  <div className="text-[15px] text-foreground tabular-nums">12,500 vials</div>
                </div>
                <div className="rounded-md border border-border-tertiary bg-background px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary">LPZ-03 loaded</div>
                  <div className="text-[15px] text-foreground tabular-nums">12,000 vials</div>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-text-secondary">
                Filling pump reports{" "}
                <span className="text-amber-700 dark:text-amber-400 font-medium">+500 excess vials (+4.2 %)</span>{" "}
                vs upstream washer count. Investigation open.
              </p>
            </div>
          </div>
        </Card>

        {/* Process chain — two streams converging at fill-finish */}
        <section className="mb-6 space-y-4">
          <div className="flex items-baseline justify-between">
            <h3 className="text-section text-foreground">Process Chain Status</h3>
            <span className="text-[11px] text-text-secondary uppercase tracking-wide">
              9 instruments · click to open
            </span>
          </div>
          <Card kind="operational" className="p-4 space-y-4">
            <ChainStream title="Drug Substance Stream" steps={DRUG_SUBSTANCE} />
            <ChainStream title="Container Preparation Stream" steps={CONTAINER_PREP} />
            <div className="flex items-center justify-center gap-2 text-text-secondary text-[11px] uppercase tracking-wide pt-1">
              <ArrowRight className="h-3.5 w-3.5 -rotate-90" />
              <span>Streams converge</span>
              <ArrowRight className="h-3.5 w-3.5 -rotate-90" />
            </div>
            <ChainStream title="Fill-Finish Stream" steps={FILL_FINISH} />
          </Card>
        </section>

        {/* Yield funnel + KPI */}
        <section className="mb-6 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          <Card kind="operational" className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-section text-foreground">Yield Funnel — Protein Mass Basis</h3>
              <span className="text-[11px] text-text-secondary uppercase tracking-wide">
                Drug substance harvest → fill
              </span>
            </div>
            <div className="divide-y divide-border-tertiary">
              {FUNNEL.map((f, i) => (
                <FunnelRow key={f.label} step={f} isHighlight={i === 3} />
              ))}
            </div>
          </Card>

          <Card kind="operational" className="p-5 flex flex-col justify-center">
            <div className="flex items-center gap-1.5">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                End-to-end protein mass yield
              </div>
              <UITooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-text-secondary hover:text-foreground">
                    <Info className="h-3 w-3" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-[280px] text-[11px]">
                  Downstream protein mass yield represents recovery from ~1.225 L bioreactor
                  culture. Expressed per litre culture: ~{SPECIFIC_YIELD.toFixed(1)} mg/L.
                </TooltipContent>
              </UITooltip>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-[44px] leading-none text-foreground tabular-nums">
                {PROTEIN_YIELD_PCT.toFixed(1)}
              </span>
              <span className="text-[18px] text-text-secondary">%</span>
            </div>
            <div className="mt-2 text-[12px] text-text-secondary">
              <span className="tabular-nums text-foreground">{POOL_MG.toFixed(1)} mg</span>{" "}
              pool of{" "}
              <span className="tabular-nums text-foreground">{HARVEST_MG.toFixed(0)} mg</span>{" "}
              harvested
            </div>
            <div className="mt-1 text-[11px] text-text-secondary">
              Specific yield ~{SPECIFIC_YIELD.toFixed(1)} mg/L culture
            </div>
            <div className="mt-3">
              <Badge variant="neutral">Harvest → FPLC pool</Badge>
            </div>
          </Card>
        </section>

        {/* Impurity clearance */}
        <section className="mb-6">
          <Card kind="operational" className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border-tertiary flex items-baseline justify-between">
              <div>
                <h3 className="text-section text-foreground">Impurity Clearance Summary</h3>
                <p className="text-[12px] text-text-secondary">
                  Endotoxin control thread across container preparation and drug substance
                </p>
              </div>
              <Badge variant="success">All within spec</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-tertiary">
              {CLEARANCE.map((c) => (
                <div key={c.instrument} className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="neutral" className="font-mono">{c.instrument}</Badge>
                    {c.status === "PASS"
                      ? <Badge variant="success">PASS</Badge>
                      : <Badge variant="neutral">Indicator</Badge>}
                  </div>
                  <div className="mt-2 text-[12px] text-text-secondary">{c.parameter}</div>
                  <div className="text-[20px] text-foreground tabular-nums mt-0.5">{c.value}</div>
                  <div className="text-[11px] text-text-secondary mt-1">{c.spec}</div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-border-tertiary flex items-start gap-2 bg-emerald-500/[0.05]">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
              <p className="text-[12px] text-foreground">
                Three-point endotoxin control strategy confirmed across container preparation
                and drug substance streams.
              </p>
            </div>
          </Card>
        </section>

        {/* QC + Alerts summaries */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card kind="operational" className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-section text-foreground">QC Status Summary</h3>
              <Badge variant="warning">Release blocked</Badge>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded-md border border-border-tertiary px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Total tests</div>
                <div className="text-[20px] text-foreground tabular-nums">11</div>
              </div>
              <div className="rounded-md border border-border-tertiary px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">PASS</div>
                <div className="text-[20px] text-emerald-600 tabular-nums">10</div>
              </div>
              <div className="rounded-md border border-border-tertiary px-3 py-2.5 bg-destructive/[0.04]">
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">OOS</div>
                <div className="text-[20px] text-destructive tabular-nums">1</div>
              </div>
            </div>
            <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.06] px-3 py-2.5 flex items-start gap-2 mb-3">
              <FileWarning className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-[12px] text-foreground">
                Batch release blocked pending OOS investigation.
              </div>
            </div>
            <div className="text-[12px]">
              <span className="text-text-secondary">OOS item: </span>
              <span className="text-foreground font-medium">Glycation</span>
              <span className="text-text-secondary"> — Investigation pending</span>
            </div>
          </Card>

          <Card kind="operational" className="p-5">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-section text-foreground">Open Alerts Summary</h3>
              <span className="text-[11px] text-text-secondary uppercase tracking-wide">
                Campaign duration
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="rounded-md border border-border-tertiary px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Total fired</div>
                <div className="text-[20px] text-foreground tabular-nums">3</div>
              </div>
              <div className="rounded-md border border-border-tertiary px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Resolved</div>
                <div className="text-[20px] text-emerald-600 tabular-nums">1</div>
              </div>
              <div className="rounded-md border border-border-tertiary px-3 py-2.5 bg-amber-500/[0.05]">
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">Open</div>
                <div className="text-[20px] text-amber-600 tabular-nums">2</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-md border border-border-tertiary px-3 py-2 flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <Badge variant="success">Resolved</Badge>
                <span className="text-[12px] text-foreground">Foam spike — Day 6</span>
                <span className="ml-auto text-[11px] text-text-secondary">CRITICAL · BR-003-p</span>
              </div>
              <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.05] px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <Badge variant="warning">Open</Badge>
                <span className="text-[12px] text-foreground">NH₄⁺ elevation — Day 8</span>
                <span className="ml-auto text-[11px] text-text-secondary">HIGH · BR-003-p</span>
              </div>
              <div className="rounded-md border border-amber-500/40 bg-amber-500/[0.05] px-3 py-2 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                <Badge variant="warning">Open</Badge>
                <span className="text-[12px] text-foreground">Material balance — +500 vials</span>
                <span className="ml-auto text-[11px] text-text-secondary">HIGH · FP-02</span>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-secondary">
              <BellRing className="h-3 w-3" />
              <span>Open alerts require review before campaign closure.</span>
            </div>
          </Card>
        </section>
      </div>
    </TooltipProvider>
  );
}
