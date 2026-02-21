/**
 * Alerts Engine – automatic alert generation from data_records.
 *
 * Rules:
 * 1. Out-of-range values (timeseries with out_of_range flag)
 * 2. Missing required metadata (label_templates completeness < 100)
 * 3. Timestamp gaps for critical parameters
 * 4. Duplicate raw_ref detection
 * 5. HPLC PDF without CSV companion
 */

import type { DataRecord } from "./runTypes";
import { getDataRecords } from "./dataRecords";
import { computeCompleteness } from "./labelTemplates";
import { PARAMETERS, RUNS } from "./runData";

// ── Types ──

export type AlertSeverity = "critical" | "warning" | "info";

export type AlertType =
  | "out_of_range"
  | "missing_metadata"
  | "timestamp_gap"
  | "duplicate_record"
  | "missing_companion";

export interface Alert {
  alert_id: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  interface_id: string;
  linked_run_id: string | undefined;
  created_at: string;
  affected_record_ids: string[];
}

// ── State ──

let _alerts: Alert[] = [];
let _generated = false;

// ── Rule implementations ──

function ruleOutOfRange(records: DataRecord[]): Alert[] {
  const alerts: Alert[] = [];
  const oor = records.filter(
    (r) => r.data_type === "timeseries" && r.quality_flags.includes("out_of_range"),
  );

  // Group by interface + run to avoid per-record noise
  const groups = new Map<string, DataRecord[]>();
  for (const r of oor) {
    const key = `${r.interface_id}::${r.linked_run_id || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  for (const [key, recs] of groups) {
    const [ifaceId, runId] = key.split("::");
    const run = RUNS.find((r) => r.run_id === runId);
    alerts.push({
      alert_id: `ALR-OOR-${ifaceId}-${runId || "none"}-${recs.length}`,
      severity: recs.length > 10 ? "critical" : "warning",
      type: "out_of_range",
      message: `${recs.length} out-of-range value(s) detected on ${ifaceId}${run ? ` (${run.bioreactor_run})` : ""}`,
      interface_id: ifaceId,
      linked_run_id: runId || undefined,
      created_at: recs[recs.length - 1].measured_at,
      affected_record_ids: recs.map((r) => r.record_id),
    });
  }

  return alerts;
}

function ruleMissingMetadata(records: DataRecord[]): Alert[] {
  const alerts: Alert[] = [];
  const incomplete = records.filter((r) => {
    const c = computeCompleteness(r);
    return c.score < 100 && c.template && c.template.required_fields.length > 0;
  });

  // Group by interface
  const groups = new Map<string, DataRecord[]>();
  for (const r of incomplete) {
    if (!groups.has(r.interface_id)) groups.set(r.interface_id, []);
    groups.get(r.interface_id)!.push(r);
  }

  for (const [ifaceId, recs] of groups) {
    alerts.push({
      alert_id: `ALR-META-${ifaceId}-${recs.length}`,
      severity: "info",
      type: "missing_metadata",
      message: `${recs.length} record(s) on ${ifaceId} have incomplete required metadata labels`,
      interface_id: ifaceId,
      linked_run_id: undefined,
      created_at: new Date().toISOString(),
      affected_record_ids: recs.slice(0, 20).map((r) => r.record_id),
    });
  }

  return alerts;
}

function ruleTimestampGaps(records: DataRecord[]): Alert[] {
  const alerts: Alert[] = [];
  const criticalCodes = new Set(
    PARAMETERS.filter((p) => p.is_critical).map((p) => p.parameter_code),
  );

  // Per run+interface, check timeseries ordering for gaps
  const tsRecords = records
    .filter((r) => r.data_type === "timeseries" && r.labels.parameter && criticalCodes.has(r.labels.parameter))
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());

  // Group by run + parameter
  const groups = new Map<string, DataRecord[]>();
  for (const r of tsRecords) {
    const key = `${r.linked_run_id || ""}::${r.labels.parameter}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  for (const [key, recs] of groups) {
    if (recs.length < 2) continue;
    const [runId, paramCode] = key.split("::");
    const param = PARAMETERS.find((p) => p.parameter_code === paramCode);

    // Expected gap is ~1 hour for our data; flag if > 3 hours
    const MAX_GAP_MS = 3 * 3600000;
    for (let i = 1; i < recs.length; i++) {
      const gap = new Date(recs[i].measured_at).getTime() - new Date(recs[i - 1].measured_at).getTime();
      if (gap > MAX_GAP_MS) {
        const gapHours = Math.round(gap / 3600000);
        alerts.push({
          alert_id: `ALR-GAP-${runId}-${paramCode}-${i}`,
          severity: "warning",
          type: "timestamp_gap",
          message: `${gapHours}h gap in ${param?.display_name || paramCode} data${runId ? ` (run ${RUNS.find((r) => r.run_id === runId)?.bioreactor_run || runId})` : ""}`,
          interface_id: recs[i].interface_id,
          linked_run_id: runId || undefined,
          created_at: recs[i].measured_at,
          affected_record_ids: [recs[i - 1].record_id, recs[i].record_id],
        });
      }
    }
  }

  return alerts;
}

function ruleDuplicateRawRef(records: DataRecord[]): Alert[] {
  const alerts: Alert[] = [];
  const seen = new Map<string, DataRecord[]>();

  for (const r of records) {
    if (!seen.has(r.raw_ref)) seen.set(r.raw_ref, []);
    seen.get(r.raw_ref)!.push(r);
  }

  for (const [rawRef, recs] of seen) {
    if (recs.length <= 1) continue;
    alerts.push({
      alert_id: `ALR-DUP-${recs[0].record_id}`,
      severity: "warning",
      type: "duplicate_record",
      message: `Duplicate raw_ref detected: ${rawRef} (${recs.length} records)`,
      interface_id: recs[0].interface_id,
      linked_run_id: recs[0].linked_run_id,
      created_at: new Date().toISOString(),
      affected_record_ids: recs.map((r) => r.record_id),
    });
  }

  return alerts;
}

function ruleMissingCompanion(records: DataRecord[]): Alert[] {
  const alerts: Alert[] = [];
  const hplcFiles = records.filter(
    (r) => r.interface_id === "HPLC-01" && r.data_type === "file",
  );

  // Group by injection seq (from labels or summary)
  const pdfs = hplcFiles.filter((r) => r.summary.includes("PDF") || r.labels.format === "PDF");
  const csvs = hplcFiles.filter((r) => r.summary.includes("CSV") || r.labels.format === "CSV");

  // Match by poll_seq label or injection label
  for (const pdf of pdfs) {
    const seq = pdf.labels.poll_seq || pdf.labels.injection;
    if (!seq) continue;
    const hasCsv = csvs.some(
      (c) => (c.labels.poll_seq || c.labels.injection) === seq,
    );
    if (!hasCsv) {
      alerts.push({
        alert_id: `ALR-COMP-HPLC-${seq}`,
        severity: "warning",
        type: "missing_companion",
        message: `HPLC PDF (seq ${seq}) has no companion CSV summary file`,
        interface_id: "HPLC-01",
        linked_run_id: pdf.linked_run_id,
        created_at: pdf.ingested_at,
        affected_record_ids: [pdf.record_id],
      });
    }
  }

  return alerts;
}

// ── Public API ──

export function generateAlerts(): Alert[] {
  const records = getDataRecords();

  _alerts = [
    ...ruleOutOfRange(records),
    ...ruleMissingMetadata(records),
    ...ruleTimestampGaps(records),
    ...ruleDuplicateRawRef(records),
    ...ruleMissingCompanion(records),
  ];

  // Sort by severity then created_at
  const severityOrder: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };
  _alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  _generated = true;
  return _alerts;
}

export function getAlerts(): Alert[] {
  if (!_generated) generateAlerts();
  return _alerts;
}

export function getAlertsForInterface(interfaceId: string): Alert[] {
  return getAlerts().filter((a) => a.interface_id === interfaceId);
}

export function getAlertsForRun(runId: string): Alert[] {
  return getAlerts().filter((a) => a.linked_run_id === runId);
}

export function getAlertCountsByInterface(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const a of getAlerts()) {
    counts[a.interface_id] = (counts[a.interface_id] || 0) + 1;
  }
  return counts;
}

export function getAlertCountsBySeverity(): Record<AlertSeverity, number> {
  const counts: Record<AlertSeverity, number> = { critical: 0, warning: 0, info: 0 };
  for (const a of getAlerts()) {
    counts[a.severity]++;
  }
  return counts;
}
