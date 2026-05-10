import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Settings, ExternalLink, FlaskConical, LineChart as LineChartIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { OverviewHeader } from "@/components/shared/PageHeader";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM";

interface Rule {
  instrument: string;
  parameter: string;
  condition: string;
  threshold: string;
  severity: Severity;
  status: "Active";
  source: string;
}

const RULES: Rule[] = [
  // Bioreactor BR-003-p
  { instrument: "BR-003-p", parameter: "Temperature", condition: "Outside range during Phase 1–2", threshold: "36.5–37.5 °C", severity: "CRITICAL", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "Temperature", condition: "Outside range during Phase 3–5", threshold: "32.5–33.5 °C", severity: "CRITICAL", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "pH", condition: "Outside range", threshold: "6.80–7.20", severity: "CRITICAL", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "dCO₂", condition: "Above limit", threshold: "> 16 %", severity: "HIGH", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "NH₄⁺", condition: "Above limit (glycosylation risk)", threshold: "> 3 mM", severity: "HIGH", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "Viability", condition: "Drop in 4-hour window", threshold: "> 5 %", severity: "HIGH", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "Glucose", condition: "Below threshold without scheduled feed in next 2 h", threshold: "< 2 mM", severity: "HIGH", status: "Active", source: "Controlled Parameters" },
  { instrument: "BR-003-p", parameter: "Foam", condition: "Above vessel-height fraction", threshold: "> 80 % vessel height", severity: "CRITICAL", status: "Active", source: "Controlled Parameters" },

  // Centrifuge CFG-003
  { instrument: "CFG-003", parameter: "RPM Actual vs Setpoint", condition: "Deviation sustained > 30 s", threshold: "|Δ| > 50 RPM", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "CFG-003", parameter: "Temperature", condition: "Above limit during run (product stability)", threshold: "> 12 °C", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "CFG-003", parameter: "Lid Lock", condition: "Unlocked at cycle start (safety)", threshold: "State = UNLOCKED", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "CFG-003", parameter: "Timestamp format", condition: "Excel serial number detected (data quality)", threshold: "Type ≠ ISO-8601", severity: "MEDIUM", status: "Active", source: "Sensors Params" },

  // UF Skid UF-03
  { instrument: "UF-03", parameter: "TMP", condition: "Above limit (membrane integrity)", threshold: "> 1.8 bar", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "UF-03", parameter: "Temperature", condition: "Above limit (FSH aggregation risk)", threshold: "> 12 °C", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "UF-03", parameter: "Concentration Factor", condition: "Below target after expected run time (process failure)", threshold: "< 3×", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "UF-03", parameter: "Aggregate content (offline)", condition: "Above release criterion (FSH)", threshold: "> 2 %", severity: "HIGH", status: "Active", source: "Quality metrics" },
  { instrument: "UF-03", parameter: "Online vs offline conductivity", condition: "Delta beyond consistency tolerance", threshold: "|Δ| > 0.2 mS/cm", severity: "MEDIUM", status: "Active", source: "Sensors Params" },
];

interface FeedAlert {
  id: string;
  instrument: string;
  parameter: string;
  observed: string;
  threshold: string;
  severity: Severity;
  occurredAt: string;
  evidenceLabel: string;
  evidenceIcon: "sample" | "chart";
}

const FEED: FeedAlert[] = [
  {
    id: "ALR-BR003-NH4-D8",
    instrument: "BR-003-p",
    parameter: "NH₄⁺",
    observed: "3.1 mM",
    threshold: "> 3 mM",
    severity: "HIGH",
    occurredAt: "Day 8 · 09:15",
    evidenceLabel: "S-R456-D8-NH4 sample record",
    evidenceIcon: "sample",
  },
  {
    id: "ALR-BR003-FOAM-D6",
    instrument: "BR-003-p",
    parameter: "Foam",
    observed: "82 % vessel height",
    threshold: "> 80 %",
    severity: "CRITICAL",
    occurredAt: "Day 6 · 14:22",
    evidenceLabel: "Bioreactor chart timestamp marker",
    evidenceIcon: "chart",
  },
];

function severityBadge(s: Severity) {
  if (s === "CRITICAL") return <Badge variant="danger">CRITICAL</Badge>;
  if (s === "HIGH") return <Badge variant="warning">HIGH</Badge>;
  return <Badge variant="neutral">MEDIUM</Badge>;
}

function instrumentBadge(id: string) {
  return <Badge variant="neutral" className="font-mono">{id}</Badge>;
}

function severityRowTint(s: Severity) {
  if (s === "CRITICAL") return "bg-destructive/[0.04]";
  if (s === "HIGH") return "bg-amber-500/[0.04]";
  return "";
}

function RulesTable() {
  const [query, setQuery] = useState("");
  const [instrument, setInstrument] = useState<"ALL" | "BR-003-p" | "CFG-003" | "UF-03">("ALL");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RULES.filter((r) => {
      if (instrument !== "ALL" && r.instrument !== instrument) return false;
      if (!q) return true;
      return (
        r.parameter.toLowerCase().includes(q) ||
        r.condition.toLowerCase().includes(q) ||
        r.threshold.toLowerCase().includes(q)
      );
    });
  }, [query, instrument]);

  const counts = useMemo(() => ({
    total: RULES.length,
    critical: RULES.filter((r) => r.severity === "CRITICAL").length,
    high: RULES.filter((r) => r.severity === "HIGH").length,
    medium: RULES.filter((r) => r.severity === "MEDIUM").length,
  }), []);

  return (
    <div className="space-y-4">
      <Card kind="operational" className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              Active Rules
            </span>
            <Badge variant="neutral">{counts.total} total</Badge>
            <Badge variant="danger">{counts.critical} critical</Badge>
            <Badge variant="warning">{counts.high} high</Badge>
            <Badge variant="neutral">{counts.medium} medium</Badge>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-border-tertiary overflow-hidden">
              {(["ALL", "BR-003-p", "CFG-003", "UF-03"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstrument(opt)}
                  className={
                    "px-2.5 py-1.5 text-[12px] transition-colors " +
                    (instrument === opt
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-foreground")
                  }
                >
                  {opt === "ALL" ? "All instruments" : opt}
                </button>
              ))}
            </div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search parameter or condition…"
              className="h-8 w-[240px] text-[12px]"
            />
          </div>
        </div>
      </Card>

      <Card kind="operational" className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Instrument</TableHead>
              <TableHead className="w-[180px]">Parameter</TableHead>
              <TableHead>Condition</TableHead>
              <TableHead className="w-[180px]">Threshold</TableHead>
              <TableHead className="w-[110px]">Severity</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={`${r.instrument}-${r.parameter}-${i}`} className={severityRowTint(r.severity)}>
                <TableCell>{instrumentBadge(r.instrument)}</TableCell>
                <TableCell className="text-foreground">{r.parameter}</TableCell>
                <TableCell className="text-text-secondary">{r.condition}</TableCell>
                <TableCell className="font-mono text-[12px] text-foreground">{r.threshold}</TableCell>
                <TableCell>{severityBadge(r.severity)}</TableCell>
                <TableCell><Badge variant="success">Active</Badge></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-text-secondary text-[12px]">
                  No rules match the current filter.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <p className="text-[11px] text-text-secondary">
        Rules are derived from instrument source files (Controlled Parameters, Sensors Params,
        Quality metrics). Editing rules requires Manager role and is out of scope for this
        prototype.
      </p>
    </div>
  );
}

function AlertsFeed() {
  return (
    <div className="space-y-3">
      <Card kind="operational" className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Triggered Alerts
          </span>
          <Badge variant="danger">1 critical</Badge>
          <Badge variant="warning">1 high</Badge>
          <span className="ml-auto text-[11px] text-text-secondary">
            Generated by Alerts Engine · linked to ledger evidence
          </span>
        </div>
      </Card>

      {FEED.map((a) => {
        const EvIcon = a.evidenceIcon === "sample" ? FlaskConical : LineChartIcon;
        return (
          <Card
            key={a.id}
            kind="operational"
            className={"p-4 border-l-[3px] " + (a.severity === "CRITICAL" ? "border-l-destructive" : "border-l-amber-500")}
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  "h-9 w-9 rounded-md flex items-center justify-center shrink-0 " +
                  (a.severity === "CRITICAL"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-amber-500/10 text-amber-600")
                }
              >
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {severityBadge(a.severity)}
                  {instrumentBadge(a.instrument)}
                  <span className="text-[13px] text-foreground font-medium">{a.parameter}</span>
                  <span className="text-[12px] text-text-secondary ml-auto tabular-nums">
                    {a.occurredAt}
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-1 md:grid-cols-[auto_auto_1fr] gap-x-6 gap-y-1 text-[12px]">
                  <div>
                    <span className="text-text-secondary">Observed: </span>
                    <span className="text-foreground tabular-nums">{a.observed}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary">Threshold: </span>
                    <span className="font-mono text-foreground">{a.threshold}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[12px]">
                  <span className="text-text-secondary">Evidence:</span>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    <EvIcon className="h-3.5 w-3.5" />
                    {a.evidenceLabel}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}

      <p className="text-[11px] text-text-secondary">
        Pre-populated demo alerts. Live alerts will be appended from the ingestion pipeline
        as soon as a triggering record enters the ledger.
      </p>
    </div>
  );
}

export default function AlertsPage() {
  return (
    <div className="px-8 py-8">
      <OverviewHeader
        title="Alerts Engine"
        description="Threshold rules and triggered alerts for CHO production-line instruments. Rules are sourced directly from instrument parameter sheets."
      />

      <Tabs defaultValue="feed" className="space-y-4">
        <TabsList>
          <TabsTrigger value="feed" className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Alerts Feed
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Rules Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-0">
          <AlertsFeed />
        </TabsContent>

        <TabsContent value="rules" className="mt-0">
          <RulesTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
