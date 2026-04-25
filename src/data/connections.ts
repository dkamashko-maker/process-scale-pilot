/**
 * Shared connections graph.
 *
 * Edges between equipment units — describes material flow, sample
 * handoffs, and data lineage. Used by Sensor Map, Material Flow,
 * Workflow Canvas, and tooltips.
 */

export type ConnectionKind = "material" | "sample" | "data";
export type ConnectionStatus = "active" | "idle" | "blocked";

export interface Connection {
  id: string;
  fromEquipmentId: string;
  toEquipmentId: string;
  kind: ConnectionKind;
  status: ConnectionStatus;
  /** Optional label rendered on the edge */
  label?: string;
  /** Batches currently flowing across this edge */
  currentBatchIds: string[];
}

export const CONNECTIONS: Connection[] = [
  // ── Material flow (upstream → downstream) ──
  // Seed → production transfer (carries the seed batch into production)
  { id: "C-UP001-UP002", fromEquipmentId: "UP-001", toEquipmentId: "UP-002", kind: "material", status: "active", label: "Seed inoculum",         currentBatchIds: ["B-250420-SD01"] },
  // Harvest broth: production batch leaves UP-002 toward clarification (DS04 already
  // moved through, PD01 is the in-progress production batch about to harvest)
  { id: "C-UP002-DS101", fromEquipmentId: "UP-002", toEquipmentId: "DS-101", kind: "material", status: "active", label: "Harvest broth",         currentBatchIds: ["B-250423-DS04", "B-250423-PD01"] },
  { id: "C-UP002-DS102", fromEquipmentId: "UP-002", toEquipmentId: "DS-102", kind: "material", status: "idle",   label: "Harvest broth (alt)",   currentBatchIds: [] },
  { id: "C-DS101-DS201", fromEquipmentId: "DS-101", toEquipmentId: "DS-201", kind: "material", status: "active", label: "Clarified pool",        currentBatchIds: ["B-250423-DS04"] },
  { id: "C-DS201-DS202", fromEquipmentId: "DS-201", toEquipmentId: "DS-202", kind: "material", status: "active", label: "Capture eluate",        currentBatchIds: ["B-250423-DS04"] },
  { id: "C-DS202-DS402", fromEquipmentId: "DS-202", toEquipmentId: "DS-402", kind: "material", status: "active", label: "Concentrated DS",       currentBatchIds: ["B-250423-DS04"] },
  { id: "C-DS301-DS302", fromEquipmentId: "DS-301", toEquipmentId: "DS-302", kind: "material", status: "idle",   label: "Washed vials",          currentBatchIds: [] },
  { id: "C-DS302-DS402", fromEquipmentId: "DS-302", toEquipmentId: "DS-402", kind: "material", status: "active", label: "Depyrogenated vials",   currentBatchIds: ["B-250423-DS04"] },
  { id: "C-DS402-DS401", fromEquipmentId: "DS-402", toEquipmentId: "DS-401", kind: "material", status: "blocked",label: "Filled vials → Lyo (FAULT)", currentBatchIds: ["B-250423-DS04"] },
  // DS04 is on hold mid-lyo; tag the downstream lyo→pack edge so the batch is
  // visible on DS-403 even though material has not physically moved yet.
  { id: "C-DS401-DS403", fromEquipmentId: "DS-401", toEquipmentId: "DS-403", kind: "material", status: "idle",   label: "Lyophilized vials → pack", currentBatchIds: ["B-250423-DS04"] },

  // ── Sample handoffs (process → analytical) ──
  { id: "C-UP002-AN109", fromEquipmentId: "UP-002", toEquipmentId: "AN-109", kind: "sample", status: "active", label: "Daily VCD sample",    currentBatchIds: ["B-250423-AR07"] },
  // Cell-bank identity test handoff for the previous (completed) analytical run.
  { id: "C-UP001-AN103", fromEquipmentId: "UP-001", toEquipmentId: "AN-103", kind: "sample", status: "idle",   label: "Identity (qPCR)",     currentBatchIds: ["B-250422-AR06"] },
  { id: "C-DS202-AN101", fromEquipmentId: "DS-202", toEquipmentId: "AN-101", kind: "sample", status: "active", label: "HMW (3b)",            currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN102", fromEquipmentId: "DS-202", toEquipmentId: "AN-102", kind: "sample", status: "active", label: "Charge (4)",          currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN104", fromEquipmentId: "DS-202", toEquipmentId: "AN-104", kind: "sample", status: "active", label: "LMW (3c)",            currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN105", fromEquipmentId: "DS-202", toEquipmentId: "AN-105", kind: "sample", status: "active", label: "HCP (6a)",            currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN106", fromEquipmentId: "DS-202", toEquipmentId: "AN-106", kind: "sample", status: "active", label: "Surfactant (6c)",     currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN107", fromEquipmentId: "DS-202", toEquipmentId: "AN-107", kind: "sample", status: "active", label: "HCD (6b)",            currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN110", fromEquipmentId: "DS-202", toEquipmentId: "AN-110", kind: "sample", status: "active", label: "Tetra-sialylated (5b)", currentBatchIds: ["B-250423-AR07"] },
  { id: "C-DS202-AN111", fromEquipmentId: "DS-202", toEquipmentId: "AN-111", kind: "sample", status: "active", label: "Sialic acid (5a)",    currentBatchIds: ["B-250423-AR07"] },
  // Endotoxin (manual): historically used by the completed AR06 batch.
  { id: "C-DS402-AN108", fromEquipmentId: "DS-402", toEquipmentId: "AN-108", kind: "sample", status: "idle",   label: "Endotoxin (manual)",  currentBatchIds: ["B-250422-AR06"] },

  // ── Data only ──
  { id: "C-AN101-DV", fromEquipmentId: "AN-101", toEquipmentId: "DATAVEST", kind: "data", status: "active", label: "Result file", currentBatchIds: ["B-250423-AR07"] },
  { id: "C-AN102-DV", fromEquipmentId: "AN-102", toEquipmentId: "DATAVEST", kind: "data", status: "active", label: "Result file", currentBatchIds: ["B-250423-AR07"] },
];

export function getConnectionsForEquipment(id: string) {
  return {
    incoming: CONNECTIONS.filter((c) => c.toEquipmentId === id),
    outgoing: CONNECTIONS.filter((c) => c.fromEquipmentId === id),
  };
}
