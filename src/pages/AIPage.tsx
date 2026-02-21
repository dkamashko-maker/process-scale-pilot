import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Lightbulb, Settings2, AlertTriangle, CheckCircle2,
  ExternalLink, Shield, Tag, TrendingUp, Zap, Info,
} from "lucide-react";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AI_RECIPES, getInsights, toggleRecipe, generateInsights,
  type AiRecipe, type AiInsight, type InsightSeverity,
} from "@/data/aiInsights";
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
        <InfoTooltip content="Deterministic insights generated from alerts, data patterns, and metadata analysis. No external LLM calls." />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiMini label="Total Insights" value={insights.length} />
        <KpiMini label="Critical" value={critCount} accent={critCount > 0} />
        <KpiMini label="Warnings" value={warnCount} />
        <KpiMini label="Active Recipes" value={AI_RECIPES.filter((r) => r.enabled).length} />
      </div>

      <Tabs defaultValue="insights" className="space-y-4">
        <TabsList>
          <TabsTrigger value="insights" className="gap-1.5">
            <Lightbulb className="h-3.5 w-3.5" />
            Insights Feed
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
            AI Config
          </TabsTrigger>
        </TabsList>

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

// ── Sub-components ──

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
