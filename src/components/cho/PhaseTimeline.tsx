import { Sprout, ThermometerSun, Beaker, Pill, Droplet, Syringe } from "lucide-react";
import { Card } from "@/components/ui/card";

type Phase = {
  num: number;
  name: string;
  startDay: number;
  endDay: number;
  current?: boolean;
};

const PHASES: Phase[] = [
  { num: 1, name: "Seeding & Lag", startDay: 0, endDay: 1 },
  { num: 2, name: "Exponential Growth", startDay: 1, endDay: 3 },
  { num: 3, name: "Transition & Temperature Shift", startDay: 3, endDay: 4 },
  { num: 4, name: "Production Phase", startDay: 4, endDay: 12, current: true },
  { num: 5, name: "Harvest", startDay: 12, endDay: 14 },
];

const TOTAL_DAYS = 14;

type EventType = "inoculation" | "tshift" | "feed" | "additive";

const EVENTS: {
  day: number;
  time: string;
  phaseNum: number;
  type: EventType;
  title: string;
  detail: string;
  operator: string;
}[] = [
  {
    day: 0, time: "06:00", phaseNum: 1, type: "inoculation",
    title: "Phase 1 Start: Inoculation",
    detail: "VCD 0.5 × 10⁶ cells/mL",
    operator: "20-456",
  },
  {
    day: 3, time: "14:00", phaseNum: 3, type: "tshift",
    title: "Phase 3 Start: Temperature shift 37 °C → 33 °C",
    detail: "Sodium Butyrate 2 mM added",
    operator: "20-456",
  },
  {
    day: 4, time: "08:00", phaseNum: 4, type: "feed",
    title: "Phase 4 Start: First bolus feed 50 mL EfficientFeed C+",
    detail: "Galactose 10 mM added",
    operator: "20-456",
  },
  {
    day: 5, time: "09:00", phaseNum: 4, type: "additive",
    title: "Z-VAD-fmk 20 µM added",
    detail: "Apoptosis inhibitor",
    operator: "20-456",
  },
];

const TYPE_ICON: Record<EventType, typeof Sprout> = {
  inoculation: Sprout,
  tshift: ThermometerSun,
  feed: Droplet,
  additive: Syringe,
};

const TYPE_LABEL: Record<EventType, string> = {
  inoculation: "Inoculation",
  tshift: "T-Shift",
  feed: "Feed",
  additive: "Additive",
};

const TYPE_TINT: Record<EventType, string> = {
  inoculation: "text-emerald-600 bg-emerald-50",
  tshift: "text-amber-600 bg-amber-50",
  feed: "text-blue-600 bg-blue-50",
  additive: "text-purple-600 bg-purple-50",
};

export function PhaseTimeline() {
  return (
    <Card kind="operational" className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-section text-foreground">Process Timeline</h3>
        <span className="text-[12px] text-text-secondary">Day 0 → Day {TOTAL_DAYS}</span>
      </div>

      {/* Phase strip */}
      <div className="flex w-full overflow-hidden rounded-md border border-border-tertiary">
        {PHASES.map((p, idx) => {
          const widthPct = ((p.endDay - p.startDay) / TOTAL_DAYS) * 100;
          const isCurrent = p.current;
          return (
            <div
              key={p.num}
              className={[
                "px-3 py-2.5 flex flex-col gap-0.5 min-w-0 border-r border-border-tertiary last:border-r-0 transition-colors",
                isCurrent
                  ? "bg-[hsl(var(--nav-active-bg))] text-foreground"
                  : "bg-background text-text-secondary",
              ].join(" ")}
              style={{ width: `${widthPct}%` }}
              title={`Phase ${p.num}: ${p.name} — Day ${p.startDay}${p.endDay !== p.startDay ? `–${p.endDay}` : ""}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] uppercase tracking-wide font-medium">
                  Phase {p.num}
                </span>
                {isCurrent && (
                  <span className="text-[10px] uppercase tracking-wide text-primary font-medium">
                    · Current
                  </span>
                )}
              </div>
              <div className={`text-[12px] truncate ${isCurrent ? "text-foreground font-medium" : ""}`}>
                {p.name}
              </div>
              <div className="text-[11px] opacity-70">
                Day {p.startDay}{p.endDay !== p.startDay ? `–${p.endDay}` : ""}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day axis */}
      <div className="relative mt-1.5 h-4 text-[10px] text-text-secondary">
        {[0, 1, 3, 4, 12, 14].map((d) => (
          <span
            key={d}
            className="absolute -translate-x-1/2"
            style={{ left: `${(d / TOTAL_DAYS) * 100}%` }}
          >
            D{d}
          </span>
        ))}
      </div>

      {/* Phase events */}
      <div className="mt-5">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-[13px] font-medium text-foreground">Phase Events</h4>
          <span className="text-[11px] text-text-secondary uppercase tracking-wide">
            {EVENTS.length} entries
          </span>
        </div>
        <ul className="divide-y divide-border-tertiary border border-border-tertiary rounded-md">
          {EVENTS.map((e, i) => {
            const Icon = TYPE_ICON[e.type];
            return (
              <li key={i} className="flex items-start gap-3 px-3 py-2.5">
                <div
                  className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${TYPE_TINT[e.type]}`}
                  aria-hidden
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] text-foreground font-medium tabular-nums">
                      Day {e.day}, {e.time}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-text-secondary">
                      Phase {e.phaseNum}
                    </span>
                    <span className="text-[11px] uppercase tracking-wide text-text-secondary">
                      · {TYPE_LABEL[e.type]}
                    </span>
                  </div>
                  <div className="text-[13px] text-foreground mt-0.5">{e.title}</div>
                  <div className="text-[12px] text-text-secondary mt-0.5">{e.detail}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wide text-text-secondary">Operator</div>
                  <div className="text-[12px] text-foreground tabular-nums">{e.operator}</div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

// Silence unused-import lint for icons reserved for future event types
void Beaker; void Pill;
