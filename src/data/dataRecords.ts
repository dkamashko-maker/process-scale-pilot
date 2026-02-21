/**
 * Data Records – the canonical Data Vest ALCOA storage ledger.
 *
 * Records are IMMUTABLE once created.  Corrections create new records
 * with data_type = "correction" and corrects_record_id pointing at the
 * original.  The module exposes a reactive in-memory store so that
 * runtime corrections (from the UI) are immediately visible.
 */

import type { DataRecord, QualityFlag } from "./runTypes";
import { RUNS, INTERFACES, PARAMETERS, getTimeseries, getInitialEvents } from "./runData";

// ── deterministic hash stub ──
function fakeHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0") + "a3f7c1";
}

// ── seed helpers ──
function interfaceForReactor(reactorId: string) {
  return INTERFACES.find((i) => i.linked_reactor_id === reactorId);
}

// ── Generate seed records from existing datasets ──
function generateSeedRecords(): DataRecord[] {
  const records: DataRecord[] = [];

  for (const run of RUNS) {
    const iface = interfaceForReactor(run.reactor_id);
    if (!iface) continue;
    const ts = getTimeseries(run.run_id);

    // Sample every 6 hours of timeseries → one "timeseries batch" record
    for (let h = 0; h < ts.length; h += 6) {
      const point = ts[h];
      const measuredAt = point.timestamp;
      const ingestedAt = new Date(new Date(measuredAt).getTime() + 2000).toISOString(); // +2s ingestion lag

      // Check out-of-range for quality flags
      const flags: QualityFlag[] = [];
      let oor = false;
      for (const p of PARAMETERS) {
        const v = point[p.parameter_code] as number;
        if (typeof v === "number" && (v < p.min_value || v > p.max_value)) {
          oor = true;
          break;
        }
      }
      if (oor) flags.push("out_of_range");
      if (!oor) flags.push("in_spec");

      const temp = (point.TEMP as number)?.toFixed(1) ?? "—";
      const ph = (point.PH as number)?.toFixed(2) ?? "—";
      const doVal = (point.DO as number)?.toFixed(1) ?? "—";

      records.push({
        record_id: `DR-TS-${iface.id}-${run.run_id}-h${h}`,
        measured_at: measuredAt,
        ingested_at: ingestedAt,
        interface_id: iface.id,
        data_type: "timeseries",
        summary: `6h batch @ h${h}: T=${temp}°C pH=${ph} DO=${doVal}%`,
        raw_ref: `raw://${iface.id}/${run.run_id}/ts-${h}`,
        hash: fakeHash(`${iface.id}-${run.run_id}-${h}`),
        attributable_to: iface.id,
        entry_mode: "auto",
        labels: { reactor: run.reactor_id, run: run.bioreactor_run },
        completeness_score: 100,
        quality_flags: flags,
        linked_run_id: run.run_id,
      });
    }
  }

  // Gas MFC – synthetic timeseries records (1 per 12h block across the run window)
  const gasMfc = INTERFACES.find((i) => i.id === "GAS-MFC-RACK");
  if (gasMfc) {
    const start = new Date(RUNS[0].start_time).getTime();
    const end = new Date(RUNS[0].end_time).getTime();
    for (let t = start; t < end; t += 12 * 3600000) {
      const ts = new Date(t).toISOString();
      records.push({
        record_id: `DR-TS-GAS-${t}`,
        measured_at: ts,
        ingested_at: new Date(t + 1500).toISOString(),
        interface_id: "GAS-MFC-RACK",
        data_type: "timeseries",
        summary: "Gas composition snapshot – O₂/N₂/CO₂/Air",
        raw_ref: `raw://GAS-MFC-RACK/snapshot-${t}`,
        hash: fakeHash(`gas-${t}`),
        attributable_to: "GAS-MFC-RACK",
        entry_mode: "auto",
        labels: {},
        completeness_score: 100,
        quality_flags: ["in_spec"],
      });
    }
  }

  // Pump module – one record per event across all runs
  const pumpIf = INTERFACES.find((i) => i.id === "PUMP-MODULE");
  if (pumpIf) {
    const evts = getInitialEvents();
    const pumpTypes = ["FEED", "BASE_ADDITION", "ANTIFOAM"];
    for (const evt of evts) {
      if (!pumpTypes.includes(evt.event_type)) continue;
      records.push({
        record_id: `DR-EV-PUMP-${evt.id}`,
        measured_at: evt.timestamp,
        ingested_at: new Date(new Date(evt.timestamp).getTime() + 500).toISOString(),
        interface_id: "PUMP-MODULE",
        data_type: "event",
        summary: `${evt.event_type}${evt.subtype ? ` / ${evt.subtype}` : ""}${evt.amount != null ? ` — ${evt.amount} ${evt.amount_unit}` : ""}`,
        raw_ref: `raw://PUMP-MODULE/${evt.id}`,
        hash: fakeHash(`pump-${evt.id}`),
        attributable_to: pumpIf.id,
        entry_mode: "auto",
        labels: { event_type: evt.event_type },
        completeness_score: evt.amount != null ? 100 : 80,
        quality_flags: evt.amount != null ? ["in_spec"] : ["missing_field"],
        linked_run_id: evt.run_id,
      });
    }
  }

  // Metabolite analyzer – daily sample records per run
  const metab = INTERFACES.find((i) => i.id === "METAB-ANALYZER");
  if (metab) {
    for (const run of RUNS) {
      const start = new Date(run.start_time).getTime();
      const end = new Date(run.end_time).getTime();
      let day = 0;
      for (let t = start; t < end; t += 24 * 3600000) {
        const ts = new Date(t + 9 * 3600000).toISOString(); // 9am daily sample
        records.push({
          record_id: `DR-TS-METAB-${run.run_id}-d${day}`,
          measured_at: ts,
          ingested_at: new Date(new Date(ts).getTime() + 900000).toISOString(), // 15m lag
          interface_id: "METAB-ANALYZER",
          data_type: "timeseries",
          summary: `Daily metabolite panel – GLU/LAC/NH₃/GLN (Day ${day})`,
          raw_ref: `raw://METAB-ANALYZER/${run.run_id}/d${day}`,
          hash: fakeHash(`metab-${run.run_id}-${day}`),
          attributable_to: "METAB-ANALYZER",
          entry_mode: "auto",
          labels: { day: String(day), run: run.bioreactor_run },
          completeness_score: 95,
          quality_flags: ["in_spec"],
          linked_run_id: run.run_id,
        });
        day++;
      }
    }
  }

  // Cell counter – daily sample per run
  const cellCounter = INTERFACES.find((i) => i.id === "CELL-COUNTER");
  if (cellCounter) {
    for (const run of RUNS) {
      const start = new Date(run.start_time).getTime();
      const end = new Date(run.end_time).getTime();
      let day = 0;
      for (let t = start; t < end; t += 24 * 3600000) {
        const ts = new Date(t + 10 * 3600000).toISOString(); // 10am
        records.push({
          record_id: `DR-TS-CELL-${run.run_id}-d${day}`,
          measured_at: ts,
          ingested_at: new Date(new Date(ts).getTime() + 1800000).toISOString(), // 30m lag
          interface_id: "CELL-COUNTER",
          data_type: "timeseries",
          summary: `Cell count – VCD/TCD/Viability (Day ${day})`,
          raw_ref: `raw://CELL-COUNTER/${run.run_id}/d${day}`,
          hash: fakeHash(`cell-${run.run_id}-${day}`),
          attributable_to: "CELL-COUNTER",
          entry_mode: "auto",
          labels: { day: String(day), run: run.bioreactor_run },
          completeness_score: 100,
          quality_flags: ["in_spec"],
          linked_run_id: run.run_id,
        });
        day++;
      }
    }
  }

  // HPLC – file records (every 3 days per run)
  const hplc = INTERFACES.find((i) => i.id === "HPLC-01");
  if (hplc) {
    for (const run of RUNS) {
      const start = new Date(run.start_time).getTime();
      const end = new Date(run.end_time).getTime();
      let seq = 0;
      for (let t = start + 3 * 86400000; t < end; t += 3 * 86400000) {
        const ts = new Date(t + 14 * 3600000).toISOString(); // 2pm injection
        records.push({
          record_id: `DR-FILE-HPLC-${run.run_id}-s${seq}`,
          measured_at: ts,
          ingested_at: new Date(new Date(ts).getTime() + 3600000).toISOString(), // 1h lag
          interface_id: "HPLC-01",
          data_type: "file",
          summary: `HPLC injection #${seq + 1} – titer & purity CDF`,
          raw_ref: `file://HPLC-01/${run.run_id}/inj_${seq}.cdf`,
          hash: fakeHash(`hplc-${run.run_id}-${seq}`),
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
  }

  // Sort by measured_at
  records.sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
  return records;
}

// ── In-memory store ──

let _records: DataRecord[] | null = null;

export function getDataRecords(): DataRecord[] {
  if (!_records) _records = generateSeedRecords();
  return _records;
}

/**
 * Create a correction record.  The original is never mutated.
 * Returns the new correction record.
 */
export function createCorrectionRecord(
  originalRecordId: string,
  correctedSummary: string,
  actor: string,
): DataRecord | null {
  const records = getDataRecords();
  const original = records.find((r) => r.record_id === originalRecordId);
  if (!original) return null;

  const now = new Date().toISOString();
  const correction: DataRecord = {
    record_id: `DR-COR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    measured_at: original.measured_at,
    ingested_at: now,
    interface_id: original.interface_id,
    data_type: "correction",
    summary: correctedSummary,
    raw_ref: `correction://${original.record_id}`,
    hash: fakeHash(`cor-${original.record_id}-${now}`),
    attributable_to: actor,
    entry_mode: "manual",
    labels: { ...original.labels, correction_of: original.record_id },
    completeness_score: original.completeness_score,
    quality_flags: ["corrected"],
    linked_run_id: original.linked_run_id,
    corrects_record_id: original.record_id,
  };

  // Mark original as corrected (add flag without removing existing)
  if (!original.quality_flags.includes("corrected")) {
    original.quality_flags.push("corrected");
  }

  records.push(correction);
  return correction;
}

/**
 * Get all corrections for a given record.
 */
export function getCorrectionsFor(recordId: string): DataRecord[] {
  return getDataRecords().filter((r) => r.corrects_record_id === recordId);
}

/**
 * Get record counts grouped by interface_id.
 */
export function getRecordCountsByInterface(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of getDataRecords()) {
    counts[r.interface_id] = (counts[r.interface_id] || 0) + 1;
  }
  return counts;
}

/**
 * Get record counts grouped by data_type.
 */
export function getRecordCountsByType(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const r of getDataRecords()) {
    counts[r.data_type] = (counts[r.data_type] || 0) + 1;
  }
  return counts;
}
