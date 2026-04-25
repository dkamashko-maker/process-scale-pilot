// Shared metadata schema store.
// Defines reusable text-based metadata fields configured by users in the
// Metadata Configurator. Other prototype areas (dashboard tooltips, workflow
// nodes, etc.) can read these definitions to render consistent metadata.

export type MetadataOrigin = "manual" | "sensor";

export interface MetadataFieldDef {
  id: string;
  name: string;            // human label, e.g. "Operator initials"
  key: string;             // machine key, e.g. "operator_initials"
  description?: string;
  required: boolean;
  origin: MetadataOrigin;  // future ingestion hint, no logic yet
  placeholder?: string;
}

const STORAGE_KEY = "dv_metadata_schema_v1";
const VALUES_KEY = "dv_metadata_values_v1";

const DEFAULT_FIELDS: MetadataFieldDef[] = [
  {
    id: "f_batch_id",
    name: "Batch ID",
    key: "batch_id",
    description: "Identifier of the batch this record belongs to.",
    required: true,
    origin: "manual",
    placeholder: "e.g. BR-2025-014",
  },
  {
    id: "f_operator",
    name: "Operator initials",
    key: "operator_initials",
    description: "Initials of the operator entering the record.",
    required: true,
    origin: "manual",
    placeholder: "e.g. AS",
  },
  {
    id: "f_temp_setpoint",
    name: "Temperature setpoint",
    key: "temp_setpoint_c",
    description: "Configured setpoint in °C.",
    required: false,
    origin: "sensor",
    placeholder: "e.g. 37.0",
  },
  {
    id: "f_notes",
    name: "Notes",
    key: "notes",
    description: "Free-text observations from the operator.",
    required: false,
    origin: "manual",
    placeholder: "Optional notes…",
  },
];

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function loadMetadataSchema(): MetadataFieldDef[] {
  if (typeof window === "undefined") return DEFAULT_FIELDS;
  return safeParse<MetadataFieldDef[]>(localStorage.getItem(STORAGE_KEY), DEFAULT_FIELDS);
}

export function saveMetadataSchema(fields: MetadataFieldDef[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
}

export function loadMetadataValues(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, string>>(localStorage.getItem(VALUES_KEY), {});
}

export function saveMetadataValues(values: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VALUES_KEY, JSON.stringify(values));
}

export function makeFieldId(): string {
  return `f_${Math.random().toString(36).slice(2, 9)}`;
}

export function slugifyKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}
