import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
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
  BASE_ADDITION: "Base",
  ANTIFOAM: "Antifoam",
  INDUCER: "Inducer",
  ADDITIVE: "Additive",
  HARVEST: "Harvest",
  SAMPLE: "Sample",
  NOTE: "Note",
};

const FILTER_CHIPS: { id: string; label: string; types: string[] | null }[] = [
  { id: "ALL",      label: "All",      types: null },
  { id: "BASE",     label: "Base",     types: ["BASE_ADDITION"] },
  { id: "FEED",     label: "Feed",     types: ["FEED"] },
  { id: "ANTIFOAM", label: "Antifoam", types: ["ANTIFOAM"] },
  { id: "INDUCER",  label: "Inducer",  types: ["INDUCER"] },
];

interface ControlActionsPanelProps {
  events: ProcessEvent[];
  runStartTime: string;
  selectedEventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  canLogEvents: boolean;
  onLogEvent: () => void;
}

export function ControlActionsPanel({
  events,
  runStartTime,
  selectedEventId,
  onSelectEvent,
  canLogEvents,
  onLogEvent,
}: ControlActionsPanelProps) {
  const runStart = new Date(runStartTime).getTime();
  const [filter, setFilter] = useState<string>("ALL");

  // ── Feed status summary ──
  const feedSummary = useMemo(() => {
    const feeds = events.filter((e) => e.event_type === "FEED");
    const bases = events.filter((e) => e.event_type === "BASE_ADDITION");
    const antifoams = events.filter((e) => e.event_type === "ANTIFOAM");
    const lastFeed = feeds.length > 0 ? feeds[feeds.length - 1] : null;
    const lastFeedH = lastFeed
      ? ((new Date(lastFeed.timestamp).getTime() - runStart) / 3600000).toFixed(1)
      : null;
    return {
      totalFeeds: feeds.length,
      totalBases: bases.length,
      totalAntifoams: antifoams.length,
      lastFeedLine: lastFeed
        ? `Last feed: h${lastFeedH} — ${lastFeed.amount ?? "—"} ${lastFeed.amount_unit ?? ""}`.trim()
        : "No feeds logged yet",
    };
  }, [events, runStart]);

  // ── Filtered events ──
  const filteredEvents = useMemo(() => {
    const cfg = FILTER_CHIPS.find((c) => c.id === filter);
    if (!cfg || cfg.types == null) return events;
    return events.filter((e) => cfg.types!.includes(e.event_type));
  }, [events, filter]);

  return (
    <div className="flex flex-col h-full">
      {/* ── Feed Status ── */}
      <div className="p-4 stack-section">
        <h4 className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
          Feed Status
        </h4>

        {/* Single horizontal row — Feeds is the primary metric */}
        <div className="flex items-baseline gap-5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[20px] font-medium tabular-nums text-foreground leading-none">
              {feedSummary.totalFeeds}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-text-secondary">
              Feeds
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] tabular-nums text-foreground leading-none">
              {feedSummary.totalBases}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-text-secondary">
              Base Adds
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] tabular-nums text-foreground leading-none">
              {feedSummary.totalAntifoams}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-text-secondary">
              Antifoam
            </span>
          </div>
        </div>

        <p className="text-[12px] text-text-secondary">{feedSummary.lastFeedLine}</p>

        {canLogEvents && (
          <Button size="sm" className="w-full mt-1" onClick={onLogEvent}>
            Log Event / Additive
          </Button>
        )}
      </div>

      <div className="h-px bg-[hsl(var(--border-tertiary))]" />

      {/* ── Control Actions log ── */}
      <div className="p-4 pb-2 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Control Actions
          </h4>
          <span className="text-[11px] text-text-tertiary">
            {filteredEvents.length}
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-1.5">
          {FILTER_CHIPS.map((c) => {
            const active = filter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={
                  "h-[22px] px-2 rounded-pill text-[11px] font-medium uppercase tracking-wide transition-colors " +
                  (active
                    ? "bg-[hsl(var(--nav-active-bg))] text-primary"
                    : "bg-[hsl(var(--pill-neutral-bg))] text-text-secondary hover:text-foreground")
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <ScrollArea className="flex-1 px-4 pb-4">
        {filteredEvents.length === 0 ? (
          <p className="text-[12px] text-text-secondary py-3">No events match this filter.</p>
        ) : (
          <ul className="space-y-2">
            {filteredEvents.map((evt) => {
              const isSelected = selectedEventId === evt.id;
              const elapsed = ((new Date(evt.timestamp).getTime() - runStart) / 3600000).toFixed(1);
              const border = EVENT_BORDER[evt.event_type] ?? "#94a3b8";
              const label = EVENT_LABEL[evt.event_type] ?? evt.event_type;
              return (
                <li key={evt.id}>
                  <button
                    onClick={() => onSelectEvent(isSelected ? null : evt.id)}
                    className={
                      "w-full text-left rounded-md px-3 py-2 transition-colors " +
                      "border-l-[3px] hover:bg-accent/40 " +
                      (isSelected ? "bg-[hsl(var(--nav-active-bg))]" : "bg-transparent")
                    }
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
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollArea>
    </div>
  );
}
