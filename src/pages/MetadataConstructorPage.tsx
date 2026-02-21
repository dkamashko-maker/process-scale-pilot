import { PARAMETERS } from "@/data/runData";
import { RUNS } from "@/data/runData";
import { DataTable } from "@/components/shared/DataTable";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, AlertCircle } from "lucide-react";
import type { ParameterDef } from "@/data/runTypes";

export default function MetadataConstructorPage() {
  const paramColumns = [
    { key: "parameter_code", label: "Code", sortable: true as const },
    { key: "display_name", label: "Name", sortable: true as const },
    { key: "unit", label: "Unit" },
    { key: "min_value", label: "Min", render: (p: ParameterDef) => p.min_value.toString() },
    { key: "max_value", label: "Max", render: (p: ParameterDef) => p.max_value.toString() },
    {
      key: "type_priority", label: "Priority", sortable: true as const,
      render: (p: ParameterDef) => (
        <Badge variant={p.is_critical ? "default" : "outline"}>{p.type_priority}</Badge>
      ),
    },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Construction className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">Metadata Constructor</h2>
        <InfoTooltip content="Define and review metadata schemas for instrumental data, parameters, and run configurations." />
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Prototype Demonstration</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              In production, metadata schemas would be configurable and versioned. This view shows the current parameter catalog and run configuration templates.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Run Configuration Schema */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Run Configuration Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {["run_id", "batch_id", "reactor_id", "operator_id", "cell_line", "target_protein", "process_strategy", "basal_medium", "feed_medium", "start_time", "end_time", "sampling_interval_sec"].map((field) => (
              <div key={field} className="border rounded-md p-3">
                <p className="font-mono text-xs text-primary">{field}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {field.includes("time") ? "datetime" : field.includes("sec") ? "integer" : "string"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Parameter Catalog */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Parameter Catalog ({PARAMETERS.length} parameters)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable data={[...PARAMETERS]} columns={paramColumns} />
        </CardContent>
      </Card>

      {/* Event Schema */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Process Event Schema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {["id", "run_id", "timestamp", "event_type", "subtype", "amount", "amount_unit", "actor", "entry_mode", "notes"].map((field) => (
              <div key={field} className="border rounded-md p-3">
                <p className="font-mono text-xs text-primary">{field}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {field === "amount" ? "number | null" : field === "timestamp" ? "datetime" : "string"}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
