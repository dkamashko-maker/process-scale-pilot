import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, AlertTriangle, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Tooltip as UITooltip, TooltipContent, TooltipTrigger, TooltipProvider,
} from "@/components/ui/tooltip";

/* =========================================================================
   Source data — Sensors Params sheet (CHO_ds_FPLC.xlsx)
   ========================================================================= */
type Row = {
  t: number; uv: number; cond: number; ph: number;
  pressure: number; frac: number; bPct: number;
};

const SERIES: Row[] = [
  { t: 0,   uv: 10.5,  cond: 2.1,  ph: 8, pressure: 0.3, frac: 0, bPct: 0 },
  { t: 10,  uv: 8.2,   cond: 2.1,  ph: 8, pressure: 0.3, frac: 0, bPct: 0 },
  { t: 20,  uv: 7.5,   cond: 2.1,  ph: 8, pressure: 0.3, frac: 0, bPct: 0 },
  { t: 30,  uv: 6.8,   cond: 2.1,  ph: 8, pressure: 0.3, frac: 0, bPct: 0 },
  { t: 40,  uv: 7.1,   cond: 2.2,  ph: 8, pressure: 0.3, frac: 0, bPct: 0 },
  { t: 45,  uv: 15.2,  cond: 2.3,  ph: 8, pressure: 0.4, frac: 0, bPct: 0 },
  { t: 50,  uv: 20.4,  cond: 2.5,  ph: 8, pressure: 0.4, frac: 0, bPct: 0 },
  { t: 55,  uv: 35.1,  cond: 2.9,  ph: 8, pressure: 0.5, frac: 0, bPct: 0 },
  { t: 60,  uv: 45.2,  cond: 3.4,  ph: 8, pressure: 0.5, frac: 0, bPct: 0 },
  { t: 65,  uv: 72.8,  cond: 4.0,  ph: 8, pressure: 0.6, frac: 0, bPct: 1 },
  { t: 70,  uv: 90.1,  cond: 4.8,  ph: 8, pressure: 0.6, frac: 0, bPct: 3 },
  { t: 75,  uv: 110.5, cond: 5.7,  ph: 8, pressure: 0.7, frac: 0, bPct: 6 },
  { t: 80,  uv: 120.3, cond: 6.5,  ph: 8, pressure: 0.7, frac: 0, bPct: 10 },
  { t: 85,  uv: 115.2, cond: 7.2,  ph: 8, pressure: 0.7, frac: 0, bPct: 14 },
  { t: 90,  uv: 95.8,  cond: 7.8,  ph: 8, pressure: 0.6, frac: 0, bPct: 18 },
  { t: 91,  uv: 88.4,  cond: 8.0,  ph: 8, pressure: 0.6, frac: 5, bPct: 19 },
  { t: 92,  uv: 105.2, cond: 8.1,  ph: 8, pressure: 0.7, frac: 5, bPct: 20 },
  { t: 93,  uv: 145.6, cond: 8.3,  ph: 8, pressure: 0.8, frac: 5, bPct: 21 },
  { t: 94,  uv: 210.3, cond: 8.4,  ph: 8, pressure: 0.9, frac: 5, bPct: 22 },
  { t: 95,  uv: 285.7, cond: 8.6,  ph: 8, pressure: 1.0, frac: 5, bPct: 23 },
  { t: 96,  uv: 340.2, cond: 8.7,  ph: 8, pressure: 1.1, frac: 5, bPct: 24 },
  { t: 97,  uv: 380.5, cond: 8.9,  ph: 8, pressure: 1.2, frac: 5, bPct: 25 },
  { t: 98,  uv: 395.1, cond: 9.0,  ph: 8, pressure: 1.2, frac: 5, bPct: 26 },
  { t: 99,  uv: 385.6, cond: 9.1,  ph: 8, pressure: 1.2, frac: 5, bPct: 27 },
  { t: 100, uv: 350.3, cond: 9.2,  ph: 8, pressure: 1.1, frac: 5, bPct: 28 },
  { t: 101, uv: 290.2, cond: 9.3,  ph: 8, pressure: 1.0, frac: 6, bPct: 29 },
  { t: 102, uv: 210.5, cond: 9.4,  ph: 8, pressure: 0.9, frac: 6, bPct: 30 },
  { t: 103, uv: 140.1, cond: 9.5,  ph: 8, pressure: 0.8, frac: 6, bPct: 31 },
  { t: 104, uv: 85.6,  cond: 9.6,  ph: 8, pressure: 0.7, frac: 6, bPct: 32 },
  { t: 105, uv: 50.3,  cond: 9.7,  ph: 8, pressure: 0.6, frac: 6, bPct: 33 },
  { t: 106, uv: 32.1,  cond: 9.8,  ph: 8, pressure: 0.5, frac: 6, bPct: 34 },
  { t: 107, uv: 22.4,  cond: 9.9,  ph: 8, pressure: 0.5, frac: 6, bPct: 35 },
  { t: 108, uv: 18.2,  cond: 10.0, ph: 8, pressure: 0.5, frac: 7, bPct: 36 },
  { t: 109, uv: 16.5,  cond: 10.0, ph: 8, pressure: 0.5, frac: 7, bPct: 37 },
  { t: 110, uv: 14.7,  cond: 10.1, ph: 8, pressure: 0.5, frac: 7, bPct: 38 },
  { t: 115, uv: 12.1,  cond: 10.2, ph: 8, pressure: 0.4, frac: 7, bPct: 42 },
  { t: 120, uv: 10.8,  cond: 10.3, ph: 8, pressure: 0.4, frac: 7, bPct: 45 },
];

/* Scale UV onto right-axis (0–50) so a single composed chart can render
   all four series cleanly without two truly independent right axes. */
const UV_AXIS_MAX = 450;
const RIGHT_AXIS_MAX = 50;
const DATA = SERIES.map((r) => ({
  ...r,
  uvScaled: (r.uv / UV_AXIS_MAX) * RIGHT_AXIS_MAX,
}));

const PHASE_LINES = [
  { t: 0,   label: "Equilibration" },
  { t: 45,  label: "Sample Load" },
  { t: 65,  label: "Gradient Start" },
  { t: 91,  label: "Fraction Start" },
  { t: 110, label: "Re-equilibration" },
];

const FRACTIONS = [
  { id: 5, t1: 91,  t2: 100 },
  { id: 6, t1: 101, t2: 107 },
  { id: 7, t1: 108, t2: 120 },
];

/* =========================================================================
   Metadata panel (right sidebar)
   ========================================================================= */

function MetadataField({
  label, children,
}: { label: string; children: React.ReactNode }) {
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

function FPLCMetadataPanel() {
  const navigate = useNavigate();
  return (
    <Card kind="operational" className="p-0">
      <div className="p-4 border-b border-border-tertiary">
        <h3 className="text-section text-foreground">Run Metadata</h3>
        <p className="text-[12px] text-text-secondary">Read-only · Source: Metadata sheet</p>
      </div>
      <dl className="divide-y divide-border-tertiary">
        <MetadataField label="Batch Number">FSH-2025-042</MetadataField>

        <MetadataField label="Equipment Number">
          <div className="flex items-center gap-2 flex-wrap">
            <span>FPLC-01</span>
            <CorrectedBadge />
          </div>
          <div className="text-[11px] text-text-secondary mt-0.5">
            Source file showed <span className="font-mono line-through">UF-03</span>
          </div>
        </MetadataField>

        <MetadataField label="Operator Name">J. Smith</MetadataField>

        <MetadataField label="Column ID">
          Capto Q ImpRes, 5 mL{" "}
          <span className="text-text-secondary">· serial 8912</span>
        </MetadataField>

        <MetadataField label="Method File Name">
          <span className="font-mono text-[12px]">FSH_anion_exchange_v4.2.ecm</span>
        </MetadataField>

        <MetadataField label="Run Start Timestamp">
          <span className="tabular-nums">2025-11-20 09:10:00 UTC</span>
        </MetadataField>

        <MetadataField label="Processed Sample ID">
          <button
            type="button"
            onClick={() => navigate("/cho-production-line/ultrafiltration")}
            className="inline-flex items-center gap-1 font-mono text-[12px] text-primary underline underline-offset-2 hover:text-primary/80"
          >
            S-042-UF-ret-1
            <ExternalLink className="h-3 w-3" />
          </button>
          <div className="text-[11px] text-text-secondary mt-0.5">From UF-03 retentate</div>
        </MetadataField>

        <MetadataField label="Processed Sample Description">
          <span className="text-[12px] leading-relaxed">
            Concentrated harvest after UF · 45 mg total protein · FSH activity 5200 IU/mL · volume 120 mL
          </span>
        </MetadataField>

        <MetadataField label="Buffer A Composition">
          20 mM Tris-HCl, pH 8.0
        </MetadataField>
        <MetadataField label="Buffer B Composition">
          20 mM Tris-HCl, 1 M NaCl, pH 8.0
        </MetadataField>
        <MetadataField label="Equilibration Volume (Buffer A)">
          5 CV (25 mL)
        </MetadataField>
        <MetadataField label="Wash Volume (Buffer A)">
          3 CV (15 mL)
        </MetadataField>
        <MetadataField label="Elution Gradient">
          0–50% B in 20 CV (100 mL)
        </MetadataField>
      </dl>
    </Card>
  );
}

/* =========================================================================
   Chromatogram
   ========================================================================= */

function ChromatogramTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload as Row;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-[12px] text-popover-foreground shadow-sm">
      <div className="font-medium mb-1 tabular-nums">t = {label} min</div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 tabular-nums">
        <span style={{ color: "hsl(217 91% 60%)" }}>UV 280</span><span>{row.uv.toFixed(1)} mAU</span>
        <span style={{ color: "hsl(28 95% 53%)" }}>Conductivity</span><span>{row.cond.toFixed(1)} mS/cm</span>
        <span style={{ color: "hsl(142 71% 45%)" }}>% Buffer B</span><span>{row.bPct}%</span>
        <span className="text-text-secondary">Pressure</span><span>{row.pressure.toFixed(2)} bar</span>
      </div>
    </div>
  );
}

function Chromatogram() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Chromatogram</h3>
          <p className="text-[12px] text-text-secondary">
            UV 280 · Conductivity · % Buffer B · System Pressure
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <LegendDot color="hsl(217 91% 60%)" label="UV 280 (mAU)" />
          <LegendDot color="hsl(28 95% 53%)" label="Conductivity (mS/cm)" />
          <LegendDot color="hsl(142 71% 45%)" dashed label="% Buffer B" />
          <LegendDot color="hsl(var(--muted-foreground))" label="Pressure (bar)" />
        </div>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={DATA} margin={{ top: 16, right: 56, bottom: 24, left: 8 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
            <XAxis
              type="number" dataKey="t" domain={[0, 120]}
              ticks={[0, 15, 30, 45, 60, 75, 90, 105, 120]}
              tickFormatter={(v) => `${v}`}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
              label={{
                value: "Time (min)", position: "insideBottom", offset: -8,
                fill: "hsl(var(--muted-foreground))", fontSize: 11,
              }}
            />

            {/* Left axis: UV 280 in mAU 0–450 */}
            <YAxis
              yAxisId="uv" orientation="left"
              domain={[0, UV_AXIS_MAX]} ticks={[0, 100, 200, 300, 400, 450]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={42}
              label={{
                value: "UV 280 (mAU)", angle: -90, position: "insideLeft",
                fill: "hsl(var(--muted-foreground))", fontSize: 11, offset: 10,
              }}
            />
            {/* Right axis: 0–50, hosting conductivity, %B and pressure (scaled) */}
            <YAxis
              yAxisId="right" orientation="right"
              domain={[0, RIGHT_AXIS_MAX]} ticks={[0, 10, 20, 30, 40, 50]}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))" width={42}
              label={{
                value: "mS/cm  ·  % B", angle: 90, position: "insideRight",
                fill: "hsl(var(--muted-foreground))", fontSize: 11, offset: 10,
              }}
            />

            {/* Phase markers */}
            {PHASE_LINES.map((p) => (
              <ReferenceLine
                key={p.t} x={p.t} yAxisId="uv"
                stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3"
                label={{
                  value: p.label, position: "top",
                  fill: "hsl(var(--muted-foreground))", fontSize: 10,
                }}
              />
            ))}

            {/* UV start collection threshold */}
            <ReferenceLine
              y={100} yAxisId="uv"
              stroke="hsl(142 71% 45% / 0.6)" strokeDasharray="4 4"
              label={{
                value: "Collect ≥100 mAU", position: "insideTopRight",
                fill: "hsl(142 71% 35%)", fontSize: 10,
              }}
            />

            {/* Series */}
            <Line
              yAxisId="uv" type="monotone" dataKey="uv"
              stroke="hsl(217 91% 60%)" strokeWidth={2}
              dot={false} isAnimationActive={false} name="UV 280"
            />
            <Line
              yAxisId="right" type="monotone" dataKey="cond"
              stroke="hsl(28 95% 53%)" strokeWidth={1.5}
              dot={false} isAnimationActive={false} name="Conductivity"
            />
            <Line
              yAxisId="right" type="monotone" dataKey="bPct"
              stroke="hsl(142 71% 45%)" strokeWidth={1.5} strokeDasharray="5 4"
              dot={false} isAnimationActive={false} name="% Buffer B"
            />
            <Line
              yAxisId="right" type="monotone" dataKey="pressure"
              stroke="hsl(var(--muted-foreground))" strokeWidth={1.25}
              dot={false} isAnimationActive={false} name="Pressure"
            />

            {/* Peak max annotation */}
            <ReferenceDot
              x={98} y={395.1} yAxisId="uv" r={4}
              fill="hsl(217 91% 60%)" stroke="hsl(var(--card))" strokeWidth={2}
              ifOverflow="visible"
            />

            <Tooltip content={<ChromatogramTooltip />} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Peak annotation callout */}
      <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-border-tertiary bg-background px-3 py-1.5 text-[12px]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: "hsl(217 91% 60%)" }}
        />
        <span className="text-foreground">
          <span className="font-medium">Peak max:</span> 395.1 mAU at t = 98 min ·
          Fraction 5 · 26% Buffer B
        </span>
      </div>

      {/* Fraction collection bar */}
      <FractionBar />
    </Card>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-text-secondary">
      <span
        className="inline-block w-4 h-[2px]"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color}, ${color} 3px, transparent 3px, transparent 6px)`
            : color,
        }}
      />
      {label}
    </span>
  );
}

function FractionBar() {
  // Maps t=0..120 to 0..100% with the same chart left/right inset as ComposedChart.
  // Chart margin: left=8 + yAxis width 42 = 50px reserved on left;
  // right=56 + yAxis 42 = 98px reserved. We approximate with percentage padding.
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1.5 text-[11px] text-text-secondary">
        <span className="uppercase tracking-wide font-medium">Fraction Collection</span>
        <span>5 mL per fraction</span>
      </div>
      <div
        className="relative h-7 rounded-md border border-border-tertiary bg-background overflow-hidden"
        style={{ paddingLeft: "50px", paddingRight: "98px" }}
      >
        <div className="relative h-full w-full">
          {FRACTIONS.map((f) => {
            const left = (f.t1 / 120) * 100;
            const width = ((f.t2 - f.t1) / 120) * 100;
            return (
              <div
                key={f.id}
                className="absolute top-0.5 bottom-0.5 rounded-sm bg-emerald-500/85 text-white text-[10px] font-medium flex items-center justify-center"
                style={{ left: `${left}%`, width: `${width}%` }}
                title={`Fraction ${f.id} · ${f.t1}–${f.t2} min`}
              >
                F{f.id}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   Setpoints panel
   ========================================================================= */

const SETPOINTS = [
  { label: "Flow rate setpoint",            value: "2",   unit: "mL/min", note: "Range 0.5 – 10.0" },
  { label: "Maximum pressure alarm",        value: "3",   unit: "bar",    note: "Range 1.0 – 8.0" },
  { label: "Fraction volume",               value: "5",   unit: "mL",     note: "Range 1.0 – 50.0" },
  { label: "UV start collection threshold", value: "100", unit: "mAU",    note: "Range 20 – 500" },
  { label: "UV stop collection threshold",  value: "50",  unit: "mAU",    note: "Range 10 – 200" },
];

function SetpointsPanel() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Setpoint Parameters</h3>
          <p className="text-[12px] text-text-secondary">Read-only · Source: Set Params sheet</p>
        </div>
        <Badge variant="neutral">Read-only</Badge>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {SETPOINTS.map((sp) => (
          <div
            key={sp.label}
            className="rounded-md border border-border-tertiary bg-background p-3 flex flex-col gap-1"
          >
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium leading-tight">
              {sp.label}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[22px] text-foreground tabular-nums">{sp.value}</span>
              <span className="text-[12px] text-text-secondary">{sp.unit}</span>
            </div>
            <div className="text-[10px] text-text-secondary mt-auto">{sp.note}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* =========================================================================
   Quality Results — sourced from "Quality metrics" sheet
   ========================================================================= */

type QC = {
  metric: string;
  result: string;
  spec: string;
  method: string;
  formula?: string;
};

const QC_RESULTS: QC[] = [
  { metric: "Peak Resolution (FSH vs impurity)", result: "1.7",   spec: "≥ 1.5",         method: "Calculated from UV trace" },
  { metric: "Purity by RP-HPLC",                 result: "96.8 %", spec: "≥ 95.0 %",     method: "Analytical HPLC" },
  { metric: "FSH Concentration in pool",         result: "940 IU/mL", spec: "500 – 1500 IU/mL", method: "ELISA (FSH-specific)" },
  { metric: "Total Protein in pool",             result: "38.5 mg",   spec: "25 – 60 mg", method: "Bradford assay" },
  { metric: "Recovery Yield",                    result: "85.6 %",    spec: "≥ 75 %",
    method: "Calculated",
    formula: "Total activity in pool / Total activity loaded × 100\n= (940 IU/mL × ~41 mL pool) / (5200 IU/mL × 120 mL loaded) × 100\n= 85.6 %" },
  { metric: "Host Cell Protein (HCP) residual",  result: "12 ng/mg FSH", spec: "≤ 50 ng/mg", method: "HCP ELISA" },
  { metric: "Endotoxin level",                   result: "0.8 EU/mg",    spec: "≤ 5.0 EU/mg", method: "LAL test" },
];

function QCResultsTable() {
  return (
    <Card kind="operational" className="p-0 overflow-hidden">
      <div className="p-4 border-b border-border-tertiary flex items-baseline justify-between">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">QC Results</h3>
          <p className="text-[12px] text-text-secondary">Source: Quality metrics sheet · 7 of 7 within specification</p>
        </div>
        <Badge variant="success">All PASS</Badge>
      </div>
      <table className="w-full text-[13px]">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-text-secondary border-b border-border-tertiary">
            <th className="text-left font-medium px-4 py-2">Quality Metric</th>
            <th className="text-left font-medium px-4 py-2">Result</th>
            <th className="text-left font-medium px-4 py-2">Specification</th>
            <th className="text-left font-medium px-4 py-2">Status</th>
            <th className="text-left font-medium px-4 py-2">Method</th>
          </tr>
        </thead>
        <tbody>
          {QC_RESULTS.map((q) => (
            <tr key={q.metric} className="border-b border-border-tertiary last:border-b-0">
              <td className="px-4 py-2.5 text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  {q.metric}
                  {q.formula && (
                    <UITooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="text-text-secondary hover:text-foreground">
                          <Info className="h-3 w-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[340px] text-[11px]">
                        <span className="font-medium">Calculation</span>
                        <div className="mt-0.5 font-mono whitespace-pre-line">{q.formula}</div>
                      </TooltipContent>
                    </UITooltip>
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 tabular-nums text-foreground">{q.result}</td>
              <td className="px-4 py-2.5 text-text-secondary">{q.spec}</td>
              <td className="px-4 py-2.5"><Badge variant="success">PASS</Badge></td>
              <td className="px-4 py-2.5 text-text-secondary">{q.method}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

/* =========================================================================
   Column History panel
   ========================================================================= */

const RESOLUTION_TREND = [1.9, 1.85, 1.82, 1.78, 1.75, 1.71, 1.7];
const RESOLUTION_LIMIT = 1.5;

function ResolutionSparkline() {
  const W = 200, H = 56, PAD = 4;
  const min = 1.4, max = 2.0;
  const xs = RESOLUTION_TREND.map((_, i) =>
    PAD + (i / (RESOLUTION_TREND.length - 1)) * (W - PAD * 2),
  );
  const ys = RESOLUTION_TREND.map((v) =>
    H - PAD - ((v - min) / (max - min)) * (H - PAD * 2),
  );
  const path = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const limitY = H - PAD - ((RESOLUTION_LIMIT - min) / (max - min)) * (H - PAD * 2);
  return (
    <svg width={W} height={H} className="overflow-visible">
      <line
        x1={PAD} x2={W - PAD} y1={limitY} y2={limitY}
        stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="3 3"
      />
      <path d={path} fill="none" stroke="hsl(217 91% 60%)" strokeWidth={1.5} />
      {xs.map((x, i) => (
        <circle
          key={i} cx={x} cy={ys[i]} r={2}
          fill={i === xs.length - 1 ? "hsl(217 91% 60%)" : "hsl(var(--card))"}
          stroke="hsl(217 91% 60%)" strokeWidth={1.25}
        />
      ))}
      <text
        x={W - PAD} y={limitY - 3} textAnchor="end"
        fontSize={9} fill="hsl(var(--destructive))"
      >
        Limit 1.5
      </text>
    </svg>
  );
}

function ColumnHistoryPanel() {
  return (
    <Card kind="operational" className="p-4">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-medium text-foreground">Column History</h3>
          <p className="text-[12px] text-text-secondary">Reusable consumable tracking</p>
        </div>
        <Badge variant="success">Active — Qualified</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-5">
        <dl className="grid grid-cols-[160px_1fr] gap-y-2 text-[12px]">
          <dt className="text-text-secondary">Column ID</dt>
          <dd className="text-foreground">Capto Q ImpRes, 5 mL, serial 8912</dd>
          <dt className="text-text-secondary">Column Type</dt>
          <dd className="text-foreground">Anion Exchange (Capto Q ImpRes)</dd>
          <dt className="text-text-secondary">Resin Volume</dt>
          <dd className="text-foreground tabular-nums">5 mL</dd>
          <dt className="text-text-secondary">Serial Number</dt>
          <dd className="text-foreground font-mono">8912</dd>
          <dt className="text-text-secondary">Current Run Count</dt>
          <dd className="text-foreground tabular-nums">7 <span className="text-text-secondary">(this run is run 7)</span></dd>
          <dt className="text-text-secondary">Total Volume Processed</dt>
          <dd className="text-foreground tabular-nums">840 mL <span className="text-text-secondary">(cumulative across 7 runs)</span></dd>
          <dt className="text-text-secondary">Qualification Status</dt>
          <dd><Badge variant="success">Qualified</Badge></dd>
          <dt className="text-text-secondary">Next Qualification Due</dt>
          <dd className="text-foreground">After run 10 or 1200 mL total volume</dd>
        </dl>

        <div className="rounded-md border border-border-tertiary bg-background p-3">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-1">
            Performance Trend — Peak Resolution
          </div>
          <ResolutionSparkline />
          <div className="mt-2 text-[11px] text-text-secondary tabular-nums">
            Runs 1 → 7 · current 1.70
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-[12px]">
        <Info className="h-3.5 w-3.5 mt-0.5 text-amber-600 dark:text-amber-300 shrink-0" />
        <span className="text-foreground">
          Column performance trending downward over successive runs.
          Estimated <span className="font-medium">3 runs remaining</span> before re-qualification required.
        </span>
      </div>
    </Card>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */


export function FPLCView() {
  return (
    <TooltipProvider delayDuration={150}>
      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="quality">Quality Results</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-6 min-w-0">
              <Chromatogram />
              <SetpointsPanel />
            </div>
            <FPLCMetadataPanel />
          </div>
        </TabsContent>

        <TabsContent value="quality" className="mt-0">
          <div className="space-y-6">
            <QCResultsTable />
            <ColumnHistoryPanel />
          </div>
        </TabsContent>
      </Tabs>
    </TooltipProvider>
  );
}

