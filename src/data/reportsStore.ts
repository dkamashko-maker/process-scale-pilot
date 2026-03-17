/**
 * Reports Store – in-memory PoC for batch/run reports with QC data,
 * alert/insight linkage, and version-controlled signing.
 */

import { RUNS, PARAMETERS } from "./runData";
import { getAlerts, type Alert } from "./alertsEngine";
import { getInsights, type AiInsight } from "./aiInsights";

// ── Types ──

export interface QcRow {
  parameter: string;
  value: string;
  unit: string;
  status: "Pass" | "Fail" | "Review";
}

export interface Report {
  report_id: string;
  report_no: string;
  report_date: string;
  linked_run_id: string;
  status: "Archive" | "In Progress" | "Issues";
  version: number;
  created_by: string;
  signed_by: string | null;
  signed_at: string | null;
  comment: string | null;
  qc_rows: QcRow[];
  alert_ids: string[];
  insight_ids: string[];
}

// ── In-memory store ──

let _reports: Report[] = [];
let _seeded = false;

function seedReports() {
  if (_seeded) return;
  _seeded = true;

  const alerts = getAlerts();
  const insights = getInsights();

  // Helper to pick alerts/insights for a run
  const alertsForRun = (runId: string) =>
    alerts.filter((a) => a.linked_run_id === runId).map((a) => a.alert_id);
  const insightsForRun = (runId: string) =>
    insights.filter((i) => i.linked_run_id === runId).map((i) => i.id);

  // Generate QC rows from parameter catalog for a run
  function makeQcRows(runId: string): QcRow[] {
    const criticalParams = PARAMETERS.filter((p) => p.is_critical);
    const runAlerts = alerts.filter((a) => a.linked_run_id === runId);
    const oorParams = new Set(
      runAlerts
        .filter((a) => a.type === "out_of_range")
        .flatMap((a) => a.affected_record_ids)
    );

    return criticalParams.map((p) => {
      const hasIssue = oorParams.size > 0 && Math.random() > 0.6;
      const baseVal = (p.min_value + p.max_value) / 2;
      const val = hasIssue
        ? p.max_value + (p.max_value - p.min_value) * 0.1
        : baseVal + (Math.random() - 0.5) * (p.max_value - p.min_value) * 0.3;
      return {
        parameter: p.display_name,
        value: val.toFixed(2),
        unit: p.unit,
        status: hasIssue ? "Fail" as const : "Pass" as const,
      };
    });
  }

  // Seed reports linked to existing runs
  const run1 = RUNS.find((r) => r.reactor_id === "003-p");
  const run2 = RUNS.find((r) => r.reactor_id === "004-p");
  const run3 = RUNS.find((r) => r.reactor_id === "005-p");

  if (run1) {
    _reports.push({
      report_id: "RPT-001",
      report_no: "RPT-2026-001",
      report_date: "2026-02-28T10:00:00",
      linked_run_id: run1.run_id,
      status: "Archive",
      version: 2,
      created_by: "J. Fischer",
      signed_by: "M. Weber",
      signed_at: "2026-02-28T14:30:00",
      comment: "Final batch report. All parameters within specification.",
      qc_rows: makeQcRows(run1.run_id),
      alert_ids: alertsForRun(run1.run_id).slice(0, 3),
      insight_ids: insightsForRun(run1.run_id).slice(0, 2),
    });
  }

  if (run2) {
    _reports.push({
      report_id: "RPT-002",
      report_no: "RPT-2026-002",
      report_date: "2026-03-05T09:00:00",
      linked_run_id: run2.run_id,
      status: "In Progress",
      version: 1,
      created_by: "A. Müller",
      signed_by: null,
      signed_at: null,
      comment: null,
      qc_rows: makeQcRows(run2.run_id),
      alert_ids: alertsForRun(run2.run_id).slice(0, 2),
      insight_ids: insightsForRun(run2.run_id).slice(0, 2),
    });
  }

  if (run3) {
    const qcRows = makeQcRows(run3.run_id);
    // Force at least one fail for the "Issues" report
    if (qcRows.length > 0) qcRows[0].status = "Fail";
    _reports.push({
      report_id: "RPT-003",
      report_no: "RPT-2026-003",
      report_date: "2026-03-10T11:00:00",
      linked_run_id: run3.run_id,
      status: "Issues",
      version: 1,
      created_by: "K. Bauer",
      signed_by: null,
      signed_at: null,
      comment: "Temperature excursion noted at h72. Under review.",
      qc_rows: qcRows,
      alert_ids: alertsForRun(run3.run_id).slice(0, 4),
      insight_ids: insightsForRun(run3.run_id).slice(0, 3),
    });
  }

  // Add a 4th archive report
  if (run1) {
    _reports.push({
      report_id: "RPT-004",
      report_no: "RPT-2026-004",
      report_date: "2026-02-20T08:00:00",
      linked_run_id: run1.run_id,
      status: "Archive",
      version: 1,
      created_by: "J. Fischer",
      signed_by: "J. Fischer",
      signed_at: "2026-02-20T16:00:00",
      comment: "Interim batch report v1.",
      qc_rows: makeQcRows(run1.run_id),
      alert_ids: alertsForRun(run1.run_id).slice(0, 1),
      insight_ids: insightsForRun(run1.run_id).slice(0, 1),
    });
  }
}

// ── Public API ──

export function getReports(): Report[] {
  seedReports();
  return _reports;
}

export function getReport(id: string): Report | undefined {
  seedReports();
  return _reports.find((r) => r.report_id === id);
}

export function updateReport(report: Report): Report {
  seedReports();
  const idx = _reports.findIndex((r) => r.report_id === report.report_id);
  if (idx >= 0) _reports[idx] = report;
  return report;
}

export function signReport(reportId: string, signedBy: string): Report | undefined {
  seedReports();
  const report = _reports.find((r) => r.report_id === reportId);
  if (!report) return undefined;
  report.signed_by = signedBy;
  report.signed_at = new Date().toISOString();
  return report;
}

export function createNewVersion(reportId: string, createdBy: string): Report | undefined {
  seedReports();
  const original = _reports.find((r) => r.report_id === reportId);
  if (!original) return undefined;
  const newReport: Report = {
    ...original,
    report_id: `${original.report_id}-v${original.version + 1}`,
    version: original.version + 1,
    created_by: createdBy,
    signed_by: null,
    signed_at: null,
    report_date: new Date().toISOString(),
    comment: null,
  };
  _reports.push(newReport);
  return newReport;
}

export function createReportFromRun(runId: string, createdBy: string): Report {
  seedReports();
  const alerts = getAlerts().filter((a) => a.linked_run_id === runId);
  const insights = getInsights().filter((i) => i.linked_run_id === runId);
  const run = RUNS.find((r) => r.run_id === runId);

  // Build QC rows from critical parameters
  const criticalParams = PARAMETERS.filter((p) => p.is_critical);
  const qcRows: QcRow[] = criticalParams.map((p) => {
    const hasOor = alerts.some((a) => a.type === "out_of_range" && a.message.toLowerCase().includes(p.display_name.toLowerCase()));
    const baseVal = (p.min_value + p.max_value) / 2;
    const val = hasOor
      ? p.max_value + (p.max_value - p.min_value) * 0.08
      : baseVal + (Math.random() - 0.5) * (p.max_value - p.min_value) * 0.2;
    return {
      parameter: p.display_name,
      value: val.toFixed(2),
      unit: p.unit,
      status: hasOor ? "Fail" as const : "Pass" as const,
    };
  });

  // Try to populate from HPLC data records if available
  try {
    const { getDataRecords } = require("./dataRecords");
    const hplcRecords = getDataRecords().filter(
      (r: any) => r.interface_id === "HPLC-01" && r.data_type === "file" && (r.summary.includes("CSV") || r.labels?.format === "CSV"),
    );
    if (hplcRecords.length > 0) {
      const latest = hplcRecords[hplcRecords.length - 1];
      qcRows.push({
        parameter: "Titer (HPLC)",
        value: (0.8 + Math.random() * 0.4).toFixed(2),
        unit: "g/L",
        status: "Pass",
      });
      qcRows.push({
        parameter: "Purity (HPLC)",
        value: (95 + Math.random() * 4).toFixed(1),
        unit: "%",
        status: "Pass",
      });
    }
  } catch { /* dataRecords not available */ }

  const nextNum = _reports.length + 1;
  const report: Report = {
    report_id: `RPT-GEN-${Date.now()}`,
    report_no: `RPT-2026-${String(nextNum).padStart(3, "0")}`,
    report_date: new Date().toISOString(),
    linked_run_id: runId,
    status: alerts.some((a) => a.severity === "critical") ? "Issues" : "In Progress",
    version: 1,
    created_by: createdBy,
    signed_by: null,
    signed_at: null,
    comment: `Auto-generated from ${run?.bioreactor_run || runId} monitoring view.`,
    qc_rows: qcRows,
    alert_ids: alerts.map((a) => a.alert_id),
    insight_ids: insights.map((i) => i.id),
  };
  _reports.push(report);
  return report;
}

export function getReportAlertsAndInsights(report: Report): {
  alerts: Alert[];
  insights: AiInsight[];
} {
  const allAlerts = getAlerts();
  const allInsights = getInsights();
  return {
    alerts: report.alert_ids.length > 0
      ? allAlerts.filter((a) => report.alert_ids.includes(a.alert_id))
      : allAlerts.filter((a) => a.linked_run_id === report.linked_run_id),
    insights: report.insight_ids.length > 0
      ? allInsights.filter((i) => report.insight_ids.includes(i.id))
      : allInsights.filter((i) => i.linked_run_id === report.linked_run_id),
  };
}
