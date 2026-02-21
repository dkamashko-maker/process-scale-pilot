/**
 * Label Templates – defines required & optional metadata fields
 * per interface + data_type combination.
 *
 * Completeness scoring: score = (present required / total required) * 100
 */

import type { DataRecord } from "./runTypes";

export interface LabelTemplate {
  template_id: string;
  name: string;
  applies_to: { interface_id: string; data_type: string };
  required_fields: string[];
  optional_fields: string[];
}

// ── Seed Templates ──

export const LABEL_TEMPLATES: LabelTemplate[] = [
  {
    template_id: "TPL-BR-TS",
    name: "Bioreactor Timeseries",
    applies_to: { interface_id: "BR-*", data_type: "timeseries" },
    required_fields: ["run", "parameter", "reactor", "priority"],
    optional_fields: ["batch", "phase", "operator"],
  },
  {
    template_id: "TPL-EVT",
    name: "Process Event",
    applies_to: { interface_id: "*", data_type: "event" },
    required_fields: ["event_type", "run"],
    optional_fields: ["subtype", "batch", "phase"],
  },
  {
    template_id: "TPL-HPLC-FILE",
    name: "HPLC File",
    applies_to: { interface_id: "HPLC-01", data_type: "file" },
    required_fields: ["run", "injection", "format"],
    optional_fields: ["assay_id", "sample_id", "method_version"],
  },
  {
    template_id: "TPL-METAB-TS",
    name: "Metabolite Analyzer",
    applies_to: { interface_id: "METAB-ANALYZER", data_type: "timeseries" },
    required_fields: ["run", "day"],
    optional_fields: ["panel_version", "operator"],
  },
  {
    template_id: "TPL-CELL-TS",
    name: "Cell Counter",
    applies_to: { interface_id: "CELL-COUNTER", data_type: "timeseries" },
    required_fields: ["run", "day"],
    optional_fields: ["method", "dilution_factor"],
  },
  {
    template_id: "TPL-GAS-TS",
    name: "Gas MFC Rack",
    applies_to: { interface_id: "GAS-MFC-RACK", data_type: "timeseries" },
    required_fields: [],
    optional_fields: ["calibration_date", "rack_position"],
  },
];

// ── Matching ──

function matchesInterface(pattern: string, interfaceId: string): boolean {
  if (pattern === "*") return true;
  if (pattern.endsWith("-*")) return interfaceId.startsWith(pattern.slice(0, -1));
  return pattern === interfaceId;
}

export function getTemplateForRecord(record: DataRecord): LabelTemplate | null {
  return (
    LABEL_TEMPLATES.find(
      (t) =>
        matchesInterface(t.applies_to.interface_id, record.interface_id) &&
        (t.applies_to.data_type === "*" || t.applies_to.data_type === record.data_type),
    ) || null
  );
}

// ── Completeness ──

export interface CompletenessResult {
  score: number;
  present: string[];
  missing: string[];
  optional_present: string[];
  optional_missing: string[];
  template: LabelTemplate | null;
}

export function computeCompleteness(record: DataRecord): CompletenessResult {
  const template = getTemplateForRecord(record);
  if (!template || template.required_fields.length === 0) {
    return {
      score: 100,
      present: [],
      missing: [],
      optional_present: [],
      optional_missing: [],
      template,
    };
  }

  const labels = record.labels;
  const present = template.required_fields.filter((f) => f in labels && labels[f] !== "");
  const missing = template.required_fields.filter((f) => !(f in labels) || labels[f] === "");
  const optional_present = template.optional_fields.filter((f) => f in labels && labels[f] !== "");
  const optional_missing = template.optional_fields.filter((f) => !(f in labels) || labels[f] === "");

  const score = Math.round((present.length / template.required_fields.length) * 100);

  return { score, present, missing, optional_present, optional_missing, template };
}

/**
 * Apply label values to a record (mutates labels in-place since records are
 * objects held by reference in the ledger). Returns the updated completeness.
 */
export function applyLabels(
  record: DataRecord,
  newLabels: Record<string, string>,
): CompletenessResult {
  for (const [k, v] of Object.entries(newLabels)) {
    if (v.trim()) {
      record.labels[k] = v.trim();
    }
  }

  const result = computeCompleteness(record);
  record.completeness_score = result.score;
  return result;
}

/**
 * Bulk-apply the same labels to multiple records.
 * Returns count of updated records.
 */
export function bulkApplyLabels(
  records: DataRecord[],
  newLabels: Record<string, string>,
): number {
  let count = 0;
  for (const rec of records) {
    applyLabels(rec, newLabels);
    count++;
  }
  return count;
}
