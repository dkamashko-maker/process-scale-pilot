import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, TrendingUp, AlertTriangle, Lightbulb, AlertCircle } from "lucide-react";

const AI_FEATURES = [
  {
    title: "Anomaly Detection",
    icon: AlertTriangle,
    description: "Automated identification of out-of-range readings and unexpected parameter deviations using statistical models.",
    status: "Concept",
  },
  {
    title: "Trend Forecasting",
    icon: TrendingUp,
    description: "Predictive analytics for parameter trajectories to anticipate process deviations before they occur.",
    status: "Concept",
  },
  {
    title: "Process Optimization Insights",
    icon: Lightbulb,
    description: "AI-generated recommendations for process improvements based on historical run data and parameter correlations.",
    status: "Concept",
  },
  {
    title: "Intelligent Event Classification",
    icon: Brain,
    description: "Automatic categorization and tagging of recorded process events using natural language processing.",
    status: "Concept",
  },
];

export default function AIPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-semibold">AI Analytics</h2>
      </div>

      {/* Disclaimer */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Prototype Demonstration</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              AI features shown below are conceptual demonstrations. In production, these would integrate with trained models on validated instrumental data.
              This system records and analyzes log entries only — it does not send commands to instruments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AI_FEATURES.map((feature) => (
          <Card key={feature.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <feature.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">{feature.title}</CardTitle>
                </div>
                <Badge variant="secondary" className="text-[10px]">{feature.status}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Future Vision */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Roadmap Vision</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Data Vest's AI module will leverage collected instrumental data to provide actionable insights:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              Cross-run pattern recognition to identify optimal process conditions
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              Real-time anomaly alerts based on historical baselines
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              Natural language querying of process data and event logs
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              Automated report generation for batch records and regulatory submissions
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
