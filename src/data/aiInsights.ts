/**
 * AI Recipes & Insights – deterministic insight generation from alerts + data patterns.
 */

import type { Alert, AlertSeverity } from "./alertsEngine";
import { getAlerts } from "./alertsEngine";
import { getDataRecords, getRecordCountsByInterface } from "./dataRecords";
import { INTERFACES, PARAMETERS, RUNS } from "./runData";
import { computeCompleteness } from "./labelTemplates";

// ── Recipes ──

export interface AiRecipe {
  id: string;
  name: string;
  description: string;
  category: "quality" | "completeness" | "trend" | "anomaly";
  applies_to: string[]; // interface_id patterns, "*" = all
  enabled: boolean;
}

export const AI_RECIPES: AiRecipe[] = [
  {
    id: "RCP-OOR-TREND",
    name: "Out-of-Range Trend Analysis",
    description: "Identifies interfaces with high out-of-range record concentrations and highlights worst parameters.",
    category: "quality",
    applies_to: ["BR-*"],
    enabled: true,
  },
  {
    id: "RCP-METADATA-GAP",
    name: "Metadata Completeness Audit",
    description: "Flags interfaces where >20% of records have incomplete required labels.",
    category: "completeness",
    applies_to: ["*"],
    enabled: true,
  },
  {
    id: "RCP-INGESTION-SKEW",
    name: "Ingestion Volume Imbalance",
    description: "Detects disproportionately low ingestion from interfaces that should produce similar volumes.",
    category: "anomaly",
    applies_to: ["BR-*"],
    enabled: true,
  },
  {
    id: "RCP-COMPANION-CHECK",
    name: "HPLC Companion File Check",
    description: "Ensures every HPLC PDF chromatogram has a matching CSV summary.",
    category: "quality",
    applies_to: ["HPLC-01"],
    enabled: true,
  },
  {
    id: "RCP-CRITICAL-GAP",
    name: "Critical Parameter Gap Detection",
    description: "Alerts when critical parameters have unexpected time gaps in their data streams.",
    category: "trend",
    applies_to: ["BR-*"],
    enabled: true,
  },
  {
    id: "RCP-EVENT-DENSITY",
    name: "Event Density Analysis",
    description: "Identifies runs with unusually high or low event frequencies compared to peers.",
    category: "anomaly",
    applies_to: ["*"],
    enabled: false,
  },
];

// ── Insights ──

export type InsightSeverity = "critical" | "warning" | "info" | "success";

export interface AiInsight {
  id: string;
  recipe_id: string;
  title: string;
  explanation: string;
  severity: InsightSeverity;
  evidence_record_ids: string[];
  interface_id: string | null;
  linked_run_id: string | null;
  created_at: string;
}

// ── State ──

let _insights: AiInsight[] = [];
let _generated = false;

// ── Deterministic insight generators ──

function insightOorTrend(alerts: Alert[], records: ReturnType<typeof getDataRecords>): AiInsight[] {
  const insights: AiInsight[] = [];
  const oorAlerts = alerts.filter((a) => a.type === "out_of_range");

  for (const a of oorAlerts) {
    const count = a.affected_record_ids.length;
    const run = RUNS.find((r) => r.run_id === a.linked_run_id);

    // Find worst parameter
    const paramCounts: Record<string, number> = {};
    for (const rid of a.affected_record_ids) {
      const rec = records.find((r) => r.record_id === rid);
      if (rec?.labels.parameter) {
        paramCounts[rec.labels.parameter] = (paramCounts[rec.labels.parameter] || 0) + 1;
      }
    }
    const worstParam = Object.entries(paramCounts).sort((a, b) => b[1] - a[1])[0];
    const paramDef = worstParam ? PARAMETERS.find((p) => p.parameter_code === worstParam[0]) : null;

    insights.push({
      id: `INS-OOR-${a.interface_id}-${a.linked_run_id || "x"}`,
      recipe_id: "RCP-OOR-TREND",
      title: `High deviation rate on ${INTERFACES.find((i) => i.id === a.interface_id)?.display_name || a.interface_id}`,
      explanation: `${count} out-of-range readings detected${run ? ` during ${run.bioreactor_run}` : ""}. ${
        paramDef ? `The worst contributor is ${paramDef.display_name} with ${worstParam![1]} violations (spec: ${paramDef.min_value}–${paramDef.max_value} ${paramDef.unit}).` : ""
      } Review parameter trends and consider adjusting process controls.`,
      severity: count > 20 ? "critical" : "warning",
      evidence_record_ids: a.affected_record_ids.slice(0, 10),
      interface_id: a.interface_id,
      linked_run_id: a.linked_run_id || null,
      created_at: a.created_at,
    });
  }
  return insights;
}

function insightMetadataGap(records: ReturnType<typeof getDataRecords>): AiInsight[] {
  const insights: AiInsight[] = [];
  const byIface: Record<string, { total: number; incomplete: number; ids: string[] }> = {};

  for (const r of records) {
    if (!byIface[r.interface_id]) byIface[r.interface_id] = { total: 0, incomplete: 0, ids: [] };
    byIface[r.interface_id].total++;
    const c = computeCompleteness(r);
    if (c.score < 100 && c.template && c.template.required_fields.length > 0) {
      byIface[r.interface_id].incomplete++;
      if (byIface[r.interface_id].ids.length < 5) byIface[r.interface_id].ids.push(r.record_id);
    }
  }

  for (const [ifaceId, data] of Object.entries(byIface)) {
    const pct = data.total > 0 ? (data.incomplete / data.total) * 100 : 0;
    if (pct > 20) {
      insights.push({
        id: `INS-META-${ifaceId}`,
        recipe_id: "RCP-METADATA-GAP",
        title: `${Math.round(pct)}% of ${INTERFACES.find((i) => i.id === ifaceId)?.display_name || ifaceId} records lack required labels`,
        explanation: `${data.incomplete} of ${data.total} records have incomplete metadata. Missing labels reduce traceability and may impact ALCOA compliance. Use Metadata Constructor to bulk-apply labels.`,
        severity: pct > 50 ? "warning" : "info",
        evidence_record_ids: data.ids,
        interface_id: ifaceId,
        linked_run_id: null,
        created_at: new Date().toISOString(),
      });
    }
  }
  return insights;
}

function insightIngestionSkew(): AiInsight[] {
  const insights: AiInsight[] = [];
  const counts = getRecordCountsByInterface();
  const brInterfaces = INTERFACES.filter((i) => i.id.startsWith("BR-"));

  if (brInterfaces.length < 2) return insights;

  const brCounts = brInterfaces.map((i) => ({ iface: i, count: counts[i.id] || 0 }));
  const avg = brCounts.reduce((s, c) => s + c.count, 0) / brCounts.length;

  for (const { iface, count } of brCounts) {
    if (avg > 0 && count < avg * 0.5) {
      insights.push({
        id: `INS-SKEW-${iface.id}`,
        recipe_id: "RCP-INGESTION-SKEW",
        title: `Low ingestion volume from ${iface.display_name}`,
        explanation: `Only ${count} records ingested vs. average of ${Math.round(avg)} across bioreactors. This may indicate a polling issue, sensor failure, or late-starting run.`,
        severity: "warning",
        evidence_record_ids: [],
        interface_id: iface.id,
        linked_run_id: null,
        created_at: new Date().toISOString(),
      });
    }
  }
  return insights;
}

function insightCompanion(alerts: Alert[]): AiInsight[] {
  const companions = alerts.filter((a) => a.type === "missing_companion");
  if (companions.length === 0) return [];

  return [{
    id: "INS-COMP-HPLC",
    recipe_id: "RCP-COMPANION-CHECK",
    title: `${companions.length} HPLC file(s) missing companion CSV`,
    explanation: `PDF chromatogram reports without matching CSV summaries were detected. This may delay downstream titer/purity analysis. Check HPLC system output configuration.`,
    severity: "warning",
    evidence_record_ids: companions.flatMap((c) => c.affected_record_ids).slice(0, 10),
    interface_id: "HPLC-01",
    linked_run_id: companions[0]?.linked_run_id || null,
    created_at: companions[0]?.created_at || new Date().toISOString(),
  }];
}

function insightCriticalGaps(alerts: Alert[]): AiInsight[] {
  const gaps = alerts.filter((a) => a.type === "timestamp_gap");
  if (gaps.length === 0) return [];

  // Group by run
  const byRun: Record<string, Alert[]> = {};
  for (const g of gaps) {
    const key = g.linked_run_id || "none";
    if (!byRun[key]) byRun[key] = [];
    byRun[key].push(g);
  }

  return Object.entries(byRun).map(([runId, gapAlerts]) => {
    const run = RUNS.find((r) => r.run_id === runId);
    return {
      id: `INS-GAP-${runId}`,
      recipe_id: "RCP-CRITICAL-GAP",
      title: `${gapAlerts.length} data gap(s) in critical parameters${run ? ` (${run.bioreactor_run})` : ""}`,
      explanation: `Unexpected time gaps detected in critical parameter streams. Gaps may indicate sensor disconnection, system downtime, or data loss. Review affected time windows.`,
      severity: gapAlerts.length > 3 ? "critical" : "warning" as InsightSeverity,
      evidence_record_ids: gapAlerts.flatMap((g) => g.affected_record_ids).slice(0, 10),
      interface_id: gapAlerts[0].interface_id,
      linked_run_id: runId === "none" ? null : runId,
      created_at: gapAlerts[0].created_at,
    };
  });
}

function insightAllClear(alerts: Alert[], records: ReturnType<typeof getDataRecords>): AiInsight[] {
  if (alerts.length === 0) {
    return [{
      id: "INS-CLEAR",
      recipe_id: "RCP-OOR-TREND",
      title: "All systems nominal",
      explanation: "No quality alerts, data gaps, or missing companions detected across all interfaces. Data integrity checks passed.",
      severity: "success",
      evidence_record_ids: [],
      interface_id: null,
      linked_run_id: null,
      created_at: new Date().toISOString(),
    }];
  }
  return [];
}

// ── Public API ──

export function generateInsights(): AiInsight[] {
  const alerts = getAlerts();
  const records = getDataRecords();
  const enabledRecipes = new Set(AI_RECIPES.filter((r) => r.enabled).map((r) => r.id));

  _insights = [];

  if (enabledRecipes.has("RCP-OOR-TREND")) _insights.push(...insightOorTrend(alerts, records));
  if (enabledRecipes.has("RCP-METADATA-GAP")) _insights.push(...insightMetadataGap(records));
  if (enabledRecipes.has("RCP-INGESTION-SKEW")) _insights.push(...insightIngestionSkew());
  if (enabledRecipes.has("RCP-COMPANION-CHECK")) _insights.push(...insightCompanion(alerts));
  if (enabledRecipes.has("RCP-CRITICAL-GAP")) _insights.push(...insightCriticalGaps(alerts));
  _insights.push(...insightAllClear(alerts, records));

  const sevOrder: Record<InsightSeverity, number> = { critical: 0, warning: 1, info: 2, success: 3 };
  _insights.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  _generated = true;
  return _insights;
}

export function getInsights(): AiInsight[] {
  if (!_generated) generateInsights();
  return _insights;
}

export function toggleRecipe(recipeId: string): boolean {
  const recipe = AI_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) return false;
  recipe.enabled = !recipe.enabled;
  _generated = false; // force regeneration
  return recipe.enabled;
}

export function getEnabledRecipes(): AiRecipe[] {
  return AI_RECIPES.filter((r) => r.enabled);
}
