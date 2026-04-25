/**
 * Shared analytical & process methods catalog.
 *
 * Single source of truth for method names, codes, and the equipment they
 * normally execute on. Used by Equipment Dashboard, Reports, Analytics,
 * Metadata Configurator, Workflow Canvas, and AI Insights so all
 * surfaces speak the same vocabulary.
 */

export type MethodCategory = "analytical" | "process";

export interface MethodDef {
  id: string;
  code: string;
  name: string;
  category: MethodCategory;
  /** Equipment ids that can run this method */
  compatibleEquipmentIds: string[];
  /** Default equipment id (primary) */
  primaryEquipmentId?: string;
  unit?: string;
  /** Acceptance window for the result (display-only) */
  acceptance?: { min?: number; max?: number; target?: number };
  notes?: string;
}

export const METHODS: MethodDef[] = [
  // ── Analytical ──
  {
    id: "3b", code: "3b", name: "HMW Aggregates", category: "analytical",
    compatibleEquipmentIds: ["AN-101"], primaryEquipmentId: "AN-101",
    unit: "%", acceptance: { max: 2.0 },
  },
  {
    id: "3c", code: "3c", name: "LMW Fragments", category: "analytical",
    compatibleEquipmentIds: ["AN-104"], primaryEquipmentId: "AN-104",
    unit: "%", acceptance: { max: 3.0 },
  },
  {
    id: "4", code: "4", name: "Charge Variants", category: "analytical",
    compatibleEquipmentIds: ["AN-102"], primaryEquipmentId: "AN-102",
    unit: "% main peak", acceptance: { min: 60 },
  },
  {
    id: "5a", code: "5a", name: "Sialic Acid", category: "analytical",
    compatibleEquipmentIds: ["AN-111"], primaryEquipmentId: "AN-111",
    unit: "mol/mol", acceptance: { min: 1.5 },
  },
  {
    id: "5b", code: "5b", name: "Tetra-sialylated", category: "analytical",
    compatibleEquipmentIds: ["AN-110"], primaryEquipmentId: "AN-110",
    unit: "%", acceptance: { min: 8 },
  },
  {
    id: "6a", code: "6a", name: "HCP", category: "analytical",
    compatibleEquipmentIds: ["AN-105"], primaryEquipmentId: "AN-105",
    unit: "ppm", acceptance: { max: 100 },
  },
  {
    id: "6b", code: "6b", name: "Host Cell DNA", category: "analytical",
    compatibleEquipmentIds: ["AN-107"], primaryEquipmentId: "AN-107",
    unit: "pg/mg", acceptance: { max: 10 },
  },
  {
    id: "6c", code: "6c", name: "Surfactant", category: "analytical",
    compatibleEquipmentIds: ["AN-106"], primaryEquipmentId: "AN-106",
    unit: "mg/mL", acceptance: { min: 0.2, max: 0.6 },
  },

  // ── Process / recipe methods ──
  {
    id: "M-PROTA-CAP-V3", code: "ProteinA-Capture-v3", name: "Protein A Capture v3",
    category: "process",
    compatibleEquipmentIds: ["DS-201"], primaryEquipmentId: "DS-201",
    notes: "Capture chromatography on MabSelect SuRe.",
  },
  {
    id: "M-UFDF-30K", code: "UFDF-30k", name: "UF/DF — 30 kDa cassette",
    category: "process",
    compatibleEquipmentIds: ["DS-202"], primaryEquipmentId: "DS-202",
  },
  {
    id: "M-LYO-MAB", code: "Lyo-mAb-Std", name: "Lyo cycle — mAb standard",
    category: "process",
    compatibleEquipmentIds: ["DS-401"], primaryEquipmentId: "DS-401",
  },
];

export function getMethodById(id: string): MethodDef | undefined {
  return METHODS.find((m) => m.id === id || m.code === id);
}
