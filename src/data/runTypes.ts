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
  /** For bioreactor interfaces, maps to runs.reactor_id */
  linked_reactor_id?: string;
}
