/**
 * Simulated HPLC-01 API polling connector.
 *
 * Every POLL_INTERVAL_MS it checks for recent file records.
 * If none exist within the window, it generates a PDF + CSV pair.
 * An alert rule fires if a PDF exists without its companion CSV
 * within COMPANION_TIMEOUT_MS.
 */

import type { DataRecord, QualityFlag } from "./runTypes";
import { RUNS } from "./runData";
import { getDataRecords } from "./dataRecords";

// ── Config ──
const POLL_INTERVAL_MS = 30_000; // 30 sec demo cadence
const COMPANION_TIMEOUT_MS = 2 * 60_000; // 2 min
const INTERFACE_ID = "HPLC-01";

// ── State ──
let _intervalId: ReturnType<typeof setInterval> | null = null;
let _seq = 1000; // start high to avoid collisions with seed data
const _ledger: DataRecord[] = []; // connector-local append-only
const _rawRefIndex = new Set<string>();

export type HplcAlert = {
  id: string;
  timestamp: string;
  message: string;
  pdfRecordId: string;
  resolved: boolean;
};

const _alerts: HplcAlert[] = [];

// ── Listeners ──
type Listener = () => void;
const _listeners = new Set<Listener>();
export function onHplcUpdate(fn: Listener) {
  _listeners.add(fn);
  return () => { _listeners.delete(fn); };
}
function _notify() { _listeners.forEach((fn) => fn()); }

// ── Helpers ──
function fakeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0") + "b4e2d9";
}

function pickRun() {
  // Most recent run by start_time
  return [...RUNS].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  )[0];
}

function makeRecord(
  type: "pdf" | "csv",
  seq: number,
  run: (typeof RUNS)[0],
  measuredAt: string,
): DataRecord {
  const ext = type === "pdf" ? "pdf" : "csv";
  const label = type === "pdf" ? "Report PDF" : "Summary CSV";
  const rawRef = `file://HPLC-01/poll/${run.run_id}/${ext}_${seq}`;
  const now = new Date();

  return {
    record_id: `DR-FILE-HPLC-POLL-${ext.toUpperCase()}-${seq}`,
    measured_at: measuredAt,
    ingested_at: now.toISOString(),
    interface_id: INTERFACE_ID,
    data_type: "file",
    summary: `HPLC ${label} – Run ${run.bioreactor_run}`,
    raw_ref: rawRef,
    hash: fakeHash(rawRef),
    attributable_to: INTERFACE_ID,
    entry_mode: "auto",
    labels: {
      format: ext.toUpperCase(),
      run: run.bioreactor_run,
      poll_seq: String(seq),
    },
    completeness_score: 100,
    quality_flags: ["in_spec"] as QualityFlag[],
    linked_run_id: run.run_id,
  };
}

// ── Alert rule ──
function checkCompanionRule() {
  const now = Date.now();
  // Find PDFs from _ledger that have no matching CSV within timeout
  const pdfs = _ledger.filter(
    (r) => r.labels.format === "PDF" && r.labels.poll_seq,
  );

  for (const pdf of pdfs) {
    const seq = pdf.labels.poll_seq;
    const existingAlert = _alerts.find((a) => a.pdfRecordId === pdf.record_id);
    if (existingAlert) continue; // already alerted

    const hasCsv = _ledger.some(
      (r) => r.labels.format === "CSV" && r.labels.poll_seq === seq,
    );
    if (hasCsv) continue;

    const pdfAge = now - new Date(pdf.ingested_at).getTime();
    if (pdfAge >= COMPANION_TIMEOUT_MS) {
      _alerts.push({
        id: `HPLC-ALERT-${seq}`,
        timestamp: new Date().toISOString(),
        message: `Missing companion summary CSV for HPLC Report PDF (seq ${seq})`,
        pdfRecordId: pdf.record_id,
        resolved: false,
      });
    }
  }
}

// ── Poll tick ──
function tick() {
  const run = pickRun();
  if (!run) return;

  const now = new Date();
  const measuredAt = now.toISOString();

  // Check if a recent file was generated within the last poll interval
  const recentCutoff = now.getTime() - POLL_INTERVAL_MS;
  const hasRecent = _ledger.some(
    (r) => new Date(r.ingested_at).getTime() > recentCutoff,
  );

  if (!hasRecent) {
    const seq = _seq++;

    // Generate PDF immediately
    const pdf = makeRecord("pdf", seq, run, measuredAt);
    if (!_rawRefIndex.has(pdf.raw_ref)) {
      _rawRefIndex.add(pdf.raw_ref);
      _ledger.push(pdf);
    }

    // CSV arrives 0–90 sec later (randomized).
    // If > 120 sec the alert rule fires.
    const csvDelay = Math.random() < 0.8
      ? Math.random() * 60_000          // 80 %: 0–60 s (arrives in time)
      : 130_000 + Math.random() * 30_000; // 20 %: 130–160 s (triggers alert)

    setTimeout(() => {
      const csv = makeRecord("csv", seq, run, measuredAt);
      if (!_rawRefIndex.has(csv.raw_ref)) {
        _rawRefIndex.add(csv.raw_ref);
        _ledger.push(csv);

        // Resolve alert if one was raised
        const alert = _alerts.find(
          (a) => a.pdfRecordId === pdf.record_id && !a.resolved,
        );
        if (alert) alert.resolved = true;
      }
      _notify();
    }, csvDelay);
  }

  checkCompanionRule();
  _notify();
}

// ── Public API ──

/** Start the polling loop. Safe to call multiple times. */
export function startHplcPolling(): void {
  if (_intervalId != null) return;
  tick(); // first tick immediately
  _intervalId = setInterval(tick, POLL_INTERVAL_MS);
}

/** Stop polling. */
export function stopHplcPolling(): void {
  if (_intervalId != null) {
    clearInterval(_intervalId);
    _intervalId = null;
  }
}

/** Records generated by the connector (append-only). */
export function getHplcPolledRecords(): DataRecord[] {
  return _ledger;
}

/** All HPLC alerts (includes resolved). */
export function getHplcAlerts(): HplcAlert[] {
  return _alerts;
}

/** Active (unresolved) alerts only. */
export function getActiveHplcAlerts(): HplcAlert[] {
  return _alerts.filter((a) => !a.resolved);
}

/** Is polling currently running? */
export function isHplcPolling(): boolean {
  return _intervalId != null;
}
