/**
 * Pipeline & Simulation store — in-memory PoC.
 * Provides types, CRUD, and a deterministic + ML-heuristic simulation engine.
 */

import type { ProcessEvent, InstrumentInterface } from "./runTypes";
import { INTERFACES, RUNS, PARAMETERS, getTimeseries, getEvents } from "./runData";

// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

export interface PipelineNodeParam {
  parameter_code: string;
  display_name: string;
  unit: string;
  min: number;
  max: number;
  useCatalogRange: boolean;
  unitOverride?: string;
}

export interface PipelineNode {
  id: string;
  type: "device" | "range_check" | "unit_consistency" | "event_overlay" | "ml_insight" | "alert_generator" | "merge";
  label: string;
  x: number;
  y: number;
  // Device node config
  interface_id?: string;
  selected_run_ids?: string[];
  parameters?: PipelineNodeParam[];
  // Utility node config
  anomaly_threshold?: number;
  apply_parameter_codes?: string[];
  forecast_hours?: number;
}

export interface PipelineEdge {
  id: string;
  source: string;
  target: string;
}

export interface Pipeline {
  pipeline_id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export type ScopeMode = "single_run" | "multi_run";

export interface SimulationConfig {
  scope_mode: ScopeMode;
  selected_run_ids: string[];
  selected_interface_ids: string[];
  time_window_start: string;
  time_window_end: string;
  downsample_minutes: number;
  generate_alerts: boolean;
  generate_events_preview: boolean;
}

export interface ParameterResult {
  parameter_code: string;
  display_name: string;
  unit: string;
  total_points: number;
  in_range_count: number;
  pct_in_range: number;
  oor_episodes: { start_h: number; end_h: number; duration_h: number }[];
  anomaly_scores: { elapsed_h: number; score: number }[];
  forecast: { elapsed_h: number; value: number; lower: number; upper: number }[];
  forecast_violation_risk: number;
  unit_mismatch: boolean;
}

export interface SimulationAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  run_id: string;
  parameter_code: string;
  timestamp: string;
}

export interface EventPreview {
  id: string;
  timestamp: string;
  type: string;
  parameter_code: string;
  message: string;
  attributable_to: string;
  evidence_run_id: string;
  evidence_start_h: number;
}

export interface SimulationResults {
  simulation_id: string;
  pipeline_id: string;
  created_at: string;
  created_by: string;
  scope_mode: ScopeMode;
  selected_run_ids: string[];
  selected_interface_ids: string[];
  time_window_start: string;
  time_window_end: string;
  parameter_results: Record<string, ParameterResult>;
  alerts: SimulationAlert[];
  events_preview: EventPreview[];
  overall_status: "pass" | "warning" | "critical";
  top_risks: string[];
  ml_drivers: string[];
  timeline_data: { elapsed_h: number; [key: string]: number }[];
  process_events: ProcessEvent[];
}

export interface PipelineSimulationRecord {
  simulation_id: string;
  pipeline_id: string;
  created_at: string;
  created_by: string;
  scope_mode: ScopeMode;
  selected_run_ids: string[];
  selected_interface_ids: string[];
  time_window_start: string;
  time_window_end: string;
  results_summary: Record<string, any>;
  generated_alerts: SimulationAlert[];
  generated_events_preview: EventPreview[];
}

// ══════════════════════════════════════════════
// In-memory stores
// ══════════════════════════════════════════════

let _pipelines: Pipeline[] = [];
let _simulations: PipelineSimulationRecord[] = [];
let _committedEvents: EventPreview[] = [];
let _nextId = 1;

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${_nextId++}`;
}

// ── Pipeline CRUD ──

export function getPipelines(): Pipeline[] {
  return _pipelines;
}

export function getPipeline(id: string): Pipeline | undefined {
  return _pipelines.find((p) => p.pipeline_id === id);
}

export function savePipeline(p: Pipeline): Pipeline {
  const idx = _pipelines.findIndex((x) => x.pipeline_id === p.pipeline_id);
  const updated = { ...p, updated_at: new Date().toISOString() };
  if (idx >= 0) _pipelines[idx] = updated;
  else _pipelines.push(updated);
  return updated;
}

export function createPipeline(name: string, createdBy: string): Pipeline {
  const p: Pipeline = {
    pipeline_id: uid("PL"),
    name,
    created_by: createdBy,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    nodes: [],
    edges: [],
  };
  _pipelines.push(p);
  return p;
}

export function deletePipeline(id: string) {
  _pipelines = _pipelines.filter((p) => p.pipeline_id !== id);
}

// ── Simulation records ──

export function getSimulationRecords(): PipelineSimulationRecord[] {
  return _simulations;
}

export function saveSimulationRecord(r: PipelineSimulationRecord) {
  _simulations.push(r);
}

export function getCommittedEvents(): EventPreview[] {
  return _committedEvents;
}

export function commitEvents(events: EventPreview[]) {
  _committedEvents.push(...events);
}

// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

export function getRunsForDevice(interfaceId: string): typeof RUNS {
  const iface = INTERFACES.find((i) => i.id === interfaceId);
  if (!iface?.linked_reactor_id) return [...RUNS]; // non-reactor devices can use all runs
  return RUNS.filter((r) => r.reactor_id === iface.linked_reactor_id);
}

export function getParameterCatalog() {
  return PARAMETERS;
}

export function getInterfaceList() {
  return INTERFACES;
}

// ══════════════════════════════════════════════
// Simulation Engine
// ══════════════════════════════════════════════

function downsample(data: { elapsed_h: number; [k: string]: any }[], intervalMin: number): typeof data {
  if (data.length === 0) return [];
  const intervalH = intervalMin / 60;
  const result: typeof data = [data[0]];
  let lastH = data[0].elapsed_h;
  for (let i = 1; i < data.length; i++) {
    if (data[i].elapsed_h - lastH >= intervalH) {
      result.push(data[i]);
      lastH = data[i].elapsed_h;
    }
  }
  // always include last
  if (result[result.length - 1] !== data[data.length - 1]) result.push(data[data.length - 1]);
  return result;
}

function rollingStats(values: number[], windowSize: number): { mean: number; std: number }[] {
  const result: { mean: number; std: number }[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance = window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
    result.push({ mean, std: Math.sqrt(variance) });
  }
  return result;
}

function exponentialSmoothing(values: number[], alpha: number, forecastN: number): number[] {
  if (values.length === 0) return [];
  let s = values[0];
  for (let i = 1; i < values.length; i++) {
    s = alpha * values[i] + (1 - alpha) * s;
  }
  return Array.from({ length: forecastN }, () => s);
}

export function runSimulation(
  pipeline: Pipeline,
  config: SimulationConfig,
): SimulationResults {
  const simId = uid("SIM");
  const windowStart = new Date(config.time_window_start).getTime();
  const windowEnd = new Date(config.time_window_end).getTime();

  const paramResults: Record<string, ParameterResult> = {};
  const alerts: SimulationAlert[] = [];
  const eventsPreview: EventPreview[] = [];
  const allTimelineData: { elapsed_h: number; [key: string]: number }[] = [];
  const allProcessEvents: ProcessEvent[] = [];
  const topRisks: string[] = [];
  const mlDrivers: string[] = [];

  // Collect device nodes that are active
  const activeDeviceNodes = pipeline.nodes.filter(
    (n) => n.type === "device" && n.interface_id && config.selected_interface_ids.includes(n.interface_id),
  );

  // Utility nodes
  const hasMLInsight = pipeline.nodes.some((n) => n.type === "ml_insight");
  const hasAlertGen = pipeline.nodes.some((n) => n.type === "alert_generator");
  const hasEventOverlay = pipeline.nodes.some((n) => n.type === "event_overlay");
  const hasUnitCheck = pipeline.nodes.some((n) => n.type === "unit_consistency");
  const mlNode = pipeline.nodes.find((n) => n.type === "ml_insight");
  const forecastHours = mlNode?.forecast_hours || 12;
  const anomalyThreshold = mlNode?.anomaly_threshold || 70;

  for (const node of activeDeviceNodes) {
    const runIds = node.selected_run_ids?.filter((id) => config.selected_run_ids.includes(id)) || [];
    const params = node.parameters || [];

    for (const runId of runIds) {
      const rawTs = getTimeseries(runId);
      const run = RUNS.find((r) => r.run_id === runId);
      if (!run) continue;

      const runStart = new Date(run.start_time).getTime();

      // Filter by time window
      const windowedTs = rawTs.filter((pt) => {
        const t = runStart + pt.elapsed_h * 3600000;
        return t >= windowStart && t <= windowEnd;
      });

      const ds = downsample(windowedTs, config.downsample_minutes);

      // Collect process events
      if (hasEventOverlay) {
        const runEvents = getEvents(runId);
        const filteredEvents = runEvents.filter((e) => {
          const t = new Date(e.timestamp).getTime();
          return t >= windowStart && t <= windowEnd;
        });
        allProcessEvents.push(...filteredEvents);
      }

      // Merge into timeline
      for (const pt of ds) {
        const existing = allTimelineData.find((t) => Math.abs(t.elapsed_h - pt.elapsed_h) < 0.01);
        if (existing) {
          for (const p of params) {
            const val = pt[p.parameter_code];
            if (typeof val === "number") existing[`${p.parameter_code}_${runId.slice(-3)}`] = val;
          }
        } else {
          const entry: any = { elapsed_h: pt.elapsed_h };
          for (const p of params) {
            const val = pt[p.parameter_code];
            if (typeof val === "number") entry[`${p.parameter_code}_${runId.slice(-3)}`] = val;
          }
          allTimelineData.push(entry);
        }
      }

      for (const param of params) {
        const key = `${param.parameter_code}_${runId}`;
        const values = ds.map((pt) => pt[param.parameter_code]).filter((v): v is number => typeof v === "number");
        const elapsedHours = ds.map((pt) => pt.elapsed_h);

        if (values.length === 0) continue;

        const minVal = param.useCatalogRange
          ? (PARAMETERS.find((p) => p.parameter_code === param.parameter_code)?.min_value ?? param.min)
          : param.min;
        const maxVal = param.useCatalogRange
          ? (PARAMETERS.find((p) => p.parameter_code === param.parameter_code)?.max_value ?? param.max)
          : param.max;

        // Range check
        let inRangeCount = 0;
        const oorEpisodes: ParameterResult["oor_episodes"] = [];
        let episodeStart: number | null = null;

        for (let i = 0; i < values.length; i++) {
          const inRange = values[i] >= minVal && values[i] <= maxVal;
          if (inRange) {
            inRangeCount++;
            if (episodeStart !== null) {
              oorEpisodes.push({
                start_h: episodeStart,
                end_h: elapsedHours[i - 1],
                duration_h: elapsedHours[i - 1] - episodeStart,
              });
              episodeStart = null;
            }
          } else {
            if (episodeStart === null) episodeStart = elapsedHours[i];
          }
        }
        if (episodeStart !== null) {
          oorEpisodes.push({
            start_h: episodeStart,
            end_h: elapsedHours[elapsedHours.length - 1],
            duration_h: elapsedHours[elapsedHours.length - 1] - episodeStart,
          });
        }

        // Unit consistency
        const catalogParam = PARAMETERS.find((p) => p.parameter_code === param.parameter_code);
        const unitMismatch = hasUnitCheck && !!param.unitOverride && param.unitOverride !== catalogParam?.unit;

        // Anomaly scores (ML-simulated)
        let anomalyScores: ParameterResult["anomaly_scores"] = [];
        let forecast: ParameterResult["forecast"] = [];
        let forecastViolationRisk = 0;

        if (hasMLInsight) {
          const stats = rollingStats(values, Math.min(24, Math.max(6, Math.floor(values.length / 10))));
          anomalyScores = stats.map((s, i) => {
            const zScore = s.std > 0 ? Math.abs(values[i] - s.mean) / s.std : 0;
            const score = Math.min(100, Math.round(zScore * 25));
            return { elapsed_h: elapsedHours[i], score };
          });

          // Forecast
          const forecastN = Math.ceil(forecastHours);
          const lastH = elapsedHours[elapsedHours.length - 1];
          const smoothed = exponentialSmoothing(values, 0.3, forecastN);
          const lastStd = stats[stats.length - 1]?.std || 1;

          forecast = smoothed.map((val, i) => ({
            elapsed_h: lastH + i + 1,
            value: val,
            lower: val - 1.5 * lastStd,
            upper: val + 1.5 * lastStd,
          }));

          forecastViolationRisk = forecast.filter((f) => f.value < minVal || f.value > maxVal).length / Math.max(1, forecast.length) * 100;

          // High anomaly episodes as drivers
          const highAnomaly = anomalyScores.filter((a) => a.score > anomalyThreshold);
          if (highAnomaly.length > 0) {
            mlDrivers.push(`${param.display_name}: ${highAnomaly.length} anomalous points (run ${run.bioreactor_run})`);
          }
        }

        const pctInRange = values.length > 0 ? (inRangeCount / values.length) * 100 : 100;

        paramResults[key] = {
          parameter_code: param.parameter_code,
          display_name: param.display_name,
          unit: param.unitOverride || param.unit,
          total_points: values.length,
          in_range_count: inRangeCount,
          pct_in_range: pctInRange,
          oor_episodes: oorEpisodes,
          anomaly_scores: anomalyScores,
          forecast,
          forecast_violation_risk: forecastViolationRisk,
          unit_mismatch: unitMismatch,
        };

        // Generate alerts
        if (hasAlertGen && config.generate_alerts) {
          if (pctInRange < 90) {
            alerts.push({
              id: uid("SALR"),
              severity: pctInRange < 70 ? "critical" : "warning",
              type: "out_of_range",
              message: `${param.display_name} in-range only ${pctInRange.toFixed(1)}% (${run.bioreactor_run})`,
              run_id: runId,
              parameter_code: param.parameter_code,
              timestamp: new Date().toISOString(),
            });
          }
          if (unitMismatch) {
            alerts.push({
              id: uid("SALR"),
              severity: "warning",
              type: "unit_mismatch",
              message: `Unit mismatch for ${param.display_name}: expected ${catalogParam?.unit}, got ${param.unitOverride}`,
              run_id: runId,
              parameter_code: param.parameter_code,
              timestamp: new Date().toISOString(),
            });
          }
          if (forecastViolationRisk > 30) {
            alerts.push({
              id: uid("SALR"),
              severity: forecastViolationRisk > 60 ? "critical" : "warning",
              type: "forecast_violation",
              message: `${param.display_name} forecasted to violate range with ${forecastViolationRisk.toFixed(0)}% risk (${run.bioreactor_run})`,
              run_id: runId,
              parameter_code: param.parameter_code,
              timestamp: new Date().toISOString(),
            });
          }
        }

        // Generate events preview
        if (config.generate_events_preview) {
          for (const ep of oorEpisodes) {
            eventsPreview.push({
              id: uid("EVP"),
              timestamp: new Date(runStart + ep.start_h * 3600000).toISOString(),
              type: "OOR_EPISODE",
              parameter_code: param.parameter_code,
              message: `${param.display_name} out of range for ${ep.duration_h.toFixed(1)}h`,
              attributable_to: `pipeline/${pipeline.name}`,
              evidence_run_id: runId,
              evidence_start_h: ep.start_h,
            });
          }
        }

        if (pctInRange < 85) {
          topRisks.push(`${param.display_name} (${run.bioreactor_run}): ${(100 - pctInRange).toFixed(1)}% OOR`);
        }
      }
    }
  }

  // Sort timeline
  allTimelineData.sort((a, b) => a.elapsed_h - b.elapsed_h);

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return {
    simulation_id: simId,
    pipeline_id: pipeline.pipeline_id,
    created_at: new Date().toISOString(),
    created_by: "current_user",
    scope_mode: config.scope_mode,
    selected_run_ids: config.selected_run_ids,
    selected_interface_ids: config.selected_interface_ids,
    time_window_start: config.time_window_start,
    time_window_end: config.time_window_end,
    parameter_results: paramResults,
    alerts,
    events_preview: eventsPreview,
    overall_status: criticalCount > 0 ? "critical" : warningCount > 0 ? "warning" : "pass",
    top_risks: topRisks.slice(0, 5),
    ml_drivers: mlDrivers.slice(0, 5),
    timeline_data: allTimelineData,
    process_events: allProcessEvents,
  };
}
