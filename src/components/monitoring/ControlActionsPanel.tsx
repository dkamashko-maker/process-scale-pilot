import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ProcessEvent } from "@/data/runTypes";

/**
 * Event-type colour map for the right-rail log.
 * Spec: blue=base · green=feed · amber=antifoam · purple=inducer.
 */
const EVENT_BORDER: Record<string, string> = {
  FEED:          "#22c55e",
  BASE_ADDITION: "#3b82f6",
  ANTIFOAM:      "#f59e0b",
  INDUCER:       "#a855f7",
  ADDITIVE:      "#ec4899",
  HARVEST:       "#ef4444",
  SAMPLE:        "#06b6d4",
  NOTE:          "#94a3b8",
};

const EVENT_LABEL: Record<string, string> = {
  FEED: "Feed",
  BASE_ADDITION: "Base addition",
  ANTIFOAM: "Antifoam",
  INDUCER: "Inducer",
  ADDITIVE: "Additive",
  HARVEST: "Harvest",
  SAMPLE: "Sample",
  NOTE: "Note",
};

interface ControlActionsPanelProps {
  events: ProcessEvent[];
  runStartTime: string;
  canLogEvents: boolean;
  onLogEvent: () => void;
  basalMedium?: string;
  feedMedium?: string;
}

export function ControlActionsPanel({
  events,
  runStartTime,
  canLogEvents,
  onLogEvent,
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
        ? `Last feed: h${lastFeedH} — ${lastFeed.amount ?? "—"} ${lastFeed.amount_unit ?? ""}`.trim()
        : "No feeds logged yet",
    };
  }, [events, runStart]);

  // ── Recent process events (read-only, most recent first) ──
  const recentEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Feed & Media Summary ── */}
      <div className="p-4 stack-section">
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
          <div className="space-y-1 pt-2 mt-1 border-t border-[hsl(var(--border-tertiary))]">
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

        {canLogEvents && (
          <Button size="sm" className="w-full mt-1" onClick={onLogEvent}>
            Log Event / Additive
          </Button>
        )}
      </div>

      <div className="h-px bg-[hsl(var(--border-tertiary))]" />

      {/* ── Recent process events (read-only) ── */}
      <div className="p-4 pb-2 flex items-center justify-between gap-2">
        <h4 className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
          Recent process events
        </h4>
        <span className="text-[11px] text-text-tertiary">{recentEvents.length}</span>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        {recentEvents.length === 0 ? (
          <p className="text-[12px] text-text-secondary py-3">No process events recorded yet.</p>
        ) : (
          <ul className="space-y-2">
            {recentEvents.map((evt) => {
              const elapsed = ((new Date(evt.timestamp).getTime() - runStart) / 3600000).toFixed(1);
              const border = EVENT_BORDER[evt.event_type] ?? "#94a3b8";
              const label = EVENT_LABEL[evt.event_type] ?? evt.event_type;
              return (
                <li
                  key={evt.id}
                  className="rounded-md px-3 py-2 border-l-[3px] bg-transparent"
                  style={{ borderLeftColor: border }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                      {label}
                    </span>
                    {evt.amount != null && (
                      <span className="text-[12px] font-medium tabular-nums text-foreground whitespace-nowrap">
                        {evt.amount} {evt.amount_unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-3 mt-0.5">
                    <span className="text-[11px] text-text-secondary tabular-nums">h{elapsed}</span>
                    {evt.subtype && (
                      <span className="text-[11px] text-text-tertiary truncate max-w-[120px]">
                        {evt.subtype}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
