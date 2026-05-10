import { useMemo } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, ReferenceLine, Tooltip, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

/** Days span and phase boundaries (kept in sync with PhaseTimeline). */
const TOTAL_DAYS = 14;
const PHASE_BOUNDARIES = [1, 3, 4, 12]; // dividers between phases

/** ===== Synthetic deterministic trajectories (one sample per hour) ===== */

type Pt = { d: number; v: number };

function buildSeries(fn: (day: number) => number, samplesPerDay = 24): Pt[] {
  const out: Pt[] = [];
  const total = TOTAL_DAYS * samplesPerDay;
  for (let i = 0; i <= total; i++) {
    const d = i / samplesPerDay;
    out.push({ d, v: fn(d) });
  }
  return out;
}

// Tiny deterministic pseudo-noise
const noise = (d: number, amp = 1) =>
  amp * (Math.sin(d * 7.13) + Math.cos(d * 3.37) + Math.sin(d * 11.7)) / 3;

const tempSeries = buildSeries((d) => {
  let base: number;
  if (d < 3) base = 37.0;
  else if (d < 3.2) base = 37.0 + (33.0 - 37.0) * ((d - 3) / 0.2);
  else if (d < 12) base = 33.0;
  else if (d < 12.3) base = 33.0 + (4.0 - 33.0) * ((d - 12) / 0.3);
  else base = 4.0;
  return +(base + noise(d, 0.12)).toFixed(2);
});

const phSeries = buildSeries((d) => {
  // Drift between 7.0-7.2 with small upward correction pulses
  let base = 7.10 + 0.06 * Math.sin(d * 1.3);
  const pulses = [1.5, 4.2, 6.8, 9.1, 11.5];
  for (const p of pulses) {
    if (d >= p && d < p + 0.15) base += 0.08 * (1 - (d - p) / 0.15);
  }
  return +(base + noise(d, 0.015)).toFixed(3);
});

const doSeries = buildSeries((d) => {
  // 50% → 30% gradual decline by Day 10, then steady
  const t = Math.min(1, d / 10);
  const base = 50 - 20 * t;
  return +(base + noise(d, 1.2)).toFixed(1);
});

const rpmSeries = buildSeries((d) => {
  let base = 100;
  if (d >= 2) base = 150;
  if (d >= 7) base = 200;
  return +(base + noise(d, 1.5)).toFixed(0);
});

const foamSeries = buildSeries((d) => {
  let base = 2 + 1.5 * Math.abs(Math.sin(d * 0.9));
  // Single spike near Day 6
  if (d >= 5.95 && d < 6.15) {
    const t = (d - 5.95) / 0.20;
    base = 2 + 80 * Math.sin(Math.PI * t);
  }
  return +Math.max(0, base + noise(d, 0.4)).toFixed(1);
});

/** ===== Shared chart shell ===== */

interface PhaseChartProps {
  title: string;
  unit: string;
  data: Pt[];
  /** primary in-range green band(s) */
  bands: { from: number; to: number; yMin: number; yMax: number; tint?: "green" | "amber" }[];
  /** alert threshold lines */
  thresholds?: { y: number; label: string }[];
  /** alert markers (e.g. limit breaches) */
  alerts?: { d: number; v: number; label: string }[];
  yDomain: [number, number];
  yTicks?: number[];
  decimals?: number;
}

function PhaseChart({
  title, unit, data, bands, thresholds = [], alerts = [], yDomain, yTicks, decimals = 1,
}: PhaseChartProps) {
  const tickDays = useMemo(() => [0, 1, 3, 4, 7, 10, 12, 14], []);

  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-[14px] font-medium text-foreground">{title}</h3>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">{unit}</span>
      </div>
      <div className="h-[220px] w-full">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, bottom: 18, left: 4 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />

            {/* Range bands */}
            {bands.map((b, i) => (
              <ReferenceArea
                key={`band-${i}`}
                x1={b.from}
                x2={b.to}
                y1={b.yMin}
                y2={b.yMax}
                fill={b.tint === "amber" ? "hsl(38 92% 50% / 0.10)" : "hsl(142 71% 45% / 0.10)"}
                stroke={b.tint === "amber" ? "hsl(38 92% 50% / 0.35)" : "hsl(142 71% 45% / 0.35)"}
                strokeDasharray="3 3"
                ifOverflow="hidden"
              />
            ))}

            {/* Phase boundary dividers */}
            {PHASE_BOUNDARIES.map((d) => (
              <ReferenceLine
                key={`pb-${d}`}
                x={d}
                stroke="hsl(var(--border-secondary))"
                strokeDasharray="4 4"
              />
            ))}

            {/* Threshold lines (e.g. foam alert) */}
            {thresholds.map((t, i) => (
              <ReferenceLine
                key={`th-${i}`}
                y={t.y}
                stroke="hsl(0 84% 60%)"
                strokeDasharray="4 2"
                label={{
                  value: t.label,
                  position: "insideTopRight",
                  fill: "hsl(0 84% 45%)",
                  fontSize: 10,
                }}
              />
            ))}

            <XAxis
              type="number"
              dataKey="d"
              domain={[0, TOTAL_DAYS]}
              ticks={tickDays}
              tickFormatter={(v) => `D${v}`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
            />
            <YAxis
              domain={yDomain}
              ticks={yTicks}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
              width={36}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 12,
                color: "hsl(var(--popover-foreground))",
              }}
              labelFormatter={(d) => {
                const day = Math.floor(Number(d));
                const hr = Math.round((Number(d) - day) * 24);
                return `Day ${day}, ${String(hr).padStart(2, "0")}:00`;
              }}
              formatter={(value: number) => [`${value.toFixed(decimals)} ${unit}`, title]}
            />
            <Line
              type="monotone"
              dataKey="v"
              stroke="hsl(var(--primary))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />

            {/* Alert markers */}
            {alerts.map((a, i) => (
              <ReferenceDot
                key={`a-${i}`}
                x={a.d}
                y={a.v}
                r={5}
                fill="hsl(0 84% 60%)"
                stroke="white"
                strokeWidth={1.5}
                ifOverflow="visible"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {alerts.length > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-[hsl(0_84%_45%)]">
          <AlertTriangle className="h-3 w-3" />
          {alerts.map((a) => `Day ${a.d.toFixed(1)} — ${a.label}`).join(" · ")}
        </div>
      )}
    </Card>
  );
}

/** ===== Public component: 5 stacked charts ===== */

export function MonitoringCharts() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <PhaseChart
        title="Temperature"
        unit="°C"
        data={tempSeries}
        yDomain={[0, 40]}
        yTicks={[4, 10, 20, 30, 33, 37, 40]}
        bands={[
          { from: 0, to: 3, yMin: 36.5, yMax: 37.5, tint: "green" },
          { from: 3, to: 14, yMin: 32.5, yMax: 33.5, tint: "green" },
        ]}
        decimals={1}
      />

      <PhaseChart
        title="pH"
        unit="pH"
        data={phSeries}
        yDomain={[6.6, 7.4]}
        yTicks={[6.6, 6.8, 7.0, 7.2, 7.4]}
        bands={[{ from: 0, to: 14, yMin: 6.80, yMax: 7.20, tint: "green" }]}
        decimals={2}
      />

      <PhaseChart
        title="Dissolved O₂"
        unit="% air sat."
        data={doSeries}
        yDomain={[0, 70]}
        yTicks={[0, 20, 30, 40, 50, 70]}
        bands={[
          { from: 0, to: 1, yMin: 45, yMax: 55, tint: "green" },
          { from: 1, to: 14, yMin: 30, yMax: 45, tint: "green" },
        ]}
        decimals={1}
      />

      <PhaseChart
        title="Agitation Speed"
        unit="rpm"
        data={rpmSeries}
        yDomain={[0, 250]}
        yTicks={[0, 50, 100, 150, 200, 250]}
        bands={[{ from: 0, to: 14, yMin: 50, yMax: 200, tint: "green" }]}
        decimals={0}
      />

      <PhaseChart
        title="Foam Level"
        unit="% vessel height"
        data={foamSeries}
        yDomain={[0, 100]}
        yTicks={[0, 20, 40, 60, 80, 100]}
        bands={[{ from: 0, to: 14, yMin: 0, yMax: 60, tint: "green" }]}
        thresholds={[{ y: 80, label: "Alert · 80%" }]}
        alerts={[{ d: 6.05, v: 82, label: "Foam breach 82%" }]}
        decimals={1}
      />
    </div>
  );
}
