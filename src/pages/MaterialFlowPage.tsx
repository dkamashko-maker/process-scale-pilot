/**
 * Material Flow — read-only, management-oriented batch flow visualization.
 *
 * Shows all equipment and connections as a static layout. A multi-batch
 * picker highlights flows using the same fixed palette as Sensor Map.
 * Emphasizes shared resources, critical hubs / single points of failure,
 * overloaded vs idle vs broken equipment, and seeded delay cues.
 *
 * No editing, no node/connection authoring, no simulation.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  AlertTriangle, Boxes, Clock, GitBranch, Info, Layers,
  Pause, ShieldAlert, Timer, X, Zap,
} from "lucide-react";
import { EQUIPMENT, type Equipment } from "@/data/equipment";
import { CONNECTIONS, type Connection } from "@/data/connections";
import { BATCHES, type Batch } from "@/data/batches";
import { EquipmentTooltip } from "@/components/equipment/EquipmentTooltip";

// ── Batch palette — kept in sync with Sensor Map ───────────────────────
const BATCH_PALETTE = [
  "hsl(195 85% 45%)",
  "hsl(280 70% 55%)",
  "hsl(38 92% 50%)",
  "hsl(158 64% 38%)",
  "hsl(0 72% 51%)",
];
const FALLBACK_BATCH = "hsl(215 16% 55%)";

function batchColorFor(batchId: string, selected: string[]): string {
  const idx = selected.indexOf(batchId);
  if (idx === -1) return FALLBACK_BATCH;
  return BATCH_PALETTE[idx] ?? FALLBACK_BATCH;
}

// ── Layout (Upstream → Downstream → Analytical) ────────────────────────
const COLUMN_X = { upstream: 120, downstream: 480, analytical: 880 } as const;
const NODE_W = 220;
const NODE_H = 100;
const ROW_GAP = 18;
const COL_TOP = 80;

interface PositionedNode {
  eq: Equipment;
  x: number;
  y: number;
}

function buildLayout(): PositionedNode[] {
  const upstream    = EQUIPMENT.filter((e) => e.equipmentCategory === "upstream");
  const downstream  = EQUIPMENT.filter((e) => e.equipmentCategory === "downstream");
  const analytical  = EQUIPMENT.filter((e) => e.equipmentCategory === "analytical");

  const place = (list: Equipment[], x: number): PositionedNode[] =>
    list.map((eq, i) => ({ eq, x, y: COL_TOP + i * (NODE_H + ROW_GAP) }));

  return [
    ...place(upstream,   COLUMN_X.upstream),
    ...place(downstream, COLUMN_X.downstream),
    ...place(analytical, COLUMN_X.analytical),
  ];
}

const LAYOUT = buildLayout();
const POS = new Map(LAYOUT.map((n) => [n.eq.equipmentId, n]));

const CANVAS_W = COLUMN_X.analytical + NODE_W + 80;
const CANVAS_H =
  COL_TOP +
  Math.max(
    EQUIPMENT.filter((e) => e.equipmentCategory === "upstream").length,
    EQUIPMENT.filter((e) => e.equipmentCategory === "downstream").length,
    EQUIPMENT.filter((e) => e.equipmentCategory === "analytical").length,
  ) * (NODE_H + ROW_GAP) +
  40;

// ── Helpers ────────────────────────────────────────────────────────────

function batchesOnConnection(connBatchIds: string[], selected: string[]): string[] {
  if (selected.length === 0) return [];
  return selected.filter((b) => connBatchIds.includes(b));
}

/** Selected batches that touch a given equipment unit. */
function batchesOnEquipment(eq: Equipment, selected: string[]): string[] {
  if (selected.length === 0) return [];
  const set = new Set<string>(eq.currentBatchIds ?? (eq.currentBatch ? [eq.currentBatch] : []));
  for (const c of CONNECTIONS) {
    if (c.fromEquipmentId === eq.equipmentId || c.toEquipmentId === eq.equipmentId) {
      for (const b of c.currentBatchIds) set.add(b);
    }
  }
  return selected.filter((b) => set.has(b));
}

/** All batches (selected or not) that touch this unit — for load detection. */
function allBatchesOnEquipment(eq: Equipment): string[] {
  const set = new Set<string>(eq.currentBatchIds ?? (eq.currentBatch ? [eq.currentBatch] : []));
  for (const b of BATCHES) if (b.equipmentIds.includes(eq.equipmentId)) set.add(b.id);
  for (const c of CONNECTIONS) {
    if (c.fromEquipmentId === eq.equipmentId || c.toEquipmentId === eq.equipmentId) {
      for (const b of c.currentBatchIds) set.add(b);
    }
  }
  return Array.from(set);
}

/** Single-point-of-failure heuristic: equipment carrying ≥1 in-progress
 *  batch with no idle peer in the same column able to take over. */
function isSinglePointOfFailure(eq: Equipment): boolean {
  const myBatches = allBatchesOnEquipment(eq).filter((bid) => {
    const b = BATCHES.find((x) => x.id === bid);
    return b && b.status === "in_progress";
  });
  if (myBatches.length === 0) return false;
  const peers = EQUIPMENT.filter(
    (p) => p.equipmentCategory === eq.equipmentCategory && p.equipmentId !== eq.equipmentId,
  );
  const peerCanTakeOver = peers.some((p) => p.status === "idle" && p.connectionHealth !== "offline");
  return !peerCanTakeOver;
}

/** Batches associated with this equipment that are on hold/blocked or
 *  whose downstream link is "blocked". Used for delay cues. */
function delayedBatchesOnEquipment(eq: Equipment): string[] {
  const out = new Set<string>();
  for (const bid of allBatchesOnEquipment(eq)) {
    const b = BATCHES.find((x) => x.id === bid);
    if (b && b.status === "on_hold") out.add(bid);
  }
  for (const c of CONNECTIONS) {
    if (c.status === "blocked" && c.fromEquipmentId === eq.equipmentId) {
      for (const b of c.currentBatchIds) out.add(b);
    }
  }
  return Array.from(out);
}

function loadLabel(count: number): "idle" | "normal" | "busy" | "overloaded" {
  if (count === 0) return "idle";
  if (count === 1) return "normal";
  if (count === 2) return "busy";
  return "overloaded";
}

// ── Atoms ──────────────────────────────────────────────────────────────

function StatusDot({ eq }: { eq: Equipment }) {
  const cls =
    eq.status === "error"
      ? "bg-status-error"
      : eq.status === "active"
      ? "bg-status-active"
      : "bg-status-idle";
  return <span className={`h-2 w-2 rounded-full ${cls}`} />;
}

// ── Node ───────────────────────────────────────────────────────────────

function Node({
  node, selectedBatches, isHub, isSpof, isOverloaded, hasDelay,
}: {
  node: PositionedNode;
  selectedBatches: string[];
  isHub: boolean;
  isSpof: boolean;
  isOverloaded: boolean;
  hasDelay: boolean;
}) {
  const { eq, x, y } = node;
  const batches = batchesOnEquipment(eq, selectedBatches);
  const isHighlighted = batches.length > 0;
  const broken = eq.status === "error";
  const idle = eq.status === "idle";
  const allBatches = allBatchesOnEquipment(eq);

  // Border priority: hub > SPOF > broken > overloaded > batch highlight
  let borderColor = "hsl(var(--border))";
  let borderWidth = 1;
  if (isHub) {
    borderColor = "hsl(38 92% 50%)";
    borderWidth = 2.5;
  } else if (isSpof) {
    borderColor = "hsl(280 70% 55%)";
    borderWidth = 2.5;
  } else if (broken) {
    borderColor = "hsl(var(--status-error))";
    borderWidth = 2;
  } else if (isOverloaded) {
    borderColor = "hsl(0 72% 51%)";
    borderWidth = 2;
  } else if (isHighlighted) {
    borderColor = batchColorFor(batches[0], selectedBatches);
    borderWidth = 2.25;
  }

  const fill =
    broken ? "hsl(0 80% 97%)"
    : isOverloaded ? "hsl(0 75% 98%)"
    : idle ? "hsl(var(--muted)/0.4)"
    : "hsl(var(--card))";

  const opacity = selectedBatches.length > 0 && !isHighlighted && !broken && !isHub && !isSpof ? 0.5 : 1;
  const load = loadLabel(allBatches.length);

  return (
    <g transform={`translate(${x}, ${y})`} style={{ opacity }}>
      <EquipmentTooltip equipment={eq} side="top">
        <foreignObject width={NODE_W} height={NODE_H} style={{ overflow: "visible" }}>
          <div
            className="rounded-lg shadow-tile h-full w-full px-3 py-2 flex flex-col gap-1 relative"
            style={{
              borderStyle: "solid",
              borderColor,
              borderWidth,
              background: fill,
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground font-medium">
                  {eq.equipmentCategory === "upstream"
                    ? "Bioreactor"
                    : eq.equipmentCategory === "downstream"
                    ? "Operational"
                    : "Analytical"}
                </div>
                <div className="text-[12px] font-semibold leading-tight truncate">{eq.equipmentName}</div>
                <div className="text-[9px] font-mono text-muted-foreground truncate">{eq.equipmentId}</div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <StatusDot eq={eq} />
              </div>
            </div>

            {/* Load / state row */}
            <div className="mt-auto flex items-center justify-between gap-1">
              <span
                className={`inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full border ${
                  load === "overloaded"
                    ? "bg-status-error/15 text-status-error border-status-error/40"
                    : load === "busy"
                    ? "bg-status-warning/15 text-status-warning border-status-warning/40"
                    : load === "idle"
                    ? "bg-muted text-muted-foreground border-border"
                    : "bg-status-active/10 text-status-active border-status-active/30"
                }`}
                title={`${allBatches.length} batch${allBatches.length === 1 ? "" : "es"} associated`}
              >
                <Boxes className="h-2.5 w-2.5" /> {allBatches.length} batch{allBatches.length === 1 ? "" : "es"}
              </span>

              <div className="flex items-center gap-1">
                {broken && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-error/15 text-status-error border-status-error/40"
                    title="Broken — explicit current state"
                  >
                    <Zap className="h-2.5 w-2.5" /> Broken
                  </span>
                )}
                {hasDelay && !broken && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-warning/15 text-status-warning border-status-warning/40"
                    title="Batch delay associated with this unit"
                  >
                    <Clock className="h-2.5 w-2.5" /> Delay
                  </span>
                )}
                {isHub && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border"
                    style={{ background: "hsl(38 95% 94%)", color: "hsl(38 92% 35%)", borderColor: "hsl(38 92% 50%)" }}
                    title="Critical hub — >2 selected batch flows intersect here"
                  >
                    <Layers className="h-2.5 w-2.5" /> Hub
                  </span>
                )}
                {isSpof && !isHub && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border"
                    style={{ background: "hsl(280 80% 96%)", color: "hsl(280 70% 40%)", borderColor: "hsl(280 70% 55%)" }}
                    title="Single point of failure — no idle peer can take over"
                  >
                    <ShieldAlert className="h-2.5 w-2.5" /> SPOF
                  </span>
                )}
              </div>
            </div>

            {/* Selected batch dots */}
            {batches.length > 0 && (
              <div className="absolute -top-1.5 left-2 flex items-center gap-1">
                {batches.map((b) => (
                  <span
                    key={b}
                    className="h-2.5 w-2.5 rounded-full border border-background shadow-sm"
                    style={{ background: batchColorFor(b, selectedBatches) }}
                    title={b}
                  />
                ))}
              </div>
            )}
          </div>
        </foreignObject>
      </EquipmentTooltip>
    </g>
  );
}

// ── Edges ──────────────────────────────────────────────────────────────

function Edge({
  conn, highlightBatches, selectedBatches,
}: {
  conn: Connection;
  highlightBatches: string[];
  selectedBatches: string[];
}) {
  const a = POS.get(conn.fromEquipmentId);
  const b = POS.get(conn.toEquipmentId);
  if (!a || !b) return null;

  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  const blocked = conn.status === "blocked";
  const dimmed = selectedBatches.length > 0 && highlightBatches.length === 0 && !blocked;

  let stroke = "hsl(var(--border))";
  let strokeWidth = 1.25;
  let dash: string | undefined;
  let opacity = dimmed ? 0.2 : 0.65;

  if (blocked) {
    stroke = "hsl(var(--status-error))";
    strokeWidth = 2;
    dash = "6 4";
    opacity = 1;
  } else if (highlightBatches.length >= 1) {
    stroke = batchColorFor(highlightBatches[0], selectedBatches);
    strokeWidth = 2.75;
    opacity = 1;
  }

  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={dash}
        opacity={opacity}
      />
      {/* Stacked ribbons for additional selected batches */}
      {highlightBatches.slice(1).map((b, i) => (
        <path
          key={b}
          d={path}
          fill="none"
          stroke={batchColorFor(b, selectedBatches)}
          strokeWidth={2}
          strokeDasharray="2 6"
          opacity={0.95}
          style={{ transform: `translateY(${(i + 1) * 4}px)` }}
        />
      ))}
      {blocked && (
        <text
          x={mx}
          y={(y1 + y2) / 2 - 6}
          textAnchor="middle"
          fontSize={9}
          fill="hsl(var(--status-error))"
          fontWeight={600}
        >
          blocked
        </text>
      )}
    </g>
  );
}

// ── Legend ─────────────────────────────────────────────────────────────

function LegendSwatch({
  color, label, dashed, icon,
}: { color?: string; label: string; dashed?: boolean; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      {icon ?? (
        <svg width={28} height={10}>
          <line
            x1={0} y1={5} x2={28} y2={5}
            stroke={color}
            strokeWidth={2.5}
            strokeDasharray={dashed ? "4 4" : undefined}
          />
        </svg>
      )}
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────

export default function MaterialFlowPage() {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleBatch = (id: string) => {
    setSelectedBatches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  // Critical hubs: > 2 selected batch flows intersect on a single unit.
  const hubIds = useMemo(() => {
    if (selectedBatches.length < 2) return new Set<string>();
    const out = new Set<string>();
    for (const eq of EQUIPMENT) {
      if (batchesOnEquipment(eq, selectedBatches).length > 2) out.add(eq.equipmentId);
    }
    return out;
  }, [selectedBatches]);

  // Always-on management cues (independent of selection)
  const spofIds = useMemo(() => {
    const out = new Set<string>();
    for (const eq of EQUIPMENT) if (isSinglePointOfFailure(eq)) out.add(eq.equipmentId);
    return out;
  }, []);

  const overloadedIds = useMemo(() => {
    const out = new Set<string>();
    for (const eq of EQUIPMENT) {
      if (allBatchesOnEquipment(eq).length >= 3) out.add(eq.equipmentId);
    }
    return out;
  }, []);

  const delayIds = useMemo(() => {
    const out = new Set<string>();
    for (const eq of EQUIPMENT) {
      if (delayedBatchesOnEquipment(eq).length > 0) out.add(eq.equipmentId);
    }
    return out;
  }, []);

  // KPI strip
  const kpis = useMemo(() => {
    const broken = EQUIPMENT.filter((e) => e.status === "error").length;
    const idle = EQUIPMENT.filter((e) => e.status === "idle").length;
    const active = EQUIPMENT.filter((e) => e.status === "active").length;
    const onHoldBatches = BATCHES.filter((b) => b.status === "on_hold").length;
    const inProgressBatches = BATCHES.filter((b) => b.status === "in_progress").length;
    return {
      active, idle, broken,
      onHoldBatches, inProgressBatches,
      hubs: hubIds.size,
      spof: spofIds.size,
      overloaded: overloadedIds.size,
    };
  }, [hubIds, spofIds, overloadedIds]);

  const renderableConnections = CONNECTIONS.filter(
    (c) => POS.has(c.fromEquipmentId) && POS.has(c.toEquipmentId),
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Material Flow</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Batch-centric view of how material moves through the fleet — designed to surface bottlenecks,
              shared resources, and single points of failure at a glance.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="gap-1"><GitBranch className="h-3 w-3" /> {kpis.inProgressBatches} in progress</Badge>
            {kpis.onHoldBatches > 0 && (
              <Badge className="gap-1 bg-status-warning/15 text-status-warning border-status-warning/30 hover:bg-status-warning/15">
                <Pause className="h-3 w-3" /> {kpis.onHoldBatches} on hold
              </Badge>
            )}
            {kpis.broken > 0 && (
              <Badge className="gap-1 bg-status-error/15 text-status-error border-status-error/30 hover:bg-status-error/15">
                <Zap className="h-3 w-3" /> {kpis.broken} broken
              </Badge>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile icon={<Boxes className="h-4 w-4" />} label="Active equipment" value={kpis.active} tone="active" />
          <KpiTile icon={<Timer className="h-4 w-4" />} label="Idle equipment" value={kpis.idle} tone="muted" />
          <KpiTile icon={<Layers className="h-4 w-4" />} label="Critical hubs" value={kpis.hubs} tone="warning" hint="select ≥3 batches" />
          <KpiTile icon={<ShieldAlert className="h-4 w-4" />} label="Single points of failure" value={kpis.spof} tone="spof" />
        </div>

        {/* Batch picker */}
        <Card>
          <CardContent className="py-3 flex flex-wrap items-center gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <Layers className="h-4 w-4" />
                  Select batches
                  {selectedBatches.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {selectedBatches.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-2" align="start">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                  One or many batches — first 5 get distinct colors
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {BATCHES.map((b: Batch) => {
                    const checked = selectedBatches.includes(b.id);
                    const idx = selectedBatches.indexOf(b.id);
                    const color = idx >= 0 ? BATCH_PALETTE[idx] ?? FALLBACK_BATCH : FALLBACK_BATCH;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBatch(b.id)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs ${checked ? "bg-muted" : ""}`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border shrink-0"
                          style={{ background: checked ? color : "transparent", borderColor: checked ? color : "hsl(var(--border))" }}
                        />
                        <span className="font-mono">{b.id}</span>
                        <span className="text-muted-foreground truncate">— {b.product} · {b.stage.replace("_", " ")}</span>
                        {b.status === "on_hold" && (
                          <span className="ml-auto text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-status-warning/15 text-status-warning border border-status-warning/40">
                            on hold
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedBatches.length > 0 && (
                  <>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-xs h-7"
                      onClick={() => setSelectedBatches([])}
                    >
                      Clear selection
                    </Button>
                  </>
                )}
              </PopoverContent>
            </Popover>

            <div className="flex flex-wrap items-center gap-1.5">
              {selectedBatches.map((id, i) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full border text-[11px] font-medium bg-card"
                  style={{ borderColor: BATCH_PALETTE[i] ?? FALLBACK_BATCH }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: BATCH_PALETTE[i] ?? FALLBACK_BATCH }} />
                  <span className="font-mono">{id}</span>
                  <button
                    type="button"
                    onClick={() => toggleBatch(id)}
                    className="ml-0.5 h-4 w-4 inline-flex items-center justify-center rounded-full hover:bg-muted"
                    aria-label={`Remove ${id}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {selectedBatches.length === 0 && (
                <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
                  <Info className="h-3 w-3" /> Select batches to highlight their material flow across the fleet.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" /> Material flow across the fleet
            </CardTitle>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>Upstream</span><span>→</span>
              <span>Downstream</span><span>→</span>
              <span>Analytical</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <svg
                width={CANVAS_W}
                height={CANVAS_H}
                className="block"
                role="img"
                aria-label="Material flow visualization"
              >
                {/* Column dividers */}
                {[COLUMN_X.downstream - 30, COLUMN_X.analytical - 30].map((x) => (
                  <line
                    key={x}
                    x1={x} x2={x} y1={40} y2={CANVAS_H - 20}
                    stroke="hsl(var(--border))"
                    strokeDasharray="2 6"
                    strokeWidth={1}
                  />
                ))}

                {/* Edges */}
                {renderableConnections.map((c) => (
                  <Edge
                    key={c.id}
                    conn={c}
                    highlightBatches={batchesOnConnection(c.currentBatchIds, selectedBatches)}
                    selectedBatches={selectedBatches}
                  />
                ))}

                {/* Nodes */}
                {LAYOUT.map((n) => (
                  <Node
                    key={n.eq.equipmentId}
                    node={n}
                    selectedBatches={selectedBatches}
                    isHub={hubIds.has(n.eq.equipmentId)}
                    isSpof={spofIds.has(n.eq.equipmentId)}
                    isOverloaded={overloadedIds.has(n.eq.equipmentId)}
                    hasDelay={delayIds.has(n.eq.equipmentId)}
                  />
                ))}
              </svg>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" /> Legend
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
            <div className="col-span-2 md:col-span-3 lg:col-span-4">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">Batch palette (selection order)</div>
              <div className="flex flex-wrap gap-3">
                {BATCH_PALETTE.map((c, i) => (
                  <div key={c} className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-3 w-3 rounded-full" style={{ background: c }} />
                    <span className="text-muted-foreground">Batch #{i + 1}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-3 w-3 rounded-full" style={{ background: FALLBACK_BATCH }} />
                  <span className="text-muted-foreground">Additional</span>
                </div>
              </div>
            </div>

            <Separator className="col-span-2 md:col-span-3 lg:col-span-4 my-1" />

            <LegendSwatch color="hsl(var(--border))" label="Connection (no batch selected)" />
            <LegendSwatch color={BATCH_PALETTE[0]} label="Batch flow (matches batch color)" />
            <LegendSwatch color="hsl(var(--status-error))" dashed label="Blocked connection" />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-active/10 text-status-active border-status-active/30"><Boxes className="h-2.5 w-2.5" /> N</span>}
              label="Active equipment with batches"
            />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-muted text-muted-foreground border-border"><Boxes className="h-2.5 w-2.5" /> 0</span>}
              label="Idle equipment"
            />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-error/15 text-status-error border-status-error/40"><Boxes className="h-2.5 w-2.5" /> ≥3</span>}
              label="Overloaded equipment (≥3 batches)"
            />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-error/15 text-status-error border-status-error/40"><Zap className="h-2.5 w-2.5" /> Broken</span>}
              label="Broken equipment (current state)"
            />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-warning/15 text-status-warning border-status-warning/40"><Clock className="h-2.5 w-2.5" /> Delay</span>}
              label="Batch delay associated"
            />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border" style={{ background: "hsl(38 95% 94%)", color: "hsl(38 92% 35%)", borderColor: "hsl(38 92% 50%)" }}><Layers className="h-2.5 w-2.5" /> Hub</span>}
              label="Critical hub (>2 selected flows intersect)"
            />
            <LegendSwatch
              icon={<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border" style={{ background: "hsl(280 80% 96%)", color: "hsl(280 70% 40%)", borderColor: "hsl(280 70% 55%)" }}><ShieldAlert className="h-2.5 w-2.5" /> SPOF</span>}
              label="Single point of failure (no idle peer)"
            />
          </CardContent>
        </Card>

        {/* Footnote */}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3" />
          Read-only management view. Solid vs dashed lines and the number of outgoing edges have no deeper semantic meaning —
          rely on the explicit hub, SPOF, overload, broken and delay markers for decision making.
        </p>
      </div>
    </TooltipProvider>
  );
}

// ── KPI tile ────────────────────────────────────────────────────────────

function KpiTile({
  icon, label, value, tone, hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "active" | "muted" | "warning" | "spof";
  hint?: string;
}) {
  const toneCls =
    tone === "active"  ? "bg-status-active/10 text-status-active border-status-active/30"
  : tone === "warning" ? "bg-status-warning/10 text-status-warning border-status-warning/30"
  : tone === "spof"    ? "border-[hsl(280_70%_55%)]/40 text-[hsl(280_70%_40%)] bg-[hsl(280_80%_96%)]"
  :                      "bg-muted text-muted-foreground border-border";
  return (
    <div className={`rounded-lg border p-3 flex items-center gap-3 shadow-tile ${toneCls}`}>
      <div className="h-8 w-8 rounded-md bg-card/70 flex items-center justify-center border border-border/60">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide font-medium opacity-80 truncate">{label}</div>
        <div className="text-xl font-bold leading-tight">{value}</div>
        {hint && <div className="text-[9px] opacity-70 truncate">{hint}</div>}
      </div>
    </div>
  );
}
