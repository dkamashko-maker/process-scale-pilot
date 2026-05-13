import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Info, Link2 } from "lucide-react";
import {
  Tooltip as UITooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";

/* =========================================================================
   Synthetic time-series — heat up 12.5°C/min, hold 30 min @ 250°C, cool 5.2°C/min
   Total ~ 195 min (3h15)
   ========================================================================= */
const AMBIENT = 22;
const SETPOINT = 250;
const HEAT_RATE = 12.5;
const COOL_RATE = 5.2;
const HEAT_DUR = (SETPOINT - AMBIENT) / HEAT_RATE; // ~18.24 min
const HOLD_DUR = 30;
const COOL_DUR = (SETPOINT - 50) / COOL_RATE;      // ~38.46 min
const TOTAL = Math.round(HEAT_DUR + HOLD_DUR + COOL_DUR + 100); // pad with pre/post settle

type Row = { t: number; temp: number; dp: number };

const SERIES: Row[] = (() => {
  const out: Row[] = [];
  // Pre-cycle settle 5 min at ambient
  const PRE = 5;
  const heatStart = PRE;
  const holdStart = heatStart + HEAT_DUR;
  const coolStart = holdStart + HOLD_DUR;
  const coolEnd = coolStart + COOL_DUR;
  const POST_END = Math.min(TOTAL, Math.ceil(coolEnd + 10));

  for (let t = 0; t <= POST_END; t++) {
    let temp = AMBIENT;
    if (t < heatStart) temp = AMBIENT;
    else if (t < holdStart) temp = AMBIENT + HEAT_RATE * (t - heatStart);
    else if (t < coolStart) temp = SETPOINT + (Math.sin(t * 0.6) * 0.4); // small oscillation
    else if (t < coolEnd) temp = SETPOINT - COOL_RATE * (t - coolStart);
    else temp = 50;
    // Differential pressure stable ~15 Pa
    const dp = +(15 + Math.sin(t * 0.3) * 0.6).toFixed(2);
    out.push({ t, temp: +temp.toFixed(1), dp });
  }
  return out;
})();

const PHASE = (() => {
  const PRE = 5;
  const heatStart = PRE;
  const holdStart = heatStart + HEAT_DUR;
  const coolStart = holdStart + HOLD_DUR;
  const coolEnd = coolStart + COOL_DUR;
  return { heatStart, holdStart, coolStart, coolEnd };
})();

/* =========================================================================
   Metadata panel
   ========================================================================= */
function MetadataField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">{label}</dt>
      <dd className="text-[13px] text-foreground">{children}</dd>
    </div>
  );
}

function CorrectedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      <AlertTriangle className="h-2.5 w-2.5" />
      Source corrected
    </span>
  );
}

function DPYMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>

        <MetadataField label="Equipment ID">
          <div className="flex items-center gap-2 flex-wrap">
            <span>DPY-01</span>
            <CorrectedBadge />
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            Source file showed <span className="font-mono line-through">VW-03</span>
          </div>
        </MetadataField>

        <MetadataField label="Operator">J. Smith</MetadataField>

        <MetadataField label="Start">
          <span className="tabular-nums">2025-04-24 11:30 UTC</span>
        </MetadataField>
        <MetadataField label="End">
          <span className="tabular-nums">2025-04-24 14:45 UTC</span>
        </MetadataField>

        <MetadataField label="Vial Lot Number">
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-primary/10 text-primary font-mono text-[12px] hover:bg-primary/15"
              >
                <Link2 className="h-3 w-3" />
                VL-9876
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[260px] text-[11px]">
              <span className="font-medium">Lot also processed by:</span>
              <div className="mt-1">VW-03 (Vial Washer)</div>
              <div>FP-02 (Filling Pump)</div>
              <div>LPZ-03 (Lyophilizer)</div>
              <div className="mt-1 text-text-secondary">Lot spans 4 operations.</div>
            </TooltipContent>
          </UITooltip>
        </MetadataField>

        <MetadataField label="Cycle Program">
          <span className="font-mono text-[12px]">DP-250-30</span>
        </MetadataField>
        <MetadataField label="Setpoint Temperature">
          <span className="tabular-nums">250 °C</span>
        </MetadataField>
        <MetadataField label="Hold Time">
          <span className="tabular-nums">30 min</span>
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Cycle phase timeline
   ========================================================================= */
function CyclePhaseStrip() {
  const heat = HEAT_DUR;
  const hold = HOLD_DUR;
  const cool = COOL_DUR;
  const total = heat + hold + cool;
  const segs = [
    { name: "Heat-up ramp", detail: "12.5 °C/min · ambient → 250 °C", dur: heat, color: "bg-orange-400/70" },
    { name: "Hold @ 250 °C", detail: "30 min · qualified depyrogenation", dur: hold, color: "bg-emerald-500", highlight: true },
    { name: "Cooling", detail: "5.2 °C/min · 250 → ~50 °C", dur: cool, color: "bg-sky-400/70" },
  ];
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Cycle Phase Timeline</h3>
          <p className="text-[12px] text-text-secondary">DP-250-30 programme · 3 phases</p>
        </div>
        <div className="text-[12px] text-text-secondary">
          Total cycle time:{" "}
          <span className="text-foreground tabular-nums">{Math.round(total)} min</span>{" "}
          (~3 h 15 min)
        </div>
      </div>

      <div className="flex h-9 w-full overflow-hidden rounded-md border border-border-tertiary">
        {segs.map((s) => (
          <div
            key={s.name}
            className={`${s.color} flex items-center justify-center text-[11px] font-medium text-white relative ${s.highlight ? "ring-2 ring-emerald-600 z-10" : ""}`}
            style={{ width: `${(s.dur / total) * 100}%` }}
            title={`${s.name} · ${s.dur.toFixed(1)} min`}
          >
            {Math.round((s.dur / total) * 100)}%
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {segs.map((s, i) => (
          <div
            key={s.name}
            className={`rounded-md border p-2.5 ${s.highlight ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/15" : "border-border-tertiary bg-background"}`}
          >
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              Phase {i + 1}
              {s.highlight && <Badge variant="success" className="ml-1.5 align-middle">Critical</Badge>}
            </div>
            <div className="text-[13px] text-foreground mt-0.5">{s.name}</div>
            <div className="text-[11px] text-text-secondary mt-0.5">{s.detail}</div>
            <div className="text-[11px] text-foreground tabular-nums mt-1">{s.dur.toFixed(1)} min</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========================================================================
   Parameter charts
   ========================================================================= */
function TemperatureChart() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-foreground">Chamber Temperature</h3>
          <Badge variant="warning">Critical</Badge>
        </div>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">°C</span>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer>
          <LineChart data={SERIES} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />

            {/* Critical alert band: <240°C during hold */}
            <ReferenceArea
              x1={PHASE.holdStart} x2={PHASE.coolStart}
              y1={0} y2={240}
              fill="hsl(var(--destructive) / 0.08)"
              stroke="hsl(var(--destructive) / 0.3)"
              strokeDasharray="3 3"
            />
            {/* Hold window highlight */}
            <ReferenceArea
              x1={PHASE.holdStart} x2={PHASE.coolStart}
              fill="hsl(142 71% 45% / 0.06)"
              stroke="hsl(142 71% 45% / 0.4)"
              strokeDasharray="4 4"
              label={{ value: "Hold @ 250°C", position: "insideTop", fill: "hsl(142 71% 35%)", fontSize: 11 }}
            />

            <XAxis
              type="number" dataKey="t" domain={[0, "dataMax"]}
              ticks={[0, 30, 60, 90, 120, 150, 180]}
              tickFormatter={(v) => `${v}m`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={[0, 280]} ticks={[0, 50, 100, 150, 200, 240, 250]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={40}
            />
            <ReferenceLine
              y={SETPOINT} stroke="hsl(var(--primary))" strokeDasharray="5 4"
              label={{ value: "Setpoint 250 °C", position: "right", fill: "hsl(var(--primary))", fontSize: 10 }}
            />
            <ReferenceLine
              y={240} stroke="hsl(var(--destructive))" strokeDasharray="3 3"
              label={{ value: "Min hold 240 °C", position: "left", fill: "hsl(var(--destructive))", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(t) => `t = ${t} min`}
              formatter={(v: number) => [`${v.toFixed(1)} °C`, "Chamber"]}
            />
            <Line
              type="monotone" dataKey="temp"
              stroke="hsl(217 91% 60%)" strokeWidth={1.75}
              dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PressureChart() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[14px] font-medium text-foreground">Differential Pressure</h3>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">Pa</span>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer>
          <LineChart data={SERIES} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
            <ReferenceArea
              y1={5} y2={25}
              fill="hsl(142 71% 45% / 0.08)"
              stroke="hsl(142 71% 45% / 0.30)"
              strokeDasharray="3 3"
            />
            <XAxis
              type="number" dataKey="t" domain={[0, "dataMax"]}
              ticks={[0, 30, 60, 90, 120, 150, 180]}
              tickFormatter={(v) => `${v}m`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={[0, 30]} ticks={[0, 5, 15, 25, 30]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={36}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
              }}
              labelFormatter={(t) => `t = ${t} min`}
              formatter={(v: number) => [`${v.toFixed(2)} Pa`, "ΔP"]}
            />
            <Line
              type="monotone" dataKey="dp"
              stroke="hsl(28 95% 53%)" strokeWidth={1.5}
              dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* =========================================================================
   Quality results
   ========================================================================= */
function QualityResults() {
  return (
    <Card kind="operational" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border-tertiary flex items-baseline justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Quality Results</h3>
          <p className="text-[12px] text-text-secondary">Source: Quality metrics sheet</p>
        </div>
        <Badge variant="success">PASS</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border-tertiary">
        {/* Endotoxin LRV */}
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Endotoxin LRV
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] text-foreground tabular-nums">3.2</span>
            <span className="text-[12px] text-text-secondary">LRV</span>
          </div>
          <dl className="mt-3 grid grid-cols-[110px_1fr] gap-y-1 text-[12px]">
            <dt className="text-text-secondary">Specification</dt><dd className="text-foreground">≥ 3.0 LRV</dd>
            <dt className="text-text-secondary">Method</dt><dd className="text-foreground">LAL assay (biological indicators)</dd>
            <dt className="text-text-secondary">Status</dt><dd><Badge variant="success">PASS</Badge></dd>
          </dl>
        </div>

        {/* F_H computed parameter */}
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              F_H Value (heat lethality integral)
            </span>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-text-secondary hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[300px] text-[11px]">
                F_H is the time-temperature integral above 170 °C, analogous to F_0 in steam sterilisation.
                The DP-250-30 programme is validated to deliver ≥ 3 LRV endotoxin reduction.
              </TooltipContent>
            </UITooltip>
            <Badge variant="neutral" className="ml-1">Computed</Badge>
          </div>
          <div className="mt-2 text-[13px] text-foreground">
            ≥ 3.0 LRV confirmed at <span className="tabular-nums">250 °C</span> for{" "}
            <span className="tabular-nums">30 min</span> hold
          </div>
          <div className="mt-2 text-[11px] text-text-secondary">
            Derived from chamber temperature integral · DP-250-30 validated programme
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */
export function DepyrogenationView() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <CyclePhaseStrip />
          <TemperatureChart />
          <PressureChart />
          <QualityResults />
        </div>
        <DPYMetadataPanel />
      </div>
    </TooltipProvider>
  );
}
