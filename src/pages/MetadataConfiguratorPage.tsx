import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OverviewHeader } from "@/components/shared/PageHeader";
import {
  Plus, Trash2, Save, Cpu, PencilLine, ChevronDown, ChevronRight, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import {
  MetadataFieldDef,
  MetadataOrigin,
  loadMetadataSchema,
  saveMetadataSchema,
  loadMetadataValues,
  saveMetadataValues,
  makeFieldId,
  slugifyKey,
} from "@/data/metadataSchemaStore";

export default function MetadataConfiguratorPage() {
  const initial = useMemo(() => loadMetadataSchema(), []);
  const [fields, setFields] = useState<MetadataFieldDef[]>(initial);
  const [values, setValues] = useState<Record<string, string>>(() => loadMetadataValues());

  // Auto-collapse cards when 3+ fields are present
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    initial.length >= 3 ? new Set() : new Set(initial.map((f) => f.id)),
  );

  // Persist on change
  useEffect(() => { saveMetadataSchema(fields); }, [fields]);
  useEffect(() => { saveMetadataValues(values); }, [values]);

  const requiredCount = fields.filter((f) => f.required).length;
  const sensorCount   = fields.filter((f) => f.origin === "sensor").length;

  // ── Field operations ──
  const update = (id: string, patch: Partial<MetadataFieldDef>) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const remove = (id: string) =>
    setFields((prev) => prev.filter((f) => f.id !== id));

  const reorder = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= fields.length) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const addField = () => {
    const id = makeFieldId();
    setFields((prev) => [
      ...prev,
      {
        id,
        name: "New field",
        key: slugifyKey(`new_field_${prev.length + 1}`),
        description: "",
        required: false,
        origin: "manual",
        placeholder: "",
      },
    ]);
    // New fields are auto-expanded so the user can edit immediately
    setExpanded((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 max-w-[1400px] mx-auto stack-page">
        <OverviewHeader
          title="Metadata Configurator"
          description="Define reusable metadata fields and preview how operators will fill them in. The schema is shared with workflow nodes, dashboard tooltips, and metadata-aware screens."
          actions={
            <Button
              size="sm"
              onClick={() => {
                saveMetadataSchema(fields);
                toast.success("Metadata schema saved");
              }}
              className="gap-1"
            >
              <Save className="h-4 w-4" /> Save schema
            </Button>
          }
        />

        {/* Summary bar */}
        <div className="flex flex-wrap items-stretch gap-3">
          <SummaryTile label="Fields" value={fields.length} />
          <SummaryTile label="Required" value={requiredCount} tone="active" />
          <SummaryTile
            label="Sensor-flagged"
            value={sensorCount}
            tone="primary"
            tooltip="This field is automatically populated from sensor data and cannot be edited by operators."
          />
          {fields.length <= 6 && (
            <button
              onClick={addField}
              className="rounded-lg p-4 bg-secondary hover:bg-secondary/70 transition-colors flex items-center gap-2 text-[13px] font-medium text-foreground border border-dashed border-border-tertiary"
            >
              <Plus className="h-4 w-4" /> Add field
            </button>
          )}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* ─── LEFT 60% — Field definitions ─── */}
          <div className="lg:col-span-3 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[16px] font-medium">Field definitions</h2>
              {fields.length > 6 && (
                <Button size="sm" variant="outline" className="gap-1" onClick={addField}>
                  <Plus className="h-4 w-4" /> Add field
                </Button>
              )}
            </div>

            {fields.length === 0 && (
              <div className="card-data p-10 text-center text-text-secondary">
                <p className="text-sm">No fields defined yet.</p>
                <Button size="sm" variant="outline" onClick={addField} className="mt-3 gap-1">
                  <Plus className="h-4 w-4" /> Add your first field
                </Button>
              </div>
            )}

            {fields.map((f, i) => (
              <FieldAccordionCard
                key={f.id}
                index={i}
                total={fields.length}
                field={f}
                expanded={expanded.has(f.id)}
                onToggle={() => toggleExpanded(f.id)}
                onUpdate={(patch) => update(f.id, patch)}
                onRemove={() => remove(f.id)}
                onMoveUp={() => reorder(i, i - 1)}
                onMoveDown={() => reorder(i, i + 1)}
              />
            ))}
          </div>

          {/* ─── RIGHT 40% — Operator live preview ─── */}
          <aside className="lg:col-span-2">
            <div className="sticky top-6">
              <p className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-2">
                Operator view — live preview
              </p>
              <OperatorPreview fields={fields} values={values} setValues={setValues} />
            </div>
          </aside>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ───────────────────────────────────────────────────────────
// Field accordion card — 44px collapsed row, expanded inline
// ───────────────────────────────────────────────────────────
function FieldAccordionCard({
  index, total, field, expanded,
  onToggle, onUpdate, onRemove, onMoveUp, onMoveDown,
}: {
  index: number;
  total: number;
  field: MetadataFieldDef;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (patch: Partial<MetadataFieldDef>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="card-operational" style={{ padding: 0 }}>
      {/* ── Compact summary row (44px) ── */}
      <div
        className="flex items-center gap-3 px-3 cursor-pointer select-none"
        style={{ minHeight: 44 }}
        onClick={onToggle}
      >
        {/* Drag handle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              onDoubleClick={(e) => { e.stopPropagation(); onMoveUp(); }}
              className="cursor-grab active:cursor-grabbing text-text-secondary hover:text-foreground p-1 -ml-1"
              aria-label="Reorder field"
              draggable
              onDragStart={(e) => e.dataTransfer.setData("text/plain", String(index))}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const from = Number(e.dataTransfer.getData("text/plain"));
                if (!Number.isNaN(from)) {
                  if (from < index) onMoveDown(); else if (from > index) onMoveUp();
                }
              }}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">Drag to reorder · double-click to move up</TooltipContent>
        </Tooltip>

        <span className="text-[11px] font-mono text-text-secondary tabular-nums w-6 text-right">
          #{index + 1}
        </span>

        {field.required && <Badge variant="warning">Required</Badge>}

        <div className="min-w-0 flex-1 flex items-center gap-2">
          <span className="text-[14px] font-medium leading-tight truncate">{field.name}</span>
          <span className="text-[12px] font-mono text-text-secondary truncate">{field.key}</span>
        </div>

        {/* Origin chip */}
        <span
          className={`hidden sm:inline-flex items-center gap-1 px-2 h-[22px] rounded-full text-[11px] font-medium
            ${field.origin === "sensor"
              ? "bg-blue-50 text-blue-700"
              : "bg-secondary text-text-secondary"}`}
        >
          {field.origin === "sensor" ? <Cpu className="h-3 w-3" /> : <PencilLine className="h-3 w-3" />}
          {field.origin === "sensor" ? "Sensor" : "Manual"}
        </span>

        {/* Required toggle */}
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <Label htmlFor={`req-${field.id}`} className="text-[11px] text-text-secondary">
            Required
          </Label>
          <Switch
            id={`req-${field.id}`}
            checked={field.required}
            onCheckedChange={(v) => onUpdate({ required: v })}
          />
        </div>

        {/* Expand chevron */}
        <button
          type="button"
          className="text-text-secondary hover:text-foreground p-1"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div
          className="px-3 pb-3 pt-0"
          style={{ borderTop: "0.5px solid hsl(var(--border-tertiary))" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
            <div>
              <Label className="text-xs">Field name</Label>
              <Input
                value={field.name}
                onChange={(e) => {
                  const name = e.target.value;
                  onUpdate({ name, key: slugifyKey(name) });
                }}
                placeholder="e.g. Operator initials"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Key (auto)</Label>
              <Input
                value={field.key}
                onChange={(e) => onUpdate({ key: slugifyKey(e.target.value) })}
                placeholder="operator_initials"
                className="font-mono text-xs mt-1"
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={2}
                value={field.description ?? ""}
                onChange={(e) => onUpdate({ description: e.target.value })}
                placeholder="What is this field for?"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Placeholder</Label>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Example value shown to operator"
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Data origin</Label>
              <Select
                value={field.origin}
                onValueChange={(v: MetadataOrigin) => onUpdate({ origin: v })}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual input</SelectItem>
                  <SelectItem value="sensor">Sensor-generated (future)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 mt-3" style={{ borderTop: "0.5px solid hsl(var(--border-tertiary))" }}>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onMoveUp} disabled={index === 0}>
                Move up
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={onMoveDown} disabled={index === total - 1}>
                Move down
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-[11px] text-status-error gap-1"
              onClick={onRemove}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Operator live preview (read-only-feeling form)
// ───────────────────────────────────────────────────────────
function OperatorPreview({
  fields,
  values,
  setValues,
}: {
  fields: MetadataFieldDef[];
  values: Record<string, string>;
  setValues: (next: Record<string, string>) => void;
}) {
  const missingRequired = useMemo(
    () => fields.filter((f) => f.required && !(values[f.key] ?? "").trim()),
    [fields, values],
  );

  const setVal = (key: string, v: string) => setValues({ ...values, [key]: v });

  return (
    <Card className="bg-secondary/40">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-[14px] font-medium flex items-center justify-between">
          <span>Operator metadata form</span>
          <Badge variant="neutral" className="text-[10px]">
            {fields.length} fields · {fields.filter((f) => f.required).length} required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3 max-h-[640px] overflow-y-auto">
        {fields.length === 0 && (
          <p className="text-sm text-text-secondary italic">
            No fields defined. Add a field on the left to populate this preview.
          </p>
        )}

        {fields.map((f) => {
          const v = values[f.key] ?? "";
          const isMissing = f.required && !v.trim();
          const isSensor = f.origin === "sensor";
          return (
            <div key={f.id} className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Label className="text-[13px]">
                  {f.name}
                  {f.required && <span className="text-status-error ml-1">*</span>}
                </Label>
                {isSensor && (
                  <Badge variant="neutral" className="gap-1">
                    <Cpu className="h-2.5 w-2.5" /> Sensor (auto)
                  </Badge>
                )}
              </div>
              {f.description && (
                <p className="text-[11px] text-text-secondary">{f.description}</p>
              )}
              <Input
                value={isSensor ? "" : v}
                onChange={(e) => setVal(f.key, e.target.value)}
                placeholder={isSensor ? "Will be auto-populated from sensor stream" : (f.placeholder || "Enter value")}
                disabled={isSensor}
                className={isMissing ? "border-status-error" : ""}
              />
              {isMissing && (
                <p className="text-[11px] text-status-error">This field is required.</p>
              )}
            </div>
          );
        })}

        {fields.length > 0 && (
          <div className="flex items-center justify-between pt-2" style={{ borderTop: "0.5px solid hsl(var(--border-tertiary))" }}>
            <p className="text-[11px] text-text-secondary">
              {missingRequired.length === 0
                ? "All required fields have values."
                : `${missingRequired.length} required field(s) missing.`}
            </p>
            <Button
              size="sm"
              disabled={missingRequired.length > 0}
              onClick={() => {
                saveMetadataValues(values);
                toast.success("Metadata values saved");
              }}
            >
              <Save className="h-4 w-4 mr-1" /> Save values
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────
// Summary tile (small)
// ───────────────────────────────────────────────────────────
function SummaryTile({
  label, value, tone = "primary", tooltip,
}: {
  label: string;
  value: number;
  tone?: "primary" | "active" | "warning";
  tooltip?: string;
}) {
  const labelEl = (
    <span className="text-[13px] font-normal text-text-secondary inline-flex items-center gap-1">
      {label}
      {tooltip && (
        <span className="inline-flex items-center justify-center h-3.5 w-3.5 rounded-full border border-border-tertiary text-[9px] text-text-secondary">?</span>
      )}
    </span>
  );
  const tile = (
    <div className="rounded-lg p-4 bg-secondary min-w-[140px]">
      <div className="flex items-start justify-between gap-3">
        {labelEl}
      </div>
      <p className={`text-kpi tabular-nums leading-none mt-2 ${
        tone === "active"  ? "text-status-active" :
        tone === "warning" ? "text-status-warning" :
        "text-foreground"
      }`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
  if (!tooltip) return tile;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{tile}</TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs max-w-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
