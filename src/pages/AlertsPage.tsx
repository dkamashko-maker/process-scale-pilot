import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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

  // FPLC-01 — Anion Exchange Chromatography
  { instrument: "FPLC-01", parameter: "System pressure", condition: "Above maximum alarm setpoint (column damage)", threshold: "> 3 bar", severity: "CRITICAL", status: "Active", source: "Set Params" },
  { instrument: "FPLC-01", parameter: "UV280", condition: "No peak detected above 50 mAU in expected elution window (no product)", threshold: "Peak < 50 mAU", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "FPLC-01", parameter: "Fraction collection", condition: "Triggered but no UV threshold crossing (method error)", threshold: "Trigger ∧ UV < 100 mAU", severity: "MEDIUM", status: "Active", source: "Set Params" },
  { instrument: "FPLC-01", parameter: "Equipment ID field", condition: "Value does not match instrument class (data quality)", threshold: "ID ∉ FPLC class", severity: "MEDIUM", status: "Active", source: "Metadata" },

  // Depyrogenation Oven DPY-01
  { instrument: "DPY-01", parameter: "Chamber temperature", condition: "Below limit during hold phase (depyrogenation failure)", threshold: "< 240 °C @ hold", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "DPY-01", parameter: "Hold phase duration", condition: "Below regulatory minimum at qualified temperature", threshold: "< 30 min @ ≥ 250 °C", severity: "CRITICAL", status: "Active", source: "Set Params" },
  { instrument: "DPY-01", parameter: "Differential pressure", condition: "Below limit (HEPA integrity risk)", threshold: "< 5 Pa", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "DPY-01", parameter: "Equipment ID field", condition: "Value does not match instrument class (data quality)", threshold: "ID ∉ DPY class", severity: "MEDIUM", status: "Active", source: "Metadata" },

  // Vial Washer VW-03
  { instrument: "VW-03", parameter: "Rinse water conductivity", condition: "Above WFI quality limit (water quality failure)", threshold: "> 0.8 µS/cm", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "VW-03", parameter: "Visual inspection pass rate", condition: "Below container release criterion", threshold: "< 98 %", severity: "HIGH", status: "Active", source: "Quality metrics" },
  { instrument: "VW-03", parameter: "Wash water temperature", condition: "Outside qualified range", threshold: "Outside 65–80 °C", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "VW-03", parameter: "Conductivity unit", condition: "Reported in mS/cm instead of µS/cm (unit mismatch)", threshold: "Unit ≠ µS/cm", severity: "HIGH", status: "Active", source: "Sensors Params" },

  // Filling Pump FP-02
  { instrument: "FP-02", parameter: "Fill volume deviation", condition: "Beyond dose-uniformity tolerance from 1.0 mL target", threshold: "> ± 1.0 %", severity: "CRITICAL", status: "Active", source: "Set Params" },
  { instrument: "FP-02", parameter: "Liquid temperature", condition: "Above limit (FSH stability)", threshold: "> 12 °C", severity: "HIGH", status: "Active", source: "Sensors Params" },
  { instrument: "FP-02", parameter: "Vial count", condition: "Discrepancy vs upstream instrument count (material balance)", threshold: "> 5 %", severity: "HIGH", status: "Active", source: "Metadata" },
  { instrument: "FP-02", parameter: "Comment field", condition: "Free-text comment populated — prompt to convert to structured event", threshold: "Comment ≠ ∅", severity: "MEDIUM", status: "Active", source: "Metadata" },

  // Lyophilizer LPZ-03
  { instrument: "LPZ-03", parameter: "Product temperature", condition: "Rises above Tg′ during primary drying (cake collapse)", threshold: "> −32 °C", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "LPZ-03", parameter: "Condenser temperature", condition: "Rises above product temperature (sublimation stops)", threshold: "T_cond > T_prod", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "LPZ-03", parameter: "Chamber pressure", condition: "Rises above limit during primary drying", threshold: "> 0.5 mbar", severity: "HIGH", status: "Active", source: "Set Params" },
  { instrument: "LPZ-03", parameter: "Pirani–manometer delta", condition: "Above convergence threshold at expected endpoint (drying incomplete)", threshold: "Δ > 0.02 mbar", severity: "MEDIUM", status: "Active", source: "Sensors Params" },

  // Capping & Labelling CAP-01
  { instrument: "CAP-01", parameter: "Cap presence sensor", condition: "Cap absent at capping station exit (unsealed vial)", threshold: "Sensor = ABSENT", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "CAP-01", parameter: "Label sensor", condition: "Label sensor fails reading (unlabelled vial)", threshold: "Read = FAIL", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "CAP-01", parameter: "Print quality", condition: "Misaligned or missing batch data (traceability failure)", threshold: "Print = MISALIGNED ∨ MISSING", severity: "CRITICAL", status: "Active", source: "Sensors Params" },
  { instrument: "CAP-01", parameter: "Reject gate count", condition: "Above batch threshold", threshold: "> 1 % of batch (> 125 vials)", severity: "HIGH", status: "Active", source: "Sensors Params" },

  // Global rules — apply to all instruments
  { instrument: "GLOBAL", parameter: "Timestamp format", condition: "Excel serial number detected — auto-convert to ISO 8601 and log conversion event", threshold: "Type ≠ ISO-8601", severity: "MEDIUM", status: "Active", source: "Ingestion" },
  { instrument: "GLOBAL", parameter: "Equipment ID field", condition: "Value matches a different instrument's known ID — flag as suspected data entry error, require manual confirmation", threshold: "ID ∈ other_instrument_ids", severity: "MEDIUM", status: "Active", source: "Ingestion" },
  { instrument: "GLOBAL", parameter: "Vial count (cross-instrument)", condition: "Material balance: count at any step differs from upstream step", threshold: "> 2 %", severity: "HIGH", status: "Active", source: "Pipeline" },
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
  {
    id: "ALR-FP02-MATBAL",
    instrument: "FP-02",
    parameter: "Material Balance",
    observed: "Vials filled (12,500) vs washed (12,000) = +4.2 %",
    threshold: "> 2 % (cross-instrument)",
    severity: "HIGH",
    occurredAt: "2024-10-15 · 07:46",
    evidenceLabel: "FP-02 vials counter — open investigation",
    evidenceIcon: "chart",
  },
  {
    id: "ALR-DPY01-EQID",
    instrument: "DPY-01",
    parameter: "Equipment ID",
    observed: "Source shows \"VW-03\", expected unique DPY-01",
    threshold: "ID ∈ other_instrument_ids",
    severity: "MEDIUM",
    occurredAt: "Detected at ingestion · corrected to DPY-01",
    evidenceLabel: "DPY-01 metadata — source-corrected field",
    evidenceIcon: "sample",
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

function RulesTable({ initialInstrument = "ALL" }: { initialInstrument?: string }) {
  const [query, setQuery] = useState("");
  const [instrument, setInstrument] = useState<string>(initialInstrument);

  const instruments = useMemo(
    () => Array.from(new Set(RULES.map((r) => r.instrument))),
    [],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RULES.filter((r) => {
      if (instrument !== "ALL" && r.instrument !== instrument) return false;
      if (!q) return true;
      return (
        r.parameter.toLowerCase().includes(q) ||
        r.condition.toLowerCase().includes(q) ||
        r.threshold.toLowerCase().includes(q) ||
        r.instrument.toLowerCase().includes(q)
      );
    });
  }, [query, instrument]);

  const counts = useMemo(() => ({
    total: RULES.length,
    critical: RULES.filter((r) => r.severity === "CRITICAL").length,
    high: RULES.filter((r) => r.severity === "HIGH").length,
    medium: RULES.filter((r) => r.severity === "MEDIUM").length,
  }), []);

  const filterOpts = ["ALL", ...instruments];

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
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex flex-wrap rounded-md border border-border-tertiary overflow-hidden">
              {filterOpts.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setInstrument(opt)}
                  className={
                    "px-2.5 py-1.5 text-[12px] transition-colors border-r border-border-tertiary last:border-r-0 " +
                    (instrument === opt
                      ? "bg-primary/10 text-primary"
                      : "text-text-secondary hover:text-foreground")
                  }
                >
                  {opt === "ALL" ? "All" : opt}
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

function AlertsFeed({ equipmentId }: { equipmentId?: string }) {
  const items = equipmentId ? FEED.filter((a) => a.instrument === equipmentId) : FEED;
  return (
    <div className="space-y-3">
      {equipmentId && (
        <Card kind="operational" className="p-3">
          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="text-text-secondary">Filtered to equipment</span>
            <Badge variant="neutral" className="font-mono">{equipmentId}</Badge>
            {items.length === 0 && (
              <span className="text-text-secondary">— no triggered alerts for this equipment.</span>
            )}
          </div>
        </Card>
      )}
      <Card kind="operational" className="p-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
            Triggered Alerts
          </span>
          <Badge variant="danger">1 critical</Badge>
          <Badge variant="warning">2 high</Badge>
          <Badge variant="neutral">1 medium</Badge>
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
