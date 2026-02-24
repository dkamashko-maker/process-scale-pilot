import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  Brain, Lightbulb, Settings2, AlertTriangle, CheckCircle2,
  ExternalLink, Shield, Tag, TrendingUp, Zap, Info,
  MessageSquare, Send, Trash2, Download, Loader2,
} from "lucide-react";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AI_RECIPES, getInsights, toggleRecipe, generateInsights,
  type AiRecipe, type AiInsight, type InsightSeverity,
} from "@/data/aiInsights";
import {
  sendMessage, getChatHistory, clearChatHistory, generateReportContent,
  type ChatMessage,
} from "@/data/aiAssistant";
import { INTERFACES } from "@/data/runData";

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

const QUICK_PROMPTS = [
  "What is the current process status?",
  "Show me pH trends and forecast",
  "Are there any alerts or deviations?",
  "Data quality summary",
  "Generate a full process report",
];

export default function AIPage() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  const insights = useMemo(() => getInsights(), []);

  const handleToggle = useCallback((id: string) => {
    toggleRecipe(id);
    generateInsights();
    setTick((t) => t + 1);
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

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">AI Insights</h2>
        <InfoTooltip content="AI-powered process analytics, forecasting, and deterministic insights. No external LLM calls — all analysis runs locally against your data." />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini label="Total Insights" value={insights.length} />
        <KpiMini label="Critical" value={critCount} accent={critCount > 0} />
        <KpiMini label="Warnings" value={warnCount} />
        <KpiMini label="Active Recipes" value={AI_RECIPES.filter((r) => r.enabled).length} />
      </div>

      <Tabs defaultValue="assistant" className="space-y-4">
        <TabsList>
          <TabsTrigger value="assistant" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            AI Assistant
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Insights Feed
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            AI Config
          </TabsTrigger>
        </TabsList>

        {/* ─── AI Assistant ─── */}
        <TabsContent value="assistant" className="space-y-0">
          <AiAssistantChat />
        </TabsContent>

        {/* ─── Insights Feed ─── */}
        <TabsContent value="insights" className="space-y-3">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm font-medium">No insights to display</p>
                <p className="text-xs">Enable recipes in AI Config to generate insights.</p>
              </CardContent>
            </Card>
          ) : (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} onOpenEvidence={() => goEvidence(insight)} />
            ))
          )}
        </TabsContent>

        {/* ─── AI Config ─── */}
        <TabsContent value="config" className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Enable or disable insight recipes. Changes regenerate insights immediately. Recipes apply to matching interfaces.
          </p>
          {AI_RECIPES.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onToggle={() => handleToggle(recipe.id)} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── AI Assistant Chat ──

function AiAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => getChatHistory());
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
              {QUICK_PROMPTS.map((prompt) => (
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
            {QUICK_PROMPTS.map((prompt) => (
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
        <p className={`text-[9px] mt-1.5 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
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
