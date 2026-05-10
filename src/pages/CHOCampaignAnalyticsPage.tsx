import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, FlaskConical,
  Filter as FilterIcon, Droplets, ExternalLink, FileWarning, BellRing,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OverviewHeader } from "@/components/shared/PageHeader";

/* =========================================================================
   Linked batches & instrument chain
   ========================================================================= */

const LINKED_BATCHES = [
  { source: "Bioreactor (BR-003-p)", id: "CHO-r-hFSG-456-250308-2" },
  { source: "Centrifuge (CFG-003)", id: "FSH-B042-24" },
  { source: "UF Skid (UF-03)", id: "FSH-2025-042" },
];

type ChainStep = {
  instrument: string;
  runId: string;
  description: string;
  alerts: number;
  Icon: React.ComponentType<{ className?: string }>;
  href: string;
};

const CHAIN: ChainStep[] = [
  {
    instrument: "BR-003-p",
    runId: "Bioreactor Run R-456",
    description: "Fed-batch cultivation",
    alerts: 0,
    Icon: FlaskConical,
    href: "/cho-production-line/bioreactor",
  },
  {
    instrument: "CFG-003",
    runId: "Centrifuge Run FSH-B042-24-C1",
    description: "Cell removal / clarification",
    alerts: 0,
    Icon: FilterIcon,
    href: "/cho-production-line/centrifuge",
  },
  {
    instrument: "UF-03",
    runId: "UF/DF Run FSH-2025-042",
    description: "Concentration / Diafiltration",
    alerts: 0,
    Icon: Droplets,
    href: "/cho-production-line/ultrafiltration",
  },
];

/* =========================================================================
   Yield funnel data
   ========================================================================= */

const FUNNEL = [
  {
    label: "Bioreactor harvest",
    volume: "1.225 L",
    detail: "Titer 3.2 g/L × 1.225 L",
    proteinG: 3.92,
  },
  {
    label: "Post-centrifuge centrate",
    volume: "1.16 L",
    detail: "Yield recovery 94.2 %",
    proteinG: 3.69,
  },
  {
    label: "Post-UF/DF retentate",
    volume: "0.20 L (est.)",
    detail: "1.9 mg/mL × 0.20 L × 1000 / 1000",
    proteinG: 3.5,
  },
];

const MAX_PROTEIN = FUNNEL[0].proteinG;
const END_TO_END = (FUNNEL[2].proteinG / FUNNEL[0].proteinG) * 100;

/* =========================================================================
   Helpers
   ========================================================================= */

function ChainCard({ step }: { step: ChainStep }) {
  const navigate = useNavigate();
  return (
    <Card
      kind="operational"
      className="p-4 flex-1 min-w-[220px] cursor-pointer hover:bg-accent/30 transition-colors"
      onClick={() => navigate(step.href)}
    >
      <div className="flex items-start gap-3">
        <div className="h-9 w-9 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <step.Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-foreground">{step.instrument}</span>
            <Badge variant="success">Complete</Badge>
          </div>
          <div className="text-[13px] text-foreground mt-0.5">{step.runId}</div>
          <div className="text-[11px] text-text-secondary">{step.description}</div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{step.alerts} open alert{step.alerts === 1 ? "" : "s"}</span>
            <ExternalLink className="h-3 w-3 ml-auto text-text-secondary" />
          </div>
        </div>
      </div>
    </Card>
  );
}

function FunnelRow({
  label, volume, detail, proteinG, isLast,
}: {
  label: string; volume: string; detail: string; proteinG: number; isLast: boolean;
}) {
  const pct = (proteinG / MAX_PROTEIN) * 100;
  return (
    <div className="grid grid-cols-[200px_1fr_140px] items-center gap-4 py-2.5">
      <div>
        <div className="text-[13px] text-foreground">{label}</div>
        <div className="text-[11px] text-text-secondary">{volume}</div>
      </div>
      <div>
        <div className="h-7 rounded-md bg-accent/40 overflow-hidden relative">
          <div
            className={"h-full " + (isLast ? "bg-primary" : "bg-primary/70")}
            style={{ width: `${pct}%` }}
          />
          <div className="absolute inset-0 flex items-center px-3">
            <span className="text-[11px] text-text-secondary">{detail}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <span className="text-[14px] tabular-nums text-foreground">{proteinG.toFixed(2)}</span>
        <span className="text-[11px] text-text-secondary ml-1">g protein</span>
      </div>
    </div>
  );
}

/* =========================================================================
   Page
   ========================================================================= */

export default function CHOCampaignAnalyticsPage() {
  return (
    <div className="px-8 py-8">
      <OverviewHeader
        title="Campaign Analytics"
        description="End-to-end summary of the FSH-Campaign-042 production run across Bioreactor, Centrifuge, and UF/DF."
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
              <div
                key={b.id}
                className="px-3 py-1.5 rounded-md border border-border-tertiary bg-background"
              >
                <div className="text-[10px] uppercase tracking-wide text-text-secondary">
                  {b.source}
                </div>
                <div className="text-[12px] font-mono text-foreground">{b.id}</div>
              </div>
            ))}
            <div className="self-center text-[11px] text-text-secondary italic">
              Source files use different batch number formats — all three belong to this campaign.
            </div>
          </div>
        </div>
      </Card>

      {/* Process chain */}
      <section className="mb-6">
        <div className="flex items-baseline justify-between mb-2">
          <h3 className="text-section text-foreground">Process Chain Status</h3>
          <span className="text-[11px] text-text-secondary uppercase tracking-wide">
            Flow order · Click to open instrument view
          </span>
        </div>
        <div className="flex items-stretch gap-2 flex-wrap lg:flex-nowrap">
          {CHAIN.map((step, i) => (
            <div key={step.instrument} className="contents">
              <ChainCard step={step} />
              {i < CHAIN.length - 1 && (
                <div className="hidden lg:flex items-center text-text-secondary shrink-0">
                  <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Yield funnel + KPI */}
      <section className="mb-6 grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
        <Card kind="operational" className="p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-section text-foreground">Yield Funnel</h3>
            <span className="text-[11px] text-text-secondary uppercase tracking-wide">
              Material flow across the chain
            </span>
          </div>
          <div className="divide-y divide-border-tertiary">
            {FUNNEL.map((f, i) => (
              <FunnelRow
                key={f.label}
                label={f.label}
                volume={f.volume}
                detail={f.detail}
                proteinG={f.proteinG}
                isLast={i === FUNNEL.length - 1}
              />
            ))}
          </div>
        </Card>

        <Card kind="operational" className="p-5 flex flex-col justify-center">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            End-to-end yield
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[44px] leading-none text-foreground tabular-nums">
              {END_TO_END.toFixed(1)}
            </span>
            <span className="text-[18px] text-text-secondary">%</span>
          </div>
          <div className="mt-2 text-[12px] text-text-secondary">
            <span className="tabular-nums text-foreground">
              {FUNNEL[2].proteinG.toFixed(2)} g
            </span>{" "}
            recovered of{" "}
            <span className="tabular-nums text-foreground">
              {FUNNEL[0].proteinG.toFixed(2)} g
            </span>{" "}
            harvested
          </div>
          <div className="mt-3">
            <Badge variant="success">Within campaign target</Badge>
          </div>
        </Card>
      </section>

      {/* QC + Alerts summaries */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* QC */}
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

        {/* Alerts */}
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
              <div className="text-[20px] text-foreground tabular-nums">2</div>
            </div>
            <div className="rounded-md border border-border-tertiary px-3 py-2.5">
              <div className="text-[10px] uppercase tracking-wide text-text-secondary">Resolved</div>
              <div className="text-[20px] text-emerald-600 tabular-nums">1</div>
            </div>
            <div className="rounded-md border border-border-tertiary px-3 py-2.5 bg-amber-500/[0.05]">
              <div className="text-[10px] uppercase tracking-wide text-text-secondary">Open</div>
              <div className="text-[20px] text-amber-600 tabular-nums">1</div>
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
          </div>

          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text-secondary">
            <BellRing className="h-3 w-3" />
            <span>Open alert requires review before campaign closure.</span>
          </div>
        </Card>
      </section>
    </div>
  );
}
