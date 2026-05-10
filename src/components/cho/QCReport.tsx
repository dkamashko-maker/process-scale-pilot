import { AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type Status = "PASS" | "OOS";

interface Row {
  testName: string;
  method: string;
  sop: string;
  result: string;
  unit: string;
  spec: string;
  status: Status;
  analyst: string;
}

const ROWS: Row[] = [
  { testName: "Titer",                method: "HPLC Protein A",       sop: "SOP-AN-001", result: "3.2",            unit: "g/L",      spec: "3.0 ± 0.5 g/L",                          status: "PASS", analyst: "Upstream Scientist" },
  { testName: "Biological Activity",  method: "cAMP Assay",           sop: "SOP-AN-010", result: "15,000",         unit: "IU/mg",    spec: "12,000 IU/mg (Ref. Std.)",               status: "PASS", analyst: "Bioassay Lead" },
  { testName: "HMW Aggregates",       method: "SEC-HPLC",             sop: "SOP-AN-101", result: "0.5",            unit: "%",        spec: "≤ 2.0 %",                                status: "PASS", analyst: "QC Analyst" },
  { testName: "LMW Fragments",        method: "CE-SDS",               sop: "SOP-AN-102", result: "1.0",            unit: "%",        spec: "≤ 3.0 %",                                status: "PASS", analyst: "QC Analyst" },
  { testName: "Charge Variants",      method: "CEX-HPLC",             sop: "SOP-AN-201", result: "32 / 53 / 15",   unit: "% (A/M/B)",spec: "30–35 / 50–55 / 12–18 %",                status: "PASS", analyst: "QC Analyst" },
  { testName: "Sialic Acid",          method: "HPAEC-PAD",            sop: "SOP-AN-301", result: "12",             unit: "mol/mol",  spec: "10–14 mol/mol",                          status: "PASS", analyst: "Glyco Specialist" },
  { testName: "Tetra-sialylated",     method: "HILIC-UPLC/FLR",       sop: "SOP-AN-302", result: "45",             unit: "%",        spec: "40–50 %",                                status: "PASS", analyst: "Glyco Specialist" },
  { testName: "Glycation",            method: "LC-MS",                sop: "SOP-AN-303", result: "0.03",           unit: "ratio",    spec: "≤ 1.5 % (target)",                       status: "OOS",  analyst: "QC Analyst" },
  { testName: "HCP",                  method: "CHO HCP ELISA",        sop: "SOP-AN-401", result: "50",             unit: "ppm",      spec: "≤ 100 ppm",                              status: "PASS", analyst: "QC Analyst" },
  { testName: "Host Cell DNA",        method: "qPCR",                 sop: "SOP-AN-402", result: "5",              unit: "pg/mg",    spec: "≤ 10 pg/mg",                             status: "PASS", analyst: "QC Analyst" },
  { testName: "Surfactant",           method: "LC-MS",                sop: "SOP-AN-403", result: "1",              unit: "µg/mg",    spec: "≤ 2 µg/mg",                              status: "PASS", analyst: "QC Analyst" },
];

export function QCReport() {
  const oosCount = ROWS.filter((r) => r.status === "OOS").length;
  const blocked = oosCount > 0;

  return (
    <div className="space-y-6">
      {/* OOS banner */}
      {oosCount > 0 && (
        <div className="flex items-start gap-3 rounded-md border border-[hsl(38_92%_50%/0.4)] bg-[hsl(48_100%_96%)] px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-[hsl(38_92%_45%)] mt-0.5 shrink-0" />
          <div className="text-[13px] text-foreground">
            <span className="font-medium">
              {oosCount} Out-of-Specification result requires investigation.
            </span>{" "}
            <span className="text-text-secondary">
              Investigate: media feed composition / harvest timing.
            </span>
          </div>
        </div>
      )}

      {/* Results table */}
      <Card kind="operational" className="p-0 overflow-hidden">
        <div className="px-5 py-3 border-b border-border-tertiary flex items-baseline justify-between">
          <div>
            <h3 className="text-section text-foreground">QC Release Results</h3>
            <p className="text-[12px] text-text-secondary">
              Batch CHO-r-hFSG-456-250308-2 · {ROWS.length} tests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">{ROWS.length - oosCount} PASS</Badge>
            {oosCount > 0 && <Badge variant="danger">{oosCount} OOS</Badge>}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Name</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>SOP</TableHead>
              <TableHead className="text-right">Result</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Specification</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Analyst</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((r) => {
              const oos = r.status === "OOS";
              return (
                <TableRow
                  key={r.testName}
                  className={oos ? "bg-[hsl(0_84%_60%/0.08)] hover:bg-[hsl(0_84%_60%/0.12)]" : ""}
                >
                  <TableCell className="font-medium text-foreground">{r.testName}</TableCell>
                  <TableCell className="text-text-secondary">{r.method}</TableCell>
                  <TableCell className="font-mono text-[12px] text-text-secondary">{r.sop}</TableCell>
                  <TableCell className="text-right tabular-nums text-foreground">{r.result}</TableCell>
                  <TableCell className="text-text-secondary">{r.unit}</TableCell>
                  <TableCell className="text-text-secondary">{r.spec}</TableCell>
                  <TableCell>
                    <Badge variant={oos ? "danger" : "success"}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-text-secondary">{r.analyst}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Sign-off panel */}
      <Card kind="operational" className="p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="text-section text-foreground">Report Sign-off</h3>
          <Badge variant="warning">Pending Supervisor Review</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr_auto] gap-4 items-end">
          <div className="space-y-1.5">
            <Label htmlFor="reviewer" className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">
              Reviewed by (Supervisor ID)
            </Label>
            <Input id="reviewer" defaultValue="10-032" readOnly className="font-mono" />
          </div>

          <div className="text-[12px] text-text-secondary md:pb-2">
            {blocked ? (
              <span className="inline-flex items-center gap-1.5 text-[hsl(0_84%_45%)]">
                <AlertTriangle className="h-3.5 w-3.5" />
                Sign-off blocked while {oosCount} OOS result is unresolved.
              </span>
            ) : (
              "All results within specification — ready for sign-off."
            )}
          </div>

          <Button disabled={blocked} className="md:justify-self-end">
            Sign &amp; Approve
          </Button>
        </div>
      </Card>
    </div>
  );
}
