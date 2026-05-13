import { useNavigate } from "react-router-dom";
import { Layers, AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";

/**
 * Persistent campaign banner — shown above main content on every authenticated view.
 * Surfaces campaign ID, product, instrument count, and a clickable open-items count.
 */
export function GlobalCampaignBanner() {
  const navigate = useNavigate();

  const openItems = [
    { label: "Material balance — FP-02 vial count discrepancy (+500)", route: "/cho-production-line/filling-pump", severity: "HIGH" as const },
    { label: "QC OOS — BR-003-p Glycation", route: "/cho-production-line/bioreactor", severity: "OOS" as const },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="border-b border-border-tertiary bg-[hsl(var(--nav-active-bg))]/60 px-6 py-1.5">
        <div className="flex items-center gap-3 text-[12px] flex-wrap">
          <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] uppercase tracking-wide text-text-secondary font-medium">
            Campaign
          </span>
          <span className="font-mono text-foreground">FSH-Campaign-042</span>
          <span className="text-text-secondary">|</span>
          <span className="text-foreground">rhFSH</span>
          <span className="text-text-secondary">|</span>
          <span className="text-text-secondary">9 instruments</span>
          <span className="text-text-secondary">|</span>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => navigate("/alerts")}
                className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-amber-500/15 transition-colors"
              >
                <AlertTriangle className="h-3 w-3 text-amber-600" />
                <span className="text-foreground font-medium">2 open items</span>
                <ChevronRight className="h-3 w-3 text-text-secondary" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[340px] text-[11px] p-0">
              <div className="px-3 py-2 border-b border-border-tertiary text-text-secondary">
                Open items requiring review before campaign closure
              </div>
              <ul className="py-1">
                {openItems.map((it) => (
                  <li key={it.label} className="px-3 py-1.5 flex items-start gap-2">
                    <Badge variant={it.severity === "OOS" ? "danger" : "warning"}>
                      {it.severity}
                    </Badge>
                    <span className="text-foreground">{it.label}</span>
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>

          <Badge variant="warning" className="ml-auto">In Progress</Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}
