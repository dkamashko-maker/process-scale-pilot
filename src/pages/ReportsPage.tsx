import { useState, useMemo, useCallback } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  FileText, Archive, Clock, AlertTriangle, CheckCircle2, Brain,
  Send, Settings2, ExternalLink, Lock, Shield, MessageSquare,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { KpiCard } from "@/components/shared/KpiCard";
import { RUNS } from "@/data/runData";
import {
  getReports, updateReport, signReport, createNewVersion,
  getReportAlertsAndInsights, type Report,
} from "@/data/reportsStore";

// ── Deterministic AI chat ──

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
    const list = failedQc.map((r) => `- **${r.parameter}**: ${r.value} ${r.unit} → ${r.status}`).join("\n");
    return `**QC Failures**\n\n${list}\n\nThese parameters exceeded their catalog specification range. Review the timeseries data for the corresponding time windows.`;
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
  return `I can help with:\n- **"summary"** – Report overview\n- **"alerts"** – Alert details\n- **"qc"** – QC parameter analysis\n- **"compare"** – Batch/run context\n- **"recommend"** – Next steps\n\nPlease ask about any of these topics for report ${report.report_no}.`;
}

// ── Status badge helper ──

function StatusBadge({ status }: { status: Report["status"] }) {
  const variants: Record<string, string> = {
    "Archive": "bg-muted text-muted-foreground",
    "In Progress": "bg-primary/10 text-primary",
    "Issues": "bg-destructive/10 text-destructive",
  };
  return <Badge className={`${variants[status] || ""} text-xs`}>{status}</Badge>;
}

// ══════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════

export default function ReportsPage() {
  const { toast } = useToast();
  const { user, isManager, canLogEvents } = useAuth();
  const navigate = useNavigate();

  const reports = useMemo(() => getReports(), []);
  const [activeReportId, setActiveReportId] = useState<string>(reports[0]?.report_id || "");
  const [comment, setComment] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showAiConfig, setShowAiConfig] = useState(false);
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

  // KPI counts
  const archiveCount = reports.filter((r) => r.status === "Archive").length;
  const inProgressCount = reports.filter((r) => r.status === "In Progress").length;
  const issuesCount = reports.filter((r) => r.status === "Issues").length;

  const handleSign = useCallback(() => {
    if (!activeReport || !user) return;
    if (activeReport.signed_by) {
      // Already signed → create new version
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

  const handleChat = useCallback(() => {
    if (!chatInput.trim() || !activeReport) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const response = generateAiResponse(userMsg, activeReport, reportAlerts, reportInsights);
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }, { role: "ai", text: response }]);
  }, [chatInput, activeReport, reportAlerts, reportInsights]);

  const isSigned = !!activeReport?.signed_by;

  return (
    <div className="space-y-4 p-4 max-w-[1600px] mx-auto">
      {/* A) Active loaded report header */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Loaded Report</p>
              <h2 className="text-lg font-bold">{activeReport?.report_no || "–"}</h2>
            </div>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div>
              <span className="text-muted-foreground">Report Date: </span>
              <span className="font-medium">{activeReport ? format(new Date(activeReport.report_date), "MMM d, yyyy HH:mm") : "–"}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Batch No: </span>
              <span className="font-medium">{linkedRun?.batch_id || "–"}</span>
            </div>
            <StatusBadge status={activeReport?.status || "Archive"} />
            {isSigned && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Lock className="h-3 w-3" /> Signed
              </Badge>
            )}
            <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate(`/run/${activeReport?.linked_run_id}`)}>
              <ExternalLink className="h-3.5 w-3.5" /> View Run
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* B) KPI counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Reports (Archive)" value={archiveCount} subtitle="Completed & signed" animationDelay={0} />
        <KpiCard label="In Progress" value={inProgressCount} subtitle="Under review" animationDelay={100} />
        <KpiCard label="Reports with Issues" value={issuesCount} subtitle="Require attention" animationDelay={200} />
        <KpiCard label="Alerts / Insights" value={`${reportAlerts.length} / ${reportInsights.length}`} subtitle="For active report" animationDelay={300} />
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: Reports table + QC */}
        <div className="lg:col-span-2 space-y-4">
          {/* C) Reports Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Archive className="h-4 w-4" /> Reports Table
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <ScrollArea className="h-[180px]">
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
                          <TableCell className="text-xs">{run?.batch_id || "–"}</TableCell>
                          <TableCell><StatusBadge status={r.status} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* D) QC Table */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" /> QC Results
                  {isSigned && <Badge variant="outline" className="text-[10px] gap-1"><Lock className="h-2.5 w-2.5" /> Locked</Badge>}
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-xs h-7" disabled>
                  Populate from HPLC summary
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Parameter</TableHead>
                    <TableHead className="text-xs">Value</TableHead>
                    <TableHead className="text-xs">Unit</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeReport?.qc_rows.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-xs font-medium">{row.parameter}</TableCell>
                      <TableCell className="text-xs font-mono">{row.value}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.unit}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${row.status === "Pass" ? "border-green-500/50 text-green-600" : row.status === "Fail" ? "border-destructive/50 text-destructive" : "border-yellow-500/50 text-yellow-600"}`}
                        >
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* E) Alerts & Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" /> Alerts
                  <Badge variant="secondary" className="text-[10px]">{reportAlerts.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[140px]">
                  {reportAlerts.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">No alerts</p>
                  ) : (
                    <div className="space-y-2">
                      {reportAlerts.map((a) => (
                        <div key={a.alert_id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                          <Badge variant={a.severity === "critical" ? "destructive" : "outline"} className="text-[10px] mt-0.5 shrink-0">
                            {a.severity}
                          </Badge>
                          <p className="text-xs">{a.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3 px-4">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4" /> Insights
                  <Badge variant="secondary" className="text-[10px]">{reportInsights.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <ScrollArea className="h-[140px]">
                  {reportInsights.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4 text-center">No insights</p>
                  ) : (
                    <div className="space-y-2">
                      {reportInsights.map((ins) => (
                        <div key={ins.id} className="flex items-start gap-2 p-2 rounded bg-muted/50">
                          <Badge variant="outline" className={`text-[10px] mt-0.5 shrink-0 ${ins.severity === "critical" ? "border-destructive text-destructive" : ins.severity === "warning" ? "border-yellow-500 text-yellow-600" : ins.severity === "success" ? "border-green-500 text-green-600" : ""}`}>
                            {ins.severity}
                          </Badge>
                          <div>
                            <p className="text-xs font-medium">{ins.title}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{ins.explanation.slice(0, 120)}…</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right column: AI Chat + Sign */}
        <div className="space-y-4">
          {/* F) Ask AI */}
          <Card className="flex flex-col">
            <CardHeader className="py-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" /> Ask AI
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setShowAiConfig(true)}>
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Ask about run/batch insights, comparison, explanation and details
              </p>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex-1 flex flex-col">
              <ScrollArea className="flex-1 h-[280px] border rounded-md p-3 mb-3 bg-muted/30">
                {chatMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic text-center pt-8">
                    Type "summary", "alerts", "qc", "compare", or "recommend" to get started.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {chatMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[90%] rounded-lg px-3 py-2 text-xs ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
                          <pre className="whitespace-pre-wrap font-sans">{msg.text}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              <div className="flex gap-2">
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about this report…"
                  className="text-xs h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleChat()}
                />
                <Button size="sm" className="h-8 w-8 p-0" onClick={handleChat}>
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* G) Sign + Comment */}
          <Card>
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" /> Sign & Comment
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
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
              <Separator />
              <div className="space-y-2">
                {isSigned && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5" />
                    <span>Signed by <strong>{activeReport?.signed_by}</strong> at {activeReport?.signed_at ? format(new Date(activeReport.signed_at), "MMM d, HH:mm") : "–"}</span>
                  </div>
                )}
                {isManager && (
                  <Button
                    size="sm"
                    className="w-full text-xs h-8"
                    onClick={handleSign}
                  >
                    {isSigned ? "Create New Version" : "Sign Report"}
                  </Button>
                )}
                {!isManager && !isSigned && (
                  <p className="text-[10px] text-muted-foreground italic">Only a Manager can sign reports.</p>
                )}
                {activeReport && (
                  <p className="text-[10px] text-muted-foreground">Version: {activeReport.version} | Created by: {activeReport.created_by}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* AI Config modal */}
      <Dialog open={showAiConfig} onOpenChange={setShowAiConfig}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">AI Configuration</DialogTitle>
            <DialogDescription className="text-xs">
              Configure AI response behavior for report analysis.
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
            <p className="text-[10px] text-muted-foreground italic">
              Prototype: AI responses are deterministic and based on linked report data. No external model calls.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
