import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceArea,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Link2, ShieldCheck } from "lucide-react";
import {
  Tooltip as UITooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";
import { QualitativeResultCard } from "./QualitativeResultCard";

/* =========================================================================
   Cycle: ~10.25 h (615 min)
   Phases (minutes):
     P1 Freezing             0  → 120  (shelf ramps to -45°C, holds)
     P2 Primary Drying     120  → 480  (shelf -20°C, P 0.12 mbar, 6 h)
     P3 Secondary Drying   480  → 600  (shelf +30°C, low P, 2 h)
     P4 Backfill/Stopper   600  → 615  (N2 backfill)
   ========================================================================= */
const PHASES = {
  freezeStart: 0,
  primaryStart: 120,
  secondaryStart: 480,
  backfillStart: 600,
  end: 615,
};

const TG_PRIME = -32; // collapse threshold

type Row = {
  t: number;            // minutes
  shelfT: number;       // °C
  productT: number;     // °C
  pressure: number;     // mbar
};

function clamp(x: number, a: number, b: number) { return Math.max(a, Math.min(b, x)); }

const SERIES: Row[] = (() => {
  const out: Row[] = [];
  for (let t = 0; t <= PHASES.end; t += 2) {
    let shelf: number;
    let product: number;
    let p: number;

    if (t < PHASES.primaryStart) {
      // Freezing: ambient 20 → -45 over 60 min, then hold 60 min
      const rampEnd = 60;
      if (t < rampEnd) shelf = 20 + (-45 - 20) * (t / rampEnd);
      else shelf = -45;
      // product lags ~5 min, supercooling drop near t=35
      const lag = 8;
      const tl = Math.max(0, t - lag);
      if (tl < rampEnd) product = 20 + (-40 - 20) * (tl / rampEnd);
      else product = -42 + Math.sin(t * 0.2) * 0.4;
      p = 1.0; // ambient (≈ atm reference normalized)
    } else if (t < PHASES.secondaryStart) {
      // Primary drying: shelf jumps to -20°C, pressure drops to 0.12 mbar
      const u = (t - PHASES.primaryStart) / (PHASES.secondaryStart - PHASES.primaryStart);
      // shelf step + small approach
      shelf = -45 + (-20 - -45) * clamp(u * 6, 0, 1);
      // product slowly warms but stays below Tg' (-32)
      // start near -42, climb to about -34 by end
      product = -42 + (-34 - -42) * u + Math.sin(t * 0.05) * 0.3;
      // pressure drops fast in first 10 min, then steady at 0.12
      const dropU = clamp((t - PHASES.primaryStart) / 10, 0, 1);
      p = 1.0 + (0.12 - 1.0) * dropU + Math.sin(t * 0.07) * 0.005;
    } else if (t < PHASES.backfillStart) {
      // Secondary drying: shelf to +30°C, pressure stays low (~0.05)
      const u = (t - PHASES.secondaryStart) / (PHASES.backfillStart - PHASES.secondaryStart);
      shelf = -20 + (30 - -20) * clamp(u * 4, 0, 1);
      product = -34 + (28 - -34) * u;
      p = 0.12 + (0.05 - 0.12) * clamp(u * 2, 0, 1) + Math.sin(t * 0.08) * 0.003;
    } else {
      // Backfill / stoppering
      const u = (t - PHASES.backfillStart) / (PHASES.end - PHASES.backfillStart);
      shelf = 30 - 10 * u;
      product = 28 - 6 * u;
      p = 0.05 + (0.95 - 0.05) * u; // N2 backfill toward ambient
    }

    out.push({
      t,
      shelfT: +shelf.toFixed(2),
      productT: +product.toFixed(2),
      pressure: +Math.max(0.001, p).toFixed(4),
    });
  }
  return out;
})();

/* Pirani-Manometer convergence (secondary drying) */
const CONVERGENCE: { t: number; pirani: number; manometer: number }[] = (() => {
  const out: { t: number; pirani: number; manometer: number }[] = [];
  // window: 7h → 9h (420 → 540 min), convergence at ~8h (480 min)
  for (let t = 420; t <= 540; t += 4) {
    const u = (t - 420) / 120;
    // Pirani reads higher (water vapor); converges down to manometer baseline
    const manometer = 0.06 + Math.sin(t * 0.1) * 0.002;
    const pirani = 0.06 + 0.18 * Math.exp(-u * 4) + Math.sin(t * 0.12) * 0.003;
    out.push({ t, pirani: +pirani.toFixed(4), manometer: +manometer.toFixed(4) });
  }
  return out;
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

function LPZMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>
        <MetadataField label="Equipment ID">LPZ-03</MetadataField>
        <MetadataField label="Operator Name">J. Smith</MetadataField>
        <MetadataField label="Start Time">
          <span className="tabular-nums">2025-04-25 08:32 UTC</span>
        </MetadataField>
        <MetadataField label="End Time">
          <span className="tabular-nums">2025-04-25 18:47 UTC</span>
          <span className="ml-2 text-[11px] text-text-secondary">(~10 h 15 min)</span>
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
              <div>DPY-01 (Depyrogenation Oven)</div>
              <div>FP-02 (Filling Pump)</div>
              <div className="mt-1 text-text-secondary">Lot spans 4 operations.</div>
            </TooltipContent>
          </UITooltip>
        </MetadataField>

        <MetadataField label="Number of Vials Loaded">
          <span className="tabular-nums">12,000</span>
        </MetadataField>

        <MetadataField label="Lyophilization Recipe">
          <span className="font-mono text-[12px]">FSH_Cycle_3</span>
        </MetadataField>

        <MetadataField label="Sterilization Cycle ID">
          <UITooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-mono text-[12px] hover:bg-amber-500/15 border border-amber-500/30"
              >
                <ShieldCheck className="h-3 w-3" />
                SIP_241015_02
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[280px] text-[11px]">
              <span className="font-medium">GxP prerequisite record — sterilisation must be confirmed before batch processing begins.</span>
              <div className="mt-1 text-text-secondary">Steam-in-Place · 2024-10-15</div>
              <div className="text-text-secondary">121 °C · 30 min hold · F₀ ≥ 15</div>
            </TooltipContent>
          </UITooltip>
        </MetadataField>

        <MetadataField label="Setpoint Temp (Freezing)">
          <span className="tabular-nums">−45 °C</span>
        </MetadataField>
        <MetadataField label="Setpoint Temp (Primary Drying)">
          <span className="tabular-nums">−20 °C</span>
        </MetadataField>
        <MetadataField label="Chamber Pressure Setpoint">
          <span className="tabular-nums">0.12 mbar</span>
        </MetadataField>
        <MetadataField label="Setpoint Temp (Secondary Drying)">
          <span className="tabular-nums">+30 °C</span>
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Phase strip
   ========================================================================= */
function PhaseStrip() {
  const segs = [
    {
      name: "Freezing",
      detail: "Shelf → −45 °C, hold",
      dur: PHASES.primaryStart - PHASES.freezeStart,
      color: "bg-sky-500/80",
    },
    {
      name: "Primary Drying",
      detail: "Shelf −20 °C · 0.12 mbar · sublimation of unbound water",
      dur: PHASES.secondaryStart - PHASES.primaryStart,
      color: "bg-emerald-500",
      highlight: true,
    },
    {
      name: "Secondary Drying",
      detail: "Shelf +30 °C · removal of bound water",
      dur: PHASES.backfillStart - PHASES.secondaryStart,
      color: "bg-orange-400/80",
    },
    {
      name: "Backfill & Stoppering",
      detail: "N₂ backfill · vials stoppered",
      dur: PHASES.end - PHASES.backfillStart,
      color: "bg-violet-500/80",
    },
  ];
  const total = PHASES.end;
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Lyophilization Phase Timeline</h3>
          <p className="text-[12px] text-text-secondary">FSH_Cycle_3 · 4 phases</p>
        </div>
        <div className="text-[12px] text-text-secondary">
          Total cycle:{" "}
          <span className="text-foreground tabular-nums">
            {Math.round(total / 60 * 10) / 10} h
          </span>
        </div>
      </div>

      <div className="flex h-9 w-full overflow-hidden rounded-md border border-border-tertiary">
        {segs.map((s) => (
          <div
            key={s.name}
            className={`${s.color} flex items-center justify-center text-[11px] font-medium text-white relative ${s.highlight ? "ring-2 ring-emerald-600 z-10" : ""}`}
            style={{ width: `${(s.dur / total) * 100}%` }}
            title={`${s.name} · ${s.dur} min`}
          >
            {Math.round((s.dur / total) * 100)}%
          </div>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            <div className="text-[11px] text-foreground tabular-nums mt-1">
              {Math.round(s.dur / 6) / 10} h
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========================================================================
   Multi-signal process chart (dual Y-axis)
   ========================================================================= */
function ProcessChart() {
  const xTicks = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540, 600];
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-foreground">Process Signals</h3>
          <Badge variant="warning">Critical</Badge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[hsl(217_91%_60%)]" /> Shelf temp
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0 border-t-2 border-dashed border-[hsl(0_84%_60%)]" /> Product temp
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[hsl(142_71%_45%)]" /> Pressure
          </span>
        </div>
      </div>
      <div className="h-[320px] w-full">
        <ResponsiveContainer>
          <LineChart data={SERIES} margin={{ top: 8, right: 50, bottom: 16, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />

            {/* Phase shading */}
            <ReferenceArea
              x1={PHASES.primaryStart} x2={PHASES.secondaryStart}
              fill="hsl(142 71% 45% / 0.05)" stroke="hsl(142 71% 45% / 0.25)" strokeDasharray="3 3"
              label={{ value: "Primary Drying", position: "insideTop", fill: "hsl(142 71% 35%)", fontSize: 11 }}
            />
            <ReferenceArea
              x1={PHASES.secondaryStart} x2={PHASES.backfillStart}
              fill="hsl(28 95% 53% / 0.05)" stroke="hsl(28 95% 53% / 0.25)" strokeDasharray="3 3"
              label={{ value: "Secondary", position: "insideTop", fill: "hsl(28 80% 40%)", fontSize: 11 }}
            />

            <XAxis
              type="number" dataKey="t" domain={[0, PHASES.end]}
              ticks={xTicks}
              tickFormatter={(v) => `${(v / 60).toFixed(0)}h`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              yAxisId="temp"
              domain={[-55, 35]}
              ticks={[-55, -45, -32, -20, 0, 20, 35]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={40}
              label={{ value: "°C", angle: -90, position: "insideLeft", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />
            <YAxis
              yAxisId="pres"
              orientation="right"
              domain={[0, 1.0]}
              ticks={[0, 0.12, 0.25, 0.5, 0.75, 1.0]}
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={44}
              label={{ value: "mbar", angle: 90, position: "insideRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
            />

            {/* Tg' collapse threshold */}
            <ReferenceLine
              yAxisId="temp" y={TG_PRIME}
              stroke="hsl(var(--destructive))" strokeDasharray="4 3"
              label={{ value: "Collapse threshold (Tg′ −32 °C)", position: "right", fill: "hsl(var(--destructive))", fontSize: 10 }}
            />
            {/* Pressure setpoint */}
            <ReferenceLine
              yAxisId="pres" y={0.12}
              stroke="hsl(142 71% 45%)" strokeDasharray="3 3"
              label={{ value: "P setpoint 0.12 mbar", position: "left", fill: "hsl(142 71% 35%)", fontSize: 10 }}
            />

            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(t) => `t = ${(Number(t) / 60).toFixed(2)} h (${t} min)`}
              formatter={(v: number, n: string) => {
                if (n === "pressure") return [`${v.toFixed(3)} mbar`, "Pressure"];
                if (n === "shelfT") return [`${v.toFixed(1)} °C`, "Shelf"];
                return [`${v.toFixed(1)} °C`, "Product"];
              }}
            />
            <Line
              yAxisId="temp" type="monotone" dataKey="shelfT"
              stroke="hsl(217 91% 60%)" strokeWidth={1.75}
              dot={false} isAnimationActive={false}
            />
            <Line
              yAxisId="temp" type="monotone" dataKey="productT"
              stroke="hsl(0 84% 60%)" strokeWidth={1.5} strokeDasharray="5 4"
              dot={false} isAnimationActive={false}
            />
            <Line
              yAxisId="pres" type="monotone" dataKey="pressure"
              stroke="hsl(142 71% 45%)" strokeWidth={1.75}
              dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* =========================================================================
   Pirani / Manometer convergence
   ========================================================================= */
function ConvergencePanel() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">
            Pirani / Manometer Convergence
          </h3>
          <p className="text-[12px] text-text-secondary">
            Drying endpoint: Pirani–Manometer convergence at t ≈ 8 h
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[hsl(280_70%_55%)]" /> Pirani
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 bg-[hsl(200_30%_40%)]" /> Manometer
          </span>
        </div>
      </div>
      <div className="h-[160px] w-full">
        <ResponsiveContainer>
          <LineChart data={CONVERGENCE} margin={{ top: 8, right: 16, bottom: 16, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
            <XAxis
              type="number" dataKey="t" domain={[420, 540]}
              ticks={[420, 450, 480, 510, 540]}
              tickFormatter={(v) => `${(v / 60).toFixed(1)}h`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={[0, 0.3]}
              tickFormatter={(v) => v.toFixed(2)}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={40}
            />
            <ReferenceLine
              x={480} stroke="hsl(var(--primary))" strokeDasharray="4 3"
              label={{ value: "Endpoint t≈8h", position: "top", fill: "hsl(var(--primary))", fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
              }}
              labelFormatter={(t) => `t = ${(Number(t) / 60).toFixed(2)} h`}
              formatter={(v: number, n: string) => [`${v.toFixed(3)} mbar`, n === "pirani" ? "Pirani" : "Manometer"]}
            />
            <Line type="monotone" dataKey="pirani"
              stroke="hsl(280 70% 55%)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            <Line type="monotone" dataKey="manometer"
              stroke="hsl(200 30% 40%)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
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
  const qualitative = [
    {
      name: "Cake Appearance",
      result: "White to off-white, uniform, intact, no collapse or shrinkage",
      spec: "Uniform cake, no collapse / shrinkage",
      method: "Visual inspection",
    },
    {
      name: "Reconstitution Time",
      result: "≤ 30 s for 2 mL vial",
      spec: "≤ 30 s",
      method: "Stopwatch / turbidity measurement",
    },
  ];
  return (
    <Card kind="operational" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border-tertiary flex items-baseline justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Quality Results</h3>
          <p className="text-[12px] text-text-secondary">Source: Quality metrics sheet</p>
        </div>
        <Badge variant="success">PASS</Badge>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border-tertiary">
        {qualitative.map((it) => (
          <QualitativeResultCard
            key={it.name}
            name={it.name}
            result={it.result}
            spec={it.spec}
            method={it.method}
          />
        ))}
        {/* Numeric result */}
        <div className="p-4">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Residual Moisture
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] text-foreground tabular-nums">≤ 1.0</span>
            <span className="text-[12px] text-text-secondary">%</span>
          </div>
          <dl className="mt-3 grid grid-cols-[90px_1fr] gap-y-1 text-[12px]">
            <dt className="text-text-secondary">Spec</dt><dd className="text-foreground">≤ 1.0 %</dd>
            <dt className="text-text-secondary">Method</dt><dd className="text-foreground">Karl Fischer titration</dd>
            <dt className="text-text-secondary">Status</dt><dd><Badge variant="success">PASS</Badge></dd>
          </dl>
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-border-tertiary flex items-start gap-2 bg-muted/30">
        <Info className="h-3.5 w-3.5 mt-0.5 text-text-secondary shrink-0" />
        <p className="text-[11px] text-text-secondary">
          Qualitative results (quoted) are recorded as structured text attributes,
          distinct from numeric pass/fail measurements.
        </p>
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */
export function LyophilizerView() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <PhaseStrip />
          <ProcessChart />
          <ConvergencePanel />
          <QualityResults />
        </div>
        <LPZMetadataPanel />
      </div>
    </TooltipProvider>
  );
}
