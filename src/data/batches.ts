/**
 * Shared batches catalog.
 *
 * Multiple batches can pass through different equipment and intersect
 * on shared units (e.g. both upstream batches eventually reach DS-201).
 * Used by Equipment Dashboard, Reports, AI Insights, and tooltips.
 */

export type BatchStage =
  | "seed"
  | "production"
  | "harvest"
  | "downstream"
  | "fill_finish"
  | "analytical"
  | "released"
  | "on_hold";

export interface Batch {
  id: string;
  product: string;
  stage: BatchStage;
  startedAt: string;
  expectedEndAt: string;
  /** Equipment ids the batch is currently or recently routed through */
  equipmentIds: string[];
  /** Method ids planned/run for this batch (analytical) */
  methodIds: string[];
  status: "in_progress" | "completed" | "on_hold";
  notes?: string;
}

export const BATCHES: Batch[] = [
  {
    id: "B-250420-SD01",
    product: "mAb-07",
    stage: "seed",
    startedAt: "2026-04-18T09:00:00",
    expectedEndAt: "2026-04-25T09:00:00",
    equipmentIds: ["UP-001"],
    methodIds: [],
    status: "in_progress",
  },
  {
    id: "B-250423-PD01",
    product: "mAb-07",
    stage: "production",
    startedAt: "2026-04-09T08:00:00",
    expectedEndAt: "2026-04-24T20:00:00",
    equipmentIds: ["UP-002"],
    methodIds: [],
    status: "in_progress",
    notes: "Harvest window opening on day 14.",
  },
  {
    id: "B-250423-DS04",
    product: "mAb-07",
    stage: "downstream",
    startedAt: "2026-04-23T06:00:00",
    expectedEndAt: "2026-04-24T18:00:00",
    equipmentIds: ["DS-101", "DS-201", "DS-202", "DS-302", "DS-402", "DS-403", "DS-401"],
    methodIds: ["M-PROTA-CAP-V3", "M-UFDF-30K", "M-LYO-MAB"],
    status: "on_hold",
    notes: "Lyo fault — fill/finish on hold pending engineering review.",
  },
  {
    id: "B-250423-AR07",
    product: "mAb-07",
    stage: "analytical",
    startedAt: "2026-04-23T05:00:00",
    expectedEndAt: "2026-04-23T18:00:00",
    equipmentIds: ["AN-101", "AN-102", "AN-104", "AN-105", "AN-106", "AN-107", "AN-109", "AN-110", "AN-111"],
    methodIds: ["3b", "3c", "4", "5a", "5b", "6a", "6b", "6c"],
    status: "in_progress",
  },
  {
    id: "B-250422-AR06",
    product: "mAb-07",
    stage: "analytical",
    startedAt: "2026-04-22T05:00:00",
    expectedEndAt: "2026-04-22T20:00:00",
    equipmentIds: ["AN-103", "AN-108"],
    methodIds: [],
    status: "completed",
  },
];

export function getBatchById(id: string): Batch | undefined {
  return BATCHES.find((b) => b.id === id);
}

export function getBatchesForEquipment(equipmentId: string): Batch[] {
  return BATCHES.filter((b) => b.equipmentIds.includes(equipmentId));
}
