import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Pipette, FlaskConical, Droplets, Beaker, Syringe, StickyNote, PackageOpen, TestTube } from "lucide-react";
import { format } from "date-fns";
import type { ProcessEvent } from "@/data/runTypes";

const EVENT_ICONS: Record<string, typeof FlaskConical> = {
  FEED: FlaskConical,
  BASE_ADDITION: Pipette,
  ANTIFOAM: Droplets,
  INDUCER: Beaker,
  ADDITIVE: Syringe,
  HARVEST: PackageOpen,
  SAMPLE: TestTube,
  NOTE: StickyNote,
};

const EVENT_COLORS: Record<string, string> = {
  FEED: "text-chart-1",
  BASE_ADDITION: "text-chart-2",
  ANTIFOAM: "text-chart-3",
  INDUCER: "text-chart-4",
  ADDITIVE: "text-chart-5",
  HARVEST: "text-destructive",
  SAMPLE: "text-muted-foreground",
  NOTE: "text-muted-foreground",
};

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

  // Feed status summary
  const feedSummary = useMemo(() => {
    const feeds = events.filter((e) => e.event_type === "FEED");
    const bases = events.filter((e) => e.event_type === "BASE_ADDITION");
    const antifoams = events.filter((e) => e.event_type === "ANTIFOAM");
    const lastFeed = feeds.length > 0 ? feeds[feeds.length - 1] : null;
    return {
      totalFeeds: feeds.length,
      totalBases: bases.length,
      totalAntifoams: antifoams.length,
      lastFeedTime: lastFeed ? format(new Date(lastFeed.timestamp), "MM-dd HH:mm") : "—",
      lastFeedAmount: lastFeed ? `${lastFeed.amount} ${lastFeed.amount_unit}` : "—",
    };
  }, [events]);

  return (
    <div className="flex flex-col h-full">
      {/* Feed Status */}
      <div className="p-3 space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Feed Status</h4>
        <div className="grid grid-cols-3 gap-2">
          <div className="border rounded-md p-2 text-center">
            <p className="text-lg font-bold">{feedSummary.totalFeeds}</p>
            <p className="text-[10px] text-muted-foreground">Feeds</p>
          </div>
          <div className="border rounded-md p-2 text-center">
            <p className="text-lg font-bold">{feedSummary.totalBases}</p>
            <p className="text-[10px] text-muted-foreground">Base Adds</p>
          </div>
          <div className="border rounded-md p-2 text-center">
            <p className="text-lg font-bold">{feedSummary.totalAntifoams}</p>
            <p className="text-[10px] text-muted-foreground">Antifoam</p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Last feed: <span className="font-medium text-foreground">{feedSummary.lastFeedTime}</span> — {feedSummary.lastFeedAmount}
        </div>
      </div>

      <Separator />

      {/* Action buttons */}
      {canLogEvents && (
        <div className="p-3">
          <Button size="sm" className="w-full" onClick={onLogEvent}>
            Log Event / Additive
          </Button>
        </div>
      )}

      <Separator />

      {/* Event timeline */}
      <div className="p-3 pb-1">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Control Actions</h4>
        <p className="text-[10px] text-muted-foreground mt-0.5">Click to highlight on chart</p>
      </div>
      <ScrollArea className="flex-1 px-3 pb-3">
        <div className="space-y-1">
          {events.map((evt) => {
            const Icon = EVENT_ICONS[evt.event_type] || StickyNote;
            const colorClass = EVENT_COLORS[evt.event_type] || "text-muted-foreground";
            const elapsed = ((new Date(evt.timestamp).getTime() - runStart) / 3600000).toFixed(1);
            const isSelected = selectedEventId === evt.id;

            return (
              <button
                key={evt.id}
                onClick={() => onSelectEvent(isSelected ? null : evt.id)}
                className={`w-full text-left rounded-md p-2 text-xs transition-colors flex items-start gap-2 ${
                  isSelected
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${colorClass}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0">{evt.event_type}</Badge>
                    {evt.subtype && <span className="text-muted-foreground truncate">{evt.subtype}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-muted-foreground">h{elapsed}</span>
                    {evt.amount != null && (
                      <span className="font-medium">{evt.amount} {evt.amount_unit}</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
