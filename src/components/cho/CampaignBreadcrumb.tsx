/**
 * CampaignBreadcrumb — persistent banner shown on all CHO instrument views.
 * Surfaces the parent campaign + instrument-specific batch/run identifiers.
 */
import { ChevronRight, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InstrumentRef {
  /** Display label for the instrument batch ID (or batch + run). */
  primary: string;
  /** Optional secondary line (e.g. "Run FSH-B042-24-C1"). */
  secondary?: string;
}

interface Props {
  campaignId?: string;
  instrument: string;        // e.g. "BR-003-p"
  refs: InstrumentRef[];     // batch IDs etc.
  status?: "in-progress" | "complete";
}

const STATUS_LABEL: Record<NonNullable<Props["status"]>, { label: string; variant: "warning" | "success" }> = {
  "in-progress": { label: "In Progress", variant: "warning" },
  complete: { label: "Complete", variant: "success" },
};

export function CampaignBreadcrumb({
  campaignId = "FSH-Campaign-042",
  instrument,
  refs,
  status = "in-progress",
}: Props) {
  const cfg = STATUS_LABEL[status];
  return (
    <div className="mb-4 rounded-md border border-border-tertiary bg-[hsl(var(--nav-active-bg))] px-4 py-2.5">
      <div className="flex items-center gap-2 flex-wrap text-[12px]">
        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
          Campaign
        </span>
        <span className="font-mono text-foreground">{campaignId}</span>
        <Badge variant={cfg.variant} className="text-[10px]">{cfg.label}</Badge>
        <ChevronRight className="h-3 w-3 text-text-secondary mx-1" />
        <span className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
          Instrument
        </span>
        <span className="font-mono text-foreground">{instrument}</span>
      </div>
      <div className="mt-1.5 pl-5 flex flex-wrap gap-x-5 gap-y-0.5">
        {refs.map((r, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
              {i === 0 ? "Batch ID" : "Run"}
            </span>
            <span className="font-mono text-[11px] text-foreground">{r.primary}</span>
            {r.secondary && (
              <span className="text-[11px] text-text-secondary">· {r.secondary}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
