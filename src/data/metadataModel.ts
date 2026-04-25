/**
 * Shared metadata model.
 *
 * Defines reusable metadata field definitions and a category-aware
 * rule of which fields apply to which equipment family. Used by:
 *   - Equipment Dashboard hover tooltips
 *   - Workflow Canvas node inspectors
 *   - Metadata Configurator
 *   - Reports (metadata snapshots)
 *
 * Rules of thumb:
 *   - Bioreactors get the richest metadata (process + control).
 *   - Non-bioreactor operational equipment gets a reduced operational set.
 *   - Analytical equipment gets a result-centric set.
 */

import { EQUIPMENT, type EquipmentCategory } from "./equipment";

export type MetadataFieldType = "string" | "number" | "boolean" | "enum";

export interface MetadataFieldDef {
  key: string;
  label: string;
  type: MetadataFieldType;
  unit?: string;
  /** Enum options when type === 'enum' */
  options?: string[];
  required?: boolean;
  /** Short helper text shown in tooltips and inspectors */
  help?: string;
}

export const METADATA_FIELDS: MetadataFieldDef[] = [
  // Process / bioreactor
  { key: "workingVolumeL",  label: "Working volume",   type: "number", unit: "L", required: true },
  { key: "vesselType",      label: "Vessel type",      type: "string", required: true },
  { key: "cellLine",        label: "Cell line",        type: "string", required: true },
  { key: "cultureMode",     label: "Culture mode",     type: "enum", options: ["Batch", "Fed-batch", "Perfusion"], required: true },
  { key: "controlLoops",    label: "Control loops",    type: "string" },
  { key: "qualifiedFor",    label: "Qualified for",    type: "string" },

  // Operational (non-bioreactor)
  { key: "bowlVolumeL",     label: "Bowl volume",      type: "number", unit: "L" },
  { key: "maxRpm",          label: "Max RPM",          type: "number", unit: "rpm" },
  { key: "cipQualified",    label: "CIP qualified",    type: "boolean" },
  { key: "cassetteKDa",     label: "Cassette MWCO",    type: "number", unit: "kDa" },
  { key: "membraneArea_m2", label: "Membrane area",    type: "number", unit: "m²" },
  { key: "columnVolumeMl",  label: "Column volume",    type: "number", unit: "mL" },
  { key: "resin",           label: "Resin",            type: "string" },
  { key: "maxPressureBar",  label: "Max pressure",     type: "number", unit: "bar" },
  { key: "recipe",          label: "Recipe",           type: "string" },
  { key: "shelves",         label: "Shelves",          type: "number" },
  { key: "vialFormat",      label: "Vial format",      type: "string" },
  { key: "fillAccuracyPct", label: "Fill accuracy",    type: "number", unit: "%" },
  { key: "labelFormat",     label: "Label format",     type: "string" },
  { key: "capType",         label: "Cap type",         type: "string" },
  { key: "setpointC",       label: "Setpoint",         type: "number", unit: "°C" },
  { key: "soakMin",         label: "Soak time",        type: "number", unit: "min" },

  // Analytical / result-centric
  { key: "column",          label: "Column",           type: "string" },
  { key: "injectionUl",     label: "Injection volume", type: "number", unit: "µL" },
  { key: "runtimeMin",      label: "Method runtime",   type: "number", unit: "min" },
  { key: "plateFormat",     label: "Plate format",     type: "string" },
  { key: "absorbanceNm",    label: "Absorbance",       type: "number", unit: "nm" },
  { key: "wavelengthRangeNm", label: "λ range",        type: "string" },
  { key: "chemistry",       label: "Chemistry",        type: "string" },
  { key: "detector",        label: "Detector",         type: "string" },
  { key: "samplingMode",    label: "Sampling mode",    type: "enum", options: ["on-line", "at-line", "off-line"] },
  { key: "measurand",       label: "Measurand",        type: "string" },
  { key: "method",          label: "Method",           type: "string" },
  { key: "entryMode",       label: "Entry mode",       type: "enum", options: ["auto", "manual"] },
  { key: "gelType",         label: "Gel type",         type: "string" },
];

/** Category-aware metadata rules — keys to expose per equipment family. */
export const METADATA_RULES: Record<
  "bioreactor" | "operational" | "analytical",
  string[]
> = {
  bioreactor: [
    "workingVolumeL", "vesselType", "cellLine", "cultureMode",
    "controlLoops", "qualifiedFor",
  ],
  operational: [
    "bowlVolumeL", "maxRpm", "cipQualified",
    "cassetteKDa", "membraneArea_m2",
    "columnVolumeMl", "resin", "maxPressureBar",
    "recipe", "shelves",
    "vialFormat", "fillAccuracyPct",
    "labelFormat", "capType",
    "setpointC", "soakMin",
  ],
  analytical: [
    "column", "injectionUl", "runtimeMin",
    "plateFormat", "absorbanceNm", "wavelengthRangeNm",
    "chemistry", "detector", "samplingMode", "measurand",
    "method", "entryMode", "gelType",
  ],
};

/** Picks the rule set a given equipment unit should follow. */
export function getMetadataRuleFor(equipmentId: string): string[] {
  const eq = EQUIPMENT.find((e) => e.equipmentId === equipmentId);
  if (!eq) return [];
  if (eq.equipmentCategory === "analytical") return METADATA_RULES.analytical;
  if (eq.equipmentCategory === "upstream")   return METADATA_RULES.bioreactor;
  return METADATA_RULES.operational;
}

/** Returns the metadata field definitions for an equipment unit. */
export function getMetadataFieldsFor(equipmentId: string): MetadataFieldDef[] {
  const keys = getMetadataRuleFor(equipmentId);
  return keys
    .map((k) => METADATA_FIELDS.find((f) => f.key === k))
    .filter((f): f is MetadataFieldDef => Boolean(f));
}

/** Convenience: build a tooltip-ready list of {label, value, unit?}. */
export function getMetadataDisplayFor(equipmentId: string) {
  const eq = EQUIPMENT.find((e) => e.equipmentId === equipmentId);
  if (!eq || !eq.metadata) return [];
  const fields = getMetadataFieldsFor(equipmentId);
  return fields
    .map((f) => {
      const v = eq.metadata?.[f.key];
      if (v === undefined || v === null || v === "") return null;
      return { key: f.key, label: f.label, value: v, unit: f.unit };
    })
    .filter((x): x is { key: string; label: string; value: string | number | boolean; unit?: string } => Boolean(x));
}

export type { EquipmentCategory };
