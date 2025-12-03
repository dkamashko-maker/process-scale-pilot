import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { computeMlOutput, generateRecommendedProfile } from "@/logic/ml";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceArea,
  ReferenceLine,
} from "recharts";

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const data = useDashboardData();

  const batch = data.batches.find((b) => b.id === batchId);
  const mlOutput = data.mlOutputs.find((m) => m.batchId === batchId);
  const recommendation = data.recommendations.find((r) => r.batchId === batchId);
  const cppData = data.cppData.filter((c) => c.batchId === batchId);
  const cqaResults = data.cqaResults.filter((c) => c.batchId === batchId);

  // What-if sliders
  const [doOffset, setDoOffset] = useState(0);
  const [tempOffset, setTempOffset] = useState(0);
  const [feedOffset, setFeedOffset] = useState(0);

  // Calculate what-if results
  const whatIfResult = useMemo(() => {
    if (!batch || !mlOutput) return null;

    // Simulate adjusted parameters
    const adjustedCpp = cppData.map((point) => ({
      ...point,
      DO: point.DO + doOffset,
      temp: point.temp + tempOffset,
      feedRate: point.feedRate + feedOffset,
    }));

    const result = computeMlOutput(batch, adjustedCpp);
    return result;
  }, [batch, mlOutput, cppData, doOffset, tempOffset, feedOffset]);

  // Timeline chart data
  const timelineData = useMemo(() => {
    return cppData.map((point, idx) => ({
      time: idx * 2,
      phase: point.phase,
      pH: point.pH,
      DO: point.DO,
      temp: point.temp,
      feedRate: point.feedRate,
      vcd: point.viableCellDensity,
    }));
  }, [cppData]);

  // Top drivers chart data
  const driversData = useMemo(() => {
    if (!mlOutput) return [];
    return mlOutput.topDrivers.map((d) => ({
      parameter: d.parameter,
      contribution: d.impact === "Positive" ? d.contribution : -d.contribution,
      fill: d.impact === "Positive" ? "hsl(var(--chart-1))" : "hsl(var(--chart-5))",
    }));
  }, [mlOutput]);

  // Find linked experiment
  const linkedExperiment = useMemo(() => {
    return data.experiments.find((exp) =>
      exp.runs.some((run) => run.linkedBatchId === batchId)
    );
  }, [data.experiments, batchId]);

  if (!batch || !mlOutput) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Batch not found</h2>
        <Button onClick={() => navigate("/overview")}>Back to Overview</Button>
      </div>
    );
  }

  const titerSpec = cqaResults.find((c) => c.cqaName === "Titer");
  const glycanSpec = cqaResults.find((c) => c.cqaName === "GlycanQuality");

  // Phase boundaries for background bands
  const phaseBoundaries = useMemo(() => {
    const phases: { start: number; end: number; phase: number }[] = [];
    let currentPhase = timelineData[0]?.phase;
    let start = 0;

    timelineData.forEach((point, idx) => {
      if (point.phase !== currentPhase) {
        phases.push({ start, end: idx * 2, phase: currentPhase });
        start = idx * 2;
        currentPhase = point.phase;
      }
    });
    phases.push({ start, end: timelineData.length * 2, phase: currentPhase });
    return phases;
  }, [timelineData]);

  return (
    <div className="p-6 space-y-6">
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card rounded-lg border">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <span className="text-sm text-muted-foreground">Batch ID</span>
            <h1 className="text-2xl font-bold">{batch.id}</h1>
          </div>
          <div className="h-12 w-px bg-border" />
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Stage</span>
              <p className="font-medium">{batch.stage}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Product</span>
              <p className="font-medium">{batch.product}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Site</span>
              <p className="font-medium">{batch.site}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Recipe</span>
              <p className="font-medium">{batch.recipeVersion}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Result</span>
              <StatusBadge status={batch.resultStatus} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Risk:</span>
          <StatusBadge status={mlOutput.riskLevel} />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Predicted Titer"
          value={`${mlOutput.predictedTiter.toFixed(2)} g/L`}
          subtitle={titerSpec ? `Spec: ${titerSpec.specLow}-${titerSpec.specHigh}` : ""}
          trend={titerSpec?.inSpec ? "up" : "down"}
        />
        <KpiCard
          label="Predicted Glycan Score"
          value={mlOutput.predictedGlycanScore.toFixed(0)}
          subtitle={glycanSpec ? `Spec: ${glycanSpec.specLow}-${glycanSpec.specHigh}` : ""}
          trend={glycanSpec?.inSpec ? "up" : "down"}
        />
        <KpiCard
          label="Risk Score"
          value={(mlOutput.riskScore * 100).toFixed(0) + "%"}
          trend={mlOutput.riskScore < 0.3 ? "up" : mlOutput.riskScore > 0.6 ? "down" : "neutral"}
        />
        <KpiCard
          label="Hours DO < 30% (Phase 3)"
          value={cppData.filter((c) => c.phase === 3 && c.DO < 30).length * 2}
          subtitle="hours"
          trend={cppData.filter((c) => c.phase === 3 && c.DO < 30).length > 3 ? "down" : "up"}
        />
      </div>

      {/* Main Content - Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: CPP Timeline */}
        <ChartCard
          title="CPP Timeline"
          subtitle={
            <span className="flex items-center gap-1">
              Process parameters over time
              <InfoTooltip content="Multi-parameter view showing pH, DO, Temperature, and Feed Rate. Colored bands indicate process phases. Shaded areas highlight out-of-spec conditions." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              {phaseBoundaries.map((pb, idx) => (
                <ReferenceArea
                  key={idx}
                  x1={pb.start}
                  x2={pb.end}
                  fill={`hsl(var(--chart-${pb.phase}))`}
                  fillOpacity={0.1}
                />
              ))}
              <ReferenceLine y={30} stroke="hsl(var(--chart-5))" strokeDasharray="5 5" label="DO Threshold" />
              <XAxis dataKey="time" label={{ value: "Hours", position: "bottom" }} className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="pH" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} name="pH" />
              <Line type="monotone" dataKey="DO" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} name="DO (%)" />
              <Line type="monotone" dataKey="temp" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={false} name="Temp (°C)" />
              <Line type="monotone" dataKey="feedRate" stroke="hsl(var(--chart-4))" strokeWidth={2} dot={false} name="Feed Rate" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Right: Insights & What-if */}
        <div className="space-y-4">
          {/* ML Insight Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                ML Insight
                <InfoTooltip content="AI-generated analysis of key factors affecting batch performance." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                This batch shows {mlOutput.riskLevel.toLowerCase()} risk due to{" "}
                {mlOutput.topDrivers
                  .filter((d) => d.impact === "Negative")
                  .map((d) => d.parameter.toLowerCase())
                  .join(", ") || "stable process conditions"}
                .{" "}
                {recommendation?.rationale}
              </p>
            </CardContent>
          </Card>

          {/* Top Drivers Chart */}
          <ChartCard title="Top Drivers" subtitle="Impact contribution (%)">
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={driversData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" domain={[-50, 50]} className="text-xs" />
                <YAxis type="category" dataKey="parameter" width={150} className="text-xs" />
                <Tooltip />
                <Bar dataKey="contribution">
                  {driversData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* What-if Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                What-if Analysis
                <InfoTooltip content="Adjust process parameters to simulate their impact on predicted outcomes." />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">DO Target Offset: {doOffset > 0 ? "+" : ""}{doOffset}%</label>
                  <Slider
                    value={[doOffset]}
                    onValueChange={(v) => setDoOffset(v[0])}
                    min={-15}
                    max={15}
                    step={1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Temperature Offset: {tempOffset > 0 ? "+" : ""}{tempOffset}°C</label>
                  <Slider
                    value={[tempOffset]}
                    onValueChange={(v) => setTempOffset(v[0])}
                    min={-2}
                    max={2}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Feed Rate Offset: {feedOffset > 0 ? "+" : ""}{feedOffset} mL/h</label>
                  <Slider
                    value={[feedOffset]}
                    onValueChange={(v) => setFeedOffset(v[0])}
                    min={-5}
                    max={5}
                    step={0.5}
                    className="mt-2"
                  />
                </div>
              </div>

              {whatIfResult && (
                <div className="p-3 bg-muted rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">What-if Result</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Predicted Titer:</span>
                      <span className="ml-2 font-medium">{whatIfResult.predictedTiter.toFixed(2)} g/L</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Risk Score:</span>
                      <span className="ml-2 font-medium">{(whatIfResult.riskScore * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">View Model Results</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Model Results Summary</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold">Model Version</h4>
                <p className="text-muted-foreground">v1.2 – demo</p>
              </div>
              <div>
                <h4 className="font-semibold">Inputs Used</h4>
                <p className="text-muted-foreground">
                  CPP time-series ({cppData.length} points), Phase metadata, Batch parameters
                </p>
              </div>
              <div>
                <h4 className="font-semibold">Predictions</h4>
                <ul className="text-muted-foreground list-disc list-inside">
                  <li>Titer: {mlOutput.predictedTiter.toFixed(2)} g/L</li>
                  <li>Glycan Score: {mlOutput.predictedGlycanScore.toFixed(0)}</li>
                  <li>Risk: {mlOutput.riskLevel} ({(mlOutput.riskScore * 100).toFixed(0)}%)</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold">Key Drivers</h4>
                <ul className="text-muted-foreground list-disc list-inside">
                  {mlOutput.topDrivers.map((d, idx) => (
                    <li key={idx}>{d.parameter}: {d.impact} ({d.contribution}%)</li>
                  ))}
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          onClick={() => navigate(`/analytics?product=${batch.product}&stage=${batch.stage}`)}
        >
          View Scale-up Performance
        </Button>

        {linkedExperiment && (
          <Button
            variant="outline"
            onClick={() => navigate(`/experiments?highlight=${linkedExperiment.id}`)}
          >
            View Related Experiment
          </Button>
        )}
      </div>
    </div>
  );
}
