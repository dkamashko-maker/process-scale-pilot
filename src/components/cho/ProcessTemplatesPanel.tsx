import { useMemo, useState } from "react";
import { FlaskConical, Filter as FilterIcon, Droplets } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldDef = { name: string; required: boolean; value: string };

type ProcessTemplate = {
  id: "bioreactor" | "centrifuge" | "ufdf";
  label: string;
  short: string;
  source: string;
  Icon: React.ComponentType<{ className?: string }>;
  fields: FieldDef[];
};

const TEMPLATES: ProcessTemplate[] = [
  {
    id: "bioreactor",
    label: "Bioreactor Run",
    short: "BR-003-p",
    source: 'Meta sheet · CHO_protein_expression-v3.xlsx',
    Icon: FlaskConical,
    fields: [
      { name: "Batch No", required: true, value: "CHO-r-hFSG-456-250308-2" },
      { name: "Cell Line", required: true, value: "CHO-DG44/r-hFSHβ-α-clone_127" },
      { name: "Bioreactor No", required: true, value: "BR-003-p" },
      { name: "Bioreactor Run", required: true, value: "R-456" },
      { name: "Operator", required: true, value: "20-456" },
      { name: "Supervisor", required: true, value: "10-032" },
      { name: "Start Time", required: true, value: "2025-03-08 08:00 UTC" },
      { name: "End Time", required: true, value: "2025-03-22 08:00 UTC" },
      { name: "Cultivation Strategy", required: true, value: "Fed-batch" },
      { name: "SOP Version", required: true, value: "SOP-CULT-03.9" },
      { name: "Cleaning Status", required: true, value: "Clean (validated)" },
      { name: "Target Protein", required: false, value: "rhFSH" },
      { name: "Basal Medium", required: false, value: "Gibco CD CHO" },
      { name: "Feed Medium", required: false, value: "Gibco EfficientFeed C+" },
      { name: "Initial Volume", required: false, value: "1.0 L" },
      { name: "Initial VCD", required: false, value: "0.5 × 10⁶ cells/mL" },
      { name: "Current Phase", required: false, value: "Production Phase" },
    ],
  },
  {
    id: "centrifuge",
    label: "Centrifuge Run",
    short: "CFG-003",
    source: 'Metadata sheet · CHO_ds_centrifuge.xlsx',
    Icon: FilterIcon,
    fields: [
      { name: "Batch Number", required: true, value: "FSH-B042-24" },
      { name: "Sub-batch / Centrifuge Run ID", required: true, value: "FSH-B042-24-C1" },
      { name: "Equipment Number / ID", required: true, value: "CFG-003" },
      { name: "Operator", required: true, value: "J. Smith / M. Chen" },
      { name: "Supervisor", required: true, value: "A. Johnson" },
      { name: "Date & Time Start", required: true, value: "2024-11-22 08:30 UTC" },
      { name: "Date & Time End", required: true, value: "2024-11-22 10:30 UTC" },
      { name: "Culture Harvest Vessel ID", required: true, value: "BR-202" },
      { name: "SOP Version", required: true, value: "SOP-CENT-04.2" },
      { name: "Cleaning Status", required: true, value: "Clean (validated)" },
      { name: "Sample ID Inlet", required: false, value: "FSH-B042-24-C1-IN" },
      { name: "Sample ID Centrate", required: false, value: "FSH-B042-24-C1-OUT" },
    ],
  },
  {
    id: "ufdf",
    label: "UF/DF Run",
    short: "UF-03",
    source: 'Metadata sheet · CHO_ds_ultrafiltration.xlsx',
    Icon: Droplets,
    fields: [
      { name: "Batch Number", required: true, value: "FSH-2025-042" },
      { name: "Equipment Number", required: true, value: "UF-03" },
      { name: "Operator Name", required: true, value: "J. Smith" },
      { name: "Process Stage", required: true, value: "Concentration / Diafiltration" },
      { name: "Start Timestamp", required: true, value: "2025-05-04 08:30 UTC" },
      { name: "End Timestamp", required: true, value: "2025-05-04 12:45 UTC" },
      { name: "SOP Version", required: true, value: "SOP-UFDF-02.4 (inferred)" },
      { name: "Cleaning Status", required: true, value: "Clean (validated)" },
      { name: "Sample ID Inlet", required: false, value: "S-042-UF-in-1" },
      { name: "Sample ID Retentate", required: false, value: "S-042-UF-ret-1" },
      { name: "Sample ID Permeate", required: false, value: "S-042-UF-perm-1" },
      { name: "UF Membrane Cassette Lot", required: false, value: "C1234-5678" },
    ],
  },
];

function CompletenessBar({ score }: { score: number }) {
  const tone =
    score === 100 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-destructive";
  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <div className="flex-1 h-1.5 rounded-full bg-accent/50 overflow-hidden">
        <div className={cn("h-full transition-all", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[12px] tabular-nums text-foreground w-[42px] text-right">
        {score}%
      </span>
    </div>
  );
}

export function ProcessTemplatesPanel() {
  const [activeId, setActiveId] = useState<ProcessTemplate["id"]>("bioreactor");
  const active = TEMPLATES.find((t) => t.id === activeId)!;

  // Editable values per template (pre-populated)
  const [values, setValues] = useState<Record<string, Record<string, string>>>(
    () =>
      Object.fromEntries(
        TEMPLATES.map((t) => [t.id, Object.fromEntries(t.fields.map((f) => [f.name, f.value]))]),
      ),
  );

  const scores = useMemo(() => {
    const out: Record<string, number> = {};
    for (const t of TEMPLATES) {
      const required = t.fields.filter((f) => f.required);
      const filled = required.filter((f) => (values[t.id]?.[f.name] || "").trim().length > 0).length;
      out[t.id] = required.length === 0 ? 100 : Math.round((filled / required.length) * 100);
    }
    return out;
  }, [values]);

  const requiredCount = active.fields.filter((f) => f.required).length;
  const optionalCount = active.fields.length - requiredCount;

  return (
    <Card kind="operational" className="p-5">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <h3 className="text-section text-foreground">Process Metadata Templates</h3>
          <p className="text-[12px] text-text-secondary">
            Pre-populated entry templates for CHO production-line runs
          </p>
        </div>
        <span className="text-[11px] text-text-secondary uppercase tracking-wide">
          Read-only demo · synthetic values
        </span>
      </div>

      {/* Template selector */}
      <div className="mb-5">
        <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-2">
          Select Template
        </div>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t) => {
            const isActive = t.id === activeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveId(t.id)}
                className={cn(
                  "px-3 py-2 rounded-md border text-[12px] flex items-center gap-2 transition-colors",
                  isActive
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-background border-border-tertiary text-text-secondary hover:text-foreground",
                )}
              >
                <t.Icon className="h-3.5 w-3.5" />
                <span className="font-medium">{t.label}</span>
                <span className="font-mono text-[11px] text-text-secondary">{t.short}</span>
                <span
                  className={cn(
                    "ml-1 text-[10px] tabular-nums",
                    scores[t.id] === 100 ? "text-emerald-600" : "text-amber-600",
                  )}
                >
                  {scores[t.id]}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active template */}
      <div className="rounded-md border border-border-tertiary">
        <div className="px-4 py-3 border-b border-border-tertiary">
          <h4 className="text-[14px] font-medium text-foreground">Template Constructor</h4>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
          {active.fields.map((f) => {
            const val = values[active.id]?.[f.name] || "";
            return (
              <div key={f.name}>
                <Label className="text-[10px] uppercase tracking-wide text-text-secondary flex items-center gap-1">
                  {f.name}
                  {f.required && <span className="text-destructive">*</span>}
                </Label>
                <Input
                  className="h-8 text-[12px] mt-1"
                  value={val}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      [active.id]: { ...prev[active.id], [f.name]: e.target.value },
                    }))
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-[11px] text-text-secondary">
        Field names match each instrument source file exactly. The completeness bar fills as
        required fields (*) are populated.
      </p>
    </Card>
  );
}
