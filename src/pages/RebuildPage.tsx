import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import {
  FlaskConical, Wind, Pipette, TestTube, Microscope, Cpu, Gauge,
  Search, GripVertical, Plus, Trash2, Save, Play, Settings2, X,
  ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Brain,
  Merge, Filter, Zap, BarChart3, LineChart as LineChartIcon, Clock,
  FileText, Shield, ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine, Area, AreaChart, BarChart, Bar,
  ComposedChart, Scatter,
} from "recharts";
import {
  INTERFACES, RUNS, PARAMETERS,
} from "@/data/runData";
import {
  type Pipeline, type PipelineNode, type PipelineEdge, type PipelineNodeParam,
  type SimulationConfig, type SimulationResults, type SimulationAlert, type EventPreview,
  createPipeline, savePipeline, getRunsForDevice, runSimulation,
  saveSimulationRecord, commitEvents, getPipelines, createDefaultStarterPipeline,
} from "@/data/pipelineStore";
import type { InstrumentInterface } from "@/data/runTypes";

// ══════════════════════════════════════════════
// Constants
// ══════════════════════════════════════════════

const DEVICE_ICONS: Record<string, typeof FlaskConical> = {
  // Legacy
  "BR-003-p": FlaskConical, "BR-004-p": FlaskConical, "BR-005-p": FlaskConical,
  "GAS-MFC-RACK": Wind, "PUMP-MODULE": Pipette,
  "METAB-ANALYZER": TestTube, "CELL-COUNTER": Microscope, "HPLC-01": Cpu,
  // Upstream
  "UP-001": FlaskConical, "UP-002": FlaskConical,
  // Downstream
  "DS-101": Pipette, "DS-102": Pipette,
  "DS-201": Pipette, "DS-202": Pipette,
  "DS-301": TestTube, "DS-302": Wind,
  "DS-401": TestTube, "DS-402": Pipette, "DS-403": TestTube,
  // Analytical
  "AN-101": Cpu, "AN-102": Cpu, "AN-103": Cpu, "AN-104": TestTube,
  "AN-105": Microscope, "AN-106": Cpu, "AN-107": TestTube,
  "AN-108": TestTube, "AN-109": Microscope, "AN-110": Cpu, "AN-111": Cpu,
};

const UTILITY_NODES = [
  { type: "range_check" as const, label: "Range Check", icon: Filter, description: "Validates parameter values against configured min/max ranges" },
  { type: "unit_consistency" as const, label: "Unit Consistency Check", icon: Settings2, description: "Checks timeseries units against parameter catalog" },
  { type: "event_overlay" as const, label: "Event Overlay", icon: Clock, description: "Overlays process events on the timeline" },
  { type: "ml_insight" as const, label: "ML Insight (Simulated)", icon: Brain, description: "Anomaly scoring & forecast using heuristic ML" },
  { type: "alert_generator" as const, label: "Alert Generator", icon: Zap, description: "Generates alerts from range violations & forecasts" },
  { type: "merge" as const, label: "Merge", icon: Merge, description: "Merges data streams from multiple sources" },
];

const NODE_COLORS: Record<string, string> = {
  device: "hsl(var(--primary))",
  range_check: "hsl(173, 58%, 39%)",
  unit_consistency: "hsl(43, 96%, 56%)",
  event_overlay: "hsl(27, 87%, 67%)",
  ml_insight: "hsl(270, 60%, 55%)",
  alert_generator: "hsl(0, 72%, 51%)",
  merge: "hsl(215, 25%, 47%)",
};

const GRID_SIZE = 20;
const NODE_W = 180;
const NODE_H = 72;

function snapToGrid(v: number) { return Math.round(v / GRID_SIZE) * GRID_SIZE; }

// ══════════════════════════════════════════════
// Canvas Node Component
// ══════════════════════════════════════════════

function CanvasNode({
  node, selected, alertCount, onSelect, onDragStart,
}: {
  node: PipelineNode;
  selected: boolean;
  alertCount: number;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
}) {
  const color = NODE_COLORS[node.type] || NODE_COLORS.device;
  const Icon = node.type === "device"
    ? (DEVICE_ICONS[node.interface_id || ""] || Gauge)
    : (UTILITY_NODES.find((u) => u.type === node.type)?.icon || Settings2);

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onMouseDown={(e) => { e.stopPropagation(); onDragStart(e); }}
      style={{ cursor: "grab" }}
      className="select-none"
    >
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill="hsl(var(--card))"
        stroke={selected ? color : "hsl(var(--border))"}
        strokeWidth={selected ? 2.5 : 1}
        filter={selected ? "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.08))"}
      />
      {/* Color accent bar */}
      <rect x={0} y={0} width={4} height={NODE_H} rx={2} fill={color} />
      {/* Icon */}
      <foreignObject x={12} y={16} width={32} height={32}>
        <div style={{ background: color, borderRadius: 6, padding: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 18, height: 18, color: "#fff" }} />
        </div>
      </foreignObject>
      {/* Label */}
      <text x={52} y={30} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">{node.label.length > 16 ? node.label.slice(0, 15) + "…" : node.label}</text>
      <text x={52} y={46} fontSize={9} fill="hsl(var(--muted-foreground))">{node.type === "device" ? (node.interface_id || "No device") : node.type.replace(/_/g, " ")}</text>
      {/* Alert badge */}
      {alertCount > 0 && (
        <>
          <circle cx={NODE_W - 12} cy={12} r={9} fill="hsl(0, 72%, 51%)" />
          <text x={NODE_W - 12} y={16} fontSize={9} fontWeight={700} fill="#fff" textAnchor="middle">{alertCount}</text>
        </>
      )}
      {/* Connection ports */}
      <circle cx={0} cy={NODE_H / 2} r={5} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.5} />
      <circle cx={NODE_W} cy={NODE_H / 2} r={5} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={1.5} />
    </g>
  );
}

// ══════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════

export default function RebuildPage() {
  const { toast } = useToast();

  // Pipeline state
  const [pipeline, setPipeline] = useState<Pipeline>(() => {
    const starter = createDefaultStarterPipeline();
    if (starter) return starter;
    const existing = getPipelines();
    if (existing.length > 0) return existing[0];
    return createPipeline("Untitled Pipeline", "current_user");
  });
  const [starterToastShown, setStarterToastShown] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // UI state
  const [paletteSearch, setPaletteSearch] = useState("");
  const [paletteCollapsed, setPaletteCollapsed] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);
  const [showSimModal, setShowSimModal] = useState(false);
  const [simResults, setSimResults] = useState<SimulationResults | null>(null);
  const [resultsCollapsed, setResultsCollapsed] = useState(false);

  // Canvas state
  const svgRef = useRef<SVGSVGElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState<{ nodeId: string; startX: number; startY: number; nodeStartX: number; nodeStartY: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; panStartX: number; panStartY: number } | null>(null);

  const selectedNode = pipeline.nodes.find((n) => n.id === selectedNodeId) || null;

  // Show starter toast once
  useEffect(() => {
    if (pipeline.pipeline_id === "PIPELINE-DEFAULT-001" && !starterToastShown) {
      setStarterToastShown(true);
      toast({ title: "Starter pipeline created.", description: "A default PH/TEMP monitoring pipeline has been loaded. You can edit it freely." });
    }
  }, [pipeline.pipeline_id, starterToastShown, toast]);

  // ── Palette filtering ──
  const filteredDevices = useMemo(() => {
    const q = paletteSearch.toLowerCase();
    return INTERFACES.filter(
      (i) => i.display_name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q) || i.category.toLowerCase().includes(q),
    );
  }, [paletteSearch]);

  const filteredUtilities = useMemo(() => {
    const q = paletteSearch.toLowerCase();
    return UTILITY_NODES.filter((u) => u.label.toLowerCase().includes(q));
  }, [paletteSearch]);

  // ── Node operations ──
  const addNode = useCallback((type: PipelineNode["type"], label: string, interfaceId?: string) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const x = snapToGrid(200 + Math.random() * 300 - pan.x);
    const y = snapToGrid(100 + Math.random() * 200 - pan.y);
    const newNode: PipelineNode = {
      id, type, label, x, y,
      interface_id: interfaceId,
      selected_run_ids: [],
      parameters: [],
      anomaly_threshold: type === "ml_insight" ? 70 : undefined,
      forecast_hours: type === "ml_insight" ? 12 : undefined,
      apply_parameter_codes: [],
    };
    setPipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setSelectedNodeId(id);
  }, [pan]);

  const updateNode = useCallback((nodeId: string, updates: Partial<PipelineNode>) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === nodeId ? { ...n, ...updates } : n)),
    }));
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setPipeline((prev) => ({
      ...prev,
      nodes: prev.nodes.filter((n) => n.id !== nodeId),
      edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  }, [selectedNodeId]);

  const addEdge = useCallback((source: string, target: string) => {
    if (source === target) return;
    const exists = pipeline.edges.some((e) => e.source === source && e.target === target);
    if (exists) return;
    setPipeline((prev) => ({
      ...prev,
      edges: [...prev.edges, { id: `edge-${Date.now()}`, source, target }],
    }));
  }, [pipeline.edges]);

  const deleteEdge = useCallback((edgeId: string) => {
    setPipeline((prev) => ({
      ...prev,
      edges: prev.edges.filter((e) => e.id !== edgeId),
    }));
  }, []);

  // ── Canvas interactions ──
  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setSelectedNodeId(null);
    setPanning({ startX: e.clientX, startY: e.clientY, panStartX: pan.x, panStartY: pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragging) {
      const dx = (e.clientX - dragging.startX) / zoom;
      const dy = (e.clientY - dragging.startY) / zoom;
      updateNode(dragging.nodeId, {
        x: snapToGrid(dragging.nodeStartX + dx),
        y: snapToGrid(dragging.nodeStartY + dy),
      });
    }
    if (panning) {
      setPan({
        x: panning.panStartX + (e.clientX - panning.startX),
        y: panning.panStartY + (e.clientY - panning.startY),
      });
    }
  }, [dragging, panning, zoom, updateNode]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setPanning(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  }, []);

  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    const node = pipeline.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    setDragging({ nodeId, startX: e.clientX, startY: e.clientY, nodeStartX: node.x, nodeStartY: node.y });
    setSelectedNodeId(nodeId);
  }, [pipeline.nodes]);

  const handleNodeClick = useCallback((nodeId: string) => {
    if (connectingFrom) {
      addEdge(connectingFrom, nodeId);
      setConnectingFrom(null);
    } else {
      setSelectedNodeId(nodeId);
    }
  }, [connectingFrom, addEdge]);

  // ── Save ──
  const handleSave = useCallback(() => {
    savePipeline(pipeline);
    toast({ title: "Pipeline saved", description: pipeline.name });
  }, [pipeline, toast]);

  // ── Simulation ──
  const [simConfig, setSimConfig] = useState<SimulationConfig>({
    scope_mode: "single_run",
    selected_run_ids: RUNS.length > 0 ? [RUNS[0].run_id] : [],
    selected_interface_ids: [],
    time_window_start: RUNS[0]?.start_time || "",
    time_window_end: RUNS[0]?.end_time || "",
    downsample_minutes: 5,
    generate_alerts: true,
    generate_events_preview: true,
  });

  const deviceNodesInPipeline = pipeline.nodes.filter((n) => n.type === "device" && n.interface_id);

  const handleRunSimulation = useCallback(() => {
    const results = runSimulation(pipeline, simConfig);
    setSimResults(results);
    setShowSimModal(false);
    setResultsCollapsed(false);

    // Save record
    saveSimulationRecord({
      simulation_id: results.simulation_id,
      pipeline_id: results.pipeline_id,
      created_at: results.created_at,
      created_by: results.created_by,
      scope_mode: results.scope_mode,
      selected_run_ids: results.selected_run_ids,
      selected_interface_ids: results.selected_interface_ids,
      time_window_start: results.time_window_start,
      time_window_end: results.time_window_end,
      results_summary: results.parameter_results,
      generated_alerts: results.alerts,
      generated_events_preview: results.events_preview,
    });

    toast({
      title: "Simulation complete",
      description: `${Object.keys(results.parameter_results).length} parameter results, ${results.alerts.length} alerts`,
    });
  }, [pipeline, simConfig, toast]);

  const handleCommitEvents = useCallback(() => {
    if (!simResults) return;
    commitEvents(simResults.events_preview);
    toast({ title: "Events committed", description: `${simResults.events_preview.length} events saved as log entries (recording only).` });
  }, [simResults, toast]);

  // ── Edge rendering helper ──
  const renderEdge = useCallback((edge: PipelineEdge) => {
    const src = pipeline.nodes.find((n) => n.id === edge.source);
    const tgt = pipeline.nodes.find((n) => n.id === edge.target);
    if (!src || !tgt) return null;

    const x1 = src.x + NODE_W;
    const y1 = src.y + NODE_H / 2;
    const x2 = tgt.x;
    const y2 = tgt.y + NODE_H / 2;
    const cx = (x1 + x2) / 2;

    return (
      <g key={edge.id}>
        <path
          d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={2}
          className="hover:stroke-primary transition-colors cursor-pointer"
          onClick={(e) => { e.stopPropagation(); deleteEdge(edge.id); }}
        />
        <circle cx={(x1 + x2) / 2} cy={(y1 + y2) / 2} r={3} fill="hsl(var(--muted-foreground))" />
      </g>
    );
  }, [pipeline.nodes, deleteEdge]);

  // ── Param helpers for inspector ──
  const addParamToNode = useCallback((nodeId: string) => {
    const node = pipeline.nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const existing = new Set(node.parameters?.map((p) => p.parameter_code) || []);
    const available = PARAMETERS.find((p) => !existing.has(p.parameter_code));
    if (!available) return;
    updateNode(nodeId, {
      parameters: [
        ...(node.parameters || []),
        {
          parameter_code: available.parameter_code,
          display_name: available.display_name,
          unit: available.unit,
          min: available.min_value,
          max: available.max_value,
          useCatalogRange: true,
        },
      ],
    });
  }, [pipeline.nodes, updateNode]);

  const updateParam = useCallback((nodeId: string, paramIdx: number, updates: Partial<PipelineNodeParam>) => {
    const node = pipeline.nodes.find((n) => n.id === nodeId);
    if (!node?.parameters) return;
    const newParams = [...node.parameters];
    newParams[paramIdx] = { ...newParams[paramIdx], ...updates };
    updateNode(nodeId, { parameters: newParams });
  }, [pipeline.nodes, updateNode]);

  const removeParam = useCallback((nodeId: string, paramIdx: number) => {
    const node = pipeline.nodes.find((n) => n.id === nodeId);
    if (!node?.parameters) return;
    updateNode(nodeId, { parameters: node.parameters.filter((_, i) => i !== paramIdx) });
  }, [pipeline.nodes, updateNode]);

  const changeParamCode = useCallback((nodeId: string, paramIdx: number, newCode: string) => {
    const catalogParam = PARAMETERS.find((p) => p.parameter_code === newCode);
    if (!catalogParam) return;
    updateParam(nodeId, paramIdx, {
      parameter_code: newCode,
      display_name: catalogParam.display_name,
      unit: catalogParam.unit,
      min: catalogParam.min_value,
      max: catalogParam.max_value,
    });
  }, [updateParam]);

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col animate-fade-in">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-card shrink-0">
        <Settings2 className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Metadata Constructor → Rebuild</span>
        <Badge variant="outline" className="text-[9px] ml-1">PROTOTYPE</Badge>
        <InfoTooltip content="Configure operating conditions and simulate system behavior. ML features use heuristic methods on historical data." />
        <Separator orientation="vertical" className="h-5 mx-2" />
        <Input
          className="h-7 w-48 text-xs"
          value={pipeline.name}
          onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
        />
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={handleSave}>
            <Save className="h-3 w-3" /> Save
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => {
            // Pre-populate sim config with pipeline devices
            setSimConfig((c) => ({
              ...c,
              selected_interface_ids: deviceNodesInPipeline.map((n) => n.interface_id!),
            }));
            setShowSimModal(true);
          }}>
            <Play className="h-3 w-3" /> Simulate
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ══════════ LEFT PALETTE ══════════ */}
        <div className={`border-r bg-card shrink-0 flex flex-col transition-all ${paletteCollapsed ? "w-10" : "w-56"}`}>
          <div className="flex items-center justify-between p-2 border-b">
            {!paletteCollapsed && <span className="text-xs font-semibold text-muted-foreground uppercase">Palette</span>}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setPaletteCollapsed(!paletteCollapsed)}>
              {paletteCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </Button>
          </div>
          {!paletteCollapsed && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-3">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                  <Input className="h-7 text-xs pl-7" placeholder="Search…" value={paletteSearch} onChange={(e) => setPaletteSearch(e.target.value)} />
                </div>

                {/* Devices */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Devices</p>
                  <div className="space-y-1">
                    {filteredDevices.map((iface) => {
                      const Icon = DEVICE_ICONS[iface.id] || Gauge;
                      return (
                        <button
                          key={iface.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors text-left"
                          onClick={() => addNode("device", iface.display_name, iface.id)}
                        >
                          <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{iface.display_name}</p>
                            <p className="text-[9px] text-muted-foreground">{iface.category}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <Separator />

                {/* Utility nodes */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Utility Nodes</p>
                  <div className="space-y-1">
                    {filteredUtilities.map((u) => (
                      <button
                        key={u.type}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors text-left"
                        onClick={() => addNode(u.type, u.label)}
                        title={u.description}
                      >
                        <div className="rounded p-0.5 shrink-0" style={{ background: NODE_COLORS[u.type], opacity: 0.8 }}>
                          <u.icon className="h-3 w-3 text-white" />
                        </div>
                        <span className="truncate">{u.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* ══════════ CENTER CANVAS ══════════ */}
        <div className="flex-1 min-w-0 relative overflow-hidden bg-muted/30">
          {/* Canvas info bar */}
          <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
            <Badge variant="secondary" className="text-[9px]">{pipeline.nodes.length} nodes</Badge>
            <Badge variant="secondary" className="text-[9px]">{pipeline.edges.length} edges</Badge>
            <Badge variant="outline" className="text-[9px]">Zoom: {(zoom * 100).toFixed(0)}%</Badge>
            {connectingFrom && (
              <Badge variant="default" className="text-[9px] gap-1 animate-pulse">
                Connecting… Click target node
                <button onClick={() => setConnectingFrom(null)} className="ml-1"><X className="h-2.5 w-2.5" /></button>
              </Badge>
            )}
          </div>

          <svg
            ref={svgRef}
            className="w-full h-full"
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: panning ? "grabbing" : "default" }}
          >
            {/* Grid */}
            <defs>
              <pattern id="grid" width={GRID_SIZE * zoom} height={GRID_SIZE * zoom} patternUnits="userSpaceOnUse"
                x={pan.x % (GRID_SIZE * zoom)} y={pan.y % (GRID_SIZE * zoom)}>
                <circle cx={1} cy={1} r={0.5} fill="hsl(var(--border))" opacity={0.5} />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {pipeline.edges.map(renderEdge)}

              {/* Nodes */}
              {pipeline.nodes.map((node) => (
                <CanvasNode
                  key={node.id}
                  node={node}
                  selected={node.id === selectedNodeId}
                  alertCount={0}
                  onSelect={() => handleNodeClick(node.id)}
                  onDragStart={(e) => handleNodeDragStart(node.id, e)}
                />
              ))}
            </g>
          </svg>

          {/* Empty state */}
          {pipeline.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground space-y-2">
                <Settings2 className="h-10 w-10 mx-auto opacity-30" />
                <p className="text-sm font-medium">Drag devices from the palette to begin</p>
                <p className="text-xs">Connect nodes and configure parameters to build your simulation pipeline</p>
              </div>
            </div>
          )}
        </div>

        {/* ══════════ RIGHT INSPECTOR ══════════ */}
        <div className={`border-l bg-card shrink-0 flex flex-col transition-all ${inspectorCollapsed ? "w-10" : "w-72"}`}>
          <div className="flex items-center justify-between p-2 border-b">
            {!inspectorCollapsed && <span className="text-xs font-semibold text-muted-foreground uppercase">Inspector</span>}
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setInspectorCollapsed(!inspectorCollapsed)}>
              {inspectorCollapsed ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
          {!inspectorCollapsed && (
            <ScrollArea className="flex-1">
              {selectedNode ? (
                <div className="p-3 space-y-4">
                  {/* Node header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <Input className="h-7 text-xs font-semibold" value={selectedNode.label}
                        onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })} />
                      <p className="text-[9px] text-muted-foreground mt-1">{selectedNode.type.replace(/_/g, " ")}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="h-6 w-6 p-0" title="Connect to…"
                        onClick={() => setConnectingFrom(selectedNode.id)}>
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <Button variant="destructive" size="sm" className="h-6 w-6 p-0" title="Delete node"
                        onClick={() => deleteNode(selectedNode.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* ─── Device node config ─── */}
                  {selectedNode.type === "device" && (
                    <>
                      {/* Interface selector */}
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Device</Label>
                        <Select value={selectedNode.interface_id || ""} onValueChange={(v) => {
                          updateNode(selectedNode.id, { interface_id: v, selected_run_ids: [] });
                        }}>
                          <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Select device" /></SelectTrigger>
                          <SelectContent>
                            {INTERFACES.map((i) => (
                              <SelectItem key={i.id} value={i.id} className="text-xs">{i.display_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Run selector (multi) */}
                      {selectedNode.interface_id && (
                        <div>
                          <Label className="text-[10px] uppercase text-muted-foreground">Associated Runs</Label>
                          <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                            {getRunsForDevice(selectedNode.interface_id).map((run) => (
                              <label key={run.run_id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                                <Checkbox
                                  checked={selectedNode.selected_run_ids?.includes(run.run_id) || false}
                                  onCheckedChange={(checked) => {
                                    const current = selectedNode.selected_run_ids || [];
                                    updateNode(selectedNode.id, {
                                      selected_run_ids: checked
                                        ? [...current, run.run_id]
                                        : current.filter((id) => id !== run.run_id),
                                    });
                                  }}
                                />
                                <span>{run.bioreactor_run} — {run.reactor_id}</span>
                              </label>
                            ))}
                          </div>

                          {/* Run metadata summary */}
                          {selectedNode.selected_run_ids && selectedNode.selected_run_ids.length > 0 && (
                            <div className="mt-2 rounded-md border bg-muted/30 p-2 space-y-1">
                              {selectedNode.selected_run_ids.map((rid) => {
                                const run = RUNS.find((r) => r.run_id === rid);
                                if (!run) return null;
                                return (
                                  <div key={rid} className="text-[9px] text-muted-foreground">
                                    <span className="font-medium text-foreground">{run.bioreactor_run}</span> · {run.cell_line.split("/")[0]} · {run.process_strategy}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <Separator />

                      {/* Parameters */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-[10px] uppercase text-muted-foreground">Parameters</Label>
                          <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5" onClick={() => addParamToNode(selectedNode.id)}>
                            <Plus className="h-2.5 w-2.5" /> Add
                          </Button>
                        </div>
                        <div className="space-y-3">
                          {(selectedNode.parameters || []).map((param, idx) => (
                            <div key={idx} className="border rounded-md p-2 space-y-2 bg-muted/20">
                              <div className="flex items-center justify-between">
                                <Select value={param.parameter_code} onValueChange={(v) => changeParamCode(selectedNode.id, idx, v)}>
                                  <SelectTrigger className="h-6 text-[10px] w-32"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {PARAMETERS.map((p) => (
                                      <SelectItem key={p.parameter_code} value={p.parameter_code} className="text-xs">
                                        {p.display_name} ({p.parameter_code})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => removeParam(selectedNode.id, idx)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] text-muted-foreground w-10">Unit:</span>
                                <Input className="h-5 text-[10px] w-16" value={param.unitOverride || param.unit} readOnly={!param.unitOverride}
                                  onChange={(e) => updateParam(selectedNode.id, idx, { unitOverride: e.target.value })} />
                                {param.unitOverride && param.unitOverride !== PARAMETERS.find((p) => p.parameter_code === param.parameter_code)?.unit && (
                                  <Badge variant="destructive" className="text-[8px] h-4">⚠ unit mismatch</Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <label className="flex items-center gap-1 text-[9px] text-muted-foreground cursor-pointer">
                                  <Switch className="scale-50" checked={param.useCatalogRange}
                                    onCheckedChange={(v) => {
                                      const cat = PARAMETERS.find((p) => p.parameter_code === param.parameter_code);
                                      updateParam(selectedNode.id, idx, {
                                        useCatalogRange: v,
                                        min: v && cat ? cat.min_value : param.min,
                                        max: v && cat ? cat.max_value : param.max,
                                      });
                                    }} />
                                  Use catalog range
                                </label>
                              </div>

                              {!param.useCatalogRange && (
                                <div className="flex items-center gap-1.5">
                                  <div>
                                    <Label className="text-[8px]">Min</Label>
                                    <Input className="h-5 text-[10px] w-14" type="number" value={param.min}
                                      onChange={(e) => updateParam(selectedNode.id, idx, { min: parseFloat(e.target.value) || 0 })} />
                                  </div>
                                  <div>
                                    <Label className="text-[8px]">Max</Label>
                                    <Input className="h-5 text-[10px] w-14" type="number" value={param.max}
                                      onChange={(e) => updateParam(selectedNode.id, idx, { max: parseFloat(e.target.value) || 0 })} />
                                  </div>
                                  {param.min >= param.max && (
                                    <Badge variant="destructive" className="text-[8px] h-4">min ≥ max</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─── ML Insight node config ─── */}
                  {selectedNode.type === "ml_insight" && (
                    <div className="space-y-3">
                      <Badge variant="outline" className="text-[8px]">⚗ SIMULATED ML — heuristic methods</Badge>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Anomaly Threshold</Label>
                        <Input className="h-7 text-xs mt-1" type="number" min={0} max={100}
                          value={selectedNode.anomaly_threshold || 70}
                          onChange={(e) => updateNode(selectedNode.id, { anomaly_threshold: parseInt(e.target.value) || 70 })} />
                        <p className="text-[9px] text-muted-foreground mt-0.5">Score 0–100. Points above threshold flagged.</p>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Forecast Horizon (hours)</Label>
                        <Input className="h-7 text-xs mt-1" type="number" min={1} max={48}
                          value={selectedNode.forecast_hours || 12}
                          onChange={(e) => updateNode(selectedNode.id, { forecast_hours: parseInt(e.target.value) || 12 })} />
                      </div>
                    </div>
                  )}

                  {/* ─── Other utility nodes ─── */}
                  {["range_check", "unit_consistency", "event_overlay", "alert_generator", "merge"].includes(selectedNode.type) && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {UTILITY_NODES.find((u) => u.type === selectedNode.type)?.description}
                      </p>
                      {selectedNode.type === "alert_generator" && (
                        <p className="text-[9px] text-muted-foreground italic">
                          This node will generate alerts for OOR episodes, unit mismatches, and forecast violations during simulation.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-muted-foreground text-xs mt-8">
                  <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Select a node to configure
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </div>

      {/* ══════════ RESULTS PANEL ══════════ */}
      {simResults && (
        <div className={`border-t bg-card transition-all ${resultsCollapsed ? "h-10" : "h-[45vh]"}`}>
          <div className="flex items-center gap-2 px-3 py-1.5 border-b">
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setResultsCollapsed(!resultsCollapsed)}>
              {resultsCollapsed ? <ChevronRight className="h-3 w-3 rotate-[-90deg]" /> : <ChevronRight className="h-3 w-3 rotate-90" />}
            </Button>
            <span className="text-xs font-semibold">Simulation Results</span>
            <Badge variant={simResults.overall_status === "pass" ? "secondary" : simResults.overall_status === "warning" ? "outline" : "destructive"} className="text-[9px]">
              {simResults.overall_status.toUpperCase()}
            </Badge>
            <Badge variant="secondary" className="text-[9px]">{simResults.simulation_id}</Badge>
            <span className="text-[9px] text-muted-foreground ml-auto">{format(new Date(simResults.created_at), "yyyy-MM-dd HH:mm:ss")}</span>
          </div>
          {!resultsCollapsed && (
            <Tabs defaultValue="summary" className="h-[calc(100%-36px)]">
              <TabsList className="mx-3 mt-1 h-7">
                <TabsTrigger value="summary" className="text-[10px] h-5">Summary</TabsTrigger>
                <TabsTrigger value="timeline" className="text-[10px] h-5">Timeline</TabsTrigger>
                <TabsTrigger value="forecast" className="text-[10px] h-5">Forecast</TabsTrigger>
                <TabsTrigger value="alerts" className="text-[10px] h-5">Alerts ({simResults.alerts.length})</TabsTrigger>
                <TabsTrigger value="events" className="text-[10px] h-5">Events Preview ({simResults.events_preview.length})</TabsTrigger>
              </TabsList>

              {/* Summary */}
              <TabsContent value="summary" className="px-3 overflow-auto h-[calc(100%-40px)]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <MiniKpi label="Parameters" value={Object.keys(simResults.parameter_results).length} />
                  <MiniKpi label="Alerts" value={simResults.alerts.length} accent={simResults.alerts.length > 0} />
                  <MiniKpi label="Events Preview" value={simResults.events_preview.length} />
                  <MiniKpi label="Top Risks" value={simResults.top_risks.length} accent={simResults.top_risks.length > 0} />
                </div>
                {simResults.top_risks.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Top Risks</p>
                    {simResults.top_risks.map((r, i) => (
                      <p key={i} className="text-xs flex items-center gap-1.5 py-0.5">
                        <AlertTriangle className="h-3 w-3 text-destructive shrink-0" /> {r}
                      </p>
                    ))}
                  </div>
                )}
                {simResults.ml_drivers.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">ML Drivers <Badge variant="outline" className="text-[7px] ml-1">SIMULATED</Badge></p>
                    {simResults.ml_drivers.map((d, i) => (
                      <p key={i} className="text-xs flex items-center gap-1.5 py-0.5">
                        <Brain className="h-3 w-3 text-purple-500 shrink-0" /> {d}
                      </p>
                    ))}
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px]">Parameter</TableHead>
                      <TableHead className="text-[10px]">Unit</TableHead>
                      <TableHead className="text-[10px]">Points</TableHead>
                      <TableHead className="text-[10px]">In Range %</TableHead>
                      <TableHead className="text-[10px]">OOR Episodes</TableHead>
                      <TableHead className="text-[10px]">Unit Check</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.values(simResults.parameter_results).map((pr) => (
                      <TableRow key={pr.parameter_code + pr.unit}>
                        <TableCell className="text-xs">{pr.display_name}</TableCell>
                        <TableCell className="text-xs font-mono">{pr.unit}</TableCell>
                        <TableCell className="text-xs">{pr.total_points}</TableCell>
                        <TableCell className="text-xs font-mono">
                          <span className={pr.pct_in_range < 90 ? "text-destructive font-medium" : ""}>{pr.pct_in_range.toFixed(1)}%</span>
                        </TableCell>
                        <TableCell className="text-xs">{pr.oor_episodes.length}</TableCell>
                        <TableCell>
                          {pr.unit_mismatch ? (
                            <Badge variant="destructive" className="text-[8px]">Mismatch</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[8px]">OK</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {/* Timeline */}
              <TabsContent value="timeline" className="px-3 overflow-auto h-[calc(100%-40px)]">
                {simResults.timeline_data.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <ComposedChart data={simResults.timeline_data} margin={{ left: 10, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="elapsed_h" tick={{ fontSize: 9 }} label={{ value: "Elapsed (h)", fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <RechartsTooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                      {Object.keys(simResults.timeline_data[0] || {}).filter((k) => k !== "elapsed_h").slice(0, 6).map((key, i) => (
                        <Line key={key} dataKey={key} stroke={`hsl(var(--chart-${(i % 5) + 1}))`} dot={false} strokeWidth={1.5} />
                      ))}
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">No timeline data</p>
                )}
              </TabsContent>

              {/* Forecast */}
              <TabsContent value="forecast" className="px-3 overflow-auto h-[calc(100%-40px)]">
                <div className="space-y-4">
                  {Object.values(simResults.parameter_results).filter((pr) => pr.forecast.length > 0).map((pr) => (
                    <div key={pr.parameter_code}>
                      <p className="text-xs font-medium mb-1">{pr.display_name} — Forecast <Badge variant="outline" className="text-[7px] ml-1">SIMULATED</Badge>
                        {pr.forecast_violation_risk > 0 && <Badge variant="destructive" className="text-[7px] ml-1">{pr.forecast_violation_risk.toFixed(0)}% risk</Badge>}
                      </p>
                      <ResponsiveContainer width="100%" height={120}>
                        <AreaChart data={pr.forecast} margin={{ left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="elapsed_h" tick={{ fontSize: 8 }} />
                          <YAxis tick={{ fontSize: 8 }} />
                          <RechartsTooltip contentStyle={{ fontSize: 9, borderRadius: 6 }} />
                          <Area dataKey="upper" fill="hsl(var(--destructive) / 0.1)" stroke="none" />
                          <Area dataKey="lower" fill="hsl(var(--background))" stroke="none" />
                          <Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                  {Object.values(simResults.parameter_results).every((pr) => pr.forecast.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-8">Add an ML Insight node to the pipeline for forecast output</p>
                  )}
                </div>
              </TabsContent>

              {/* Alerts */}
              <TabsContent value="alerts" className="px-3 overflow-auto h-[calc(100%-40px)]">
                {simResults.alerts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Severity</TableHead>
                        <TableHead className="text-[10px]">Type</TableHead>
                        <TableHead className="text-[10px]">Message</TableHead>
                        <TableHead className="text-[10px]">Run</TableHead>
                        <TableHead className="text-[10px]">Parameter</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simResults.alerts.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell>
                            <Badge variant={a.severity === "critical" ? "destructive" : a.severity === "warning" ? "outline" : "secondary"} className="text-[8px]">
                              {a.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-[10px]">{a.type}</TableCell>
                          <TableCell className="text-xs">{a.message}</TableCell>
                          <TableCell className="text-[10px] font-mono">{RUNS.find((r) => r.run_id === a.run_id)?.bioreactor_run || a.run_id.slice(-6)}</TableCell>
                          <TableCell className="text-[10px]">{a.parameter_code}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">No alerts generated. Add an Alert Generator node to the pipeline.</p>
                )}
              </TabsContent>

              {/* Events Preview */}
              <TabsContent value="events" className="px-3 overflow-auto h-[calc(100%-40px)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground">{simResults.events_preview.length} preview events</p>
                  {simResults.events_preview.length > 0 && (
                    <Button variant="outline" size="sm" className="h-6 text-[9px] gap-1" onClick={handleCommitEvents}>
                      <FileText className="h-3 w-3" /> Commit as Log Entries
                    </Button>
                  )}
                </div>
                {simResults.events_preview.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px]">Time</TableHead>
                        <TableHead className="text-[10px]">Type</TableHead>
                        <TableHead className="text-[10px]">Parameter</TableHead>
                        <TableHead className="text-[10px]">Message</TableHead>
                        <TableHead className="text-[10px]">Attributable To</TableHead>
                        <TableHead className="text-[10px]">
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3" /> ALCOA
                          </div>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simResults.events_preview.map((ev) => (
                        <TableRow key={ev.id}>
                          <TableCell className="text-[10px] font-mono">{format(new Date(ev.timestamp), "MM-dd HH:mm")}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[8px]">{ev.type}</Badge></TableCell>
                          <TableCell className="text-[10px]">{ev.parameter_code}</TableCell>
                          <TableCell className="text-xs">{ev.message}</TableCell>
                          <TableCell className="text-[10px]">{ev.attributable_to}</TableCell>
                          <TableCell>
                            <button className="text-[9px] text-primary hover:underline" title={`Evidence: run ${ev.evidence_run_id}, h=${ev.evidence_start_h}`}>
                              View evidence
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-8">Enable "Generate events preview" in simulation config</p>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {/* ══════════ SIMULATION CONFIG MODAL ══════════ */}
      <Dialog open={showSimModal} onOpenChange={setShowSimModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Play className="h-4 w-4" /> Simulation Configuration</DialogTitle>
            <DialogDescription>Configure scope, runs, and output options for the pipeline simulation.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Scope mode */}
            <div>
              <Label className="text-xs">Scope Mode</Label>
              <Select value={simConfig.scope_mode} onValueChange={(v: "single_run" | "multi_run") => setSimConfig((c) => ({ ...c, scope_mode: v }))}>
                <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_run">Single Run</SelectItem>
                  <SelectItem value="multi_run">Multiple Runs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Run selection */}
            <div>
              <Label className="text-xs">Select Run(s)</Label>
              <div className="mt-1 space-y-1 max-h-24 overflow-y-auto border rounded-md p-2">
                {RUNS.map((run) => (
                  <label key={run.run_id} className="flex items-center gap-2 text-xs cursor-pointer">
                    {simConfig.scope_mode === "single_run" ? (
                      <input type="radio" name="sim_run" checked={simConfig.selected_run_ids[0] === run.run_id}
                        onChange={() => setSimConfig((c) => ({ ...c, selected_run_ids: [run.run_id], time_window_start: run.start_time, time_window_end: run.end_time }))} />
                    ) : (
                      <Checkbox
                        checked={simConfig.selected_run_ids.includes(run.run_id)}
                        onCheckedChange={(checked) => {
                          setSimConfig((c) => ({
                            ...c,
                            selected_run_ids: checked
                              ? [...c.selected_run_ids, run.run_id]
                              : c.selected_run_ids.filter((id) => id !== run.run_id),
                          }));
                        }}
                      />
                    )}
                    <span>{run.bioreactor_run} — {run.reactor_id}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Device filter */}
            <div>
              <Label className="text-xs">Active Devices (from pipeline)</Label>
              <div className="mt-1 space-y-1 max-h-24 overflow-y-auto border rounded-md p-2">
                {deviceNodesInPipeline.map((n) => (
                  <label key={n.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <Checkbox
                      checked={simConfig.selected_interface_ids.includes(n.interface_id!)}
                      onCheckedChange={(checked) => {
                        setSimConfig((c) => ({
                          ...c,
                          selected_interface_ids: checked
                            ? [...c.selected_interface_ids, n.interface_id!]
                            : c.selected_interface_ids.filter((id) => id !== n.interface_id),
                        }));
                      }}
                    />
                    <span>{n.label} ({n.interface_id})</span>
                  </label>
                ))}
                {deviceNodesInPipeline.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">No device nodes in pipeline</p>
                )}
              </div>
            </div>

            {/* Time window */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Time Window Start</Label>
                <Input className="h-7 text-xs mt-1" type="datetime-local"
                  value={simConfig.time_window_start?.slice(0, 16) || ""}
                  onChange={(e) => setSimConfig((c) => ({ ...c, time_window_start: new Date(e.target.value).toISOString() }))} />
              </div>
              <div>
                <Label className="text-xs">Time Window End</Label>
                <Input className="h-7 text-xs mt-1" type="datetime-local"
                  value={simConfig.time_window_end?.slice(0, 16) || ""}
                  onChange={(e) => setSimConfig((c) => ({ ...c, time_window_end: new Date(e.target.value).toISOString() }))} />
              </div>
            </div>

            {/* Downsample */}
            <div>
              <Label className="text-xs">Downsample Interval (minutes)</Label>
              <Input className="h-7 text-xs mt-1" type="number" min={1} max={60}
                value={simConfig.downsample_minutes}
                onChange={(e) => setSimConfig((c) => ({ ...c, downsample_minutes: parseInt(e.target.value) || 5 }))} />
            </div>

            {/* Output options */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={simConfig.generate_alerts}
                  onCheckedChange={(v) => setSimConfig((c) => ({ ...c, generate_alerts: !!v }))} />
                Generate Alerts
              </label>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={simConfig.generate_events_preview}
                  onCheckedChange={(v) => setSimConfig((c) => ({ ...c, generate_events_preview: !!v }))} />
                Generate Events Preview
              </label>
            </div>

            <p className="text-[9px] text-muted-foreground italic">
              ⚠ This is a simulation only — no instrument control is implied. Results are recording-only.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSimModal(false)}>Cancel</Button>
            <Button onClick={handleRunSimulation} disabled={simConfig.selected_run_ids.length === 0 || simConfig.selected_interface_ids.length === 0}>
              <Play className="h-3.5 w-3.5 mr-1" /> Run Simulation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Mini KPI for results ──
function MiniKpi({ label, value, accent }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
      <p className={`text-lg font-bold ${accent ? "text-destructive" : ""}`}>{value}</p>
    </div>
  );
}
