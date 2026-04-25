/**
 * Shared workflow node catalog used by the Workflow Canvas and the
 * Metadata Configurator.
 *
 * Each node represents a configurable step bound to a real piece of
 * equipment, a method, or a data operation. Pages can build their
 * own canvases on top of this catalog so the vocabulary stays the
 * same across the prototype.
 */

export type WorkflowNodeKind =
  | "equipment"
  | "method"
  | "sensor"
  | "data_op"
  | "decision";

export interface WorkflowNodeTemplate {
  id: string;
  kind: WorkflowNodeKind;
  label: string;
  /** Optional reference to the canonical entity */
  refId?: string;
  /** Inputs/outputs accepted by this node template */
  inputs: string[];
  outputs: string[];
  /** Default metadata fields exposed in the inspector */
  defaultMetadataKeys: string[];
}

export const WORKFLOW_NODE_TEMPLATES: WorkflowNodeTemplate[] = [
  // ── Equipment nodes ──
  { id: "WN-UP001", kind: "equipment", label: "Seed Bioreactor (#001)", refId: "UP-001",
    inputs: ["medium"], outputs: ["seed_culture"],
    defaultMetadataKeys: ["workingVolumeL", "cellLine", "cultureMode", "controlLoops"] },
  { id: "WN-UP002", kind: "equipment", label: "Prod Bioreactor (#002)", refId: "UP-002",
    inputs: ["seed_culture", "feed"], outputs: ["harvest_broth"],
    defaultMetadataKeys: ["workingVolumeL", "cellLine", "cultureMode", "controlLoops"] },
  { id: "WN-DS101", kind: "equipment", label: "Centrifuge 1", refId: "DS-101",
    inputs: ["harvest_broth"], outputs: ["clarified_pool"],
    defaultMetadataKeys: ["bowlVolumeL", "maxRpm"] },
  { id: "WN-DS201", kind: "equipment", label: "FPLC Purification", refId: "DS-201",
    inputs: ["clarified_pool"], outputs: ["capture_eluate"],
    defaultMetadataKeys: ["columnVolumeMl", "resin"] },
  { id: "WN-DS202", kind: "equipment", label: "Ultrafiltration", refId: "DS-202",
    inputs: ["capture_eluate"], outputs: ["concentrated_ds"],
    defaultMetadataKeys: ["cassetteKDa", "membraneArea_m2"] },
  { id: "WN-DS401", kind: "equipment", label: "Lyophilizer", refId: "DS-401",
    inputs: ["filled_vials"], outputs: ["lyo_vials"],
    defaultMetadataKeys: ["recipe", "shelves"] },
  { id: "WN-DS402", kind: "equipment", label: "Filling Pump", refId: "DS-402",
    inputs: ["concentrated_ds", "depyro_vials"], outputs: ["filled_vials"],
    defaultMetadataKeys: ["vialFormat", "fillAccuracyPct"] },

  // ── Method nodes ──
  { id: "WN-M-3B", kind: "method", label: "HMW Aggregates (3b)", refId: "3b",
    inputs: ["sample"], outputs: ["result"],
    defaultMetadataKeys: ["column", "injectionUl", "runtimeMin"] },
  { id: "WN-M-4",  kind: "method", label: "Charge Variants (4)", refId: "4",
    inputs: ["sample"], outputs: ["result"],
    defaultMetadataKeys: ["column", "injectionUl", "runtimeMin"] },
  { id: "WN-M-6A", kind: "method", label: "HCP (6a)", refId: "6a",
    inputs: ["sample"], outputs: ["result"],
    defaultMetadataKeys: ["plateFormat", "absorbanceNm"] },

  // ── Data operations ──
  { id: "WN-DOP-INGEST",  kind: "data_op", label: "Ingest to Ledger",
    inputs: ["result", "timeseries", "event"], outputs: ["data_record"],
    defaultMetadataKeys: ["templateId", "completenessThreshold"] },
  { id: "WN-DOP-ALERT",   kind: "data_op", label: "Alert Rule",
    inputs: ["data_record"], outputs: ["alert"],
    defaultMetadataKeys: ["ruleType", "severity"] },
  { id: "WN-DOP-REPORT",  kind: "data_op", label: "Report Section",
    inputs: ["data_record", "alert"], outputs: ["report_block"],
    defaultMetadataKeys: ["reportSection"] },

  // ── Decision ──
  { id: "WN-DEC-SPEC",  kind: "decision", label: "In-spec?",
    inputs: ["result"], outputs: ["pass", "fail"],
    defaultMetadataKeys: ["acceptanceMin", "acceptanceMax"] },
];

export function getWorkflowTemplateById(id: string) {
  return WORKFLOW_NODE_TEMPLATES.find((n) => n.id === id);
}
