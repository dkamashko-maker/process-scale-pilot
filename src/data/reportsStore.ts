/**
 * Reports Store – in-memory PoC for batch/run reports with QC data,
 * alert/insight linkage, and version-controlled signing.
 */

import { RUNS, PARAMETERS } from "./runData";
import { getAlerts, type Alert } from "./alertsEngine";
import { getInsights, type AiInsight } from "./aiInsights";
import { getDataRecords } from "./dataRecords";

// ── Types ──

export interface QcRow {
  parameter: string;
  value: string;
  reference: string;
  unit: string;
  status: "Pass" | "Fail" | "Review";
  assayMethod: string;
  assayNumber: string;
  specification: string;
  responsiblePerson: string;
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

// ── Reference QC rows from uploaded XLSX ──

const REFERENCE_QC_ROWS: QcRow[] = [
  { parameter: "Titer", value: "3.2 g/L", reference: "3.0 ± 0.5 g/L", unit: "g/L", status: "Pass", assayMethod: "HPLC (Protein A)", assayNumber: "SOP-AN-001", specification: "In-process control. Slightly above target.", responsiblePerson: "Upstream Scientist" },
  { parameter: "Biological Activity", value: "15,000 IU/mg", reference: "12,000 IU/mg (Ref. Std. #RS-001)", unit: "IU/mg", status: "Pass", assayMethod: "In vitro cAMP Assay", assayNumber: "SOP-AN-010", specification: "Spec: 90-130% of Ref. Std. (125% of target).", responsiblePerson: "Bioassay Lead" },
  { parameter: "HMW Aggregates (Purity)", value: "0.5%", reference: "≤2.0%", unit: "%", status: "Pass", assayMethod: "SEC-HPLC", assayNumber: "SOP-AN-101", specification: "Target: As low as possible. Well within control.", responsiblePerson: "QC Analyst" },
  { parameter: "LMW Fragments (Purity)", value: "1.0%", reference: "≤3.0%", unit: "%", status: "Pass", assayMethod: "CE-SDS (r)", assayNumber: "SOP-AN-102", specification: "Target: As low as possible.", responsiblePerson: "QC Analyst" },
  { parameter: "Charge Variants (Acidic/Main/Basic)", value: "32% / 53% / 15%", reference: "30-35% / 50-55% / 12-18%", unit: "%", status: "Pass", assayMethod: "CEX-HPLC", assayNumber: "SOP-AN-201", specification: "Profile consistent with reference profile.", responsiblePerson: "QC Analyst" },
  { parameter: "Sialic Acid (Glycosylation)", value: "12 mol/mol", reference: "12 mol/mol (Ref. Std.)", unit: "mol/mol", status: "Pass", assayMethod: "HPAEC-PAD", assayNumber: "SOP-AN-301", specification: "Spec: 10-14 mol/mol. Matches reference.", responsiblePerson: "Glyco Specialist" },
  { parameter: "Tetra-sialylated (Glycosylation)", value: "45%", reference: "45% (Ref. Profile)", unit: "%", status: "Pass", assayMethod: "HILIC-UPLC/FLR", assayNumber: "SOP-AN-302", specification: "Spec: 40-50%. Core CQA, matches reference.", responsiblePerson: "Glyco Specialist" },
  { parameter: "Glycation", value: "3%", reference: "≤1.5% (Process Target)", unit: "%", status: "Fail", assayMethod: "LC-MS", assayNumber: "SOP-AN-303", specification: "Spec: ≤5%. Elevated vs. target. Investigate media feed/harvest time.", responsiblePerson: "QC Analyst" },
  { parameter: "HCP (Process Impurities)", value: "50 ppm", reference: "≤100 ppm", unit: "ppm", status: "Pass", assayMethod: "CHO HCP ELISA", assayNumber: "SOP-AN-401", specification: "Target: As low as possible. Within spec.", responsiblePerson: "QC Analyst" },
  { parameter: "Host Cell DNA", value: "5 pg/mg", reference: "≤10 pg/mg", unit: "pg/mg", status: "Pass", assayMethod: "qPCR", assayNumber: "SOP-AN-402", specification: "Target: Not Detected. Within spec.", responsiblePerson: "QC Analyst" },
  { parameter: "Surfactant", value: "1 µg/mg", reference: "≤2 µg/mg", unit: "µg/mg", status: "Pass", assayMethod: "LC-MS", assayNumber: "SOP-AN-403", specification: "Target: Not Detected.", responsiblePerson: "QC Analyst" },
];

// ── In-memory store ──

let _reports: Report[] = [];
let _seeded = false;

function makeVariantQcRows(baseRows: QcRow[], runId: string, variance: number): QcRow[] {
  const alerts = getAlerts().filter((a) => a.linked_run_id === runId);
  const hasIssues = alerts.some((a) => a.severity === "critical");
  return baseRows.map((row) => {
    const shouldFail = hasIssues && Math.random() > 0.7;
    return {
      ...row,
      status: shouldFail ? "Fail" as const : row.status,
    };
  });
}

function seedReports() {
  if (_seeded) return;
  _seeded = true;

  const alerts = getAlerts();
  const insights = getInsights();

  const alertsForRun = (runId: string) =>
    alerts.filter((a) => a.linked_run_id === runId).map((a) => a.alert_id);
  const insightsForRun = (runId: string) =>
    insights.filter((i) => i.linked_run_id === runId).map((i) => i.id);

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
      qc_rows: makeVariantQcRows(REFERENCE_QC_ROWS, run1.run_id, 0),
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
      qc_rows: makeVariantQcRows(REFERENCE_QC_ROWS, run2.run_id, 1),
      alert_ids: alertsForRun(run2.run_id).slice(0, 2),
      insight_ids: insightsForRun(run2.run_id).slice(0, 2),
    });
  }

  if (run3) {
    const qcRows = makeVariantQcRows(REFERENCE_QC_ROWS, run3.run_id, 2);
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
      qc_rows: makeVariantQcRows(REFERENCE_QC_ROWS, run1.run_id, 3),
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

  const qcRows: QcRow[] = REFERENCE_QC_ROWS.map((row) => ({
    ...row,
    status: alerts.some((a) => a.type === "out_of_range" && a.message.toLowerCase().includes(row.parameter.toLowerCase().split(" ")[0]))
      ? "Fail" as const : row.status,
  }));

  // Add HPLC summary if available
  try {
    const hplcRecords = getDataRecords().filter(
      (r) => r.interface_id === "HPLC-01" && r.data_type === "file",
    );
    if (hplcRecords.length > 0 && !qcRows.some((r) => r.parameter === "Titer")) {
      // Already included in reference rows
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
