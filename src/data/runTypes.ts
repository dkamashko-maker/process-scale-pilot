export type UserRole = "viewer" | "operator" | "manager";

export interface Run {
  run_id: string;
  batch_id: string;
  reactor_id: string;
  bioreactor_run: string;
  operator_id: string;
  cell_line: string;
  target_protein: string;
  process_strategy: string;
  basal_medium: string;
  feed_medium: string;
  start_time: string;
  end_time: string;
  sampling_interval_sec: number;
  timeline_version: string;
  timezone: string;
  seed: number;
}

export interface ParameterDef {
  parameter_code: string;
  display_name: string;
  unit: string;
  min_value: number;
  max_value: number;
  type_priority: string;
  is_critical: boolean;
}

export interface TimeseriesPoint {
  elapsed_h: number;
  timestamp: string;
  [paramCode: string]: number | string;
}

export interface ProcessEvent {
  id: string;
  run_id: string;
  timestamp: string;
  event_type: string;
  subtype: string;
  amount: number | null;
  amount_unit: string;
  actor: string;
  entry_mode: string;
  notes: string;
}

export type InterfaceCategory = "Production" | "Analytical" | "System";
export type InterfaceStatus = "Connected" | "Degraded" | "Offline";
export type InterfaceDataType = "timeseries" | "events" | "files";

export interface InstrumentInterface {
  id: string;
  display_name: string;
  category: InterfaceCategory;
  status: InterfaceStatus;
  last_polled_at: string;
  poll_frequency_sec: number;
  data_types: InterfaceDataType[];
  description: string;
  linked_reactor_id?: string;
}

// ── Data Records (canonical ALCOA storage ledger) ──

export type DataRecordType = "timeseries" | "event" | "file" | "correction";

export type QualityFlag =
  | "in_spec"
  | "out_of_range"
  | "missing_field"
  | "late_ingestion"
  | "manually_entered"
  | "corrected"
  | "flagged_for_review";

export interface DataRecord {
  /** Immutable unique identifier */
  record_id: string;
  /** Timestamp when the data was originally measured */
  measured_at: string;
  /** Timestamp when Data Vest ingested the record */
  ingested_at: string;
  /** Source interface that produced this record */
  interface_id: string;
  /** Record type */
  data_type: DataRecordType;
  /** Human-readable summary of the record content */
  summary: string;
  /** Reference to original payload / file (opaque id) */
  raw_ref: string;
  /** Display-only integrity hash (SHA-256 prefix) */
  hash: string;
  /** Device or actor who produced the data */
  attributable_to: string;
  /** How the data entered the system */
  entry_mode: "auto" | "manual" | "derived";
  /** Arbitrary key-value labels */
  labels: Record<string, string>;
  /** Completeness score 0–100 */
  completeness_score: number;
  /** Quality flags */
  quality_flags: QualityFlag[];
  /** Optional linked run */
  linked_run_id?: string;
  /** For corrections: the record_id this corrects */
  corrects_record_id?: string;
}
