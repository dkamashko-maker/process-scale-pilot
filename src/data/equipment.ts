/**
 * Unified equipment universe for Data Vest.
 *
 * This module is the single source of truth for the equipment fleet used
 * across the Device Dashboard, Bioreactor Monitoring, Data Storage,
 * Metadata Constructor, Reports, Analytics, and the new Equipment
 * Dashboard v2.
 *
 * It intentionally does NOT replace the legacy `INTERFACES` array in
 * `runData.ts` — existing pages keep working unchanged. New surfaces
 * (Equipment Dashboard v2, equipment-aware widgets) should read from
 * here so the vocabulary stays consistent.
 */

export type EquipmentCategory = "upstream" | "downstream" | "analytical";
export type IntegrationMode = "online" | "manual";
export type EquipmentStatus = "active" | "idle" | "error";
export type ConnectionHealth = "connected" | "degraded" | "offline";

export interface Equipment {
  equipmentId: string;
  equipmentName: string;
  equipmentCategory: EquipmentCategory;
  integrationMode: IntegrationMode;
  status: EquipmentStatus;
  connectionHealth: ConnectionHealth;
  /** Active batch id, if any */
  currentBatch: string | null;
  /** Free-form process phase label (e.g. "Production day 7", "Idle") */
  processPhase: string;
  /** Last time the equipment performed a meaningful operation */
  lastOperationAt: string;
  /** Last time Data Vest received any data from it */
  lastDataReceivedAt: string;
  /** Method / program currently loaded (analytical) or N/A */
  methodName: string | null;
  alertCount: number;
  criticalAlert: boolean;
  /** Pointer to the most recent evidence record (data ledger / file ref) */
  latestEvidenceRef: string | null;
}

// ── Seed fleet ──────────────────────────────────────────────────────────

export const EQUIPMENT: Equipment[] = [
  // ── Upstream ──
  {
    equipmentId: "BR-SEED-001",
    equipmentName: "Seed Bioreactor #001",
    equipmentCategory: "upstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "CHO-r-hFSG-456-250308-2",
    processPhase: "Seed expansion (Day 3)",
    lastOperationAt: "2026-02-21T14:45:00",
    lastDataReceivedAt: "2026-02-21T14:59:42",
    methodName: null,
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-TS-BR-SEED-001-latest",
  },
  {
    equipmentId: "BR-PROD-002",
    equipmentName: "Prod Bioreactor #002",
    equipmentCategory: "upstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "CHO-r-hFSG-457-250308-2",
    processPhase: "Production (Day 7)",
    lastOperationAt: "2026-02-21T14:50:00",
    lastDataReceivedAt: "2026-02-21T14:59:41",
    methodName: null,
    alertCount: 1,
    criticalAlert: false,
    latestEvidenceRef: "DR-TS-BR-PROD-002-latest",
  },

  // ── Downstream ──
  {
    equipmentId: "CENT-1",
    equipmentName: "Centrifuge 1",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-20T09:30:00",
    lastDataReceivedAt: "2026-02-21T08:00:00",
    methodName: "Clarification – 4500 g / 15 min",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "CENT-2",
    equipmentName: "Centrifuge 2",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-19T16:10:00",
    lastDataReceivedAt: "2026-02-21T08:00:00",
    methodName: "Clarification – 4500 g / 15 min",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "FPLC-01",
    equipmentName: "FPLC Purification System",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "degraded",
    currentBatch: "CHO-r-hFSG-455-250301-2",
    processPhase: "Capture chromatography",
    lastOperationAt: "2026-02-21T13:15:00",
    lastDataReceivedAt: "2026-02-21T14:55:00",
    methodName: "ProteinA-Capture-v3",
    alertCount: 1,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-FPLC-01-runlog",
  },
  {
    equipmentId: "UF-01",
    equipmentName: "Ultrafiltration System",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-20T18:00:00",
    lastDataReceivedAt: "2026-02-21T08:00:00",
    methodName: "UF/DF – 30 kDa cassette",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "VW-01",
    equipmentName: "Vial Washer",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-19T11:00:00",
    lastDataReceivedAt: "2026-02-19T11:00:00",
    methodName: "WFI rinse cycle",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "DPO-01",
    equipmentName: "Depyrogenation Oven",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-19T13:30:00",
    lastDataReceivedAt: "2026-02-19T13:30:00",
    methodName: "300 °C / 30 min",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "LYO-01",
    equipmentName: "Lyophilizer",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-18T22:00:00",
    lastDataReceivedAt: "2026-02-19T06:00:00",
    methodName: "Lyo cycle – mAb standard",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "FILL-01",
    equipmentName: "Filling Pump",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-19T10:30:00",
    lastDataReceivedAt: "2026-02-19T10:30:00",
    methodName: "1 mL vial fill",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "CAPLBL-01",
    equipmentName: "Capping & Labeling Station",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-02-19T12:00:00",
    lastDataReceivedAt: "2026-02-19T12:00:00",
    methodName: "Standard cap + 2D label",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },

  // ── Analytical (result-oriented / upload-oriented) ──
  {
    equipmentId: "HPLC-SEC",
    equipmentName: "HPLC-SEC",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "QC-2026-021",
    processPhase: "Awaiting results upload",
    lastOperationAt: "2026-02-21T11:30:00",
    lastDataReceivedAt: "2026-02-21T11:32:00",
    methodName: "HMW Aggregates (3b)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-HPLC-SEC-2026-021",
  },
  {
    equipmentId: "HPLC-IEX",
    equipmentName: "HPLC-IEX",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting next injection",
    lastOperationAt: "2026-02-20T16:45:00",
    lastDataReceivedAt: "2026-02-20T16:45:00",
    methodName: "Charge Variants (4)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-HPLC-IEX-2026-019",
  },
  {
    equipmentId: "RP-HPLC",
    equipmentName: "RP-HPLC",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting next injection",
    lastOperationAt: "2026-02-20T10:10:00",
    lastDataReceivedAt: "2026-02-20T10:10:00",
    methodName: "Reverse-phase potency",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-RP-HPLC-2026-018",
  },
  {
    equipmentId: "CE-SDS",
    equipmentName: "CE-SDS",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "QC-2026-021",
    processPhase: "Run in progress",
    lastOperationAt: "2026-02-21T14:20:00",
    lastDataReceivedAt: "2026-02-21T14:25:00",
    methodName: "LMW Fragments (3c)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-CE-SDS-2026-021",
  },
  {
    equipmentId: "ELISA-RDR",
    equipmentName: "ELISA Reader",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting plate",
    lastOperationAt: "2026-02-20T09:00:00",
    lastDataReceivedAt: "2026-02-20T09:00:00",
    methodName: "HCP (6a)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-ELISA-2026-017",
  },
  {
    equipmentId: "UV-VIS",
    equipmentName: "UV-VIS",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting sample",
    lastOperationAt: "2026-02-20T14:30:00",
    lastDataReceivedAt: "2026-02-20T14:30:00",
    methodName: "Surfactant (6c)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-UVVIS-2026-018",
  },
  {
    equipmentId: "QPCR-01",
    equipmentName: "qPCR",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "degraded",
    currentBatch: null,
    processPhase: "Awaiting plate",
    lastOperationAt: "2026-02-19T17:00:00",
    lastDataReceivedAt: "2026-02-19T17:00:00",
    methodName: "Host Cell DNA (6b)",
    alertCount: 1,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-QPCR-2026-016",
  },
  {
    equipmentId: "ENDO-RAPID",
    equipmentName: "Rapid Endotoxin",
    equipmentCategory: "analytical",
    integrationMode: "manual",
    status: "idle",
    connectionHealth: "offline",
    currentBatch: null,
    processPhase: "Manual upload",
    lastOperationAt: "2026-02-19T15:00:00",
    lastDataReceivedAt: "2026-02-19T15:05:00",
    methodName: "Endotoxin LAL",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-ENDO-2026-016",
  },
  {
    equipmentId: "CEDEX-HIRES",
    equipmentName: "Cell Analyzer (Cedex HiRes)",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting sample",
    lastOperationAt: "2026-02-21T10:30:00",
    lastDataReceivedAt: "2026-02-21T10:30:00",
    methodName: "Viable cell density / viability",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-CEDEX-2026-021",
  },
  {
    equipmentId: "HPLC-FLD",
    equipmentName: "HPLC-FLD",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting next injection",
    lastOperationAt: "2026-02-20T18:45:00",
    lastDataReceivedAt: "2026-02-20T18:45:00",
    methodName: "Tetra-sialylated (5b) – HILIC-FLR",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-HPLC-FLD-2026-018",
  },
  {
    equipmentId: "HPAEC-PAD",
    equipmentName: "HPAEC-PAD",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Awaiting next injection",
    lastOperationAt: "2026-02-20T20:00:00",
    lastDataReceivedAt: "2026-02-20T20:00:00",
    methodName: "Sialic Acid (5a)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-HPAEC-2026-018",
  },
];

// ── Method → Equipment mapping (analytical only) ─────────────────────────

export interface MethodMapping {
  methodCode: string;
  methodName: string;
  equipmentId: string;
}

export const METHOD_MAPPINGS: MethodMapping[] = [
  { methodCode: "3b", methodName: "HMW Aggregates",        equipmentId: "HPLC-SEC" },
  { methodCode: "3c", methodName: "LMW Fragments",         equipmentId: "CE-SDS" },
  { methodCode: "4",  methodName: "Charge Variants",       equipmentId: "HPLC-IEX" },
  { methodCode: "5a", methodName: "Sialic Acid",           equipmentId: "HPAEC-PAD" },
  { methodCode: "5b", methodName: "Tetra-sialylated",      equipmentId: "HPLC-FLD" },
  { methodCode: "6a", methodName: "HCP",                   equipmentId: "ELISA-RDR" },
  { methodCode: "6b", methodName: "Host Cell DNA",         equipmentId: "QPCR-01" },
  { methodCode: "6c", methodName: "Surfactant",            equipmentId: "UV-VIS" },
];

// ── Helpers ──────────────────────────────────────────────────────────────

export function getEquipmentById(id: string): Equipment | undefined {
  return EQUIPMENT.find((e) => e.equipmentId === id);
}

export function getEquipmentByCategory(cat: EquipmentCategory): Equipment[] {
  return EQUIPMENT.filter((e) => e.equipmentCategory === cat);
}

export function getEquipmentForMethod(methodCode: string): Equipment | undefined {
  const m = METHOD_MAPPINGS.find((x) => x.methodCode === methodCode);
  return m ? getEquipmentById(m.equipmentId) : undefined;
}

export function getFleetCounts() {
  return {
    total: EQUIPMENT.length,
    upstream: getEquipmentByCategory("upstream").length,
    downstream: getEquipmentByCategory("downstream").length,
    analytical: getEquipmentByCategory("analytical").length,
    active: EQUIPMENT.filter((e) => e.status === "active").length,
    error: EQUIPMENT.filter((e) => e.status === "error").length,
    degraded: EQUIPMENT.filter((e) => e.connectionHealth === "degraded").length,
    offline: EQUIPMENT.filter((e) => e.connectionHealth === "offline").length,
    alerts: EQUIPMENT.reduce((acc, e) => acc + e.alertCount, 0),
  };
}
