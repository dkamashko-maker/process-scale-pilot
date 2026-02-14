import { PARAMETERS } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileCheck, Database, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import type { ParameterDef, ProcessEvent } from "@/data/runTypes";

export default function AdminPage() {
  const { events } = useEvents();

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

  const recentEvents = [...events]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 20);

  const auditColumns = [
    {
      key: "timestamp", label: "Timestamp", sortable: true as const,
      render: (e: ProcessEvent) => format(new Date(e.timestamp), "yyyy-MM-dd HH:mm:ss"),
    },
    { key: "actor", label: "User", sortable: true as const },
    { key: "event_type", label: "Action", sortable: true as const },
    { key: "subtype", label: "Detail" },
    { key: "run_id", label: "Run" },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Disclaimer */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Prototype Demonstration</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This page demonstrates GxP readiness concepts. In production, these features would include
              validated electronic signatures, complete audit trails, and change control workflows.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* GxP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Audit Trail</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-2">Enabled</Badge>
            <p className="text-sm text-muted-foreground">
              All process events, parameter readings, and operator actions are automatically logged
              with timestamps and user identification. Records are immutable.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Electronic Signatures</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-2">Supported</Badge>
            <p className="text-sm text-muted-foreground">
              Critical event logging requires authenticated identity per 21 CFR Part 11.
              Signature meaning and intent are captured with each entry.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Data Integrity</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-2">ALCOA+ Compliant</Badge>
            <p className="text-sm text-muted-foreground">
              All records are attributable, legible, contemporaneous, original, and accurate.
              Data retention policies are configurable per regulatory requirements.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Parameter Catalog */}
      <ChartCard
        title="Parameter Catalog"
        subtitle={
          <span className="flex items-center gap-1">
            Monitored process parameters and operating ranges
            <InfoTooltip content="Reference table of all parameters monitored during bioreactor runs with their acceptable operating ranges." />
          </span>
        }
      >
        <DataTable data={[...PARAMETERS]} columns={paramColumns} />
      </ChartCard>

      {/* Audit Trail */}
      <ChartCard
        title="Recent Activity Log"
        subtitle={
          <span className="flex items-center gap-1">
            Last 20 recorded process events
            <InfoTooltip content="Immutable record of process events serving as the audit trail." />
          </span>
        }
      >
        <DataTable data={recentEvents} columns={auditColumns} />
      </ChartCard>
    </div>
  );
}
