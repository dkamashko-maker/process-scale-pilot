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

// ── Shared model augmentation ───────────────────────────────────────────
// Adds criticality, batch/method/sensor relations, metadata, runtime,
// processDuration and notes to each seeded equipment unit. Applied at
// module load so existing imports keep working without code changes.

type EquipmentAugment = Partial<Pick<
  Equipment,
  | "criticality"
  | "currentBatchIds"
  | "relatedMethodIds"
  | "relatedSensorIds"
  | "metadata"
  | "runtime"
  | "processDuration"
  | "notes"
>>;

const EQUIPMENT_AUGMENTS: Record<string, EquipmentAugment> = {
  // ── Upstream ──
  "UP-001": {
    criticality: "high",
    currentBatchIds: ["B-250420-SD01"],
    relatedSensorIds: ["S-UP001-TEMP", "S-UP001-PH", "S-UP001-DO", "S-UP001-AGI"],
    metadata: {
      workingVolumeL: 10,
      vesselType: "Single-use seed bioreactor",
      cellLine: "CHO-K1 mAb-07",
      cultureMode: "Fed-batch",
      controlLoops: "T / pH / DO / agitation",
      qualifiedFor: "Seed train",
    },
    runtime: { totalHours: 8421, sinceLastServiceHours: 312 },
    processDuration: { currentMin: null, lastCompletedMin: 96 * 60 },
    notes: "Idle between seed expansions. Next inoculation scheduled for 2026-04-25.",
  },
  "UP-002": {
    criticality: "high",
    currentBatchIds: ["B-250423-PD01"],
    relatedSensorIds: ["S-UP002-TEMP", "S-UP002-PH", "S-UP002-DO", "S-UP002-AGI", "S-UP002-CO2"],
    metadata: {
      workingVolumeL: 200,
      vesselType: "Stainless production bioreactor",
      cellLine: "CHO-K1 mAb-07",
      cultureMode: "Fed-batch",
      controlLoops: "T / pH / DO / agitation / gas mix",
      qualifiedFor: "GMP production",
    },
    runtime: { totalHours: 14760, sinceLastServiceHours: 188 },
    processDuration: { currentMin: 14 * 24 * 60 + 220, lastCompletedMin: 15 * 24 * 60 },
    notes: "Day 14 — harvest window opening. DO trending downward, expected.",
  },

  // ── Downstream ──
  "DS-101": {
    criticality: "medium",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS101-RPM", "S-DS101-TEMP"],
    metadata: { bowlVolumeL: 1.2, maxRpm: 12000, cipQualified: true },
    runtime: { totalHours: 5210, sinceLastServiceHours: 96 },
    processDuration: { currentMin: 28, lastCompletedMin: 35 },
    notes: "Clarification cycle in progress.",
  },
  "DS-102": {
    criticality: "medium",
    currentBatchIds: [],
    relatedSensorIds: ["S-DS102-RPM", "S-DS102-TEMP"],
    metadata: { bowlVolumeL: 1.2, maxRpm: 12000, cipQualified: true },
    runtime: { totalHours: 4980, sinceLastServiceHours: 410 },
    processDuration: { currentMin: null, lastCompletedMin: 32 },
    notes: "Standby. Next scheduled cycle on B-250424-DS05.",
  },
  "DS-201": {
    criticality: "high",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS201-UV280", "S-DS201-COND", "S-DS201-PRES"],
    relatedMethodIds: ["M-PROTA-CAP-V3"],
    metadata: { columnVolumeMl: 250, resin: "Protein A MabSelect SuRe", maxPressureBar: 5 },
    runtime: { totalHours: 7340, sinceLastServiceHours: 145 },
    processDuration: { currentMin: 52, lastCompletedMin: 78 },
    notes: "Capture chromatography — connection degraded, polling continues.",
  },
  "DS-202": {
    criticality: "medium",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS202-TMP", "S-DS202-FLOW"],
    metadata: { cassetteKDa: 30, membraneArea_m2: 0.5 },
    runtime: { totalHours: 6120, sinceLastServiceHours: 220 },
    processDuration: { currentMin: 110, lastCompletedMin: 145 },
    notes: "UF/DF concentration ongoing.",
  },
  "DS-301": {
    criticality: "low",
    currentBatchIds: [],
    relatedSensorIds: ["S-DS301-WFI"],
    metadata: { cycleType: "WFI rinse", maxVialsPerHour: 6000 },
    runtime: { totalHours: 3210, sinceLastServiceHours: 70 },
    processDuration: { currentMin: null, lastCompletedMin: 22 },
  },
  "DS-302": {
    criticality: "medium",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS302-TEMP"],
    metadata: { setpointC: 300, soakMin: 30 },
    runtime: { totalHours: 4015, sinceLastServiceHours: 60 },
    processDuration: { currentMin: 165, lastCompletedMin: 240 },
  },
  "DS-401": {
    criticality: "high",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS401-VAC", "S-DS401-SHELF", "S-DS401-COND"],
    metadata: { shelves: 5, recipe: "Lyo cycle – mAb standard", chamberVolumeL: 220 },
    runtime: { totalHours: 8910, sinceLastServiceHours: 540 },
    processDuration: { currentMin: 240, lastCompletedMin: 30 * 60 },
    notes: "FAULT — vacuum out of range during primary drying. Awaiting engineering review.",
  },
  "DS-402": {
    criticality: "medium",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS402-FLOW", "S-DS402-WEIGHT"],
    metadata: { vialFormat: "1 mL", fillAccuracyPct: 0.5 },
    runtime: { totalHours: 5500, sinceLastServiceHours: 80 },
    processDuration: { currentMin: 38, lastCompletedMin: 62 },
  },
  "DS-403": {
    criticality: "low",
    currentBatchIds: ["B-250423-DS04"],
    relatedSensorIds: ["S-DS403-VISION"],
    metadata: { labelFormat: "2D DataMatrix", capType: "20mm flip-off" },
    runtime: { totalHours: 4760, sinceLastServiceHours: 120 },
    processDuration: { currentMin: 33, lastCompletedMin: 60 },
  },

  // ── Analytical ──
  "AN-101": {
    criticality: "high",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["3b"],
    relatedSensorIds: ["S-AN101-UV", "S-AN101-PRES"],
    metadata: { column: "TSKgel SuperSW3000", injectionUl: 20, runtimeMin: 25 },
    runtime: { totalHours: 9120, sinceLastServiceHours: 210 },
    processDuration: { currentMin: null, lastCompletedMin: 25 },
  },
  "AN-102": {
    criticality: "high",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["4"],
    relatedSensorIds: ["S-AN102-UV", "S-AN102-COND"],
    metadata: { column: "ProPac WCX-10", injectionUl: 25, runtimeMin: 35 },
    runtime: { totalHours: 8650, sinceLastServiceHours: 180 },
    processDuration: { currentMin: null, lastCompletedMin: 35 },
  },
  "AN-103": {
    criticality: "medium",
    currentBatchIds: ["B-250422-AR06"],
    relatedSensorIds: ["S-AN103-UV"],
    metadata: { column: "C18", injectionUl: 10, runtimeMin: 20 },
    runtime: { totalHours: 4310, sinceLastServiceHours: 95 },
    processDuration: { currentMin: null, lastCompletedMin: 20 },
  },
  "AN-104": {
    criticality: "high",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["3c"],
    metadata: { gelType: "CE-SDS reduced", runtimeMin: 30 },
    runtime: { totalHours: 6020, sinceLastServiceHours: 140 },
    processDuration: { currentMin: null, lastCompletedMin: 30 },
  },
  "AN-105": {
    criticality: "high",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["6a"],
    metadata: { plateFormat: "96-well", absorbanceNm: 450 },
    runtime: { totalHours: 7200, sinceLastServiceHours: 60 },
    processDuration: { currentMin: null, lastCompletedMin: 90 },
    notes: "Plate result auto-flagged for review.",
  },
  "AN-106": {
    criticality: "low",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["6c"],
    metadata: { wavelengthRangeNm: "190–900" },
    runtime: { totalHours: 3120, sinceLastServiceHours: 40 },
    processDuration: { currentMin: null, lastCompletedMin: 5 },
  },
  "AN-107": {
    criticality: "high",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["6b"],
    metadata: { plateFormat: "384-well", chemistry: "TaqMan" },
    runtime: { totalHours: 5410, sinceLastServiceHours: 88 },
    processDuration: { currentMin: null, lastCompletedMin: 110 },
  },
  "AN-108": {
    criticality: "medium",
    currentBatchIds: ["B-250422-AR06"],
    metadata: { method: "LAL kinetic chromogenic", entryMode: "manual" },
    runtime: { totalHours: 1800, sinceLastServiceHours: 20 },
    processDuration: { currentMin: null, lastCompletedMin: 60 },
  },
  "AN-109": {
    criticality: "medium",
    currentBatchIds: ["B-250423-AR07"],
    metadata: { samplingMode: "off-line", measurand: "VCD / viability" },
    runtime: { totalHours: 4990, sinceLastServiceHours: 70 },
    processDuration: { currentMin: null, lastCompletedMin: 4 },
  },
  "AN-110": {
    criticality: "medium",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["5b"],
    metadata: { detector: "FLR", column: "HILIC" },
    runtime: { totalHours: 3850, sinceLastServiceHours: 110 },
    processDuration: { currentMin: null, lastCompletedMin: 45 },
  },
  "AN-111": {
    criticality: "medium",
    currentBatchIds: ["B-250423-AR07"],
    relatedMethodIds: ["5a"],
    metadata: { detector: "PAD", column: "CarboPac PA20" },
    runtime: { totalHours: 4200, sinceLastServiceHours: 130 },
    processDuration: { currentMin: null, lastCompletedMin: 40 },
  },
};

for (const eq of EQUIPMENT) {
  const aug = EQUIPMENT_AUGMENTS[eq.equipmentId];
  if (aug) Object.assign(eq, aug);
  // Ensure currentBatchIds is always present and aligned with currentBatch
  if (!eq.currentBatchIds) {
    eq.currentBatchIds = eq.currentBatch ? [eq.currentBatch] : [];
  }
}

