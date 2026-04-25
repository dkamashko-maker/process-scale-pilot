/**
 * Sensor Map — read-only diagnostic visualization.
 *
 * Shows equipment units, the sensors they host, and the connections
 * between them. Users can highlight one or many batches to see how
 * material/sample/data flows traverse the fleet, where alerts are
 * raised, where connectivity is degraded or missing, and where flows
 * intersect on a single unit (critical hubs).
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
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertTriangle, Cable, CircleDot, Info, Layers,
  Radio, Wifi, WifiOff, X, Zap,
} from "lucide-react";
import { EQUIPMENT, type Equipment } from "@/data/equipment";
import { SENSORS, getSensorsForEquipment } from "@/data/sensors";
import { CONNECTIONS } from "@/data/connections";
import { BATCHES } from "@/data/batches";
import { EquipmentTooltip } from "@/components/equipment/EquipmentTooltip";

// ── Batch palette (first 5 distinct colors, then a neutral fallback) ──
const BATCH_PALETTE = [
  "hsl(195 85% 45%)",   // teal-blue (primary)
  "hsl(280 70% 55%)",   // violet
  "hsl(38 92% 50%)",    // amber
  "hsl(158 64% 38%)",   // green
  "hsl(0 72% 51%)",     // red
];
const FALLBACK_BATCH = "hsl(215 16% 55%)";

function batchColorFor(batchId: string, selected: string[]): string {
  const idx = selected.indexOf(batchId);
  if (idx === -1) return FALLBACK_BATCH;
  return BATCH_PALETTE[idx] ?? FALLBACK_BATCH;
}

// ── Layout: fixed columns by category ─────────────────────────────────
// Upstream → Downstream → Analytical (sample handoff swimlane)

const COLUMN_X = { upstream: 120, downstream: 480, analytical: 880 } as const;
const NODE_W = 220;
const NODE_H = 96;
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

/** Returns the union of selected batch ids that match a connection. */
function batchesOnConnection(
  connBatchIds: string[],
  selected: string[],
): string[] {
  if (selected.length === 0) return [];
  return selected.filter((b) => connBatchIds.includes(b));
}

/** Returns all selected batches that touch a given equipment unit. */
function batchesOnEquipment(
  eq: Equipment,
  selected: string[],
): string[] {
  if (selected.length === 0) return [];
  const set = new Set<string>(eq.currentBatchIds ?? (eq.currentBatch ? [eq.currentBatch] : []));
  for (const c of CONNECTIONS) {
    if (c.fromEquipmentId === eq.equipmentId || c.toEquipmentId === eq.equipmentId) {
      for (const b of c.currentBatchIds) set.add(b);
    }
  }
  return selected.filter((b) => set.has(b));
}

// ── Visual atoms ───────────────────────────────────────────────────────

function StatusDot({ eq }: { eq: Equipment }) {
  const cls =
    eq.status === "error"
      ? "bg-status-error"
      : eq.status === "active"
      ? "bg-status-active"
      : "bg-status-idle";
  return <span className={`h-2 w-2 rounded-full ${cls}`} />;
}

function ConnectionIcon({ health }: { health: Equipment["connectionHealth"] }) {
  if (health === "connected") return <Wifi className="h-3 w-3 text-status-active" />;
  if (health === "degraded")  return <CircleDot className="h-3 w-3 text-status-warning" />;
  return <WifiOff className="h-3 w-3 text-status-error" />;
}

// ── Node ───────────────────────────────────────────────────────────────

function Node({
  node,
  selectedBatches,
  isHub,
}: {
  node: PositionedNode;
  selectedBatches: string[];
  isHub: boolean;
}) {
  const { eq, x, y } = node;
  const batches = batchesOnEquipment(eq, selectedBatches);
  const isHighlighted = batches.length > 0;
  const broken = eq.status === "error";
  const hasAlerts = eq.alertCount > 0;
  const sensors = getSensorsForEquipment(eq.equipmentId);

  // Border color: hub > broken > batch highlight > category default
  let borderColor = "hsl(var(--border))";
  let borderWidth = 1;
  if (isHub) {
    borderColor = "hsl(38 92% 50%)";
    borderWidth = 2.5;
  } else if (broken) {
    borderColor = "hsl(var(--status-error))";
    borderWidth = 2;
  } else if (isHighlighted) {
    borderColor = batchColorFor(batches[0], selectedBatches);
    borderWidth = 2;
  }

  const fill =
    broken
      ? "hsl(0 80% 97%)"
      : isHighlighted
      ? "hsl(var(--card))"
      : "hsl(var(--card))";

  const opacity = selectedBatches.length > 0 && !isHighlighted && !broken ? 0.55 : 1;

  return (
    <g transform={`translate(${x}, ${y})`} style={{ opacity }}>
      <EquipmentTooltip equipment={eq} side="top">
        <foreignObject width={NODE_W} height={NODE_H} style={{ overflow: "visible" }}>
          <div
            className="rounded-lg shadow-tile h-full w-full px-3 py-2 flex flex-col gap-1.5"
            style={{
              borderStyle: "solid",
              borderColor,
              borderWidth,
              background: fill,
            }}
          >
            {/* Header row */}
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
                <ConnectionIcon health={eq.connectionHealth} />
              </div>
            </div>

            {/* Footer row: sensors + alert/broken/hub markers */}
            <div className="mt-auto flex items-center justify-between gap-1">
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <Radio className="h-2.5 w-2.5" />
                {sensors.length} sensor{sensors.length === 1 ? "" : "s"}
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
                {hasAlerts && !broken && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-warning/15 text-status-warning border-status-warning/40"
                    title={`${eq.alertCount} alert${eq.alertCount === 1 ? "" : "s"}`}
                  >
                    <AlertTriangle className="h-2.5 w-2.5" /> {eq.alertCount}
                  </span>
                )}
                {isHub && (
                  <span
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border"
                    style={{
                      background: "hsl(38 95% 94%)",
                      color: "hsl(38 92% 35%)",
                      borderColor: "hsl(38 92% 50%)",
                    }}
                    title="Critical hub — multiple selected batch flows intersect here"
                  >
                    <Layers className="h-2.5 w-2.5" /> Hub
                  </span>
                )}
              </div>
            </div>

            {/* Batch dots — colored by selection */}
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

interface EdgeProps {
  fromId: string;
  toId: string;
  /** Connection-level selected batches (in selection order) */
  highlightBatches: string[];
  selectedBatches: string[];
  /** True when no link was modeled but we want to show absence */
  missing?: boolean;
  /** "blocked" connection state from the data model */
  blocked?: boolean;
  label?: string;
}

function Edge({
  fromId, toId, highlightBatches, selectedBatches, missing, blocked, label,
}: EdgeProps) {
  const a = POS.get(fromId);
  const b = POS.get(toId);
  if (!a || !b) return null;

  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  const path = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;

  const dimmed = selectedBatches.length > 0 && highlightBatches.length === 0 && !blocked && !missing;

  // Default neutral edge
  let stroke = "hsl(var(--border))";
  let strokeWidth = 1.25;
  let dash: string | undefined;
  let opacity = dimmed ? 0.25 : 0.7;

  if (missing) {
    stroke = "hsl(var(--status-error))";
    dash = "4 4";
    opacity = 0.9;
  } else if (blocked) {
    stroke = "hsl(var(--status-error))";
    strokeWidth = 2;
    dash = "6 4";
    opacity = 1;
  } else if (highlightBatches.length === 1) {
    stroke = batchColorFor(highlightBatches[0], selectedBatches);
    strokeWidth = 2.5;
    opacity = 1;
  } else if (highlightBatches.length > 1) {
    // For multi-batch overlap, render the first as the base line and let
    // additional batch ribbons render on top via the parent loop.
    stroke = batchColorFor(highlightBatches[0], selectedBatches);
    strokeWidth = 2.5;
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
      {label && !dimmed && (
        <text
          x={mx}
          y={(y1 + y2) / 2 - 6}
          textAnchor="middle"
          fontSize={9}
          fill="hsl(var(--muted-foreground))"
          style={{ pointerEvents: "none" }}
        >
          {missing ? "missing link" : blocked ? "blocked" : label}
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

export default function SensorMapPage() {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const toggleBatch = (id: string) => {
    setSelectedBatches((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  };

  // Identify critical hubs: equipment with > 2 selected batch flows touching it.
  const hubIds = useMemo(() => {
    if (selectedBatches.length < 2) return new Set<string>();
    const out = new Set<string>();
    for (const eq of EQUIPMENT) {
      if (batchesOnEquipment(eq, selectedBatches).length > 2) {
        out.add(eq.equipmentId);
      }
    }
    return out;
  }, [selectedBatches]);

  // Detect "missing" links: pairs that look like they should connect but
  // currently have no edge in the graph (heuristic: same batch present on
  // adjacent columns without a CONNECTIONS entry between them).
  const missingLinks = useMemo(() => {
    if (selectedBatches.length === 0) return [] as Array<{ fromId: string; toId: string }>;
    const links: Array<{ fromId: string; toId: string }> = [];
    const known = new Set(CONNECTIONS.map((c) => `${c.fromEquipmentId}->${c.toEquipmentId}`));
    for (const b of selectedBatches) {
      const upstreamHits   = EQUIPMENT.filter((e) => e.equipmentCategory === "upstream"   && (e.currentBatchIds ?? []).includes(b));
      const downstreamHits = EQUIPMENT.filter((e) => e.equipmentCategory === "downstream" && (e.currentBatchIds ?? []).includes(b));
      for (const u of upstreamHits) {
        for (const d of downstreamHits) {
          if (!known.has(`${u.equipmentId}->${d.equipmentId}`) &&
              !CONNECTIONS.some((c) => c.fromEquipmentId === u.equipmentId)) {
            links.push({ fromId: u.equipmentId, toId: d.equipmentId });
          }
        }
      }
    }
    return links;
  }, [selectedBatches]);

  // Counts for header chips
  const totals = useMemo(() => ({
    equipment: EQUIPMENT.length,
    sensors: SENSORS.length,
    connections: CONNECTIONS.filter((c) => c.toEquipmentId !== "DATAVEST").length,
    broken: EQUIPMENT.filter((e) => e.status === "error").length,
    alerts: EQUIPMENT.reduce((acc, e) => acc + (e.alertCount > 0 ? 1 : 0), 0),
  }), []);

  // Filter to renderable connections (skip data-only edges to virtual sink)
  const renderableConnections = CONNECTIONS.filter((c) => POS.has(c.fromEquipmentId) && POS.has(c.toEquipmentId));

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sensor Map</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Read-only diagnostic view of equipment, sensors and connections across the fleet.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Badge variant="secondary" className="gap-1"><Cable className="h-3 w-3" /> {totals.equipment} units</Badge>
            <Badge variant="secondary" className="gap-1"><Radio className="h-3 w-3" /> {totals.sensors} sensors</Badge>
            <Badge variant="secondary">{totals.connections} connections</Badge>
            {totals.broken > 0 && (
              <Badge className="gap-1 bg-status-error/15 text-status-error border-status-error/30 hover:bg-status-error/15">
                <Zap className="h-3 w-3" /> {totals.broken} broken
              </Badge>
            )}
            {totals.alerts > 0 && (
              <Badge className="gap-1 bg-status-warning/15 text-status-warning border-status-warning/30 hover:bg-status-warning/15">
                <AlertTriangle className="h-3 w-3" /> {totals.alerts} alerting
              </Badge>
            )}
          </div>
        </div>

        {/* Batch picker + selected chips */}
        <Card>
          <CardContent className="py-3 flex flex-wrap items-center gap-2">
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2">
                  <Layers className="h-4 w-4" />
                  Highlight batches
                  {selectedBatches.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                      {selectedBatches.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[340px] p-2" align="start">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-2 py-1.5">
                  Select one or more batches
                </div>
                <div className="max-h-[280px] overflow-y-auto">
                  {BATCHES.map((b) => {
                    const checked = selectedBatches.includes(b.id);
                    const idx = selectedBatches.indexOf(b.id);
                    const color = idx >= 0 ? BATCH_PALETTE[idx] ?? FALLBACK_BATCH : FALLBACK_BATCH;
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBatch(b.id)}
                        className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs ${
                          checked ? "bg-muted" : ""
                        }`}
                      >
                        <span
                          className="h-3 w-3 rounded-full border"
                          style={{ background: checked ? color : "transparent", borderColor: checked ? color : "hsl(var(--border))" }}
                        />
                        <span className="font-mono">{b.id}</span>
                        <span className="text-muted-foreground truncate">— {b.product} · {b.stage.replace("_", " ")}</span>
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

            {/* Selected chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedBatches.map((id, i) => (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-0.5 rounded-full border text-[11px] font-medium bg-card"
                  style={{ borderColor: BATCH_PALETTE[i] ?? FALLBACK_BATCH }}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: BATCH_PALETTE[i] ?? FALLBACK_BATCH }}
                  />
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
                  <Info className="h-3 w-3" /> Select batches to highlight their flows. The first 5 selections get distinct colors.
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Map canvas */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Cable className="h-4 w-4 text-primary" /> Fleet connectivity
            </CardTitle>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>Upstream</span>
              <span>→</span>
              <span>Downstream</span>
              <span>→</span>
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
                aria-label="Sensor map diagnostic visualization"
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

                {/* Edges (under nodes) */}
                {renderableConnections.map((c) => (
                  <Edge
                    key={c.id}
                    fromId={c.fromEquipmentId}
                    toId={c.toEquipmentId}
                    highlightBatches={batchesOnConnection(c.currentBatchIds, selectedBatches)}
                    selectedBatches={selectedBatches}
                    blocked={c.status === "blocked"}
                    label={c.label}
                  />
                ))}

                {/* Missing links (red dashed) */}
                {missingLinks.map((m, i) => (
                  <Edge
                    key={`missing-${i}`}
                    fromId={m.fromId}
                    toId={m.toId}
                    highlightBatches={[]}
                    selectedBatches={selectedBatches}
                    missing
                    label="missing"
                  />
                ))}

                {/* Nodes */}
                {LAYOUT.map((n) => (
                  <Node
                    key={n.eq.equipmentId}
                    node={n}
                    selectedBatches={selectedBatches}
                    isHub={hubIds.has(n.eq.equipmentId)}
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
            {/* Batch colors */}
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

            <LegendSwatch icon={<Wifi className="h-3.5 w-3.5 text-status-active" />} label="Connected equipment" />
            <LegendSwatch icon={<CircleDot className="h-3.5 w-3.5 text-status-warning" />} label="Degraded connection" />
            <LegendSwatch color="hsl(var(--status-error))" dashed label="Missing connection" />
            <LegendSwatch
              icon={
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-warning/15 text-status-warning border-status-warning/40">
                  <AlertTriangle className="h-2.5 w-2.5" /> N
                </span>
              }
              label="Equipment with active alerts"
            />
            <LegendSwatch
              icon={
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border bg-status-error/15 text-status-error border-status-error/40">
                  <Zap className="h-2.5 w-2.5" /> Broken
                </span>
              }
              label="Broken equipment (current state)"
            />
            <LegendSwatch
              icon={
                <span
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold border"
                  style={{ background: "hsl(38 95% 94%)", color: "hsl(38 92% 35%)", borderColor: "hsl(38 92% 50%)" }}
                >
                  <Layers className="h-2.5 w-2.5" /> Hub
                </span>
              }
              label="Critical hub (>2 selected flows intersect)"
            />
          </CardContent>
        </Card>

        {/* Footnote */}
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Info className="h-3 w-3" />
          This screen is a diagnostic visualization, not a process simulator. Solid vs dashed lines and the number of outgoing
          edges have no deeper semantic meaning.
        </p>
      </div>
    </TooltipProvider>
  );
}

// ── Suppress unused-import warnings while preserving readability ──
void Tooltip; void TooltipContent; void TooltipTrigger;
