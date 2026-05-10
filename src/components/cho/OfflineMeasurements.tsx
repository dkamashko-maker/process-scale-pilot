import { useState } from "react";
import {
  ResponsiveContainer, ComposedChart, Line, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceDot,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle } from "lucide-react";

const TOTAL_DAYS = 14;
const OPERATOR = "20-456";
const RUN = "R456";

type Sample = { d: number; v: number };
type ParamKey = "VCD" | "VIA" | "GLC" | "LAC" | "GLN" | "NH4" | "OSM";

interface ParamDef {
  key: ParamKey;
  title: string;
  unit: string;
  method: string;
  yDomain: [number, number];
  yTicks?: number[];
  decimals: number;
  data: Sample[];
  alert?: { d: number; v: number; label: string; threshold: number };
}

const PARAMS: ParamDef[] = [
  {
    key: "VCD",
    title: "Viable Cell Density",
    unit: "×10⁶ cells/mL",
    method: "Vi-CELL XR (Trypan Blue)",
    yDomain: [0, 22],
    yTicks: [0, 5, 10, 15, 20],
    decimals: 1,
    data: [
      { d: 0, v: 0.5 }, { d: 1, v: 5 }, { d: 2, v: 12 }, { d: 4, v: 18 },
      { d: 6, v: 14 }, { d: 8, v: 10 }, { d: 10, v: 8 }, { d: 12, v: 7.5 },
    ],
  },
  {
    key: "VIA",
    title: "Viability",
    unit: "%",
    method: "Vi-CELL XR (Trypan Blue)",
    yDomain: [60, 100],
    yTicks: [60, 70, 80, 90, 100],
    decimals: 0,
    data: [
      { d: 0, v: 98 }, { d: 1, v: 97 }, { d: 2, v: 96 }, { d: 3, v: 95 },
      { d: 4, v: 94 }, { d: 6, v: 90 }, { d: 8, v: 85 }, { d: 10, v: 80 },
      { d: 12, v: 72 }, { d: 14, v: 70 },
    ],
  },
  {
    key: "GLC",
    title: "Glucose",
    unit: "mM",
    method: "BioProfile FLEX2 (enzymatic)",
    yDomain: [0, 36],
    yTicks: [0, 10, 20, 30],
    decimals: 1,
    data: [
      { d: 0, v: 33 }, { d: 1, v: 20 }, { d: 2, v: 8 }, { d: 3, v: 5 },
      { d: 4, v: 6 }, { d: 6, v: 5 }, { d: 8, v: 6 }, { d: 12, v: 5 },
    ],
  },
  {
    key: "LAC",
    title: "Lactate",
    unit: "mM",
    method: "BioProfile FLEX2 (enzymatic)",
    yDomain: [0, 28],
    yTicks: [0, 5, 10, 15, 20, 25],
    decimals: 1,
    data: [
      { d: 0, v: 0.5 }, { d: 1, v: 8 }, { d: 2, v: 18 }, { d: 3, v: 22 },
      { d: 4, v: 22 }, { d: 6, v: 20 }, { d: 8, v: 18 }, { d: 10, v: 15 },
      { d: 12, v: 14 },
    ],
  },
  {
    key: "GLN",
    title: "Glutamine",
    unit: "mM",
    method: "BioProfile FLEX2 (enzymatic)",
    yDomain: [0, 9],
    yTicks: [0, 2, 4, 6, 8],
    decimals: 1,
    data: [
      { d: 0, v: 8 }, { d: 1, v: 5 }, { d: 2, v: 2.5 }, { d: 3, v: 1.2 },
      { d: 4, v: 0.8 }, { d: 6, v: 0.5 }, { d: 8, v: 0.4 }, { d: 12, v: 0.3 },
    ],
  },
  {
    key: "NH4",
    title: "Ammonium NH₄⁺",
    unit: "mM",
    method: "BioProfile FLEX2 (ISE)",
    yDomain: [0, 4],
    yTicks: [0, 1, 2, 3, 4],
    decimals: 2,
    data: [
      { d: 0, v: 0.2 }, { d: 1, v: 0.8 }, { d: 2, v: 1.5 }, { d: 3, v: 2.1 },
      { d: 4, v: 2.4 }, { d: 6, v: 2.7 }, { d: 7, v: 2.9 }, { d: 8, v: 3.1 },
    ],
    alert: { d: 8, v: 3.1, label: "Exceeds 3 mM target", threshold: 3 },
  },
  {
    key: "OSM",
    title: "Osmolality",
    unit: "mOsm/kg",
    method: "Advanced® 3320 Osmometer",
    yDomain: [280, 400],
    yTicks: [280, 310, 340, 370, 400],
    decimals: 0,
    data: [
      { d: 0, v: 300 }, { d: 1, v: 310 }, { d: 2, v: 320 }, { d: 3, v: 330 },
      { d: 4, v: 340 }, { d: 6, v: 355 }, { d: 8, v: 365 }, { d: 10, v: 378 },
    ],
  },
];

function sampleId(key: ParamKey, d: number) {
  return `S-${RUN}-D${d}-${key}`;
}

function timestampForDay(d: number) {
  // Run started 2025-03-08 06:00 UTC
  const startMs = Date.UTC(2025, 2, 8, 6, 0);
  const ts = new Date(startMs + d * 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ts.getUTCFullYear()}-${pad(ts.getUTCMonth() + 1)}-${pad(ts.getUTCDate())} ` +
    `${pad(ts.getUTCHours())}:${pad(ts.getUTCMinutes())} UTC`;
}

interface SelectedSample {
  param: ParamDef;
  sample: Sample;
  x: number;
  y: number;
}

function MiniChart({
  param, onPick,
}: {
  param: ParamDef;
  onPick: (s: Sample, e: { clientX: number; clientY: number }) => void;
}) {
  const tickDays = [0, 3, 7, 10, 14];
  return (
    <Card kind="operational" className="p-3">
      <div className="flex items-baseline justify-between mb-1.5">
        <h4 className="text-[13px] font-medium text-foreground">{param.title}</h4>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">{param.unit}</span>
      </div>
      <div className="h-[160px] w-full">
        <ResponsiveContainer>
          <ComposedChart data={param.data} margin={{ top: 6, right: 8, bottom: 14, left: 0 }}>
            <CartesianGrid stroke="hsl(var(--border-tertiary))" strokeDasharray="2 4" vertical={false} />
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
              domain={param.yDomain}
              ticks={param.yTicks}
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
              stroke="hsl(var(--border-secondary))"
              width={32}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 6,
                fontSize: 11,
                color: "hsl(var(--popover-foreground))",
                padding: "4px 8px",
              }}
              labelFormatter={(d) => `Day ${d}`}
              formatter={(value: number) => [`${value.toFixed(param.decimals)} ${param.unit}`, param.title]}
            />
            <Line
              type="linear"
              dataKey="v"
              stroke="hsl(var(--primary) / 0.7)"
              strokeDasharray="4 3"
              strokeWidth={1.25}
              dot={false}
              isAnimationActive={false}
              activeDot={false}
            />
            <Scatter
              dataKey="v"
              fill="hsl(var(--primary))"
              shape="circle"
              isAnimationActive={false}
              onClick={(p: { payload?: Sample }, _i, e) => {
                const ev = e as unknown as MouseEvent;
                if (p?.payload) onPick(p.payload, { clientX: ev.clientX, clientY: ev.clientY });
              }}
              style={{ cursor: "pointer" }}
            />
            {param.alert && (
              <ReferenceDot
                x={param.alert.d}
                y={param.alert.v}
                r={6}
                fill="hsl(0 84% 60%)"
                stroke="white"
                strokeWidth={1.5}
                ifOverflow="visible"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {param.alert && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[hsl(0_84%_45%)]">
          <AlertTriangle className="h-3 w-3" />
          Day {param.alert.d} — {param.alert.label}
        </div>
      )}
    </Card>
  );
}

export function OfflineMeasurements() {
  const [selected, setSelected] = useState<SelectedSample | null>(null);

  return (
    <Card kind="operational" className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-section text-foreground">Offline Measurements</h3>
          <p className="text-[12px] text-text-secondary">
            At-line and offline sample readings — click any point for sample provenance.
          </p>
        </div>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">
          {PARAMS.length} parameters
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PARAMS.map((p) => (
          <MiniChart
            key={p.key}
            param={p}
            onPick={(sample, pos) =>
              setSelected({ param: p, sample, x: pos.clientX, y: pos.clientY })
            }
          />
        ))}
      </div>

      {/* Anchored popover at the click coordinates */}
      <Popover
        open={!!selected}
        onOpenChange={(o) => { if (!o) setSelected(null); }}
      >
        <PopoverTrigger asChild>
          <span
            aria-hidden
            style={{
              position: "fixed",
              left: selected?.x ?? -1000,
              top: selected?.y ?? -1000,
              width: 1, height: 1, pointerEvents: "none",
            }}
          />
        </PopoverTrigger>
        {selected && (
          <PopoverContent side="top" align="center" className="w-72 p-3">
            <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-1">
              Sample Provenance
            </div>
            <div className="text-[14px] text-foreground font-medium">
              {selected.param.title}
            </div>
            <div className="text-[12px] text-text-secondary mb-2">
              {selected.sample.v.toFixed(selected.param.decimals)} {selected.param.unit} · Day {selected.sample.d}
            </div>
            <dl className="space-y-1.5 text-[12px]">
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Sample ID</dt>
                <dd className="text-foreground font-mono">
                  {sampleId(selected.param.key, selected.sample.d)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Method</dt>
                <dd className="text-foreground text-right">{selected.param.method}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Operator</dt>
                <dd className="text-foreground tabular-nums">{OPERATOR}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-text-secondary">Timestamp</dt>
                <dd className="text-foreground tabular-nums">
                  {timestampForDay(selected.sample.d)}
                </dd>
              </div>
            </dl>
          </PopoverContent>
        )}
      </Popover>
    </Card>
  );
}
