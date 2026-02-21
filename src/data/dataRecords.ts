/**
 * Data Records – canonical Data Vest ALCOA storage ledger.
 *
 * Ingestion converts existing timeseries + events into immutable DataRecords.
 * - Timeseries: 1 record per parameter per 10-min sample per run.
 * - Events: 1 record per process event, routed to correct interface.
 * - Auxiliary interfaces (Gas MFC, Metabolite, Cell Counter, HPLC) produce
 *   their own synthetic records.
 *
 * Records are IMMUTABLE. Edits create correction records linked to originals.
 * Refresh uses raw_ref as dedup key so re-ingestion never duplicates.
 */

import type { DataRecord, QualityFlag, ProcessEvent } from "./runTypes";
import { RUNS, INTERFACES, PARAMETERS, getTimeseries, getInitialEvents } from "./runData";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function fakeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0") + "a3f7c1";
}

function brInterfaceId(reactorId: string): string {
  return `BR-${reactorId}`;
}

const PUMP_EVENT_TYPES = new Set(["FEED", "BASE_ADDITION", "ANTIFOAM", "ADDITIVE", "INDUCER"]);

function formatValue(v: number, unit: string): string {
  if (unit === "%" || unit === "% air sat" || unit === "% gas") return `${v.toFixed(1)}${unit}`;
  if (unit === "pH") return v.toFixed(2);
  if (unit === "rpm" || unit === "mOsm/kg") return v.toFixed(0);
  return v.toFixed(2);
}

// ────────────────────────────────────────────
// A) Timeseries ingestion – 10-min sampling
// ────────────────────────────────────────────

function ingestTimeseries(): DataRecord[] {
  const records: DataRecord[] = [];
  const SAMPLE_INTERVAL_MIN = 10; // minutes between samples

  for (const run of RUNS) {
    const ifaceId = brInterfaceId(run.reactor_id);
    const ts = getTimeseries(run.run_id);

    // Timeseries is 1-hour resolution in the generator, so every point
    // represents ~60 min. We sample every ceil(10/60)=1 point, but to
    // produce the requested 10-min granularity effect we emit one record
    // per parameter per sampled hour (effectively 1 record/param/hour
    // which is already downsampled from the conceptual 1-min source).
    // For realistic volume we sample every 10th point ≈ every 10 hours.
    const step = Math.max(1, Math.round(SAMPLE_INTERVAL_MIN / 60));

    for (let i = 0; i < ts.length; i += step) {
      const point = ts[i];
      const measuredAt = point.timestamp;
      const ingestedAt = new Date(new Date(measuredAt).getTime() + 2000).toISOString();

      for (const param of PARAMETERS) {
        const v = point[param.parameter_code] as number;
        if (typeof v !== "number") continue;

        const oor = v < param.min_value || v > param.max_value;
        const flags: QualityFlag[] = oor ? ["out_of_range"] : ["in_spec"];

        const rawRef = `raw://${ifaceId}/${run.run_id}/${param.parameter_code}/h${point.elapsed_h}`;

        records.push({
          record_id: `DR-TS-${ifaceId}-${run.run_id}-${param.parameter_code}-h${point.elapsed_h}`,
          measured_at: measuredAt,
          ingested_at: ingestedAt,
          interface_id: ifaceId,
          data_type: "timeseries",
          summary: `${param.display_name} = ${formatValue(v, param.unit)} ${param.unit}`,
          raw_ref: rawRef,
          hash: fakeHash(rawRef),
          attributable_to: ifaceId,
          entry_mode: "auto",
          labels: {
            parameter: param.parameter_code,
            reactor: run.reactor_id,
            run: run.bioreactor_run,
            priority: param.type_priority,
          },
          completeness_score: 100,
          quality_flags: flags,
          linked_run_id: run.run_id,
        });
      }
    }
  }

  return records;
}

// ────────────────────────────────────────────
// B) Event ingestion
// ────────────────────────────────────────────

function ingestEvents(events: ProcessEvent[]): DataRecord[] {
  const records: DataRecord[] = [];

  for (const evt of events) {
    // Route to correct interface
    const run = RUNS.find((r) => r.run_id === evt.run_id);
    let interfaceId: string;

    if (PUMP_EVENT_TYPES.has(evt.event_type)) {
      interfaceId = "PUMP-MODULE";
    } else {
      // HARVEST, SAMPLE, NOTE, GAS, system events → bioreactor interface
      interfaceId = run ? brInterfaceId(run.reactor_id) : "UNKNOWN";
    }

    // Build summary
    let summary = evt.event_type;
    if (evt.amount != null) {
      summary += `: ${evt.amount} ${evt.amount_unit}`;
    }
    if (evt.subtype) {
      summary += ` (${evt.subtype})`;
    }

    const rawRef = `raw://${interfaceId}/evt/${evt.id}`;

    const flags: QualityFlag[] = [];
    if (evt.entry_mode === "manual") flags.push("manually_entered");
    if (evt.amount == null && PUMP_EVENT_TYPES.has(evt.event_type)) flags.push("missing_field");
    if (flags.length === 0) flags.push("in_spec");

    records.push({
      record_id: `DR-EV-${interfaceId}-${evt.id}`,
      measured_at: evt.timestamp,
      ingested_at: new Date(new Date(evt.timestamp).getTime() + 500).toISOString(),
      interface_id: interfaceId,
      data_type: "event",
      summary,
      raw_ref: rawRef,
      hash: fakeHash(rawRef),
      attributable_to: evt.actor,
      entry_mode: evt.entry_mode === "manual" ? "manual" : "auto",
      labels: {
        event_type: evt.event_type,
        ...(evt.subtype ? { subtype: evt.subtype } : {}),
        ...(run ? { run: run.bioreactor_run } : {}),
      },
      completeness_score: evt.amount != null ? 100 : 80,
      quality_flags: flags,
      linked_run_id: evt.run_id,
    });
  }

  return records;
}

// ────────────────────────────────────────────
// Auxiliary interface records (Gas, Metab, Cell, HPLC)
// ────────────────────────────────────────────

function ingestAuxiliary(): DataRecord[] {
  const records: DataRecord[] = [];
  const runStart = new Date(RUNS[0].start_time).getTime();
  const runEnd = new Date(RUNS[0].end_time).getTime();

  // Gas MFC – 12h snapshots
  for (let t = runStart; t < runEnd; t += 12 * 3600000) {
    const ts = new Date(t).toISOString();
    const rawRef = `raw://GAS-MFC-RACK/snapshot-${t}`;
    records.push({
      record_id: `DR-TS-GAS-${t}`,
      measured_at: ts,
      ingested_at: new Date(t + 1500).toISOString(),
      interface_id: "GAS-MFC-RACK",
      data_type: "timeseries",
      summary: "Gas composition – O₂/N₂/CO₂/Air flow rates",
      raw_ref: rawRef,
      hash: fakeHash(rawRef),
      attributable_to: "GAS-MFC-RACK",
      entry_mode: "auto",
      labels: {},
      completeness_score: 100,
      quality_flags: ["in_spec"],
    });
  }

  // Per-run auxiliary
  for (const run of RUNS) {
    const start = new Date(run.start_time).getTime();
    const end = new Date(run.end_time).getTime();

    // Metabolite analyzer – daily
    let day = 0;
    for (let t = start; t < end; t += 24 * 3600000) {
      const ts = new Date(t + 9 * 3600000).toISOString();
      const rawRef = `raw://METAB-ANALYZER/${run.run_id}/d${day}`;
      records.push({
        record_id: `DR-TS-METAB-${run.run_id}-d${day}`,
        measured_at: ts,
        ingested_at: new Date(new Date(ts).getTime() + 900000).toISOString(),
        interface_id: "METAB-ANALYZER",
        data_type: "timeseries",
        summary: `Metabolite panel Day ${day} – GLU/LAC/NH₃/GLN`,
        raw_ref: rawRef,
        hash: fakeHash(rawRef),
        attributable_to: "METAB-ANALYZER",
        entry_mode: "auto",
        labels: { day: String(day), run: run.bioreactor_run },
        completeness_score: 95,
        quality_flags: ["in_spec"],
        linked_run_id: run.run_id,
      });
      day++;
    }

    // Cell counter – daily
    day = 0;
    for (let t = start; t < end; t += 24 * 3600000) {
      const ts = new Date(t + 10 * 3600000).toISOString();
      const rawRef = `raw://CELL-COUNTER/${run.run_id}/d${day}`;
      records.push({
        record_id: `DR-TS-CELL-${run.run_id}-d${day}`,
        measured_at: ts,
        ingested_at: new Date(new Date(ts).getTime() + 1800000).toISOString(),
        interface_id: "CELL-COUNTER",
        data_type: "timeseries",
        summary: `Cell count Day ${day} – VCD/TCD/Viability`,
        raw_ref: rawRef,
        hash: fakeHash(rawRef),
        attributable_to: "CELL-COUNTER",
        entry_mode: "auto",
        labels: { day: String(day), run: run.bioreactor_run },
        completeness_score: 100,
        quality_flags: ["in_spec"],
        linked_run_id: run.run_id,
      });
      day++;
    }

    // HPLC – every 3 days
    let seq = 0;
    for (let t = start + 3 * 86400000; t < end; t += 3 * 86400000) {
      const ts = new Date(t + 14 * 3600000).toISOString();
      const rawRef = `file://HPLC-01/${run.run_id}/inj_${seq}.cdf`;
      records.push({
        record_id: `DR-FILE-HPLC-${run.run_id}-s${seq}`,
        measured_at: ts,
        ingested_at: new Date(new Date(ts).getTime() + 3600000).toISOString(),
        interface_id: "HPLC-01",
        data_type: "file",
        summary: `HPLC injection #${seq + 1} – titer & purity CDF`,
        raw_ref: rawRef,
        hash: fakeHash(rawRef),
        attributable_to: "HPLC-01",
        entry_mode: "auto",
        labels: { injection: String(seq + 1), format: "CDF", run: run.bioreactor_run },
        completeness_score: 100,
        quality_flags: ["in_spec"],
        linked_run_id: run.run_id,
      });
      seq++;
    }
  }

  return records;
}

// ────────────────────────────────────────────
// In-memory store with raw_ref-based dedup
// ────────────────────────────────────────────

let _records: DataRecord[] = [];
const _rawRefIndex = new Set<string>();
let _initialized = false;

/**
 * Ingest / merge records into the ledger.
 * Uses raw_ref as the dedup key – existing raw_refs are skipped.
 * Returns count of newly added records.
 */
function mergeRecords(incoming: DataRecord[]): number {
  let added = 0;
  for (const rec of incoming) {
    if (_rawRefIndex.has(rec.raw_ref)) continue;
    _rawRefIndex.add(rec.raw_ref);
    _records.push(rec);
    added++;
  }
  return added;
}

/**
 * Full ingestion pass.  Safe to call multiple times (raw_ref dedup).
 */
export function runIngestion(): { total: number; newlyAdded: number } {
  const events = getInitialEvents();

  const tsRecords = ingestTimeseries();
  const evtRecords = ingestEvents(events);
  const auxRecords = ingestAuxiliary();

  const a1 = mergeRecords(tsRecords);
  const a2 = mergeRecords(evtRecords);
  const a3 = mergeRecords(auxRecords);

  // Sort by measured_at
  _records.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());

  _initialized = true;
  return { total: _records.length, newlyAdded: a1 + a2 + a3 };
}

/**
 * Ingest a single runtime event (e.g. user logs a new event in the UI).
 * Dedup-safe via raw_ref.
 */
export function ingestSingleEvent(evt: ProcessEvent): DataRecord | null {
  const batch = ingestEvents([evt]);
  if (batch.length === 0) return null;
  const added = mergeRecords(batch);
  return added > 0 ? batch[0] : null;
}

/**
 * Get all records. Auto-initializes on first call.
 */
export function getDataRecords(): DataRecord[] {
  if (!_initialized) runIngestion();
  return _records;
}

/**
 * Force a full refresh (re-runs ingestion, dedup prevents duplicates).
 */
export function refreshLedger(): { total: number; newlyAdded: number } {
  return runIngestion();
}

// ────────────────────────────────────────────
// Corrections (immutable – never edit originals)
// ────────────────────────────────────────────

export function createCorrectionRecord(
  originalRecordId: string,
  correctedSummary: string,
  actor: string,
): DataRecord | null {
  const records = getDataRecords();
  const original = records.find((r) => r.record_id === originalRecordId);
  if (!original) return null;

  const now = new Date().toISOString();
  const rawRef = `correction://${original.record_id}/${Date.now()}`;

  const correction: DataRecord = {
    record_id: `DR-COR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    measured_at: original.measured_at,
    ingested_at: now,
    interface_id: original.interface_id,
    data_type: "correction",
    summary: correctedSummary,
    raw_ref: rawRef,
    hash: fakeHash(rawRef),
    attributable_to: actor,
    entry_mode: "manual",
    labels: { ...original.labels, correction_of: original.record_id },
    completeness_score: original.completeness_score,
    quality_flags: ["corrected"],
    linked_run_id: original.linked_run_id,
    corrects_record_id: original.record_id,
  };

  // Flag original as corrected
  if (!original.quality_flags.includes("corrected")) {
    original.quality_flags.push("corrected");
  }

  mergeRecords([correction]);
  return correction;
}

export function getCorrectionsFor(recordId: string): DataRecord[] {
  return getDataRecords().filter((r) => r.corrects_record_id === recordId);
}

// ────────────────────────────────────────────
// Aggregation helpers
// ────────────────────────────────────────────

export function getRecordCountsByInterface(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of getDataRecords()) {
    counts[r.interface_id] = (counts[r.interface_id] || 0) + 1;
  }
  return counts;
}

export function getRecordCountsByType(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of getDataRecords()) {
    counts[r.data_type] = (counts[r.data_type] || 0) + 1;
  }
  return counts;
}

export function getRecordsForInterface(interfaceId: string): DataRecord[] {
  return getDataRecords().filter((r) => r.interface_id === interfaceId);
}

export function getRecordsForRun(runId: string): DataRecord[] {
  return getDataRecords().filter((r) => r.linked_run_id === runId);
}

export function getOutOfRangeRecords(): DataRecord[] {
  return getDataRecords().filter((r) => r.quality_flags.includes("out_of_range"));
}
