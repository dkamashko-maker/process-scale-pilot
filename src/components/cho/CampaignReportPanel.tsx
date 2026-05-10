/**
 * Campaign Report — RPT-FSH-042-001
 * Read-only Batch Record Summary for FSH-Campaign-042.
 * Sign-off blocked while OOS investigation is open.
 */
import {
  FileText, AlertTriangle, CheckCircle2, Brain, Lock, Clock,
  ShieldAlert, Sparkles, FlaskConical, Microscope, Beaker,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const REPORT = {
  id: "RPT-FSH-042-001",
  title: "FSH-Campaign-042 Batch Record Summary",
  generated: "2025-05-05 09:00 UTC",
  status: "Pending Sign-off (OOS open)",
  campaign: {
    id: "FSH-Campaign-042",
    product: "Recombinant human FSH (rhFSH)",
    cellLine: "CHO-DG44 / r-hFSHβ-α-clone_127",
    dates: "2025-04-15 → 2025-05-04",
    runs: [
      { instrument: "BR-003-p", runId: "R-456", icon: FlaskConical },
      { instrument: "CFG-003", runId: "FSH-B042-24-C1", icon: Microscope },
      { instrument: "UF-03", runId: "FSH-2025-042", icon: Beaker },
    ],
  },
  process: [
    { instrument: "BR-003-p", line: "14-day fed-batch completed. Peak VCD 18 × 10⁶. Harvest 1.225 L." },
    { instrument: "CFG-003", line: "Cell removal complete. Yield recovery 94.2%." },
    { instrument: "UF-03", line: "Concentration and diafiltration complete. Final concentration 1.9 mg/mL." },
  ],
};

export function CampaignReportPanel() {
  return (
    <Card className="border-primary/30">
      {/* ── Report header ── */}
      <CardHeader className="py-3 px-4 border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
                Campaign Report
              </p>
              <Badge variant="warning" className="gap-1">
                <Clock className="h-2.5 w-2.5" />
                Pending Sign-off (OOS open)
              </Badge>
            </div>
            <CardTitle className="text-[16px] font-medium leading-tight mt-1.5 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              {REPORT.title}
            </CardTitle>
            <p className="text-[12px] text-text-secondary mt-1">
              <span className="font-mono">{REPORT.id}</span> · Generated {REPORT.generated}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 py-4 space-y-6">
        {/* 1. Campaign Summary */}
        <Section number={1} title="Campaign Summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 text-[12px]">
            <Field label="Campaign ID" value={REPORT.campaign.id} mono />
            <Field label="Product" value={REPORT.campaign.product} />
            <Field label="Cell Line" value={REPORT.campaign.cellLine} mono />
            <Field label="Process Dates" value={REPORT.campaign.dates} />
          </div>
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium mb-1.5">
              Linked Instrument Runs
            </p>
            <div className="flex flex-wrap gap-2">
              {REPORT.campaign.runs.map((r) => {
                const Icon = r.icon;
                return (
                  <div
                    key={r.instrument}
                    className="inline-flex items-center gap-1.5 rounded border border-border-tertiary bg-secondary/40 px-2 py-1"
                  >
                    <Icon className="h-3 w-3 text-primary" />
                    <span className="text-[11px] font-medium">{r.instrument}</span>
                    <span className="text-[11px] font-mono text-text-secondary">{r.runId}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </Section>

        <Separator />

        {/* 2. Process Overview */}
        <Section number={2} title="Process Overview">
          <ul className="space-y-1.5">
            {REPORT.process.map((p) => (
              <li key={p.instrument} className="flex items-start gap-2 text-[12px]">
                <span className="font-mono text-[11px] font-medium text-primary shrink-0 mt-0.5">
                  {p.instrument}
                </span>
                <span className="text-text-secondary">·</span>
                <span className="text-foreground">{p.line}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Separator />

        {/* 3. Alert Summary */}
        <Section number={3} title="Alert Summary">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Stat label="Total fired" value="2" />
            <Stat label="Resolved" value="1" tone="success" sub="Foam, Day 6" />
            <Stat label="Open" value="1" tone="warning" sub="NH₄⁺, Day 8" />
          </div>
        </Section>

        <Separator />

        {/* 4. QC Results Summary */}
        <Section number={4} title="QC Results Summary">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Stat label="Pass" value="10" tone="success" />
            <Stat label="OOS" value="1" tone="danger" sub="Glycation" />
            <Stat label="Status" value="Investigation" tone="warning" sub="Pending closure" />
          </div>
        </Section>

        <Separator />

        {/* 5. AI Insights Summary */}
        <Section number={5} title="AI Insights Summary">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <Stat label="Warnings" value="2" tone="warning" />
            <Stat label="Informational" value="3" tone="neutral" />
          </div>
          <div className="rounded-md bg-primary/[0.04] border border-primary/20 px-3 py-2 flex items-start gap-2">
            <Sparkles className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <p className="text-[12px] leading-relaxed">
              <span className="font-medium">Key recommendation:</span>{" "}
              <span className="text-text-secondary">
                review harvest trigger timing for next batch.
              </span>
            </p>
          </div>
        </Section>

        {/* ── Sign-off panel ── */}
        <div className="rounded-lg border border-border bg-secondary/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-text-secondary" />
            <p className="text-[13px] font-medium">Sign-off</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12px]">
            <div className="rounded border border-border-tertiary bg-card px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
                Prepared by
              </p>
              <p className="text-[12px] font-medium mt-0.5">Operator 20-456</p>
              <p className="text-[11px] text-text-secondary mt-0.5">2025-05-05 09:00 UTC</p>
            </div>
            <div className="rounded border border-dashed border-border-tertiary bg-card px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
                Reviewed by
              </p>
              <p className="text-[12px] font-medium mt-0.5 text-text-secondary italic">
                Supervisor sign-off
              </p>
              <Badge variant="danger" className="mt-1 gap-1 text-[10px]">
                <Lock className="h-2.5 w-2.5" /> BLOCKED
              </Badge>
            </div>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2.5 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-700 dark:text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-900 dark:text-amber-200 leading-relaxed">
              Report sign-off requires OOS investigation to be closed before Manager
              approval can proceed.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" disabled>
              <Lock className="h-3.5 w-3.5 mr-1.5" />
              Sign &amp; Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  number, title, children,
}: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center justify-center h-5 w-5 rounded bg-primary/10 text-primary text-[11px] font-medium">
          {number}
        </span>
        <h3 className="text-[13px] font-medium">{title}</h3>
      </div>
      <div className="pl-7">{children}</div>
    </section>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-wide text-text-secondary font-medium shrink-0 w-28">
        {label}
      </span>
      <span className={`text-[12px] ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}

function Stat({
  label, value, tone = "neutral", sub,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
  sub?: string;
}) {
  const toneCls =
    tone === "success" ? "text-emerald-600 dark:text-emerald-400"
    : tone === "warning" ? "text-amber-600 dark:text-amber-400"
    : tone === "danger" ? "text-destructive"
    : "text-foreground";
  return (
    <div className="rounded border border-border-tertiary bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
        {label}
      </p>
      <p className={`text-[16px] font-medium mt-0.5 ${toneCls}`}>{value}</p>
      {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
    </div>
  );
}
