import { useMemo } from "react";
import type { ProcessEvent } from "@/data/runTypes";

interface ControlActionsPanelProps {
  events: ProcessEvent[];
  runStartTime: string;
  basalMedium?: string;
  feedMedium?: string;
}

export function ControlActionsPanel({
  events,
  runStartTime,
  basalMedium,
  feedMedium,
}: ControlActionsPanelProps) {
  const runStart = new Date(runStartTime).getTime();

  // ── Feed status summary ──
  const feedSummary = useMemo(() => {
    const feeds = events.filter((e) => e.event_type === "FEED");
    const lastFeed = feeds.length > 0 ? feeds[feeds.length - 1] : null;
    const lastFeedH = lastFeed
      ? ((new Date(lastFeed.timestamp).getTime() - runStart) / 3600000).toFixed(1)
      : null;
    return {
      totalFeeds: feeds.length,
      lastFeedLine: lastFeed
        ? `Last feed: h${lastFeedH} \u2014 ${lastFeed.amount ?? "\u2014"} ${lastFeed.amount_unit ?? ""}`.trim()
        : "No feeds logged yet",
    };
  }, [events, runStart]);

  return (
    <div className="p-4 space-y-3">
      {/* ── Feed & Media Summary ── */}
      <h4 className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
        Feed & Media Summary
      </h4>

      {/* Primary metric: total feeds */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-[20px] font-medium tabular-nums text-foreground leading-none">
          {feedSummary.totalFeeds}
        </span>
        <span className="text-[11px] uppercase tracking-wide text-text-secondary">
          Total feeds
        </span>
      </div>

      <p className="text-[12px] text-text-secondary">{feedSummary.lastFeedLine}</p>

      {/* Media metadata */}
      {(basalMedium || feedMedium) && (
        <div className="space-y-1.5 pt-2 mt-1 border-t border-[hsl(var(--border-tertiary))]">
          {basalMedium && (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-text-secondary">Basal Growth Medium</span>
              <span className="font-medium text-foreground truncate max-w-[160px]" title={basalMedium}>
                {basalMedium}
              </span>
            </div>
          )}
          {feedMedium && (
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <span className="text-text-secondary">Feed Medium</span>
              <span className="font-medium text-foreground truncate max-w-[160px]" title={feedMedium}>
                {feedMedium}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
