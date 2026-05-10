/**
 * Phase 1 — Simulated AI Insights for FSH-Campaign-042.
 * Pre-written, deterministic insight cards (no live computation).
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle, Info, Sparkles, ExternalLink, X, FilePlus2, Clock,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Severity = "WARNING" | "INFO";

interface EvidenceLink {
  label: string;
  href?: string;
}

interface SimInsight {
  id: string;
  severity: Severity;
  title: string;
  body: React.ReactNode;
  evidence: EvidenceLink[];
  generatedAt: string;
}

const INSIGHTS: SimInsight[] = [
  {
    id: "SIM-INS-1",
    severity: "WARNING",
    title: "Ammonium accumulation risk detected in BR-003-p",
    body: (
      <>
        NH₄⁺ reached <strong>3.1 mM on Day 8</strong>, exceeding the 3.0 mM target threshold.
        Elevated ammonium is a known inhibitor of terminal glycosylation in CHO cells. This
        may be correlated with the observed OOS glycation result (Batch QC: SOP-AN-303).
      </>
    ),
    evidence: [
      { label: "NH₄⁺ Day 8 sample record S-R456-D8-NH4", href: "/data-storage" },
      { label: "QC Result: Glycation OOS (SOP-AN-303)", href: "/reports" },
    ],
    generatedAt: "2026-05-09T08:42:00",
  },
  {
    id: "SIM-INS-2",
    severity: "INFO",
    title: "Temperature shift executed on schedule — production phase optimised",
    body: (
      <>
        Temperature shift from <strong>37 °C to 33 °C</strong> was completed at Day 3 as per
        SOP-CULT-03.9. Sodium Butyrate 2 mM was co-administered. VCD peaked at
        18 × 10⁶ cells/mL within 24 hours of transition — consistent with expected protocol
        outcome.
      </>
    ),
    evidence: [
      { label: "Temperature chart Day 3 event marker", href: "/cho-production-line/bioreactor" },
      { label: "Feed event record Day 3", href: "/data-storage" },
    ],
    generatedAt: "2026-05-09T08:42:00",
  },
  {
    id: "SIM-INS-3",
    severity: "INFO",
    title: "UF/DF diafiltration endpoint confirmed",
    body: (
      <>
        Conductivity reached <strong>0.3 mS/cm</strong> in final retentate, consistent with
        successful buffer exchange. Offline analytical result (0.3 mS/cm) is within
        0.01 mS/cm of final online reading — high consistency.
      </>
    ),
    evidence: [
      { label: "UF-03 conductivity chart endpoint", href: "/cho-production-line/ultrafiltration" },
      { label: "Offline QC result: Buffer conductivity S-042-UF-perm-1", href: "/reports" },
    ],
    generatedAt: "2026-05-09T08:42:00",
  },
  {
    id: "SIM-INS-4",
    severity: "INFO",
    title: "Centrifuge yield recovery above target",
    body: (
      <>
        Yield recovery for run <strong>FSH-B042-24-C1</strong> was 94.2%, exceeding the 90%
        process target. No abnormal vibration or temperature excursions were recorded during
        the run.
      </>
    ),
    evidence: [
      { label: "CFG-003 run record FSH-B042-24-C1", href: "/cho-production-line/centrifuge" },
    ],
    generatedAt: "2026-05-09T08:42:00",
  },
  {
    id: "SIM-INS-5",
    severity: "WARNING",
    title: "OOS glycation result — harvest timing investigation recommended",
    body: (
      <>
        Glycation of <strong>0.03</strong> was recorded against a process target of ≤1.5%.
        Based on process history, elevated osmolality in late production phase
        (378 mOsm/kg at Day 12) and potential glucose over-feeding are candidate root causes.
        Consider earlier harvest trigger (viability 75% instead of 70%) in next batch.
      </>
    ),
    evidence: [
      { label: "QC Result: Glycation OOS (SOP-AN-303)", href: "/reports" },
      { label: "Osmolality Day 12 sample record", href: "/data-storage" },
      { label: "Feed event Day 12", href: "/data-storage" },
    ],
    generatedAt: "2026-05-09T08:42:00",
  },
];

const SEV_CONFIG: Record<Severity, { cls: string; icon: typeof AlertTriangle }> = {
  WARNING: {
    cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    icon: AlertTriangle,
  },
  INFO: {
    cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    icon: Info,
  },
};

export function SimulatedInsightsPanel() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = INSIGHTS.filter((i) => !dismissed.has(i.id));

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const handleAddToReport = (title: string) => {
    toast.success("Added to report draft", { description: title });
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-primary/30 bg-primary/[0.04] px-3 py-2.5 flex items-start gap-2">
        <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">
            AI-Ready Analytics — Simulated Insights (Phase 1)
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Recipe-based deterministic insights for campaign{" "}
            <span className="font-mono">FSH-Campaign-042</span>. Not real ML output.
          </p>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {visible.length} active
        </Badge>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-xs text-muted-foreground">
            All simulated insights dismissed.
          </CardContent>
        </Card>
      ) : (
        visible.map((ins) => {
          const cfg = SEV_CONFIG[ins.severity];
          const SevIcon = cfg.icon;
          return (
            <Card key={ins.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase ${cfg.cls}`}
                  >
                    <SevIcon className="h-3 w-3" />
                    {ins.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold">{ins.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {ins.body}
                    </p>
                  </div>
                </div>

                <div className="rounded-md bg-muted/40 border border-border/60 px-3 py-2 space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Evidence
                  </p>
                  <ul className="space-y-0.5">
                    {ins.evidence.map((e) => (
                      <li key={e.label}>
                        <a
                          href={e.href || "#"}
                          className="text-[11px] inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span>{e.label}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Generated {new Date(ins.generatedAt).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleDismiss(ins.id)}
                    >
                      <X className="h-3 w-3" /> Dismiss
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => handleAddToReport(ins.title)}
                    >
                      <FilePlus2 className="h-3 w-3" /> Add to Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
