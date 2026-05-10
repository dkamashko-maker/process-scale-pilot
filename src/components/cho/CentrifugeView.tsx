import { useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, Tooltip, AreaChart, Area,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Lock, CheckCircle2, ChevronDown, ChevronRight, Info, ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/* =========================================================================
   Synthetic time-series — minutes since cycle start
   Cycle: 0–2 min ramp 0→6000, 2–17 min hold ~5980, 17–18.5 min decel→0
   ========================================================================= */

const TOTAL_MIN = 18.5;
const SETPOINT = 6000;

function rpmAt(t: number) {
  if (t < 2) return (t / 2) * SETPOINT;
  if (t < 17) return 5980 + Math.sin(t * 4) * 4;
  if (t < 18.5) return 5980 * (1 - (t - 17) / 1.5);
  return 0;
}

function tempAt(t: number) {
  // 8.0–8.5 with tiny noise
  return +(8.0 + 0.25 * (1 + Math.sin(t * 0.7)) + Math.cos(t * 1.6) * 0.05).toFixed(2);
}

const SAMPLES_PER_MIN = 4;
const rpmSeries: { t: number; actual: number; setpoint: number }[] = [];
const tempSeries: { t: number; v: number }[] = [];
for (let i = 0; i <= TOTAL_MIN * SAMPLES_PER_MIN; i++) {
  const t = i / SAMPLES_PER_MIN;
  const inCycle = t > 0 && t < 18.5;
  rpmSeries.push({
    t,
    actual: +rpmAt(t).toFixed(0),
    setpoint: inCycle ? SETPOINT : NaN as unknown as number,
  });
  tempSeries.push({ t, v: tempAt(t) });
}

/* Vibration gauge target = 12 µm (range 0–40) */
const VIB = 12;
/* Motor current sparkline */
const motorSeries: { t: number; v: number }[] = [];
for (let i = 0; i <= TOTAL_MIN * SAMPLES_PER_MIN; i++) {
  const t = i / SAMPLES_PER_MIN;
  let base = 0.4;
  if (t >= 0.2 && t < 2) base = 0.4 + ((t - 0.2) / 1.8) * 4.2;
  else if (t < 17) base = 3.2 + Math.sin(t * 1.7) * 0.08;
  else if (t < 18.5) base = 3.2 * (1 - (t - 17) / 1.5) + 0.2;
  motorSeries.push({ t, v: +base.toFixed(2) });
}

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

function CentrifugeMetadataPanel() {
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-B042-24</MetadataField>
        <MetadataField label="Sub-batch / Run ID">FSH-B042-24-C1</MetadataField>
        <MetadataField label="Equipment ID">
          <LinkedValue>CFG-003</LinkedValue>
        </MetadataField>
        <MetadataField label="Operators">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="neutral">J. Smith</Badge>
            <Badge variant="neutral">M. Chen</Badge>
          </div>
        </MetadataField>
        <MetadataField label="Supervisor">
          <LinkedValue>A. Johnson</LinkedValue>
        </MetadataField>
        <MetadataField label="Start">
          <span className="tabular-nums">2024-11-22 08:30 UTC</span>
        </MetadataField>
        <MetadataField label="End">
          <span className="tabular-nums">2024-11-22 10:30 UTC</span>
        </MetadataField>
        <MetadataField label="Upstream Vessel">
          <LinkedValue>BR-202</LinkedValue>
        </MetadataField>
        <MetadataField label="Sample ID (Inlet)">
          <span className="font-mono text-[12px]">FSH-B042-24-C1-IN</span>
        </MetadataField>
        <MetadataField label="Sample ID (Centrate)">
          <span className="font-mono text-[12px]">FSH-B042-24-C1-OUT</span>
        </MetadataField>
        <MetadataField label="SOP Version">SOP-CENT-04.2</MetadataField>
        <MetadataField label="Cleaning Status">
          <Badge variant="success">Clean (validated)</Badge>
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Safety status banner
   ========================================================================= */

function SafetyBanner() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Lock className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">Lid Lock</div>
            <Badge variant="success">LOCKED</Badge>
          </div>
        </div>
        <div className="h-8 w-px bg-border-tertiary" />
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">Cycle Status</div>
            <Badge variant="success">Time Complete</Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* =========================================================================
   Process parameter charts
   ========================================================================= */

const minTick = (v: number) => `${v} m`;

function RotationSpeedChart() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Rotation Speed</h3>
          <p className="text-[11px] text-text-secondary">
            Setpoint {SETPOINT} RPM · alert if |actual − setpoint| &gt; 50 RPM for &gt; 30 s
          </p>
        </div>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">RPM</span>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer>
          <LineChart data={rpmSeries} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
            {/* Tolerance band ±50 RPM around setpoint, only over hold phase */}
            <ReferenceArea
              x1={2} x2={17}
              y1={SETPOINT - 50} y2={SETPOINT + 50}
              fill="hsl(142 71% 45% / 0.10)"
              stroke="hsl(142 71% 45% / 0.35)"
              strokeDasharray="3 3"
              ifOverflow="hidden"
            />
            <XAxis
              type="number" dataKey="t" domain={[0, TOTAL_MIN]}
              ticks={[0, 2, 5, 10, 15, 17, 18.5]}
              tickFormatter={minTick}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={[0, 6500]} ticks={[0, 2000, 4000, 6000]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={42}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(t) => `t = ${Number(t).toFixed(2)} min`}
              formatter={(v: number, name) => [`${Math.round(v)} RPM`, name === "actual" ? "Actual" : "Setpoint"]}
            />
            <Line
              type="monotone" dataKey="setpoint"
              stroke="hsl(var(--muted-foreground))" strokeDasharray="4 3"
              strokeWidth={1.25} dot={false} isAnimationActive={false} connectNulls={false}
            />
            <Line
              type="monotone" dataKey="actual"
              stroke="hsl(var(--primary))" strokeWidth={1.75}
              dot={false} isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-0.5 bg-primary" /> Actual
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 border-t border-dashed border-muted-foreground" /> Setpoint
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-3 h-2 rounded-sm bg-[hsl(142_71%_45%/0.18)] border border-[hsl(142_71%_45%/0.4)]" />
          ±50 RPM tolerance
        </span>
      </div>
    </Card>
  );
}

function TemperatureChart() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[14px] font-medium text-foreground">Temperature</h3>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">°C</span>
      </div>
      <div className="h-[240px] w-full">
        <ResponsiveContainer>
          <LineChart data={tempSeries} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
            <ReferenceArea
              x1={0} x2={TOTAL_MIN} y1={4} y2={12}
              fill="hsl(142 71% 45% / 0.10)"
              stroke="hsl(142 71% 45% / 0.35)"
              strokeDasharray="3 3"
              ifOverflow="hidden"
            />
            <XAxis
              type="number" dataKey="t" domain={[0, TOTAL_MIN]}
              ticks={[0, 5, 10, 15, 18.5]} tickFormatter={minTick}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={[2, 14]} ticks={[2, 4, 8, 12, 14]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={36}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6, fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(t) => `t = ${Number(t).toFixed(2)} min`}
              formatter={(v: number) => [`${v.toFixed(2)} °C`, "Temperature"]}
            />
            <Line
              type="monotone" dataKey="v"
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
   Calculated parameters (stat cards)
   ========================================================================= */

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card kind="operational" className="p-4">
      <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className="text-[24px] text-foreground tabular-nums">{value}</span>
        <span className="text-[12px] text-text-secondary">{unit}</span>
      </div>
    </Card>
  );
}

function CalculatedPanel() {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-section text-foreground">Calculated Parameters</h3>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">Read-only · Computed</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="RCF" value="12.5" unit="× g" />
        <StatCard label="Run Time at Speed" value="15" unit="min" />
        <StatCard label="Total Run Time" value="18.5" unit="min" />
      </div>
    </div>
  );
}

/* =========================================================================
   Equipment health (collapsible Phase 2 panel)
   ========================================================================= */

function VibrationGauge({ value, max = 40 }: { value: number; max?: number }) {
  const pct = Math.min(1, Math.max(0, value / max));
  const angle = -90 + pct * 180; // semicircle
  const cx = 80, cy = 80, r = 60;
  const rad = (angle * Math.PI) / 180;
  const nx = cx + r * Math.cos(rad);
  const ny = cy + r * Math.sin(rad);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 160 100" className="w-[180px] h-[110px]">
        <path d="M 20 80 A 60 60 0 0 1 140 80" fill="none" stroke="hsl(var(--border-tertiary))" strokeWidth="10" strokeLinecap="round" />
        <path
          d={`M 20 80 A 60 60 0 0 1 ${nx.toFixed(1)} ${ny.toFixed(1)}`}
          fill="none" stroke="hsl(var(--primary))" strokeWidth="10" strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill="hsl(var(--foreground))" />
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-[20px] text-foreground tabular-nums">{value}</div>
        <div className="text-[11px] text-text-secondary uppercase tracking-wide">µm</div>
      </div>
    </div>
  );
}

function MotorSparkline() {
  return (
    <div className="h-[80px] w-full">
      <ResponsiveContainer>
        <AreaChart data={motorSeries} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="motorFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone" dataKey="v"
            stroke="hsl(var(--primary))" strokeWidth={1.5}
            fill="url(#motorFill)" isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function EquipmentHealthPanel() {
  const [open, setOpen] = useState(false);
  return (
    <Card kind="operational" className="p-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-accent/30 transition-colors"
      >
        {open ? <ChevronDown className="h-4 w-4 text-text-secondary" /> : <ChevronRight className="h-4 w-4 text-text-secondary" />}
        <div className="flex-1">
          <h3 className="text-section text-foreground">Equipment Health Monitoring</h3>
          <p className="text-[12px] text-text-secondary">Display only · Phase 2 feature</p>
        </div>
        <Badge variant="neutral">
          <Info className="h-3 w-3 mr-1" />
          Predictive maintenance analytics planned for Phase 2
        </Badge>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border-tertiary">
          <div className="pt-4">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-2">
              Vibration / Imbalance
            </div>
            <VibrationGauge value={VIB} />
          </div>
          <div className="pt-4">
            <div className="flex items-baseline justify-between mb-2">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                Motor Current
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[20px] text-foreground tabular-nums">3.2</span>
                <span className="text-[11px] text-text-secondary">A</span>
              </div>
            </div>
            <MotorSparkline />
          </div>
        </div>
      )}
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */

export function CentrifugeView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        <SafetyBanner />

        <div>
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-section text-foreground">Process Parameters</h3>
            <span className="text-[11px] text-text-secondary uppercase tracking-wide">Live signals</span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <RotationSpeedChart />
            <TemperatureChart />
          </div>
        </div>

        <CalculatedPanel />
        <EquipmentHealthPanel />
      </div>

      <CentrifugeMetadataPanel />
    </div>
  );
}
