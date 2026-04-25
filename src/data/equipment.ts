/**
 * Unified equipment universe for Data Vest.
 *
 * Single source of truth for the equipment fleet used across the
 * Device Dashboard, Bioreactor Monitoring, Data Storage, Metadata
 * Constructor, Reports, Analytics, and the Equipment Dashboard v2.
 *
 * Existing pages keep working unchanged. New surfaces should read
 * from here so the equipment vocabulary stays consistent.
 *
 * Seeded from the synthetic dataset
 * `datavest_equipment_synthetic_datasets.xlsx`.
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
  /** Optional tiny preview series (upstream cards only) */
  trendPreview?: number[];

  // ── Shared model extensions (additive, optional) ──
  /** Process criticality tier — drives alerting weight & dashboard sort */
  criticality?: "high" | "medium" | "low";
  /** All batches currently or recently associated with this equipment */
  currentBatchIds?: string[];
  /** Method ids that can run on this equipment (analytical) or recipes used */
  relatedMethodIds?: string[];
  /** Sensor ids physically attached to this equipment */
  relatedSensorIds?: string[];
  /** Reusable, category-aware metadata key/value bag (tooltips, workflow nodes) */
  metadata?: Record<string, string | number | boolean>;
  /** Aggregate runtime hours (lifetime) */
  runtime?: { totalHours: number; sinceLastServiceHours: number };
  /** Duration of the current/last process run, in minutes */
  processDuration?: { currentMin: number | null; lastCompletedMin: number | null };
  /** Free-form operator-visible note */
  notes?: string;
}

// ── Seed fleet ──────────────────────────────────────────────────────────

export const EQUIPMENT: Equipment[] = [
  // ── Upstream ──
  {
    equipmentId: "UP-001",
    equipmentName: "Seed Bioreactor (#001)",
    equipmentCategory: "upstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: "B-250420-SD01",
    processPhase: "Idle",
    lastOperationAt: "2026-04-21T18:30:00",
    lastDataReceivedAt: "2026-04-21T18:30:00",
    methodName: null,
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-TS-UP-001-latest",
    trendPreview: [36.9, 37.0, 37.0, 37.1, 37.0, 36.9, 37.0, 37.0],
  },
  {
    equipmentId: "UP-002",
    equipmentName: "Prod Bioreactor (#002)",
    equipmentCategory: "upstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-PD01",
    processPhase: "Harvesting",
    lastOperationAt: "2026-04-23T11:55:00",
    lastDataReceivedAt: "2026-04-23T11:59:00",
    methodName: null,
    alertCount: 2,
    criticalAlert: false,
    latestEvidenceRef: "DR-TS-UP-002-latest",
    trendPreview: [37.0, 37.0, 36.9, 36.7, 36.5, 36.4, 36.3, 36.2],
  },

  // ── Downstream ──
  {
    equipmentId: "DS-101",
    equipmentName: "Centrifuge 1",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-DS04",
    processPhase: "Clarification cycle",
    lastOperationAt: "2026-04-23T11:30:00",
    lastDataReceivedAt: "2026-04-23T11:35:00",
    methodName: "Clarification – 4500 g / 15 min",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-EVT-DS-101-cycle",
  },
  {
    equipmentId: "DS-102",
    equipmentName: "Centrifuge 2",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-04-22T16:10:00",
    lastDataReceivedAt: "2026-04-22T16:10:00",
    methodName: "Clarification – 4500 g / 15 min",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "DS-201",
    equipmentName: "FPLC Purification System",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "degraded",
    currentBatch: "B-250423-DS04",
    processPhase: "Capture chromatography",
    lastOperationAt: "2026-04-23T12:00:00",
    lastDataReceivedAt: "2026-04-23T12:02:00",
    methodName: "ProteinA-Capture-v3",
    alertCount: 1,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-DS-201-runlog",
  },
  {
    equipmentId: "DS-202",
    equipmentName: "Ultrafiltration System",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-DS04",
    processPhase: "UF/DF concentration",
    lastOperationAt: "2026-04-23T10:50:00",
    lastDataReceivedAt: "2026-04-23T11:55:00",
    methodName: "UF/DF – 30 kDa cassette",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-EVT-DS-202-run",
  },
  {
    equipmentId: "DS-301",
    equipmentName: "Vial Washer",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: null,
    processPhase: "Idle",
    lastOperationAt: "2026-04-21T11:00:00",
    lastDataReceivedAt: "2026-04-21T11:00:00",
    methodName: "WFI rinse cycle",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: null,
  },
  {
    equipmentId: "DS-302",
    equipmentName: "Depyrogenation Oven",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-DS04",
    processPhase: "Heat soak (300 °C)",
    lastOperationAt: "2026-04-23T09:15:00",
    lastDataReceivedAt: "2026-04-23T11:50:00",
    methodName: "300 °C / 30 min",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-EVT-DS-302-cycle",
  },
  {
    equipmentId: "DS-401",
    equipmentName: "Lyophilizer",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "error",
    connectionHealth: "degraded",
    currentBatch: "B-250423-DS04",
    processPhase: "Primary drying – fault",
    lastOperationAt: "2026-04-23T07:40:00",
    lastDataReceivedAt: "2026-04-23T07:42:00",
    methodName: "Lyo cycle – mAb standard",
    alertCount: 3,
    criticalAlert: true,
    latestEvidenceRef: "DR-EVT-DS-401-fault",
  },
  {
    equipmentId: "DS-402",
    equipmentName: "Filling Pump",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-DS04",
    processPhase: "Vial fill",
    lastOperationAt: "2026-04-23T11:20:00",
    lastDataReceivedAt: "2026-04-23T11:58:00",
    methodName: "1 mL vial fill",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-EVT-DS-402-cycle",
  },
  {
    equipmentId: "DS-403",
    equipmentName: "Capping & Labeling Station",
    equipmentCategory: "downstream",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-DS04",
    processPhase: "Cap + label",
    lastOperationAt: "2026-04-23T11:25:00",
    lastDataReceivedAt: "2026-04-23T11:55:00",
    methodName: "Standard cap + 2D label",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-EVT-DS-403-cycle",
  },

  // ── Analytical (result-oriented / upload-oriented) ──
  {
    equipmentId: "AN-101",
    equipmentName: "HPLC-SEC",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Result uploaded",
    lastOperationAt: "2026-04-23T10:30:00",
    lastDataReceivedAt: "2026-04-23T10:32:00",
    methodName: "HMW Aggregates (3b)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-101-2026-021",
  },
  {
    equipmentId: "AN-102",
    equipmentName: "HPLC-IEX",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Result uploaded",
    lastOperationAt: "2026-04-23T09:45:00",
    lastDataReceivedAt: "2026-04-23T09:47:00",
    methodName: "Charge Variants (4)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-102-2026-021",
  },
  {
    equipmentId: "AN-103",
    equipmentName: "RP-HPLC",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "idle",
    connectionHealth: "connected",
    currentBatch: "B-250422-AR06",
    processPhase: "Awaiting next injection",
    lastOperationAt: "2026-04-22T18:10:00",
    lastDataReceivedAt: "2026-04-22T18:10:00",
    methodName: "Reverse-phase potency",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-103-2026-018",
  },
  {
    equipmentId: "AN-104",
    equipmentName: "CE-SDS",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Run uploaded",
    lastOperationAt: "2026-04-23T11:00:00",
    lastDataReceivedAt: "2026-04-23T11:05:00",
    methodName: "LMW Fragments (3c)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-104-2026-021",
  },
  {
    equipmentId: "AN-105",
    equipmentName: "ELISA Reader",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Plate read uploaded",
    lastOperationAt: "2026-04-23T08:30:00",
    lastDataReceivedAt: "2026-04-23T08:32:00",
    methodName: "HCP (6a)",
    alertCount: 1,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-105-2026-021",
  },
  {
    equipmentId: "AN-106",
    equipmentName: "UV-VIS",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Result uploaded",
    lastOperationAt: "2026-04-23T09:00:00",
    lastDataReceivedAt: "2026-04-23T09:01:00",
    methodName: "Surfactant (6c)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-106-2026-021",
  },
  {
    equipmentId: "AN-107",
    equipmentName: "qPCR",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Plate result uploaded",
    lastOperationAt: "2026-04-23T07:10:00",
    lastDataReceivedAt: "2026-04-23T07:12:00",
    methodName: "Host Cell DNA (6b)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-107-2026-021",
  },
  {
    equipmentId: "AN-108",
    equipmentName: "Rapid Endotoxin (manual load)",
    equipmentCategory: "analytical",
    integrationMode: "manual",
    status: "idle",
    connectionHealth: "offline",
    currentBatch: "B-250422-AR06",
    processPhase: "Manual upload",
    lastOperationAt: "2026-04-22T15:00:00",
    lastDataReceivedAt: "2026-04-22T15:05:00",
    methodName: "Endotoxin LAL",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-108-2026-016",
  },
  {
    equipmentId: "AN-109",
    equipmentName: "Cell Analyzer (Cedex HiRes)",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Result uploaded",
    lastOperationAt: "2026-04-23T10:30:00",
    lastDataReceivedAt: "2026-04-23T10:31:00",
    methodName: "Viable cell density / viability",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-109-2026-021",
  },
  {
    equipmentId: "AN-110",
    equipmentName: "HPLC-FLD",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Result uploaded",
    lastOperationAt: "2026-04-23T06:45:00",
    lastDataReceivedAt: "2026-04-23T06:47:00",
    methodName: "Tetra-sialylated (5b) – HILIC-FLR",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-110-2026-021",
  },
  {
    equipmentId: "AN-111",
    equipmentName: "HPAEC-PAD",
    equipmentCategory: "analytical",
    integrationMode: "online",
    status: "active",
    connectionHealth: "connected",
    currentBatch: "B-250423-AR07",
    processPhase: "Result uploaded",
    lastOperationAt: "2026-04-23T05:00:00",
    lastDataReceivedAt: "2026-04-23T05:02:00",
    methodName: "Sialic Acid (5a)",
    alertCount: 0,
    criticalAlert: false,
    latestEvidenceRef: "DR-FILE-AN-111-2026-021",
  },
];

// ── Method → Equipment mapping (analytical only) ─────────────────────────

export interface MethodMapping {
  methodCode: string;
  methodName: string;
  equipmentId: string;
}

export const METHOD_MAPPINGS: MethodMapping[] = [
  { methodCode: "3b", methodName: "HMW Aggregates",        equipmentId: "AN-101" },
  { methodCode: "3c", methodName: "LMW Fragments",         equipmentId: "AN-104" },
  { methodCode: "4",  methodName: "Charge Variants",       equipmentId: "AN-102" },
  { methodCode: "5a", methodName: "Sialic Acid",           equipmentId: "AN-111" },
  { methodCode: "5b", methodName: "Tetra-sialylated",      equipmentId: "AN-110" },
  { methodCode: "6a", methodName: "HCP",                   equipmentId: "AN-105" },
  { methodCode: "6b", methodName: "Host Cell DNA",         equipmentId: "AN-107" },
  { methodCode: "6c", methodName: "Surfactant",            equipmentId: "AN-106" },
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

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
      && d.getMonth() === now.getMonth()
      && d.getDate() === now.getDate();
}

/**
 * KPI counts displayed in the Equipment Dashboard v2 header.
 * Note: "analyticalUploadsToday" counts analytical equipment whose
 * `lastDataReceivedAt` falls on today's date.
 */
export function getFleetKpis() {
  const connected = EQUIPMENT.filter((e) => e.connectionHealth === "connected").length;
  const active = EQUIPMENT.filter((e) => e.status === "active").length;
  const idle = EQUIPMENT.filter((e) => e.status === "idle").length;
  const withAlerts = EQUIPMENT.filter((e) => e.alertCount > 0).length;
  const analyticalUploadsToday = EQUIPMENT
    .filter((e) => e.equipmentCategory === "analytical" && isToday(e.lastDataReceivedAt))
    .length;
  return { connected, active, idle, withAlerts, analyticalUploadsToday };
}

/** Synthetic recent alerts (used by the drawer). */
export function getRecentAlertsForEquipment(id: string): Array<{
  id: string; severity: "info" | "warning" | "critical"; message: string; timestamp: string;
}> {
  const eq = getEquipmentById(id);
  if (!eq || eq.alertCount === 0) return [];
  const samples: Record<string, Array<{ severity: "info" | "warning" | "critical"; message: string; offsetMin: number }>> = {
    "UP-002": [
      { severity: "warning",  message: "Dissolved O₂ dipped below 25 % for 8 min",        offsetMin: 38 },
      { severity: "info",     message: "pH drift detected during harvest transition",     offsetMin: 96 },
    ],
    "DS-201": [
      { severity: "warning",  message: "Connection degraded — 2 missed polls",            offsetMin: 14 },
    ],
    "DS-401": [
      { severity: "critical", message: "Vacuum out of range — primary drying paused",     offsetMin: 22 },
      { severity: "warning",  message: "Shelf temperature setpoint deviation",            offsetMin: 41 },
      { severity: "warning",  message: "Connection degraded",                             offsetMin: 60 },
    ],
    "AN-105": [
      { severity: "info",     message: "Plate result auto-flagged for review",            offsetMin: 75 },
    ],
  };
  const list = samples[id] ?? [];
  const base = new Date(eq.lastDataReceivedAt).getTime();
  return list.map((a, i) => ({
    id: `${id}-A${i + 1}`,
    severity: a.severity,
    message: a.message,
    timestamp: new Date(base - a.offsetMin * 60_000).toISOString(),
  }));
}
