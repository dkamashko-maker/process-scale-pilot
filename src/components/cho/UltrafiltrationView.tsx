import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Info } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/* =========================================================================
   Run timeline: 0 → 255 min (4h15)
   Concentration: 0–150 min  ·  Diafiltration: 150–255 min
   ========================================================================= */

const TOTAL_MIN = 255;
const PHASE_SWITCH = 150;
const SAMPLES_PER_MIN = 1;

function feedFlow(_t: number) { return +(1.8 + Math.sin(_t * 0.05) * 0.03).toFixed(3); }
function permeateFlow(t: number) {
  // 0.9 → 0.7 across 0..255
  return +(0.9 - (0.2 * t) / TOTAL_MIN + Math.sin(t * 0.07) * 0.01).toFixed(3);
}
function retPressure(t: number) { return +(0.8 + Math.cos(t * 0.06) * 0.02).toFixed(3); }
function temperature(t: number) { return +(8.0 + Math.sin(t * 0.04) * 0.15).toFixed(2); }
function conductivity(t: number) {
  if (t <= PHASE_SWITCH) return +(5.0 + Math.sin(t * 0.05) * 0.05).toFixed(2);
  // diafiltration: 5.0 → 0.8 → 0.3 (exponential decay-ish)
  const x = (t - PHASE_SWITCH) / (TOTAL_MIN - PHASE_SWITCH); // 0..1
  const v = 5.0 * Math.exp(-3.2 * x) + 0.3;
  return +Math.max(0.25, v).toFixed(2);
}
function tankVolume(t: number) {
  if (t <= PHASE_SWITCH) {
    // 120 → 20 across concentration
    return +(120 - (100 * t) / PHASE_SWITCH).toFixed(2);
  }
  return 20; // held during diafiltration
}

type Row = {
  t: number;
  feed: number; perm: number; ret: number; temp: number; cond: number; vol: number;
};

const series: Row[] = (() => {
  const out: Row[] = [];
  for (let i = 0; i <= TOTAL_MIN * SAMPLES_PER_MIN; i++) {
    const t = i / SAMPLES_PER_MIN;
    out.push({
      t,
      feed: feedFlow(t),
      perm: permeateFlow(t),
      ret: retPressure(t),
      temp: temperature(t),
      cond: conductivity(t),
      vol: tankVolume(t),
    });
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

function LinkedValue({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 underline underline-offset-2 decoration-border-secondary cursor-default">
      {children}
      <ExternalLink className="h-3 w-3 text-text-secondary" />
    </span>
  );
}

function UFMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>
        <MetadataField label="Equipment Number"><LinkedValue>UF-03</LinkedValue></MetadataField>
        <MetadataField label="Operator Name"><LinkedValue>J. Smith</LinkedValue></MetadataField>
        <MetadataField label="Process Stage">Concentration / Diafiltration</MetadataField>
        <MetadataField label="Start Timestamp">
          <span className="tabular-nums">2025-05-04 08:30 UTC</span>
        </MetadataField>
        <MetadataField label="End Timestamp">
          <span className="tabular-nums">2025-05-04 12:45 UTC</span>
        </MetadataField>
        <MetadataField label="Sample ID Inlet">
          <span className="font-mono text-[12px]">S-042-UF-in-1</span>
        </MetadataField>
        <MetadataField label="Sample ID Retentate">
          <span className="font-mono text-[12px]">S-042-UF-ret-1</span>
        </MetadataField>
        <MetadataField label="Sample ID Permeate">
          <span className="font-mono text-[12px]">S-042-UF-perm-1</span>
        </MetadataField>
        <MetadataField label="UF Membrane Cassette Lot">
          <span className="font-mono text-[12px]">C1234-5678</span>
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Sub-stage toggle
   ========================================================================= */

type Mode = "concentration" | "diafiltration";

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <Card kind="operational" className="p-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
          Process Sub-Stage
        </span>
        <div className="inline-flex rounded-md border border-border-tertiary bg-background overflow-hidden">
          {(["concentration", "diafiltration"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange(m)}
              className={cn(
                "px-3 py-1.5 text-[12px] transition-colors",
                mode === m
                  ? "bg-primary/10 text-primary border-l-2 border-primary first:border-l-0"
                  : "text-text-secondary hover:text-foreground",
              )}
            >
              {m === "concentration" ? "Concentration Mode" : "Diafiltration Mode"}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-text-secondary ml-auto">
          Display emphasis only · does not alter recorded data
        </span>
      </div>
    </Card>
  );
}

/* =========================================================================
   Time-series chart (generic)
   ========================================================================= */

const minTick = (v: number) => `${v}m`;

type ChartSpec = {
  title: string;
  unit: string;
  dataKey: keyof Row;
  yDomain: [number, number];
  yTicks?: number[];
  band: [number, number];
  critical?: boolean;
  width?: number;
  format?: (v: number) => string;
};

function ParamChart({ spec }: { spec: ChartSpec }) {
  const fmt = spec.format ?? ((v: number) => v.toFixed(2));
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-[14px] font-medium text-foreground">{spec.title}</h3>
          {spec.critical && <Badge variant="warning">Critical</Badge>}
        </div>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">{spec.unit}</span>
      </div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer>
          <LineChart data={series} margin={{ top: 8, right: 12, bottom: 16, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
            <ReferenceArea
              x1={0} x2={TOTAL_MIN}
              y1={spec.band[0]} y2={spec.band[1]}
              fill="hsl(142 71% 45% / 0.08)"
              stroke="hsl(142 71% 45% / 0.30)"
              strokeDasharray="3 3"
              ifOverflow="hidden"
            />
            {/* Phase divider */}
            <ReferenceArea
              x1={PHASE_SWITCH} x2={PHASE_SWITCH}
              stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3"
              ifOverflow="visible"
            />
            <XAxis
              type="number" dataKey="t" domain={[0, TOTAL_MIN]}
              ticks={[0, 60, 120, PHASE_SWITCH, 180, 240, TOTAL_MIN]}
              tickFormatter={minTick}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={spec.yDomain} ticks={spec.yTicks}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
              width={spec.width ?? 36}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(t) => `t = ${Number(t).toFixed(0)} min`}
              formatter={(v: number) => [`${fmt(v)} ${spec.unit}`, spec.title]}
            />
            <Line
              type="monotone" dataKey={spec.dataKey as string}
              stroke="hsl(var(--primary))" strokeWidth={1.5}
              dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* =========================================================================
   Calculated parameters
   ========================================================================= */

function StatCard({
  label, value, unit, primary = false, formula,
}: {
  label: string; value: string; unit: string; primary?: boolean; formula?: string;
}) {
  return (
    <Card
      kind="operational"
      className={cn(
        "p-4 transition-colors",
        primary && "ring-1 ring-primary/40 bg-primary/[0.03]",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
          {label}
        </span>
        {formula && (
          <TooltipProvider delayDuration={150}>
            <UITooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-text-secondary hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[280px] text-[11px]">
                <span className="font-medium">Formula</span>
                <div className="mt-0.5 font-mono text-[11px]">{formula}</div>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        )}
        {primary && <Badge variant="success">Primary KPI</Badge>}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[24px] text-foreground tabular-nums">{value}</span>
        <span className="text-[12px] text-text-secondary">{unit}</span>
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */

export function UltrafiltrationView() {
  const [mode, setMode] = useState<Mode>("concentration");

  const charts: ChartSpec[] = useMemo(() => [
    { title: "Feed Flow Rate", unit: "L/min", dataKey: "feed", yDomain: [0.5, 4], yTicks: [1, 1.8, 2.5, 3.5], band: [1.0, 3.5] },
    { title: "Permeate Flow Rate", unit: "L/min", dataKey: "perm", yDomain: [0.2, 3], yTicks: [0.4, 1, 2, 2.8], band: [0.4, 2.8] },
    { title: "Retentate Pressure", unit: "bar", dataKey: "ret", yDomain: [0, 2], yTicks: [0.3, 0.8, 1.5], band: [0.3, 1.5] },
    { title: "Temperature", unit: "°C", dataKey: "temp", yDomain: [2, 14], yTicks: [4, 8, 12], band: [4, 12], critical: true },
    {
      title: "Conductivity",
      unit: "mS/cm",
      dataKey: "cond",
      yDomain: [0, 22],
      yTicks: [0.1, 5, 10, 20],
      band: [0.1, 20],
      format: (v) => v.toFixed(2),
      width: 40,
    },
    { title: "Volume in Feed Tank", unit: "L", dataKey: "vol", yDomain: [0, 520], yTicks: [20, 120, 250, 500], band: [20, 500], width: 42, format: (v) => v.toFixed(0) },
  ], []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        <ModeToggle mode={mode} onChange={setMode} />

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-section text-foreground">Calculated Parameters</h3>
            <span className="text-[11px] text-text-secondary uppercase tracking-wide">
              Read-only · Computed
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="TMP"
              value="0.9"
              unit="bar"
              formula="Feed pressure − Retentate pressure"
            />
            <StatCard
              label="Concentration Factor"
              value="6×"
              unit=""
              primary={mode === "concentration"}
              formula="Initial volume / Current retentate volume"
            />
            <StatCard
              label="Diafiltration Volume"
              value="5"
              unit="DV"
              primary={mode === "diafiltration"}
              formula="Permeate volume / Retentate volume"
            />
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-section text-foreground">Process Parameters</h3>
            <span className="text-[11px] text-text-secondary uppercase tracking-wide">
              Live signals · Phase divider at t = {PHASE_SWITCH} min
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {charts.map((spec) => {
              const isPrimaryCond = mode === "diafiltration" && spec.dataKey === "cond";
              return (
                <div
                  key={spec.title}
                  className={cn(isPrimaryCond && "ring-1 ring-primary/40 rounded-md")}
                >
                  <ParamChart spec={spec} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <UFMetadataPanel />
    </div>
  );
}
