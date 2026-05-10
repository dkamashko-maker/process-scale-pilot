import { useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  ReferenceArea, Tooltip,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Info, CheckCircle2, FlaskConical } from "lucide-react";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
   Offline QC Results
   ========================================================================= */

type SampleEvidence = {
  sampleId: string;
  parameter: string;
  method: string;
  processStep: string;
  result: string;
  collectedAt: string;
  collectedBy: string;
  location: string;
};

function SampleLink({
  id, onOpen,
}: { id: string; onOpen: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      className="inline-flex items-center gap-1 font-mono text-[12px] text-primary underline underline-offset-2 hover:text-primary/80"
    >
      {id}
      <ExternalLink className="h-3 w-3" />
    </button>
  );
}

function QCResultCard({
  parameter, value, unit, method, processStep, sampleId, statusLabel,
  children, onOpenSample,
}: {
  parameter: string; value: string; unit: string; method: string;
  processStep: string; sampleId: string; statusLabel: string;
  children?: React.ReactNode;
  onOpenSample: (id: string) => void;
}) {
  return (
    <Card kind="operational" className="p-4 flex flex-col gap-3">
      <div>
        <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
          {parameter}
        </div>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span className="text-[24px] text-foreground tabular-nums">{value}</span>
          <span className="text-[12px] text-text-secondary">{unit}</span>
        </div>
      </div>

      {children}

      <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-[12px]">
        <dt className="text-text-secondary">Method</dt>
        <dd className="text-foreground">{method}</dd>
        <dt className="text-text-secondary">Process Step</dt>
        <dd className="text-foreground">{processStep}</dd>
        <dt className="text-text-secondary">Sample ID</dt>
        <dd><SampleLink id={sampleId} onOpen={onOpenSample} /></dd>
      </dl>

      <Badge variant="success" className="self-start">{statusLabel}</Badge>
    </Card>
  );
}

function AggregateGauge({ value, limit, max = 3 }: { value: number; limit: number; max?: number }) {
  const valuePct = Math.min(100, (value / max) * 100);
  const limitPct = Math.min(100, (limit / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] text-text-secondary mb-1">
        <span>0%</span>
        <span>Limit {limit}%</span>
        <span>{max}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-accent/40 overflow-visible">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
          style={{ width: `${valuePct}%` }}
        />
        <div
          className="absolute -top-1 -bottom-1 w-[2px] bg-destructive"
          style={{ left: `${limitPct}%` }}
          aria-label={`Limit ${limit}%`}
        />
      </div>
      <div className="mt-1 text-[11px] text-text-secondary">
        Result <span className="text-foreground tabular-nums">{value}%</span> · Limit{" "}
        <span className="text-destructive tabular-nums">&lt;{limit}%</span>
      </div>
    </div>
  );
}

function ConsistencyCheck({ offline, online, delta }: { offline: number; online: number; delta: number }) {
  return (
    <div className="rounded-md border border-border-tertiary bg-background px-3 py-2 text-[12px]">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-text-secondary">Offline</div>
          <div className="tabular-nums text-foreground">{offline.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-text-secondary">Online (last)</div>
          <div className="tabular-nums text-foreground">{online.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-text-secondary">Δ</div>
          <div className="tabular-nums text-foreground">{delta.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span>Consistent with online reading</span>
      </div>
    </div>
  );
}

const SAMPLE_EVIDENCE: Record<string, SampleEvidence> = {
  "S-042-UF-ret-1": {
    sampleId: "S-042-UF-ret-1",
    parameter: "Retentate sample",
    method: "Manual aliquot, sterile vial",
    processStep: "Concentration / Diafiltration",
    result: "See linked QC result",
    collectedAt: "2025-05-04 12:30 UTC",
    collectedBy: "J. Smith",
    location: "UF-03 retentate port",
  },
  "S-042-UF-perm-1": {
    sampleId: "S-042-UF-perm-1",
    parameter: "Permeate sample",
    method: "Manual aliquot, sterile vial",
    processStep: "Diafiltration",
    result: "See linked QC result",
    collectedAt: "2025-05-04 12:35 UTC",
    collectedBy: "J. Smith",
    location: "UF-03 permeate line",
  },
};

function EvidenceDrawer({
  sampleId, onOpenChange,
}: { sampleId: string | null; onOpenChange: (open: boolean) => void }) {
  const ev = sampleId ? SAMPLE_EVIDENCE[sampleId] : null;
  return (
    <Sheet open={!!sampleId} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[380px]">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            <SheetTitle className="text-[15px]">Sample Evidence</SheetTitle>
          </div>
          <SheetDescription className="text-[12px]">
            Placeholder evidence pane for the linked QC sample.
          </SheetDescription>
        </SheetHeader>
        {ev && (
          <dl className="mt-5 divide-y divide-border-tertiary border-y border-border-tertiary">
            {[
              ["Sample ID", ev.sampleId],
              ["Sample Type", ev.parameter],
              ["Process Step", ev.processStep],
              ["Collection Method", ev.method],
              ["Sampling Location", ev.location],
              ["Collected At", ev.collectedAt],
              ["Collected By", ev.collectedBy],
              ["Linked Result", ev.result],
            ].map(([label, value]) => (
              <div key={label} className="px-1 py-2.5 grid grid-cols-[130px_1fr] gap-3">
                <dt className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
                  {label}
                </dt>
                <dd className="text-[13px] text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </SheetContent>
    </Sheet>
  );
}

function OfflineQCPanel() {
  const [openSample, setOpenSample] = useState<string | null>(null);
  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-section text-foreground">Offline Analytical Results</h3>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">
          Source: Quality metrics sheet
        </span>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <QCResultCard
          parameter="Protein Concentration (FSH)"
          value="1.9"
          unit="mg/mL"
          method="UV280 (offline)"
          processStep="Concentration"
          sampleId="S-042-UF-ret-1"
          statusLabel="Within expected range"
          onOpenSample={setOpenSample}
        />
        <QCResultCard
          parameter="Aggregate Content (SEC-HPLC)"
          value="1.4"
          unit="%"
          method="SEC-HPLC"
          processStep="Concentration / Diafiltration"
          sampleId="S-042-UF-ret-1"
          statusLabel="Below 2% limit"
          onOpenSample={setOpenSample}
        >
          <AggregateGauge value={1.4} limit={2} />
        </QCResultCard>
        <QCResultCard
          parameter="Buffer Conductivity (Final Retentate)"
          value="0.3"
          unit="mS/cm"
          method="Conductivity meter (offline)"
          processStep="Diafiltration"
          sampleId="S-042-UF-perm-1"
          statusLabel="Consistent with online"
          onOpenSample={setOpenSample}
        >
          <ConsistencyCheck offline={0.3} online={0.31} delta={0.01} />
        </QCResultCard>
      </div>
      <div className="mt-2 flex items-start gap-1.5 text-[11px] text-text-secondary">
        <Info className="h-3 w-3 mt-0.5 shrink-0" />
        <span>
          Offline results are linked to online run via Sample ID. Results must be entered manually
          or imported from analytical instruments.
        </span>
      </div>
      <EvidenceDrawer sampleId={openSample} onOpenChange={(o) => !o && setOpenSample(null)} />
    </div>
  );
}

/* =========================================================================
   Public view
   ========================================================================= */

export function UltrafiltrationView({ tab = "all" }: { tab?: "monitoring" | "offline" | "all" } = {}) {
  const [mode, setMode] = useState<Mode>("concentration");
  const showMonitoring = tab === "monitoring" || tab === "all";
  const showOffline = tab === "offline" || tab === "all";

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
        {showMonitoring && (
          <>
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
          </>
        )}

        {showOffline && <OfflineQCPanel />}
      </div>

      <UFMetadataPanel />
    </div>
  );
}

