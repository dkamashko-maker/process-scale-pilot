import { useDashboardData } from "@/hooks/useDashboardData";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, FileCheck, Database, Users, Settings, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function AdminPage() {
  const data = useDashboardData();

  // Enhanced audit events with more realistic entries
  const enhancedAuditEvents = [
    ...data.auditEvents,
    {
      id: "AE-DEMO-001",
      timestamp: new Date().toISOString(),
      user: "Dr. Smith",
      role: "Process Engineer",
      action: "Accepted recommended CPP profile for Batch B-0017 (demo e-signature)",
      entityType: "Batch",
      entityId: "B-0017",
      details: "Electronic signature captured with 21 CFR Part 11 compliant workflow",
    },
    {
      id: "AE-DEMO-002",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      user: "J. Williams",
      role: "QA Manager",
      action: "Viewed model results for Batch B-0012",
      entityType: "Batch",
      entityId: "B-0012",
      details: "ML model output reviewed for quality release decision",
    },
    {
      id: "AE-DEMO-003",
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      user: "Dr. Lee",
      role: "Scientist",
      action: "Changed spec limits for Titer in Product mAb-01 (pending QA review)",
      entityType: "Config",
      entityId: "SPEC-TITER-001",
      details: "Change control initiated, awaiting QA approval",
    },
    {
      id: "AE-DEMO-004",
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      user: "System",
      role: "Automated",
      action: "Model version updated to v1.2",
      entityType: "Config",
      entityId: "MODEL-001",
      details: "Automated model retraining completed successfully",
    },
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const auditColumns = [
    {
      key: "timestamp",
      label: "Timestamp",
      sortable: true,
      render: (item: typeof enhancedAuditEvents[0]) =>
        format(new Date(item.timestamp), "yyyy-MM-dd HH:mm:ss"),
    },
    { key: "user", label: "User", sortable: true },
    { key: "role", label: "Role", sortable: true },
    { key: "action", label: "Action" },
    { key: "entityType", label: "Entity Type", sortable: true },
    { key: "entityId", label: "Entity ID" },
  ];

  // CQA definitions
  const cqaDefinitions = [
    { name: "Titer", unit: "g/L", specLow: 3.0, specHigh: 5.5, method: "HPLC" },
    { name: "Glycan Quality", unit: "Score", specLow: 70, specHigh: 100, method: "HILIC-MS" },
    { name: "Aggregation", unit: "%", specLow: 0, specHigh: 5.0, method: "SEC-HPLC" },
  ];

  // User roles
  const userRoles = [
    { role: "Operator", permissions: "View batches, monitor processes", count: 12 },
    { role: "Process Engineer", permissions: "View/edit batches, accept recommendations", count: 8 },
    { role: "Scientist", permissions: "Full R&D access, experiment management", count: 15 },
    { role: "QA Manager", permissions: "Review changes, approve specs", count: 4 },
    { role: "Administrator", permissions: "Full system access, audit management", count: 2 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Disclaimer */}
      <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              Prototype Demonstration
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              This page demonstrates GxP readiness concepts. In a production system, these features would be
              fully implemented with validated electronic signatures, complete audit trails, and configurable
              change control workflows.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* GxP Readiness Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Audit Trail</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-2">Enabled in Architecture</Badge>
            <p className="text-sm text-muted-foreground">
              All user actions, system events, and data modifications are automatically logged with timestamps,
              user identification, and change details. Audit records are immutable and tamper-evident.
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
            <Badge variant="secondary" className="mb-2">Supported Conceptually</Badge>
            <p className="text-sm text-muted-foreground">
              Critical changes (e.g., accepting recommendations, modifying specs) require authenticated
              electronic signatures per 21 CFR Part 11 requirements. Signature meaning and intent are captured.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Data Retention & Traceability</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary" className="mb-2">Configurable Policies</Badge>
            <p className="text-sm text-muted-foreground">
              Data retention periods are configurable per regulatory requirements. All records maintain
              full traceability with version history and relationship linking across batches and experiments.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Audit Log Table */}
      <ChartCard
        title="Audit Log"
        subtitle={
          <span className="flex items-center gap-1">
            Recent system activity
            <InfoTooltip content="Complete, immutable record of all user actions and system events. In production, this would be searchable and filterable." />
          </span>
        }
      >
        <DataTable data={enhancedAuditEvents} columns={auditColumns} />
      </ChartCard>

      {/* Config Preview Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">CQA Definitions & Spec Ranges</CardTitle>
                <CardDescription>
                  Critical Quality Attributes with acceptance criteria
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cqaDefinitions.map((cqa) => (
                <div key={cqa.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{cqa.name}</p>
                    <p className="text-sm text-muted-foreground">Method: {cqa.method}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {cqa.specLow} - {cqa.specHigh} {cqa.unit}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              In full system, specifications are managed via controlled change workflows with QA approval.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">User Roles</CardTitle>
                <CardDescription>
                  Role-based access control configuration
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userRoles.map((role) => (
                <div key={role.role} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{role.role}</p>
                    <p className="text-sm text-muted-foreground">{role.permissions}</p>
                  </div>
                  <Badge variant="outline">{role.count} users</Badge>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Role assignments and permission changes are tracked in the audit log.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
