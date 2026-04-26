import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { format } from "date-fns";
import {
  FlaskConical, Wind, Pipette, TestTube, Microscope, Cpu, Gauge,
  Search, GripVertical, Plus, Trash2, Save, Play, Settings2, X,
  ChevronRight, ChevronLeft, AlertTriangle, CheckCircle2, Brain,
  Merge, Filter, Zap, BarChart3, LineChart as LineChartIcon, Clock,
  FileText, Shield, ArrowRight, Pause, Square, RotateCcw, Hammer, Download,
  Boxes, Beaker, Workflow as WorkflowIcon, GitBranch, Sparkles, ArrowLeft, HelpCircle,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "react-router-dom";

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
import { Progress } from "@/components/ui/progress";
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
import { EQUIPMENT, getEquipmentById } from "@/data/equipment";
import { METHODS, getMethodById } from "@/data/methods";
import { Textarea } from "@/components/ui/textarea";


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

// Node stage classification — one of 4 enterprise lab stages
type NodeStage = "input" | "processing" | "analysis" | "output";

const STAGE_OF: Record<string, NodeStage> = {
  device: "input",
  equipment: "input",
  range_check: "processing",
  unit_consistency: "processing",
  event_overlay: "processing",
  data_op: "processing",
  merge: "processing",
  decision: "processing",
  method: "processing",
  ml_insight: "analysis",
  alert_generator: "output",
};

// Stage palette — Tailwind utility classes for backgrounds + HSL strings for SVG strokes
const STAGE_META: Record<NodeStage, { label: string; stroke: string; bgClass: string; textClass: string; borderClass: string; dotClass: string }> = {
  input:      { label: "Equipment / Input",     stroke: "hsl(173, 58%, 39%)",  bgClass: "bg-teal-50",   textClass: "text-teal-700",   borderClass: "border-teal-300",   dotClass: "bg-teal-500" },
  processing: { label: "Processing",            stroke: "hsl(214, 84%, 56%)",  bgClass: "bg-blue-50",   textClass: "text-blue-700",   borderClass: "border-blue-300",   dotClass: "bg-blue-500" },
  analysis:   { label: "Analysis / ML",         stroke: "hsl(270, 60%, 55%)",  bgClass: "bg-purple-50", textClass: "text-purple-700", borderClass: "border-purple-300", dotClass: "bg-purple-500" },
  output:     { label: "Output / Alert",        stroke: "hsl(38, 92%, 50%)",   bgClass: "bg-amber-50",  textClass: "text-amber-700",  borderClass: "border-amber-300",  dotClass: "bg-amber-500" },
};

const stageOf = (t: string): NodeStage => STAGE_OF[t] || "processing";
const stageColor = (t: string) => STAGE_META[stageOf(t)].stroke;

// Legacy NODE_COLORS — kept for palette icon dots so existing call sites keep working.
const NODE_COLORS: Record<string, string> = {
  device: "hsl(173, 58%, 39%)",
  equipment: "hsl(173, 58%, 39%)",
  method: "hsl(214, 84%, 56%)",
  decision: "hsl(214, 84%, 56%)",
  data_op: "hsl(214, 84%, 56%)",
  range_check: "hsl(214, 84%, 56%)",
  unit_consistency: "hsl(214, 84%, 56%)",
  event_overlay: "hsl(214, 84%, 56%)",
  ml_insight: "hsl(270, 60%, 55%)",
  alert_generator: "hsl(38, 92%, 50%)",
  merge: "hsl(214, 84%, 56%)",
};

const NODE_KIND_LABEL: Record<string, string> = {
  device: "Device",
  equipment: "Equipment",
  method: "Method",
  decision: "Decision",
  data_op: "Data op",
  range_check: "Range check",
  unit_consistency: "Unit check",
  event_overlay: "Event overlay",
  ml_insight: "ML insight",
  alert_generator: "Alert generator",
  merge: "Merge",
};

const NODE_KIND_ICON: Record<string, typeof FlaskConical> = {
  equipment: Boxes,
  method: Beaker,
  decision: GitBranch,
  data_op: FileText,
};

const GRID_SIZE = 20;
const NODE_W = 200;
const NODE_H = 86;


function snapToGrid(v: number) { return Math.round(v / GRID_SIZE) * GRID_SIZE; }

// ══════════════════════════════════════════════
// Canvas Node Component
// ══════════════════════════════════════════════

function CanvasNode({
  node, selected, alertCount, isConnectSource, onSelect, onDragStart, onStartConnect, onCompleteConnect,
}: {
  node: PipelineNode;
  selected: boolean;
  alertCount: number;
  isConnectSource: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onStartConnect: () => void;
  onCompleteConnect: () => void;
}) {
  const Icon =
    node.type === "device"
      ? (DEVICE_ICONS[node.interface_id || ""] || Gauge)
      : NODE_KIND_ICON[node.type]
        || UTILITY_NODES.find((u) => u.type === node.type)?.icon
        || Settings2;

  const subLabel =
    node.type === "device"   ? (node.interface_id || "No device")
  : node.type === "equipment"? (node.linkedEquipmentId || "Custom equipment")
  : node.type === "method"   ? (node.linkedMethodId || "Custom method")
  : (NODE_KIND_LABEL[node.type] || node.type.replace(/_/g, " "));

  const inputs = node.inputs ?? [];
  const outputs = node.outputs ?? [];
  const inputCount = Math.max(1, inputs.length);
  const outputCount = Math.max(1, outputs.length);
  const isCritical = node.criticality === "high";

  const stage = stageOf(node.type);
  const stageMeta = STAGE_META[stage];
  const color = stageMeta.stroke;

  // Misconfiguration detection — distinct from stage colour
  const isMisconfigured =
    (node.type === "device" && !node.interface_id) ||
    (node.type === "equipment" && !node.linkedEquipmentId && !node.label);

  const SELECT_BLUE = "hsl(214, 84%, 56%)";
  const ERROR_RED = "hsl(0, 72%, 51%)";

  const headerH = 18;

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      className="select-none"
    >
      {/* Selected state — light blue overlay underlay */}
      {selected && (
        <rect
          x={-3} y={-3} width={NODE_W + 6} height={NODE_H + 6} rx={10}
          fill={SELECT_BLUE} opacity={0.08} pointerEvents="none"
        />
      )}
      {/* Card */}
      <rect
        width={NODE_W}
        height={NODE_H}
        rx={8}
        fill="hsl(var(--card))"
        stroke={selected ? SELECT_BLUE : isConnectSource ? SELECT_BLUE : color}
        strokeWidth={selected ? 2 : 1}
        filter={selected ? "drop-shadow(0 4px 12px rgba(0,0,0,0.15))" : "drop-shadow(0 1px 3px rgba(0,0,0,0.08))"}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onMouseDown={(e) => { e.stopPropagation(); onDragStart(e); }}
        style={{ cursor: "grab" }}
      />
      {/* Stage colour header strip — bg-50 wash */}
      <rect
        x={1} y={1} width={NODE_W - 2} height={headerH} rx={7}
        fill={color} opacity={0.10} pointerEvents="none"
      />
      <rect
        x={1} y={headerH - 1} width={NODE_W - 2} height={2}
        fill={color} opacity={0.5} pointerEvents="none"
      />
      {/* Type label (matches stage colour) */}
      <foreignObject x={10} y={3} width={NODE_W - 20} height={headerH} pointerEvents="none">
        <div style={{ fontSize: 10, lineHeight: "16px", letterSpacing: 0.6, textTransform: "uppercase", color, fontWeight: 700 }}>
          {NODE_KIND_LABEL[node.type] || node.type}
          {node.alertRelevant && " · ALERTING"}
        </div>
      </foreignObject>

      {/* Icon */}
      <foreignObject x={10} y={headerH + 8} width={28} height={28} pointerEvents="none">
        <div style={{ background: color, borderRadius: 6, padding: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon style={{ width: 16, height: 16, color: "#fff" }} />
        </div>
      </foreignObject>
      {/* Name */}
      <text x={44} y={headerH + 22} fontSize={14} fontWeight={500} fill="hsl(var(--foreground))" pointerEvents="none">
        {node.label.length > 18 ? node.label.slice(0, 17) + "…" : node.label}
      </text>
      <text x={44} y={headerH + 36} fontSize={10} fill="hsl(var(--muted-foreground))" pointerEvents="none">
        {subLabel.length > 22 ? subLabel.slice(0, 21) + "…" : subLabel}
      </text>

      {isCritical && (
        <text x={NODE_W - 8} y={NODE_H - 6} fontSize={9} fontWeight={700} fill={ERROR_RED} textAnchor="end" pointerEvents="none">
          CRITICAL
        </text>
      )}

      {/* Alert badge */}
      {alertCount > 0 && (
        <>
          <circle cx={NODE_W - 12} cy={12} r={9} fill={ERROR_RED} pointerEvents="none" />
          <text x={NODE_W - 12} y={16} fontSize={9} fontWeight={700} fill="#fff" textAnchor="middle" pointerEvents="none">{alertCount}</text>
        </>
      )}

      {/* Input port dots — left edge, filled in stage colour */}
      {Array.from({ length: inputCount }).map((_, i) => {
        const cy = ((i + 1) * NODE_H) / (inputCount + 1);
        const dataType = inputs[i] || "input";
        return (
          <g
            key={`in-${i}`}
            onClick={(e) => { e.stopPropagation(); onCompleteConnect(); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ cursor: "crosshair" }}
            className="group/port"
          >
            <circle cx={0} cy={cy} r={10} fill="transparent" />
            <circle cx={0} cy={cy} r={5}
              fill={color}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              className="transition-transform group-hover/port:scale-150"
            />
            {/* hover label */}
            <foreignObject x={-90} y={cy - 10} width={80} height={20}
              style={{ pointerEvents: "none", opacity: 0 }}
              className="group-hover/port:opacity-100 transition-opacity">
              <div style={{ fontSize: 9, padding: "2px 5px", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", border: "1px solid hsl(var(--border))", borderRadius: 4, textAlign: "right", fontFamily: "monospace" }}>
                {dataType}
              </div>
            </foreignObject>
          </g>
        );
      })}
      {/* Output port dots — right edge */}
      {Array.from({ length: outputCount }).map((_, i) => {
        const cy = ((i + 1) * NODE_H) / (outputCount + 1);
        const dataType = outputs[i] || (stage === "output" ? "alert" : stage === "analysis" ? "insight" : "timeseries");
        return (
          <g
            key={`out-${i}`}
            onClick={(e) => { e.stopPropagation(); onStartConnect(); }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ cursor: "crosshair" }}
            className="group/port"
          >
            <circle cx={NODE_W} cy={cy} r={10} fill="transparent" />
            <circle cx={NODE_W} cy={cy} r={5}
              fill={isConnectSource ? SELECT_BLUE : color}
              stroke="hsl(var(--card))"
              strokeWidth={2}
              className="transition-transform group-hover/port:scale-150"
            />
            <foreignObject x={NODE_W + 10} y={cy - 10} width={80} height={20}
              style={{ pointerEvents: "none", opacity: 0 }}
              className="group-hover/port:opacity-100 transition-opacity">
              <div style={{ fontSize: 9, padding: "2px 5px", background: "hsl(var(--popover))", color: "hsl(var(--popover-foreground))", border: "1px solid hsl(var(--border))", borderRadius: 4, fontFamily: "monospace" }}>
                {dataType}
              </div>
            </foreignObject>
          </g>
        );
      })}

      {/* Misconfigured / disconnected error overlay — red dashed border */}
      {isMisconfigured && (
        <rect
          x={-1} y={-1} width={NODE_W + 2} height={NODE_H + 2} rx={9}
          fill="none" stroke={ERROR_RED} strokeWidth={1} strokeDasharray="4 3"
          pointerEvents="none"
        />
      )}
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

  // Simulation lifecycle (inspector controls)
  type SimStatus = "idle" | "running" | "paused" | "done" | "stopped";
  interface RunLogEntry { ts: string; level: "info" | "warn" | "error" | "ok"; message: string; }
  const [simStatus, setSimStatus] = useState<SimStatus>("idle");
  const [simProgress, setSimProgress] = useState(0); // 0-100
  const [runLog, setRunLog] = useState<RunLogEntry[]>([]);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepsRef = useRef<{ runner: () => void; total: number; cursor: number }>({ runner: () => {}, total: 0, cursor: 0 });

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

  const filteredEquipment = useMemo(() => {
    const q = paletteSearch.toLowerCase();
    return EQUIPMENT.filter(
      (e) => e.equipmentName.toLowerCase().includes(q) || e.equipmentId.toLowerCase().includes(q),
    );
  }, [paletteSearch]);

  const filteredMethods = useMemo(() => {
    const q = paletteSearch.toLowerCase();
    return METHODS.filter(
      (m) => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q),
    );
  }, [paletteSearch]);

  // ── Node operations ──
  const addNode = useCallback((type: PipelineNode["type"], label: string, extra?: Partial<PipelineNode>) => {
    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const x = snapToGrid(200 + Math.random() * 300 - pan.x);
    const y = snapToGrid(100 + Math.random() * 200 - pan.y);

    // Default I/O per kind
    const defaults: Partial<PipelineNode> = {};
    if (type === "equipment") {
      defaults.inputs = ["material_in"];
      defaults.outputs = ["material_out"];
      defaults.criticality = "medium";
    } else if (type === "method") {
      defaults.inputs = ["sample"];
      defaults.outputs = ["result"];
    } else if (type === "decision") {
      defaults.inputs = ["input"];
      defaults.outputs = ["pass", "fail"];
    } else if (type === "data_op") {
      defaults.inputs = ["data"];
      defaults.outputs = ["data_record"];
    }

    const newNode: PipelineNode = {
      id, type, label, x, y,
      selected_run_ids: [],
      parameters: [],
      anomaly_threshold: type === "ml_insight" ? 70 : undefined,
      forecast_hours: type === "ml_insight" ? 12 : undefined,
      apply_parameter_codes: [],
      alertRelevant: type === "alert_generator",
      ...defaults,
      ...extra,
    };
    setPipeline((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setSelectedNodeId(id);
  }, [pan]);

  /** Add an equipment node bound to a catalog entry (or blank if id omitted). */
  const addEquipmentNode = useCallback((equipmentId?: string) => {
    if (equipmentId) {
      const eq = getEquipmentById(equipmentId);
      if (!eq) return;
      addNode("equipment", eq.equipmentName, {
        linkedEquipmentId: equipmentId,
        description: `${eq.equipmentName} (${eq.equipmentCategory})`,
        criticality: eq.criticality ?? "medium",
        metadata: { ...(eq.metadata ?? {}) },
      });
    } else {
      addNode("equipment", "New Equipment", {
        description: "Custom equipment node — link to a fleet entry or describe manually.",
      });
    }
  }, [addNode]);

  /** Add a method node bound to a catalog entry (or blank if id omitted). */
  const addMethodNode = useCallback((methodId?: string) => {
    if (methodId) {
      const m = getMethodById(methodId);
      if (!m) return;
      addNode("method", `${m.name} (${m.code})`, {
        linkedMethodId: methodId,
        linkedEquipmentId: m.primaryEquipmentId,
        description: m.notes ?? `${m.name} — ${m.category}`,
        processDetails: m.unit ? `Reports in ${m.unit}.` : undefined,
        metadata: m.acceptance
          ? {
              ...(m.acceptance.min !== undefined ? { acceptanceMin: m.acceptance.min } : {}),
              ...(m.acceptance.max !== undefined ? { acceptanceMax: m.acceptance.max } : {}),
              ...(m.acceptance.target !== undefined ? { target: m.acceptance.target } : {}),
            }
          : undefined,
      });
    } else {
      addNode("method", "New Method", {
        description: "Custom method node — link to a method catalog entry or describe manually.",
      });
    }
  }, [addNode]);

  /** Add a generic device node (legacy palette path). */
  const addDeviceNode = useCallback((label: string, interfaceId: string) => {
    addNode("device", label, { interface_id: interfaceId });
  }, [addNode]);


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

  // ── Run log helpers ──
  const appendLog = useCallback((message: string, level: RunLogEntry["level"] = "info") => {
    setRunLog((prev) => [...prev, { ts: new Date().toISOString(), level, message }]);
  }, []);

  const clearTick = useCallback(() => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }, []);

  // Build a list of human-readable steps from the pipeline (used to drive the streaming runner)
  const buildSteps = useCallback((p: Pipeline): string[] => {
    const steps: string[] = [];
    steps.push(`Validating pipeline “${p.name}” (${p.nodes.length} nodes / ${p.edges.length} edges)`);
    p.nodes.forEach((n) => {
      if (n.type === "device") {
        steps.push(`Loading device ${n.label}${n.interface_id ? ` (${n.interface_id})` : ""}`);
        (n.parameters || []).forEach((pr) => steps.push(`  · Streaming ${pr.display_name} [${pr.unit}] (${pr.min}–${pr.max})`));
      } else if (n.type === "range_check") {
        steps.push(`Range check on incoming streams`);
      } else if (n.type === "unit_consistency") {
        steps.push(`Unit consistency check`);
      } else if (n.type === "ml_insight") {
        steps.push(`ML insight (anomaly threshold ${n.anomaly_threshold ?? 70}, +${n.forecast_hours ?? 12} h forecast)`);
      } else if (n.type === "alert_generator") {
        steps.push(`Generating alerts from upstream signals`);
      } else if (n.type === "merge") {
        steps.push(`Merging streams`);
      } else if (n.type === "event_overlay") {
        steps.push(`Overlaying process events`);
      }
    });
    steps.push(`Aggregating results`);
    return steps;
  }, []);

  const finalizeSimulation = useCallback(() => {
    const results = runSimulation(pipeline, simConfig);
    setSimResults(results);
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
    appendLog(`Simulation ${results.simulation_id} finished — ${Object.keys(results.parameter_results).length} parameters, ${results.alerts.length} alerts`, "ok");
    return results;
  }, [pipeline, simConfig, appendLog]);

  const startTick = useCallback(() => {
    clearTick();
    tickRef.current = setInterval(() => {
      const s = stepsRef.current;
      if (s.cursor >= s.total) {
        clearTick();
        const results = finalizeSimulation();
        setSimProgress(100);
        setSimStatus("done");
        setResultsCollapsed(false);
        toast({
          title: "Simulation complete",
          description: `${Object.keys(results.parameter_results).length} parameter results, ${results.alerts.length} alerts`,
        });
        return;
      }
      s.runner();
      s.cursor += 1;
      setSimProgress(Math.round((s.cursor / s.total) * 100));
    }, 220);
  }, [clearTick, finalizeSimulation, toast]);

  const handleStartSimulation = useCallback(() => {
    if (deviceNodesInPipeline.length === 0) {
      toast({ title: "Nothing to simulate", description: "Add at least one device node first.", variant: "destructive" });
      return;
    }
    const cfg: SimulationConfig = {
      ...simConfig,
      selected_interface_ids: deviceNodesInPipeline.map((n) => n.interface_id!),
    };
    setSimConfig(cfg);
    setSimResults(null);
    setSimProgress(0);
    setRunLog([]);
    setSimStatus("running");
    appendLog(`Starting simulation of “${pipeline.name}”`, "info");

    const steps = buildSteps(pipeline);
    let i = 0;
    stepsRef.current = {
      total: steps.length,
      cursor: 0,
      runner: () => {
        const msg = steps[i] ?? "tick";
        i += 1;
        const lvl: RunLogEntry["level"] = /alert|risk|forecast/i.test(msg) ? "warn" : "info";
        appendLog(msg, lvl);
      },
    };
    startTick();
  }, [pipeline, simConfig, deviceNodesInPipeline, appendLog, buildSteps, startTick, toast]);

  const handlePauseSimulation = useCallback(() => {
    if (simStatus !== "running") return;
    clearTick();
    setSimStatus("paused");
    appendLog("Simulation paused", "warn");
  }, [simStatus, clearTick, appendLog]);

  const handleResumeSimulation = useCallback(() => {
    if (simStatus !== "paused") return;
    setSimStatus("running");
    appendLog("Simulation resumed", "info");
    startTick();
  }, [simStatus, startTick, appendLog]);

  const handleStopSimulation = useCallback(() => {
    clearTick();
    setSimStatus("stopped");
    appendLog("Simulation stopped by user", "error");
  }, [clearTick, appendLog]);

  const handleRestartSimulation = useCallback(() => {
    clearTick();
    setSimStatus("idle");
    setSimResults(null);
    setSimProgress(0);
    setRunLog([]);
    setTimeout(() => handleStartSimulation(), 0);
  }, [clearTick, handleStartSimulation]);

  const handleRebuildPipeline = useCallback(() => {
    clearTick();
    setSimStatus("idle");
    setSimResults(null);
    setSimProgress(0);
    setRunLog([]);
    setSelectedNodeId(null);
    setConnectingFrom(null);
    appendLog("Pipeline ready to rebuild", "info");
    toast({ title: "Pipeline reset", description: "Simulation state cleared. Edit nodes and re-run." });
  }, [clearTick, appendLog, toast]);

  // Cleanup ticker on unmount
  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  // ── Report download ──
  const handleDownloadReport = useCallback(() => {
    if (!simResults) return;
    const lines: string[] = [];
    lines.push(`# Workflow Simulation Report`);
    lines.push(``);
    lines.push(`- **Simulation ID:** ${simResults.simulation_id}`);
    lines.push(`- **Pipeline:** ${pipeline.name} (${pipeline.pipeline_id})`);
    lines.push(`- **Generated:** ${simResults.created_at}`);
    lines.push(`- **Status:** ${simResults.overall_status.toUpperCase()}`);
    lines.push(`- **Scope:** ${simResults.scope_mode} · runs=${simResults.selected_run_ids.join(", ") || "—"} · interfaces=${simResults.selected_interface_ids.join(", ") || "—"}`);
    lines.push(``);
    lines.push(`## Pipeline Structure`);
    pipeline.nodes.forEach((n) => lines.push(`- ${n.label} _(${n.type}${n.interface_id ? `, ${n.interface_id}` : ""})_`));
    lines.push(``);
    lines.push(`## Parameter Results`);
    lines.push(`| Parameter | Unit | Points | In-range % | OOR episodes | Unit check |`);
    lines.push(`|---|---|---:|---:|---:|---|`);
    Object.values(simResults.parameter_results).forEach((pr) => {
      lines.push(`| ${pr.display_name} | ${pr.unit} | ${pr.total_points} | ${pr.pct_in_range.toFixed(1)}% | ${pr.oor_episodes.length} | ${pr.unit_mismatch ? "Mismatch" : "OK"} |`);
    });
    lines.push(``);
    if (simResults.top_risks.length > 0) {
      lines.push(`## Top Risks`);
      simResults.top_risks.forEach((r) => lines.push(`- ${r}`));
      lines.push(``);
    }
    if (simResults.alerts.length > 0) {
      lines.push(`## Alerts (${simResults.alerts.length})`);
      simResults.alerts.forEach((a) => lines.push(`- **[${a.severity}]** ${a.message}`));
      lines.push(``);
    }
    lines.push(`## Run Log`);
    runLog.forEach((l) => lines.push(`- \`${l.ts}\` _(${l.level})_ ${l.message}`));

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${simResults.simulation_id}-report.md`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: "Report downloaded", description: `${simResults.simulation_id}-report.md` });
  }, [simResults, pipeline, runLog, toast]);

  // ── Legacy modal-based runner (still used by the Simulate dialog "Run" button) ──
  const handleRunSimulation = useCallback(() => {
    setShowSimModal(false);
    handleStartSimulation();
  }, [handleStartSimulation]);

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
      {/* ── Top action bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-card shrink-0">
        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground">
          <Link to="/metadata/constructor"><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Input
          aria-label="Pipeline name"
          className="h-7 w-56 text-sm font-medium border-transparent hover:border-border focus:border-input bg-transparent px-2"
          value={pipeline.name}
          onChange={(e) => setPipeline((p) => ({ ...p, name: e.target.value }))}
        />
        <InfoTooltip content="Configure operating conditions and simulate system behavior. ML features use heuristic methods on historical data." />

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Prototype</Badge>
          <Separator orientation="vertical" className="h-5" />

          {/* Save — solid secondary */}
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-foreground text-background hover:bg-foreground/90" onClick={handleSave}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>

          {/* Start Simulation — PRIMARY */}
          {(simStatus === "idle" || simStatus === "stopped" || simStatus === "done") && (
            <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleStartSimulation}>
              <Play className="h-3.5 w-3.5" /> {simStatus === "done" || simStatus === "stopped" ? "Run again" : "Start Simulation"}
            </Button>
          )}
          {simStatus === "running" && (
            <>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={handlePauseSimulation}>
                <Pause className="h-3.5 w-3.5" /> Pause
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={handleStopSimulation}>
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            </>
          )}
          {simStatus === "paused" && (
            <>
              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleResumeSimulation}>
                <Play className="h-3.5 w-3.5" /> Resume
              </Button>
              <Button size="sm" variant="destructive" className="h-8 text-xs gap-1.5" onClick={handleStopSimulation}>
                <Square className="h-3.5 w-3.5" /> Stop
              </Button>
            </>
          )}
          {(simStatus === "done" || simStatus === "stopped" || simStatus === "paused") && (
            <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5" onClick={handleRestartSimulation}>
              <RotateCcw className="h-3.5 w-3.5" /> Restart
            </Button>
          )}

          {/* Rebuild — ghost / outlined (de-emphasised) */}
          <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground" onClick={handleRebuildPipeline} title="Reset simulation state and prepare to rebuild">
            <Hammer className="h-3.5 w-3.5" /> Rebuild
          </Button>

          {/* Configure — tertiary link-style */}
          <Button size="sm" variant="link" className="h-8 text-xs gap-1 px-1 text-muted-foreground hover:text-foreground" onClick={() => {
            setSimConfig((c) => ({
              ...c,
              selected_interface_ids: deviceNodesInPipeline.map((n) => n.interface_id!),
            }));
            setShowSimModal(true);
          }} title="Advanced simulation configuration">
            <Settings2 className="h-3.5 w-3.5" /> Configure…
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ══════════ LEFT PALETTE ══════════ */}
        <div className={`border-r bg-card shrink-0 flex flex-col transition-all ${paletteCollapsed ? "w-10" : "w-64"}`}>
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

                {/* Quick add — author from scratch */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Create from scratch</p>
                  <div className="grid grid-cols-2 gap-1">
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 justify-start"
                      onClick={() => addEquipmentNode()}>
                      <Boxes className="h-3 w-3" style={{ color: NODE_COLORS.equipment }} /> Equipment
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 justify-start"
                      onClick={() => addMethodNode()}>
                      <Beaker className="h-3 w-3" style={{ color: NODE_COLORS.method }} /> Method
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 justify-start"
                      onClick={() => addNode("decision", "Decision", { description: "Routes flow based on a rule." })}>
                      <GitBranch className="h-3 w-3" style={{ color: NODE_COLORS.decision }} /> Decision
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 justify-start"
                      onClick={() => addNode("data_op", "Data op", { description: "Custom data operation." })}>
                      <FileText className="h-3 w-3" style={{ color: NODE_COLORS.data_op }} /> Data op
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Equipment catalog */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                    <Boxes className="h-3 w-3" /> Equipment catalog
                  </p>
                  <div className="space-y-1">
                    {filteredEquipment.map((eq) => (
                      <button
                        key={eq.equipmentId}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors text-left"
                        onClick={() => addEquipmentNode(eq.equipmentId)}
                        title={`${eq.equipmentName} · ${eq.equipmentCategory}`}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: NODE_COLORS.equipment }} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{eq.equipmentName}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">{eq.equipmentId} · {eq.equipmentCategory}</p>
                        </div>
                      </button>
                    ))}
                    {filteredEquipment.length === 0 && (
                      <p className="text-[9px] text-muted-foreground italic px-2">No matching equipment.</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Method catalog */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5 flex items-center gap-1">
                    <Beaker className="h-3 w-3" /> Method catalog
                  </p>
                  <div className="space-y-1">
                    {filteredMethods.map((m) => (
                      <button
                        key={m.id}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors text-left"
                        onClick={() => addMethodNode(m.id)}
                        title={`${m.name} (${m.code}) · ${m.category}`}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: NODE_COLORS.method }} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{m.name}</p>
                          <p className="text-[9px] text-muted-foreground font-mono">{m.code} · {m.category}</p>
                        </div>
                      </button>
                    ))}
                    {filteredMethods.length === 0 && (
                      <p className="text-[9px] text-muted-foreground italic px-2">No matching method.</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Devices (legacy interfaces — kept for simulation runs) */}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1.5">Devices (interfaces)</p>
                  <div className="space-y-1">
                    {filteredDevices.map((iface) => {
                      const Icon = DEVICE_ICONS[iface.id] || Gauge;
                      return (
                        <button
                          key={iface.id}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent/50 transition-colors text-left"
                          onClick={() => addDeviceNode(iface.display_name, iface.id)}
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
          {/* Canvas top overlay: stage colour legend (left) + run state (right) */}
          <div className="absolute top-2 left-2 right-2 z-10 flex items-start justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-md bg-card/90 backdrop-blur border shadow-sm pointer-events-auto">
              {(["input","processing","analysis","output"] as const).map((s) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-sm ${STAGE_META[s].dotClass}`} />
                  <span className="text-[11px] text-muted-foreground">{STAGE_META[s].label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pointer-events-auto">
              <Badge variant="secondary" className="text-[10px]">{pipeline.nodes.length} nodes</Badge>
              <Badge variant="secondary" className="text-[10px]">{pipeline.edges.length} edges</Badge>
              <Badge variant="outline" className="text-[10px]">{(zoom * 100).toFixed(0)}%</Badge>
              {connectingFrom && (
                <Badge variant="default" className="text-[10px] gap-1 animate-pulse">
                  Connecting… click target left port
                  <button onClick={() => setConnectingFrom(null)} className="ml-1"><X className="h-2.5 w-2.5" /></button>
                </Badge>
              )}
            </div>
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
                  isConnectSource={connectingFrom === node.id}
                  onSelect={() => handleNodeClick(node.id)}
                  onDragStart={(e) => handleNodeDragStart(node.id, e)}
                  onStartConnect={() => setConnectingFrom(node.id)}
                  onCompleteConnect={() => {
                    if (connectingFrom && connectingFrom !== node.id) {
                      addEdge(connectingFrom, node.id);
                      setConnectingFrom(null);
                    } else {
                      setSelectedNodeId(node.id);
                    }
                  }}
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
        <div className={`border-l bg-card shrink-0 flex flex-col transition-all ${inspectorCollapsed ? "w-10" : "w-[340px]"}`}>
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
                  {/* ─── Identity ─── */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Label className="text-[10px] uppercase text-muted-foreground">Name</Label>
                      <Input
                        className="h-7 text-xs font-semibold mt-1"
                        value={selectedNode.label}
                        onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="flex gap-1 pt-5">
                      <Button variant="outline" size="sm" className="h-7 w-7 p-0" title="Start a connection from this node"
                        onClick={() => setConnectingFrom(selectedNode.id)}>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" className="h-7 w-7 p-0" title="Delete node"
                        onClick={() => deleteNode(selectedNode.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Node type</Label>
                    <Select
                      value={selectedNode.type}
                      onValueChange={(v) => updateNode(selectedNode.id, { type: v as PipelineNode["type"] })}
                    >
                      <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equipment" className="text-xs">Equipment</SelectItem>
                        <SelectItem value="method" className="text-xs">Method</SelectItem>
                        <SelectItem value="device" className="text-xs">Device (interface)</SelectItem>
                        <SelectItem value="decision" className="text-xs">Decision</SelectItem>
                        <SelectItem value="data_op" className="text-xs">Data operation</SelectItem>
                        <SelectItem value="range_check" className="text-xs">Range check</SelectItem>
                        <SelectItem value="unit_consistency" className="text-xs">Unit consistency</SelectItem>
                        <SelectItem value="event_overlay" className="text-xs">Event overlay</SelectItem>
                        <SelectItem value="ml_insight" className="text-xs">ML insight</SelectItem>
                        <SelectItem value="alert_generator" className="text-xs">Alert generator</SelectItem>
                        <SelectItem value="merge" className="text-xs">Merge</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Description</Label>
                    <Textarea
                      className="text-xs mt-1 min-h-[56px]"
                      placeholder="What does this step do? Who owns it?"
                      value={selectedNode.description ?? ""}
                      onChange={(e) => updateNode(selectedNode.id, { description: e.target.value })}
                    />
                  </div>

                  {/* ─── Linked references ─── */}
                  {(selectedNode.type === "equipment" || selectedNode.type === "method") && (
                    <div className="rounded-md border bg-muted/20 p-2 space-y-2">
                      <p className="text-[10px] uppercase text-muted-foreground font-semibold">Linked references</p>
                      <div>
                        <Label className="text-[9px] text-muted-foreground">Equipment</Label>
                        <Select
                          value={selectedNode.linkedEquipmentId ?? "__none__"}
                          onValueChange={(v) => updateNode(selectedNode.id, { linkedEquipmentId: v === "__none__" ? undefined : v })}
                        >
                          <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Not linked" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__" className="text-xs">— Not linked —</SelectItem>
                            {EQUIPMENT.map((eq) => (
                              <SelectItem key={eq.equipmentId} value={eq.equipmentId} className="text-xs">
                                {eq.equipmentName} ({eq.equipmentId})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedNode.type === "method" && (
                        <div>
                          <Label className="text-[9px] text-muted-foreground">Method</Label>
                          <Select
                            value={selectedNode.linkedMethodId ?? "__none__"}
                            onValueChange={(v) => updateNode(selectedNode.id, { linkedMethodId: v === "__none__" ? undefined : v })}
                          >
                            <SelectTrigger className="h-7 text-xs mt-1"><SelectValue placeholder="Not linked" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__" className="text-xs">— Not linked —</SelectItem>
                              {METHODS.map((m) => (
                                <SelectItem key={m.id} value={m.id} className="text-xs">
                                  {m.name} ({m.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ─── I/O ports ─── */}
                  <div className="rounded-md border bg-muted/20 p-2 space-y-2">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Inputs · Process · Outputs</p>
                    <PortListEditor
                      label="Inputs"
                      values={selectedNode.inputs ?? []}
                      onChange={(next) => updateNode(selectedNode.id, { inputs: next })}
                      placeholder="e.g. harvest_broth"
                    />
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Process details</Label>
                      <Textarea
                        className="text-xs mt-1 min-h-[48px]"
                        placeholder="Recipe, conditions, durations…"
                        value={selectedNode.processDetails ?? ""}
                        onChange={(e) => updateNode(selectedNode.id, { processDetails: e.target.value })}
                      />
                    </div>
                    <PortListEditor
                      label="Outputs"
                      values={selectedNode.outputs ?? []}
                      onChange={(next) => updateNode(selectedNode.id, { outputs: next })}
                      placeholder="e.g. clarified_pool"
                    />
                  </div>

                  {/* ─── Metadata ─── */}
                  <MetadataEditor
                    metadata={selectedNode.metadata ?? {}}
                    onChange={(next) => updateNode(selectedNode.id, { metadata: next })}
                  />

                  {/* ─── Alerts & criticality ─── */}
                  <div className="rounded-md border bg-muted/20 p-2 space-y-2">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">Alerts & criticality</p>
                    <div>
                      <Label className="text-[9px] text-muted-foreground">Criticality</Label>
                      <Select
                        value={selectedNode.criticality ?? "medium"}
                        onValueChange={(v) => updateNode(selectedNode.id, { criticality: v as PipelineNode["criticality"] })}
                      >
                        <SelectTrigger className="h-7 text-xs mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high" className="text-xs">High — surfaces as CRITICAL on canvas</SelectItem>
                          <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                          <SelectItem value="low" className="text-xs">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <label className="flex items-center gap-2 text-[10px] cursor-pointer">
                      <Switch
                        className="scale-75"
                        checked={!!selectedNode.alertRelevant}
                        onCheckedChange={(v) => updateNode(selectedNode.id, { alertRelevant: v })}
                      />
                      Alert relevant — forward issues from this node
                    </label>
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

              {/* ── Simulation panel (always visible) ── */}
              <div className="border-t bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Play className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">Simulation</span>
                  </div>
                  <Badge variant={
                    simStatus === "running" ? "default" :
                    simStatus === "paused"  ? "outline" :
                    simStatus === "done"    ? "secondary" :
                    simStatus === "stopped" ? "destructive" : "outline"
                  } className="text-[9px] uppercase">{simStatus}</Badge>
                </div>

                {/* Lifecycle controls */}
                <div className="grid grid-cols-3 gap-1">
                  {(simStatus === "idle" || simStatus === "stopped" || simStatus === "done") && (
                    <Button size="sm" className="h-7 text-[10px] gap-1 col-span-3" onClick={handleStartSimulation}>
                      <Play className="h-3 w-3" /> {simStatus === "done" ? "Run again" : "Start simulation"}
                    </Button>
                  )}
                  {simStatus === "running" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handlePauseSimulation}>
                        <Pause className="h-3 w-3" /> Pause
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-[10px] gap-1" onClick={handleStopSimulation}>
                        <Square className="h-3 w-3" /> Stop
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleRestartSimulation}>
                        <RotateCcw className="h-3 w-3" /> Restart
                      </Button>
                    </>
                  )}
                  {simStatus === "paused" && (
                    <>
                      <Button size="sm" className="h-7 text-[10px] gap-1" onClick={handleResumeSimulation}>
                        <Play className="h-3 w-3" /> Resume
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-[10px] gap-1" onClick={handleStopSimulation}>
                        <Square className="h-3 w-3" /> Stop
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleRestartSimulation}>
                        <RotateCcw className="h-3 w-3" /> Restart
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 col-span-3" onClick={handleRebuildPipeline}>
                    <Hammer className="h-3 w-3" /> Rebuild pipeline
                  </Button>
                </div>

                {/* Progress */}
                {(simStatus === "running" || simStatus === "paused" || simStatus === "done") && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                      <span>Progress</span><span className="font-mono">{simProgress}%</span>
                    </div>
                    <Progress value={simProgress} className="h-1.5" />
                  </div>
                )}

                {/* Parameter results summary */}
                {simResults && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Output Results</Label>
                      <Badge variant={simResults.overall_status === "pass" ? "secondary" : simResults.overall_status === "warning" ? "outline" : "destructive"} className="text-[8px]">
                        {simResults.overall_status.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="rounded-md border bg-card overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[9px] h-6">Param</TableHead>
                            <TableHead className="text-[9px] h-6 text-right">In-range</TableHead>
                            <TableHead className="text-[9px] h-6 text-right">OOR</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.values(simResults.parameter_results).slice(0, 6).map((pr) => (
                            <TableRow key={pr.parameter_code + pr.unit}>
                              <TableCell className="text-[10px] py-1">{pr.display_name}</TableCell>
                              <TableCell className={`text-[10px] py-1 text-right font-mono ${pr.pct_in_range < 90 ? "text-destructive" : ""}`}>
                                {pr.pct_in_range.toFixed(0)}%
                              </TableCell>
                              <TableCell className="text-[10px] py-1 text-right">{pr.oor_episodes.length}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {simResults.alerts.length > 0 && (
                      <p className="text-[9px] text-destructive mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-2.5 w-2.5" />{simResults.alerts.length} alert{simResults.alerts.length !== 1 ? "s" : ""} generated
                      </p>
                    )}
                  </div>
                )}

                {/* Run log */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-[10px] uppercase text-muted-foreground">Run Log</Label>
                    {runLog.length > 0 && (
                      <span className="text-[9px] text-muted-foreground font-mono">{runLog.length} entries</span>
                    )}
                  </div>
                  <div className="rounded-md border bg-card max-h-48 overflow-auto p-1.5 font-mono text-[9px] space-y-0.5">
                    {runLog.length === 0 ? (
                      <p className="text-muted-foreground text-center py-2">Run log will appear here once the simulation starts.</p>
                    ) : (
                      runLog.map((l, i) => (
                        <div key={i} className="flex gap-1.5">
                          <span className="text-muted-foreground shrink-0">{format(new Date(l.ts), "HH:mm:ss")}</span>
                          <span className={
                            l.level === "error" ? "text-destructive font-semibold" :
                            l.level === "warn"  ? "text-amber-600 dark:text-amber-400" :
                            l.level === "ok"    ? "text-emerald-600 dark:text-emerald-400 font-semibold" :
                            "text-foreground"
                          }>{l.message}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Download report */}
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1 w-full"
                  onClick={handleDownloadReport}
                  disabled={!simResults}
                >
                  <Download className="h-3 w-3" /> Download report (.md)
                </Button>
              </div>
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

// ── Port list editor (named inputs / outputs) ──
function PortListEditor({
  label, values, onChange, placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <Label className="text-[9px] text-muted-foreground">{label}</Label>
        <Button
          variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5"
          onClick={() => onChange([...values, ""])}
        >
          <Plus className="h-2.5 w-2.5" /> Add
        </Button>
      </div>
      <div className="space-y-1 mt-1">
        {values.length === 0 && (
          <p className="text-[9px] text-muted-foreground italic px-1">No {label.toLowerCase()} declared.</p>
        )}
        {values.map((v, i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              className="h-6 text-[10px]"
              placeholder={placeholder}
              value={v}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              title="Remove"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Metadata key/value editor ──
function MetadataEditor({
  metadata, onChange,
}: {
  metadata: Record<string, string | number | boolean>;
  onChange: (next: Record<string, string | number | boolean>) => void;
}) {
  const entries = Object.entries(metadata);
  return (
    <div className="rounded-md border bg-muted/20 p-2 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Metadata</p>
        <Button
          variant="ghost" size="sm" className="h-5 text-[9px] gap-0.5"
          onClick={() => {
            let i = 1;
            let key = `field_${i}`;
            while (key in metadata) { i += 1; key = `field_${i}`; }
            onChange({ ...metadata, [key]: "" });
          }}
        >
          <Plus className="h-2.5 w-2.5" /> Add field
        </Button>
      </div>
      {entries.length === 0 && (
        <p className="text-[9px] text-muted-foreground italic">No metadata fields. Reusable in tooltips and reports.</p>
      )}
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-center gap-1">
          <Input
            className="h-6 text-[10px] w-1/2"
            value={k}
            onChange={(e) => {
              const newKey = e.target.value;
              if (!newKey || newKey === k) return;
              const next: Record<string, string | number | boolean> = {};
              for (const [kk, vv] of entries) next[kk === k ? newKey : kk] = vv;
              onChange(next);
            }}
          />
          <Input
            className="h-6 text-[10px] flex-1"
            value={String(v)}
            onChange={(e) => {
              const raw = e.target.value;
              const num = Number(raw);
              const parsed: string | number | boolean =
                raw === "true" ? true
              : raw === "false" ? false
              : raw !== "" && !Number.isNaN(num) ? num
              : raw;
              onChange({ ...metadata, [k]: parsed });
            }}
          />
          <Button
            variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"
            onClick={() => {
              const next = { ...metadata };
              delete next[k];
              onChange(next);
            }}
            title="Remove"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
