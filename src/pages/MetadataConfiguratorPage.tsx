import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, Trash2, ArrowUp, ArrowDown, Save, Cpu, PencilLine, ClipboardList } from "lucide-react";
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
  const [fields, setFields] = useState<MetadataFieldDef[]>(() => loadMetadataSchema());
  const [values, setValues] = useState<Record<string, string>>(() => loadMetadataValues());

  // persist on change
  useEffect(() => { saveMetadataSchema(fields); }, [fields]);
  useEffect(() => { saveMetadataValues(values); }, [values]);

  const requiredCount = fields.filter((f) => f.required).length;
  const sensorCount = fields.filter((f) => f.origin === "sensor").length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Metadata Configurator</h1>
        <p className="text-sm text-muted-foreground">
          Define reusable metadata fields and preview how operators will fill them in.
          The schema is shared with workflow nodes, dashboard tooltips and other metadata-aware screens.
        </p>
      </div>

      <Tabs defaultValue="configurator" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="configurator" className="gap-2">
            <PencilLine className="h-4 w-4" /> Configurator
          </TabsTrigger>
          <TabsTrigger value="operator" className="gap-2">
            <ClipboardList className="h-4 w-4" /> Operator
          </TabsTrigger>
        </TabsList>

        {/* CONFIGURATOR TAB */}
        <TabsContent value="configurator" className="mt-4 space-y-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{fields.length} fields</Badge>
            <Badge variant="outline">{requiredCount} required</Badge>
            <Badge variant="outline" className="gap-1">
              <Cpu className="h-3 w-3" /> {sensorCount} sensor-flagged
            </Badge>
          </div>

          <ConfiguratorEditor fields={fields} setFields={setFields} />
        </TabsContent>

        {/* OPERATOR TAB */}
        <TabsContent value="operator" className="mt-4">
          <OperatorForm fields={fields} values={values} setValues={setValues} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ───────────────────────────────────────────────────────────
// Configurator editor
// ───────────────────────────────────────────────────────────
function ConfiguratorEditor({
  fields,
  setFields,
}: {
  fields: MetadataFieldDef[];
  setFields: (next: MetadataFieldDef[]) => void;
}) {
  const update = (id: string, patch: Partial<MetadataFieldDef>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const remove = (id: string) =>
    setFields(fields.filter((f) => f.id !== id));
  const move = (id: string, dir: -1 | 1) => {
    const idx = fields.findIndex((f) => f.id === id);
    if (idx < 0) return;
    const swap = idx + dir;
    if (swap < 0 || swap >= fields.length) return;
    const next = [...fields];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setFields(next);
  };
  const add = () => {
    setFields([
      ...fields,
      {
        id: makeFieldId(),
        name: "New field",
        key: slugifyKey(`new_field_${fields.length + 1}`),
        description: "",
        required: false,
        origin: "manual",
        placeholder: "",
      },
    ]);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Field definitions</CardTitle>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={add} className="gap-1">
            <Plus className="h-4 w-4" /> Add field
          </Button>
          <Button
            size="sm"
            variant="default"
            className="gap-1"
            onClick={() => {
              saveMetadataSchema(fields);
              toast.success("Metadata schema saved");
            }}
          >
            <Save className="h-4 w-4" /> Save schema
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No fields defined yet. Click “Add field” to start.
          </p>
        )}

        {fields.map((f, i) => (
          <div key={f.id} className="border rounded-lg p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px]">#{i + 1}</Badge>
                {f.required && <Badge variant="destructive" className="text-[10px]">Required</Badge>}
                <Badge
                  variant="outline"
                  className={`text-[10px] gap-1 ${f.origin === "sensor" ? "border-primary text-primary" : ""}`}
                >
                  {f.origin === "sensor" ? <Cpu className="h-3 w-3" /> : <PencilLine className="h-3 w-3" />}
                  {f.origin === "sensor" ? "Sensor-generated" : "Manual input"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(f.id, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(f.id, 1)} disabled={i === fields.length - 1}>
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => remove(f.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Field name</Label>
                <Input
                  value={f.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    update(f.id, { name, key: slugifyKey(name) });
                  }}
                  placeholder="e.g. Operator initials"
                />
              </div>
              <div>
                <Label className="text-xs">Key (auto)</Label>
                <Input
                  value={f.key}
                  onChange={(e) => update(f.id, { key: slugifyKey(e.target.value) })}
                  placeholder="operator_initials"
                  className="font-mono text-xs"
                />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Description</Label>
                <Textarea
                  rows={2}
                  value={f.description ?? ""}
                  onChange={(e) => update(f.id, { description: e.target.value })}
                  placeholder="What is this field for?"
                />
              </div>
              <div>
                <Label className="text-xs">Placeholder</Label>
                <Input
                  value={f.placeholder ?? ""}
                  onChange={(e) => update(f.id, { placeholder: e.target.value })}
                  placeholder="Example value shown to operator"
                />
              </div>
              <div>
                <Label className="text-xs">Data origin</Label>
                <Select
                  value={f.origin}
                  onValueChange={(v: MetadataOrigin) => update(f.id, { origin: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual input</SelectItem>
                    <SelectItem value="sensor">Sensor-generated (future)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-center justify-between rounded-md border bg-background px-3 py-2">
                <div>
                  <p className="text-xs font-medium">Required</p>
                  <p className="text-[11px] text-muted-foreground">Operator must provide a value before submitting.</p>
                </div>
                <Switch checked={f.required} onCheckedChange={(v) => update(f.id, { required: v })} />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ───────────────────────────────────────────────────────────
// Operator preview form
// ───────────────────────────────────────────────────────────
function OperatorForm({
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

  const setVal = (key: string, v: string) =>
    setValues({ ...values, [key]: v });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Operator metadata form</span>
          <Badge variant="outline" className="text-[10px]">
            Schema: {fields.length} fields ({fields.filter(f => f.required).length} required)
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          This form is generated from the schema you defined in the Configurator tab.
          Sensor-flagged fields show as read-only placeholders for now.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground italic">
            No fields defined. Switch to the Configurator tab to add fields.
          </p>
        )}

        {fields.map((f) => {
          const v = values[f.key] ?? "";
          const isMissing = f.required && !v.trim();
          const isSensor = f.origin === "sensor";
          return (
            <div key={f.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-sm">
                  {f.name}
                  {f.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {isSensor && (
                  <Badge variant="outline" className="text-[9px] gap-1 border-primary text-primary">
                    <Cpu className="h-2.5 w-2.5" /> Sensor (auto, future)
                  </Badge>
                )}
              </div>
              {f.description && (
                <p className="text-[11px] text-muted-foreground">{f.description}</p>
              )}
              <Input
                value={isSensor ? "" : v}
                onChange={(e) => setVal(f.key, e.target.value)}
                placeholder={isSensor ? "Will be auto-populated from sensor stream" : (f.placeholder || "Enter value")}
                disabled={isSensor}
                className={isMissing ? "border-destructive" : ""}
              />
              {isMissing && (
                <p className="text-[11px] text-destructive">This field is required.</p>
              )}
            </div>
          );
        })}

        {fields.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {missingRequired.length === 0
                ? "All required fields have values."
                : `${missingRequired.length} required field(s) still missing.`}
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
