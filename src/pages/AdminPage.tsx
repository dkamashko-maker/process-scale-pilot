import { PARAMETERS } from "@/data/runData";
import { useEvents } from "@/contexts/EventsContext";
import { useAuth } from "@/contexts/AuthContext";
import { DataTable } from "@/components/shared/DataTable";
import { ChartCard } from "@/components/shared/ChartCard";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileCheck, Database, AlertCircle, User, Eye, Pencil, Settings2 } from "lucide-react";
import { format } from "date-fns";
import type { ParameterDef } from "@/data/runTypes";
import type { AuditRecord } from "@/contexts/EventsContext";

const ROLE_INFO: Record<string, { label: string; icon: typeof Eye; permissions: string[] }> = {
  viewer: {
    label: "Viewer",
    icon: Eye,
    permissions: ["View runs and charts", "View event log (read-only)", "View analytics"],
  },
  operator: {
    label: "Operator",
    icon: Pencil,
    permissions: ["All Viewer permissions", "Log new process events", "Record additive additions"],
  },
  manager: {
    label: "Manager",
    icon: Settings2,
    permissions: ["All Operator permissions", "Edit and delete events", "Edit run metadata"],
  },
};

export default function AdminPage() {
  const { events, auditLog } = useEvents();
  const { user } = useAuth();

  const roleInfo = ROLE_INFO[user?.role || "viewer"];
  const RoleIcon = roleInfo.icon;

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

  const auditColumns = [
    {
      key: "timestamp", label: "Timestamp", sortable: true as const,
      render: (r: AuditRecord) => format(new Date(r.timestamp), "yyyy-MM-dd HH:mm:ss"),
    },
    { key: "actor", label: "User", sortable: true as const },
    {
      key: "action", label: "Action", sortable: true as const,
      render: (r: AuditRecord) => (
        <Badge variant={r.action === "event_deleted" ? "destructive" : r.action === "event_updated" ? "outline" : "secondary"} className="text-[10px]">
          {r.action.replace("event_", "").replace("_", " ")}
        </Badge>
      ),
    },
    { key: "run_id", label: "Run" },
    { key: "detail", label: "Detail" },
    { key: "entity_id", label: "Entity ID", render: (r: AuditRecord) => <span className="font-mono text-xs">{r.entity_id}</span> },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Prototype Demonstration</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This page demonstrates GxP readiness concepts for audit trail, access control, and data integrity.
              In production these would include validated workflows and cryptographic signatures.
              This system records log entries only — it does not send commands to instruments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Current User & Role */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Current Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="text-lg font-semibold">{user?.name || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge className="gap-1.5 text-sm px-3 py-1">
                <RoleIcon className="h-3.5 w-3.5" />
                {roleInfo.label}
              </Badge>
            </div>
            <div className="space-y-1 flex-1">
              <p className="text-sm text-muted-foreground">Permissions</p>
              <ul className="space-y-0.5">
                {roleInfo.permissions.map((p) => (
                  <li key={p} className="text-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GxP Concept Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Audit Trail</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">Prototype</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              All event logging actions (create, edit, delete) are captured with user identity, timestamp,
              and action detail. The audit log below is populated from actual user interactions in this session.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Electronic Signatures</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">Prototype</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              In production, critical event logging would require authenticated identity per 21 CFR Part 11.
              Signature meaning and intent would be captured with each entry.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Data Integrity</CardTitle>
              </div>
              <Badge variant="secondary" className="text-[10px]">Prototype</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Records follow ALCOA+ principles: attributable, legible, contemporaneous, original, and accurate.
              Data retention and traceability policies would be configurable per regulatory requirements.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log */}
      <ChartCard
        title="Session Audit Log"
        subtitle={
          <span className="flex items-center gap-1">
            Actions recorded during this session
            <InfoTooltip content="Log new events on any run to see audit records appear here. Each create, edit, or delete action generates an immutable audit entry." />
          </span>
        }
      >
        {auditLog.length > 0 ? (
          <DataTable data={auditLog} columns={auditColumns} />
        ) : (
          <div className="text-center py-12 text-muted-foreground text-sm">
            <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No audit records yet.</p>
            <p className="text-xs mt-1">Log, edit, or delete a process event on any run to generate audit entries.</p>
          </div>
        )}
      </ChartCard>

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
    </div>
  );
}
