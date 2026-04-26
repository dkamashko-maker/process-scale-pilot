import { useState, useMemo, useCallback, Fragment } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText, Archive, AlertTriangle, CheckCircle2, Brain,
  Send, Settings2, ExternalLink, Lock, Shield, MessageSquare, ChevronDown, ChevronRight,
  PenLine, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { OverviewHeader } from "@/components/shared/PageHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { RUNS } from "@/data/runData";
import {
  getReports, updateReport, signReport, createNewVersion,
  getReportAlertsAndInsights, type Report,
} from "@/data/reportsStore";

// ── Deterministic generator responses ──

function generateAiResponse(query: string, report: Report, alerts: any[], insights: any[]): string {
  const run = RUNS.find((r) => r.run_id === report.linked_run_id);
  const q = query.toLowerCase();
  const failedQc = report.qc_rows.filter((r) => r.status === "Fail");
  const passedQc = report.qc_rows.filter((r) => r.status === "Pass");

  if (q.includes("summary") || q.includes("overview")) {
    return `**Report ${report.report_no} Summary**\n\nLinked to batch ${run?.batch_id || "N/A"} (${run?.bioreactor_run || "N/A"}).\n- QC results: ${passedQc.length} passed, ${failedQc.length} failed out of ${report.qc_rows.length} parameters.\n- ${alerts.length} alert(s) and ${insights.length} insight(s) associated.\n- Status: **${report.status}**${report.signed_by ? ` | Signed by ${report.signed_by}` : " | Unsigned"}\n\n*This is a monitoring-only summary. No instrument actions are implied.*`;
  }
  if (q.includes("alert") || q.includes("issue") || q.includes("problem")) {
    if (alerts.length === 0) return "No alerts are linked to this report. All monitored parameters appear nominal.";
    const list = alerts.slice(0, 5).map((a: any) => `- **${a.severity}**: ${a.message}`).join("\n");
    return `**Alerts for ${report.report_no}**\n\n${list}\n\n${alerts.length > 5 ? `…and ${alerts.length - 5} more.` : ""}\n\nRecommendation: Review out-of-range episodes in the run monitoring view for root cause analysis.`;
  }
  if (q.includes("qc") || q.includes("quality") || q.includes("parameter")) {
    if (failedQc.length === 0) return `All ${report.qc_rows.length} QC parameters passed specification. No deviations detected.`;
    const list = failedQc.map((r) => `- **${r.parameter}**: ${r.value} → ${r.status} (${r.specification})`).join("\n");
    return `**QC Failures**\n\n${list}\n\nReview the corresponding assay SOPs and timeseries data for root cause analysis.`;
  }
  if (q.includes("compare") || q.includes("batch") || q.includes("run")) {
    return `**Batch Context**\n\nRun: ${run?.bioreactor_run || "N/A"}\nCell line: ${run?.cell_line || "N/A"}\nStrategy: ${run?.process_strategy || "N/A"}\nDuration: ${run?.start_time ? format(new Date(run.start_time), "MMM d") : "?"} – ${run?.end_time ? format(new Date(run.end_time), "MMM d, yyyy") : "?"}\n\nTo compare across runs, navigate to the Integrated Device Dashboard and use the multi-run analytics view.`;
  }
  if (q.includes("recommend") || q.includes("next") || q.includes("action")) {
    const recs: string[] = [];
    if (failedQc.length > 0) recs.push("Investigate QC failures and document root cause in the comment field.");
    if (alerts.length > 0) recs.push("Review linked alerts and confirm whether deviations are process-related or data artifacts.");
    if (!report.signed_by) recs.push("Once review is complete, a Manager can sign the report to lock QC data.");
    if (recs.length === 0) recs.push("Report is fully signed and archived. No further actions required.");
    return `**Recommended Next Steps**\n\n${recs.map((r, i) => `${i + 1}. ${r}`).join("\n")}\n\n*Note: Data Vest is a monitoring system. All recommendations are observational.*`;
  }
  return `I can help with: summary, alerts, QC analysis, batch comparison, or recommendations.`;
}

// ── Status badge — matches global pill system ──
function StatusBadge({ status }: { status: Report["status"] }) {
  if (status === "Archive")     return <Badge variant="neutral">Archive</Badge>;
  if (status === "In Progress") return <Badge variant="warning">In Progress</Badge>;
  return <Badge variant="danger">Issues</Badge>;
}

// QC row pass/fail badge
function QcStatusBadge({ status }: { status: "Pass" | "Fail" | "Review" }) {
  if (status === "Pass")   return <Badge variant="success">PASS</Badge>;
  if (status === "Fail")   return <Badge variant="danger">NOT PASS</Badge>;
  return <Badge variant="warning">REVIEW</Badge>;
}

// Quick-action prompts shown above generator input
const QUICK_ACTIONS: Array<{ label: string; query: string }> = [
  { label: "Summary",          query: "summary" },
  { label: "Alerts",           query: "alerts" },
  { label: "QC analysis",      query: "qc" },
  { label: "Compare batches",  query: "compare" },
  { label: "Recommendations",  query: "recommend" },
];

// ══════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════

export default function ReportsPage() {
  const { toast } = useToast();
  const { user, isManager, canLogEvents } = useAuth();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const reports = useMemo(() => getReports(), []);
  const [activeReportId, setActiveReportId] = useState<string>(() => {
    const fromQuery = searchParams.get("active");
    if (fromQuery && reports.some((r) => r.report_id === fromQuery)) return fromQuery;
    return reports[0]?.report_id || "";
  });
  const [comment, setComment] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showAiConfig, setShowAiConfig] = useState(false);
  const [reportsTableOpen, setReportsTableOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [, forceUpdate] = useState(0);

  const activeReport = useMemo(
    () => reports.find((r) => r.report_id === activeReportId) || reports[0],
    [activeReportId, reports],
  );

  const linkedRun = useMemo(
    () => RUNS.find((r) => r.run_id === activeReport?.linked_run_id),
    [activeReport],
  );

  const { alerts: reportAlerts, insights: reportInsights } = useMemo(
    () => activeReport ? getReportAlertsAndInsights(activeReport) : { alerts: [], insights: [] },
    [activeReport],
  );

  const handleSign = useCallback(() => {
    if (!activeReport || !user) return;
    if (activeReport.signed_by) {
      const newReport = createNewVersion(activeReport.report_id, user.name);
      if (newReport) {
        setActiveReportId(newReport.report_id);
        toast({ title: "New version created", description: `Report ${newReport.report_no} v${newReport.version} created for editing.` });
        forceUpdate((n) => n + 1);
      }
      return;
    }
    const signed = signReport(activeReport.report_id, user.name);
    if (signed) {
      if (comment) {
        signed.comment = comment;
        updateReport(signed);
      }
      toast({ title: "Report signed", description: `Signed by ${user.name} at ${format(new Date(), "HH:mm")}` });
      forceUpdate((n) => n + 1);
    }
  }, [activeReport, user, comment, toast]);

  const handleSaveComment = useCallback(() => {
    if (!activeReport || activeReport.signed_by) return;
    const updated = { ...activeReport, comment: comment || null };
    updateReport(updated);
    toast({ title: "Comment saved" });
    forceUpdate((n) => n + 1);
  }, [activeReport, comment, toast]);

  const runQuery = useCallback((q: string) => {
    if (!activeReport) return;
    const response = generateAiResponse(q, activeReport, reportAlerts, reportInsights);
    setChatMessages((prev) => [...prev, { role: "user", text: q }, { role: "ai", text: response }]);
    setGeneratorOpen(true);
  }, [activeReport, reportAlerts, reportInsights]);

  const handleChat = useCallback(() => {
    if (!chatInput.trim()) return;
    runQuery(chatInput.trim());
    setChatInput("");
  }, [chatInput, runQuery]);

  const isSigned = !!activeReport?.signed_by;
  const passCount = activeReport?.qc_rows.filter((r) => r.status === "Pass").length ?? 0;
  const totalCount = activeReport?.qc_rows.length ?? 0;
  const allPass = passCount === totalCount && totalCount > 0;

  const toggleRow = (i: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 max-w-[1400px] mx-auto stack-page">
        <OverviewHeader
          title="Reports"
          description="Document-centric view: review the latest signed/unsigned report and generate new content. For observational analytics, see Insights."
        />

        {/* ─────────── 1. REPORT SELECTOR HEADER — visually dominant ─────────── */}
        <div
          className="rounded-xl bg-card p-5"
          style={{ border: "1px solid hsl(var(--border))" }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">Latest Report</p>
                <StatusBadge status={activeReport?.status || "Archive"} />
                {activeReport && (
                  <Badge variant="neutral" className="gap-1">v{activeReport.version}</Badge>
                )}
                {isSigned && (
                  <Badge variant="success" className="gap-1">
                    <Lock className="h-2.5 w-2.5" /> Signed
                  </Badge>
                )}
              </div>
              <h2 className="text-[18px] font-medium leading-tight mt-1.5 text-foreground">
                {activeReport?.report_no || "—"}
              </h2>
              <p className="text-[12px] text-text-secondary mt-1">
                {activeReport ? format(new Date(activeReport.report_date), "MMM d, yyyy HH:mm") : "—"}
                {linkedRun?.batch_id && <> · Batch <span className="font-mono">{linkedRun.batch_id}</span></>}
                {activeReport?.created_by && <> · Created by {activeReport.created_by}</>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/run/${activeReport?.linked_run_id}`)}>
                <ExternalLink className="h-3.5 w-3.5" /> View Run
              </Button>
              {isManager && (
                <Button size="sm" onClick={handleSign}>
                  {isSigned ? "Create New Version" : "Sign Report"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ─────────── 2. QC REPORT CONTENT ─────────── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-[16px] font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> QC Report
                {isSigned && (
                  <Badge variant="success" className="gap-1"><Lock className="h-2.5 w-2.5" /> Locked</Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {totalCount > 0 && (
                  allPass ? (
                    <Badge variant="success">{passCount}/{totalCount} PASS</Badge>
                  ) : (
                    <span className="text-[12px] text-text-secondary tabular-nums">
                      <span className="text-status-active font-medium">{passCount}</span>
                      {" / "}
                      <span className="text-foreground font-medium">{totalCount}</span>
                      {" parameters pass"}
                      <Tooltip>
                        <TooltipTrigger className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full border border-border-tertiary text-[10px] text-text-secondary hover:text-foreground">?</TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs max-w-xs">
                          Numerator = parameters meeting specification. Denominator = total QC parameters reviewed for this report.
                        </TooltipContent>
                      </Tooltip>
                    </span>
                  )
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[28px]" />
                    <TableHead className="text-xs">QA Parameter</TableHead>
                    <TableHead className="text-xs">Result</TableHead>
                    <TableHead className="text-xs">Reference / Target</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Assay / Method</TableHead>
                    <TableHead className="text-xs">Responsible</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReport?.qc_rows.map((row, i) => {
                    const expanded = expandedRows.has(i);
                    return (
                      <Fragment key={i}>
                        <TableRow
                          className={`cursor-pointer ${row.status === "Fail" ? "bg-destructive/5" : ""}`}
                          style={{ minHeight: 44 }}
                          onClick={() => toggleRow(i)}
                        >
                          <TableCell className="py-2.5">
                            <button className="text-text-secondary hover:text-foreground" aria-label="Toggle details">
                              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                            </button>
                          </TableCell>
                          <TableCell className="text-xs font-medium py-2.5">{row.parameter}</TableCell>
                          <TableCell className="text-xs font-mono py-2.5">{row.value}</TableCell>
                          <TableCell className="text-xs text-text-secondary py-2.5">{row.reference}</TableCell>
                          <TableCell className="py-2.5"><QcStatusBadge status={row.status} /></TableCell>
                          <TableCell className="py-2.5">
                            <div className="text-xs leading-tight">{row.assayMethod}</div>
                            <div className="text-[11px] font-mono text-text-secondary mt-0.5">{row.assayNumber}</div>
                          </TableCell>
                          <TableCell className="text-xs py-2.5">{row.responsiblePerson}</TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow className="bg-secondary/40">
                            <TableCell />
                            <TableCell colSpan={6} className="py-3">
                              <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium mb-1">
                                Specification
                              </div>
                              <p className="text-[13px] text-foreground leading-relaxed">
                                {row.specification}
                              </p>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ─────────── 3. SIGN & COMMENT ─────────── */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-[14px] font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" /> Sign &amp; Comment
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-0">
            {/* Comment input */}
            <div>
              <Label className="text-xs">Comment</Label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add review comment…"
                className="text-xs mt-1 h-20 resize-none"
                disabled={isSigned && !isManager}
              />
              {!isSigned && canLogEvents && (
                <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={handleSaveComment}>
                  Save Comment
                </Button>
              )}
            </div>

            {/* Full-width 0.5px divider */}
            <div className="my-4" style={{ borderTop: "0.5px solid hsl(var(--border-tertiary))" }} />

            {/* Signature confirmation block — distinct treatment */}
            {isSigned ? (
              <div
                className="flex items-start gap-3 p-3 rounded-md bg-[hsl(var(--pill-success-bg))]/40"
                style={{ borderLeft: "3px solid hsl(var(--pill-success-fg))" }}
              >
                <PenLine className="h-4 w-4 mt-0.5" style={{ color: "hsl(var(--pill-success-fg))" }} />
                <div className="text-[13px] leading-relaxed">
                  <span className="font-medium">Signed by {activeReport?.signed_by}</span>
                  <span className="text-text-secondary"> · </span>
                  <span>{activeReport?.signed_at ? format(new Date(activeReport.signed_at), "MMM d, yyyy HH:mm") : "—"}</span>
                  <span className="text-text-secondary"> · </span>
                  <span>Version {activeReport?.version}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-[12px] text-text-secondary">
                <Lock className="h-3.5 w-3.5" />
                <span>Not signed yet.</span>
                {!isManager && (
                  <span className="italic">Only a Manager can sign reports.</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─────────── 4. REPORT GENERATOR — visually lighter, collapsed by default ─────────── */}
        <Collapsible open={generatorOpen} onOpenChange={setGeneratorOpen}>
          <div className="rounded-lg bg-secondary" style={{ border: "0.5px solid hsl(var(--border-tertiary))" }}>
            <CollapsibleTrigger asChild>
              <button className="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-secondary/70 transition-colors rounded-lg">
                <div className="flex items-center gap-2 text-[13px] font-medium">
                  <Sparkles className="h-4 w-4 text-text-secondary" />
                  Report Generator
                  <span className="text-[11px] text-text-secondary font-normal">— draft summaries, QC analysis, recommendations</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowAiConfig(true); }}
                    className="h-7 w-7 inline-flex items-center justify-center rounded text-text-secondary hover:text-foreground hover:bg-background/60"
                    aria-label="Generator settings"
                  >
                    <Settings2 className="h-3.5 w-3.5" />
                  </button>
                  {generatorOpen
                    ? <ChevronDown className="h-4 w-4 text-text-secondary" />
                    : <ChevronRight className="h-4 w-4 text-text-secondary" />}
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-3">
                {/* Quick actions */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_ACTIONS.map((a) => (
                    <Button
                      key={a.label}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[12px] px-2.5 bg-background"
                      onClick={() => runQuery(a.query)}
                    >
                      {a.label}
                    </Button>
                  ))}
                </div>

                {/* Conversation */}
                <ScrollArea className="h-[220px] rounded-md p-3 bg-background" style={{ border: "0.5px solid hsl(var(--border-tertiary))" }}>
                  {chatMessages.length === 0 ? (
                    <p className="text-[12px] text-text-secondary italic text-center pt-10">
                      Pick a quick action above, or ask a custom question below.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {chatMessages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[90%] rounded-lg px-3 py-2 text-[12px] ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                            <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {/* Custom question input */}
                <div className="flex gap-2">
                  <Input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Custom question…"
                    className="text-[12px] h-8 bg-background"
                    onKeyDown={(e) => e.key === "Enter" && handleChat()}
                  />
                  <Button size="sm" className="h-8 w-8 p-0" onClick={handleChat}>
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* ─────────── 5. ALL REPORTS ARCHIVE ─────────── */}
        <Collapsible open={reportsTableOpen} onOpenChange={setReportsTableOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardTitle className="text-[14px] font-medium flex items-center gap-2">
                  <Archive className="h-4 w-4" /> All Reports
                  <Badge variant="neutral" className="text-[10px]">{reports.length}</Badge>
                  <span className="ml-auto">
                    {reportsTableOpen ? <ChevronDown className="h-4 w-4 text-text-secondary" /> : <ChevronRight className="h-4 w-4 text-text-secondary" />}
                  </span>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[220px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Report No</TableHead>
                        <TableHead className="text-xs">Report Date</TableHead>
                        <TableHead className="text-xs">Batch No</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reports.map((r) => {
                        const run = RUNS.find((ru) => ru.run_id === r.linked_run_id);
                        return (
                          <TableRow
                            key={r.report_id}
                            className={`cursor-pointer transition-colors ${r.report_id === activeReportId ? "bg-accent" : "hover:bg-muted/50"}`}
                            onClick={() => {
                              setActiveReportId(r.report_id);
                              setComment(r.comment || "");
                              setChatMessages([]);
                            }}
                          >
                            <TableCell className="text-xs font-medium">{r.report_no}</TableCell>
                            <TableCell className="text-xs">{format(new Date(r.report_date), "MMM d, yyyy")}</TableCell>
                            <TableCell className="text-xs">{run?.batch_id || "—"}</TableCell>
                            <TableCell><StatusBadge status={r.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Linked context — small footer linking out to Insights */}
        <div
          className="rounded-md p-3 bg-secondary flex flex-wrap items-center justify-between gap-3"
          style={{ border: "0.5px dashed hsl(var(--border-tertiary))" }}
        >
          <div className="flex items-center gap-3 text-[11px] text-text-secondary">
            <span className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              {reportAlerts.length} alert{reportAlerts.length === 1 ? "" : "s"} linked
            </span>
            <span className="flex items-center gap-1">
              <Brain className="h-3.5 w-3.5" />
              {reportInsights.length} insight{reportInsights.length === 1 ? "" : "s"} linked
            </span>
            <span className="italic">— observational context, not part of the signed report</span>
          </div>
          <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => navigate("/ai")}>
            View in Insights <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* AI Config modal */}
        <Dialog open={showAiConfig} onOpenChange={setShowAiConfig}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">Generator Configuration</DialogTitle>
              <DialogDescription className="text-xs">
                Configure response behaviour for report drafting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">Response Recipe</Label>
                <div className="space-y-1.5">
                  {["Detailed Analysis", "Executive Summary", "Technical QC Focus"].map((recipe) => (
                    <div key={recipe} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                      <input type="radio" name="recipe" defaultChecked={recipe === "Detailed Analysis"} className="h-3 w-3" />
                      <span className="text-xs">{recipe}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-text-secondary italic">
                Prototype: responses are deterministic and based on linked report data. No external model calls.
              </p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Hidden references to keep imports valid */}
        <span className="hidden"><FileText className="h-0 w-0" /><MessageSquare className="h-0 w-0" /></span>
      </div>
    </TooltipProvider>
  );
}
