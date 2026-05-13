import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";

type Severity = "MEDIUM" | "HIGH";
type Issue =
  | "Excel serial timestamp"
  | "Equipment ID correction"
  | "Free-text comment → structured event";

interface Entry {
  ts: string;
  instrument: string;
  issue: Issue;
  action: string;
  severity: Severity;
}

const ENTRIES: Entry[] = [
  // Excel serial timestamp conversions
  { ts: "2024-10-15 06:00 UTC", instrument: "CFG-003", issue: "Excel serial timestamp",
    action: "Auto-converted to ISO 8601 · ledger event logged", severity: "MEDIUM" },
  { ts: "2025-04-24 08:32 UTC", instrument: "VW-03", issue: "Excel serial timestamp",
    action: "Auto-converted to ISO 8601 · ledger event logged", severity: "MEDIUM" },
  { ts: "2025-04-25 08:32 UTC", instrument: "LPZ-03", issue: "Excel serial timestamp",
    action: "Auto-converted to ISO 8601 · ledger event logged", severity: "MEDIUM" },
  { ts: "2024-10-17 11:30 UTC", instrument: "DPY-01", issue: "Excel serial timestamp",
    action: "Auto-converted to ISO 8601 · ledger event logged", severity: "MEDIUM" },
  // Equipment ID corrections
  { ts: "2025-04-23 14:20 UTC", instrument: "FPLC-01", issue: "Equipment ID correction",
    action: "Source value \"UF-03\" corrected to \"FPLC-01\" · flagged in metadata panel", severity: "MEDIUM" },
  { ts: "2024-10-17 11:30 UTC", instrument: "DPY-01", issue: "Equipment ID correction",
    action: "Source value \"VW-03\" corrected to \"DPY-01\" · flagged in metadata panel", severity: "MEDIUM" },
  // Free-text → structured events
  { ts: "2024-10-15 06:45 UTC", instrument: "FP-02", issue: "Free-text comment → structured event",
    action: "Comment \"needle change at 15,000 vials\" converted to ALCOA-traceable intervention event", severity: "MEDIUM" },
  { ts: "2024-10-17 15:42 UTC", instrument: "CAP-01", issue: "Free-text comment → structured event",
    action: "Comment \"Rejected 3 caps due to skewed crimp\" converted to deviation event", severity: "MEDIUM" },
];

function severityBadge(s: Severity) {
  return s === "HIGH"
    ? <Badge variant="warning">HIGH</Badge>
    : <Badge variant="neutral">MEDIUM</Badge>;
}

const ISSUE_TONE: Record<Issue, string> = {
  "Excel serial timestamp": "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  "Equipment ID correction": "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "Free-text comment → structured event": "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function DataQualityLog() {
  const [open, setOpen] = useState(true);

  const summary = {
    timestamps: ENTRIES.filter((e) => e.issue === "Excel serial timestamp").length,
    ids: ENTRIES.filter((e) => e.issue === "Equipment ID correction").length,
    comments: ENTRIES.filter((e) => e.issue === "Free-text comment → structured event").length,
  };

  return (
    <Card kind="operational" className="p-0 overflow-hidden mb-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full p-4 border-b border-border-tertiary flex items-center gap-3 hover:bg-accent/30 transition-colors text-left"
      >
        {open
          ? <ChevronDown className="h-4 w-4 text-text-secondary" />
          : <ChevronRight className="h-4 w-4 text-text-secondary" />}
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <div className="flex-1">
          <h3 className="text-[14px] font-medium text-foreground">Data Quality Log</h3>
          <p className="text-[12px] text-text-secondary">
            Auto-detected ingestion issues · resolved by pipeline rules
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] flex-wrap">
          <Badge variant="neutral">{summary.timestamps} timestamp conv.</Badge>
          <Badge variant="warning">{summary.ids} ID corrections</Badge>
          <Badge variant="neutral">{summary.comments} comment → event</Badge>
        </div>
      </button>

      {open && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[170px]">Timestamp</TableHead>
              <TableHead className="w-[110px]">Instrument</TableHead>
              <TableHead className="w-[260px]">Issue type</TableHead>
              <TableHead>Auto-action taken</TableHead>
              <TableHead className="w-[100px]">Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ENTRIES.map((e, i) => (
              <TableRow key={i}>
                <TableCell className="font-mono text-[12px] tabular-nums text-foreground">
                  {e.ts}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" className="font-mono">{e.instrument}</Badge>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] ${ISSUE_TONE[e.issue]}`}>
                    {e.issue}
                  </span>
                </TableCell>
                <TableCell className="text-[12px] text-text-secondary">{e.action}</TableCell>
                <TableCell>{severityBadge(e.severity)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}
