import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { differenceInHours, format } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer, Tooltip as RechartsTooltip,
} from "recharts";
import {
  Brain, Lightbulb, Settings2, AlertTriangle, CheckCircle2,
  ExternalLink, Shield, Tag, TrendingUp, Zap, Info,
  MessageSquare, Send, Trash2, Download, Loader2, FileText,
  X as XIcon, Activity, Clock, ArrowRight, HelpCircle,
} from "lucide-react";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AI_RECIPES, getInsights, toggleRecipe, generateInsights,
  type AiRecipe, type AiInsight, type InsightSeverity,
} from "@/data/aiInsights";
import {
  sendMessage, getChatHistory, clearChatHistory, generateReportContent,
  type ChatMessage, type SparklineDataset,
} from "@/data/aiAssistant";
import { INTERFACES, RUNS } from "@/data/runData";

const SEVERITY_CONFIG: Record<InsightSeverity, { icon: typeof AlertTriangle; cls: string; label: string }> = {
  critical: { icon: AlertTriangle, cls: "bg-destructive/15 text-destructive", label: "Critical" },
  warning: { icon: AlertTriangle, cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300", label: "Warning" },
  info: { icon: Info, cls: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300", label: "Info" },
  success: { icon: CheckCircle2, cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", label: "OK" },
};

const CATEGORY_ICONS: Record<string, typeof Shield> = {
  quality: Shield,
  completeness: Tag,
  trend: TrendingUp,
  anomaly: Zap,
};

const READONLY_DISMISS_KEY = "insights-readonly-banner-dismissed";

// (deduplicated — config defined above)

// Generic fallback prompts (only used when no active run is detected)
const GENERIC_PROMPTS = [
  "What is the current process status?",
  "Show me pH trends and forecast",
  "Are there any alerts or deviations?",
  "Data quality summary",
];

/** Resolve the currently-active run from the dataset (first in_progress = R-456). */
function getActiveRunContext() {
  const run = RUNS[0]; // R-456 — Prod Bioreactor (#002)
  if (!run) return null;
  const start = new Date(run.start_time);
  const end = new Date(run.end_time);
  const now = new Date();
  const elapsedH = Math.max(0, differenceInHours(now < end ? now : end, start));
  const totalH = Math.max(1, differenceInHours(end, start));
  // Phase heuristic from elapsed/total
  const pct = elapsedH / totalH;
  const phase =
    pct < 0.15 ? "Lag / inoculation"
    : pct < 0.45 ? "Exponential growth"
    : pct < 0.75 ? "Production / fed-batch feed"
    : pct < 1   ? "Late stationary"
    : "Harvest";
  const nextMilestone =
    pct < 0.45 ? "Switch to fed-batch feed schedule"
    : pct < 0.75 ? "Peak titre — start daily HPLC sampling"
    : pct < 1   ? "Harvest decision window"
    : "Harvest complete";
  return { run, elapsedH, totalH, phase, nextMilestone };
}

/** Build run-specific contextual suggestions (always returns 3-4 items). */
function buildContextualPrompts(ctx: ReturnType<typeof getActiveRunContext>, insights: AiInsight[]): string[] {
  if (!ctx) return GENERIC_PROMPTS.slice(0, 4);
  const out: string[] = [];
  // Add prompts derived from top warnings
  const warn = insights.find((i) => i.severity === "critical") || insights.find((i) => i.severity === "warning");
  if (warn) out.push(`${warn.title} — analyse the trend`);
  out.push(`Summarise ${ctx.run.bioreactor_run} progress (currently in ${ctx.phase.toLowerCase()})`);
  out.push(`Compare current batch ${ctx.run.batch_id} pH profile to the previous batch`);
  out.push("Forecast dissolved O₂ for the next 8 hours");
  return out.slice(0, 4);
}

export default function AIPage() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(READONLY_DISMISS_KEY) === "1";
  });

  const insights = useMemo(() => getInsights(), []);
  const activeCtx = useMemo(() => getActiveRunContext(), []);
  const contextPrompts = useMemo(() => buildContextualPrompts(activeCtx, insights), [activeCtx, insights]);

  const handleToggle = useCallback((id: string) => {
    toggleRecipe(id);
    generateInsights();
    setTick((t) => t + 1);
  }, []);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    if (typeof window !== "undefined") window.localStorage.setItem(READONLY_DISMISS_KEY, "1");
  }, []);

  const goEvidence = useCallback((insight: AiInsight) => {
    const params: Record<string, string> = {};
    if (insight.interface_id) params.interface = insight.interface_id;
    if (insight.linked_run_id) params.run = insight.linked_run_id;
    const qs = new URLSearchParams(params).toString();
    navigate(`/data-storage${qs ? `?${qs}` : ""}`);
  }, [navigate]);

  const critCount = insights.filter((i) => i.severity === "critical").length;
  const warnCount = insights.filter((i) => i.severity === "warning").length;
  const activeRecipes = AI_RECIPES.filter((r) => r.enabled).length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Insights</h2>
            {bannerDismissed && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Info className="h-3 w-3" /> Read-only
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto text-xs gap-1"
              onClick={() => navigate("/reports")}
            >
              <FileText className="h-3.5 w-3.5" /> Go to Reports
            </Button>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSettingsOpen(true)} aria-label="AI configuration">
                  <Settings2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">AI configuration</TooltipContent>
            </Tooltip>
          </div>
          {!bannerDismissed && (
            <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                <span className="font-medium text-foreground">Insights are observations, not reports.</span>{" "}
                They are generated automatically from process data, are read-only, and cannot be signed,
                edited, or used as compliance evidence. For signed deliverables, see{" "}
                <button onClick={() => navigate("/reports")} className="underline hover:text-foreground">Reports</button>.
              </p>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 -mt-0.5 -mr-1" onClick={dismissBanner} aria-label="Dismiss">
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Current process summary — renders automatically from active run */}
        {activeCtx && (
          <Card className="border-primary/30 bg-primary/[0.02]">
            <CardContent className="p-4 flex flex-wrap items-start gap-x-6 gap-y-3">
              <div className="flex items-center gap-2 min-w-0">
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Current process</p>
                  <p className="text-sm font-semibold truncate">{activeCtx.run.bioreactor_run}</p>
                </div>
              </div>
              <SummaryStat label="Phase" value={activeCtx.phase} />
              <SummaryStat label="Elapsed" value={`${activeCtx.elapsedH} h / ${activeCtx.totalH} h`} />
              <SummaryStat label="Next milestone" value={activeCtx.nextMilestone} />
              <div className="flex items-start gap-2 ml-auto min-w-0 max-w-md">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Top warnings</p>
                  {insights.filter((i) => i.severity === "critical" || i.severity === "warning").slice(0, 2).map((i) => (
                    <p key={i.id} className="text-xs truncate">{i.title}</p>
                  ))}
                  {insights.filter((i) => i.severity === "critical" || i.severity === "warning").length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No active warnings</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiMini label="Total Insights" value={insights.length} />
          <KpiMini label="Critical" value={critCount} accent={critCount > 0 ? "critical" : "neutral"} />
          <KpiMini label="Warnings" value={warnCount} accent={warnCount > 0 ? "warning" : "neutral"} />
          <KpiMini
            label="Active Recipes"
            value={activeRecipes}
            tooltip="Recipes are pre-configured analytical rules that evaluate incoming process data automatically."
          />
        </div>

        <Tabs defaultValue="assistant" className="space-y-4">
          <TabsList>
            <TabsTrigger value="assistant" className="gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              Feed ({insights.length})
            </TabsTrigger>
          </TabsList>

          {/* ─── AI Assistant ─── */}
          <TabsContent value="assistant" className="space-y-0">
            <AiAssistantChat contextualPrompts={contextPrompts} />
          </TabsContent>

          {/* ─── Insights Feed ─── */}
          <TabsContent value="insights" className="space-y-3">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm font-medium">No insights to display</p>
                  <p className="text-xs">Enable recipes in the settings panel to generate insights.</p>
                </CardContent>
              </Card>
            ) : (
              insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} onOpenEvidence={() => goEvidence(insight)} />
              ))
            )}
          </TabsContent>
        </Tabs>

        {/* ─── AI Config slide-over ─── */}
        <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-primary" /> AI Configuration
              </SheetTitle>
              <SheetDescription className="text-xs">
                Enable or disable insight recipes. Changes regenerate insights immediately.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              {AI_RECIPES.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} onToggle={() => handleToggle(recipe.id)} />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</p>
      <p className="text-xs font-medium truncate">{value}</p>
    </div>
  );
}

// ── AI Assistant Chat ──

function AiAssistantChat({ contextualPrompts }: { contextualPrompts: string[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Pre-focus the input on mount so users can type immediately.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback((text?: string) => {
    const content = (text || input).trim();
    if (!content) return;

    setInput("");
    setIsTyping(true);

    // Simulate slight delay for realism
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    setTimeout(() => {
      const [, assistantMsg] = sendMessage(content);
      // We already pushed userMsg locally, sendMessage also pushes to history.
      // Sync state from history to avoid duplication:
      setMessages(getChatHistory());
      setIsTyping(false);
    }, 400 + Math.random() * 600);
  }, [input]);

  const handleClear = useCallback(() => {
    clearChatHistory();
    setMessages([]);
  }, []);

  const handleDownloadReport = useCallback(() => {
    const content = generateReportContent();
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `process-report-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  return (
    <Card className="flex flex-col h-[600px]">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Process AI Assistant</span>
          <Badge variant="secondary" className="text-[9px]">Analytical Engine</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleDownloadReport}>
            <Download className="h-3 w-3" /> Report
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleClear}>
            <MessageSquare className="h-3 w-3" /> New Chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <Brain className="h-10 w-10 text-muted-foreground/40" />
            <div>
              <p className="text-sm font-medium text-foreground">Process AI Assistant</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                Ask questions about your bioreactor processes, request trend analysis, forecasts, or generate comprehensive reports based on all available data.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {contextualPrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3"
                  onClick={() => handleSend(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span className="text-xs">Analyzing data...</span>
          </div>
        )}
      </div>

      {/* Input area with quick prompts */}
      <div className="border-t border-border p-3 space-y-2">
        {messages.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {contextualPrompts.map((prompt) => (
              <Button
                key={prompt}
                variant="outline"
                size="sm"
                className="text-[10px] h-auto py-1 px-2 whitespace-nowrap shrink-0"
                onClick={() => handleSend(prompt)}
                disabled={isTyping}
              >
                {prompt}
              </Button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about process status, parameter trends, forecasts, or request a report..."
            className="min-h-[40px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="sm"
            className="h-10 px-3"
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted"
        }`}
      >
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs [&_table]:w-full [&_th]:text-left [&_th]:p-1.5 [&_td]:p-1.5 [&_th]:border-b [&_th]:border-border [&_td]:border-b [&_td]:border-border/50 [&_h2]:text-base [&_h2]:mt-0 [&_h2]:mb-2 [&_h3]:text-sm [&_h3]:mt-3 [&_h3]:mb-1 [&_p]:text-xs [&_p]:leading-relaxed [&_li]:text-xs [&_blockquote]:text-xs [&_blockquote]:border-primary/30 [&_blockquote]:bg-primary/5 [&_blockquote]:rounded [&_blockquote]:px-3 [&_blockquote]:py-2">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}

        {/* Inline sparklines for trend responses */}
        {!isUser && message.sparklines && message.sparklines.length > 0 && (
          <div className="mt-3 space-y-3">
            {message.sparklines.map((spark, idx) => (
              <InlineSparkline key={idx} data={spark} />
            ))}
          </div>
        )}

        <p className={`text-[9px] mt-1.5 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </div>
  );
}

function InlineSparkline({ data }: { data: SparklineDataset }) {
  if (!data.points.length) return null;

  return (
    <div className="rounded-md border border-border/60 bg-background/60 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-foreground">{data.label}</span>
        <span className="text-[10px] text-muted-foreground">
          Spec: {data.min_spec}–{data.max_spec} {data.unit}
        </span>
      </div>
      <ResponsiveContainer width="100%" height={100}>
        <LineChart data={data.points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <ReferenceLine y={data.min_spec} stroke="hsl(var(--destructive))" strokeDasharray="4 2" strokeOpacity={0.5} />
          <ReferenceLine y={data.max_spec} stroke="hsl(var(--destructive))" strokeDasharray="4 2" strokeOpacity={0.5} />
          <XAxis dataKey="h" hide />
          <YAxis
            domain={[
              Math.min(data.min_spec, ...data.points.map(p => p.v)) * 0.98,
              Math.max(data.max_spec, ...data.points.map(p => p.v)) * 1.02,
            ]}
            hide
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { h: number; v: number };
              return (
                <div className="bg-card border rounded px-2 py-1 text-[10px] shadow">
                  <span className="font-medium">{p.v.toFixed(2)} {data.unit}</span>
                  <span className="text-muted-foreground ml-1.5">@ {p.h.toFixed(1)}h</span>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="v"
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "hsl(var(--primary))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Existing sub-components ──

function InsightCard({ insight, onOpenEvidence }: { insight: AiInsight; onOpenEvidence: () => void }) {
  const cfg = SEVERITY_CONFIG[insight.severity];
  const SevIcon = cfg.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] font-bold uppercase ${cfg.cls}`}>
            <SevIcon className="h-3 w-3" />
            {cfg.label}
          </span>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">{insight.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.explanation}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            {insight.interface_id && (
              <Badge variant="outline" className="text-[10px]">
                {INTERFACES.find((i) => i.id === insight.interface_id)?.display_name || insight.interface_id}
              </Badge>
            )}
            <span className="font-mono">{insight.recipe_id}</span>
            {insight.evidence_record_ids.length > 0 && (
              <span>{insight.evidence_record_ids.length} evidence record(s)</span>
            )}
          </div>
          {insight.evidence_record_ids.length > 0 && (
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={onOpenEvidence}>
              <ExternalLink className="h-3 w-3" /> Open Evidence
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RecipeCard({ recipe, onToggle }: { recipe: AiRecipe; onToggle: () => void }) {
  const CategoryIcon = CATEGORY_ICONS[recipe.category] || Shield;

  return (
    <Card className={`transition-colors ${recipe.enabled ? "border-primary/30" : "opacity-60"}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <Checkbox checked={recipe.enabled} onCheckedChange={onToggle} className="mt-1" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryIcon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{recipe.name}</h3>
            <Badge variant="secondary" className="text-[9px] capitalize">{recipe.category}</Badge>
            <span className="text-[10px] font-mono text-muted-foreground ml-auto">{recipe.id}</span>
          </div>
          <p className="text-xs text-muted-foreground">{recipe.description}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.applies_to.map((pattern) => (
              <Badge key={pattern} variant="outline" className="text-[9px]">{pattern}</Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiMini({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${accent ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
