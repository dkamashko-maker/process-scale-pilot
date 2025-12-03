import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useFilteredData, useDashboardData } from "@/hooks/useDashboardData";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { Stage } from "@/data/types";

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const { batches, mlOutputs, cqaResults, cppData } = useFilteredData();
  const allData = useDashboardData();

  // Calculate CV by stage
  const cvByStage = useMemo(() => {
    const stages: Stage[] = ["Lab", "Pilot", "Manufacturing"];
    const result: Record<Stage, { mean: number; cv: number; count: number }> = {} as any;

    stages.forEach((stage) => {
      const stageBatchIds = batches.filter((b) => b.stage === stage).map((b) => b.id);
      const titers = cqaResults
        .filter((c) => c.cqaName === "Titer" && stageBatchIds.includes(c.batchId))
        .map((c) => c.value);

      if (titers.length === 0) {
        result[stage] = { mean: 0, cv: 0, count: 0 };
        return;
      }

      const mean = titers.reduce((a, b) => a + b, 0) / titers.length;
      const std = Math.sqrt(titers.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / titers.length);
      const cv = mean > 0 ? (std / mean) * 100 : 0;

      result[stage] = { mean: parseFloat(mean.toFixed(2)), cv: parseFloat(cv.toFixed(1)), count: titers.length };
    });

    return result;
  }, [batches, cqaResults]);

  // Baseline vs Optimized CV comparison
  const scenarioComparison = useMemo(() => {
    const scenarios = ["baseline", "optimized"] as const;
    return scenarios.map((scenario) => {
      const scenarioBatchIds = batches.filter((b) => b.scenario === scenario).map((b) => b.id);
      const titers = cqaResults
        .filter((c) => c.cqaName === "Titer" && scenarioBatchIds.includes(c.batchId))
        .map((c) => c.value);

      if (titers.length === 0) return { scenario, cv: 0, passRate: 0 };

      const mean = titers.reduce((a, b) => a + b, 0) / titers.length;
      const std = Math.sqrt(titers.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / titers.length);
      const cv = mean > 0 ? (std / mean) * 100 : 0;

      const passRate = batches.filter((b) => b.scenario === scenario && b.resultStatus === "Pass").length /
        batches.filter((b) => b.scenario === scenario).length * 100;

      return {
        scenario: scenario.charAt(0).toUpperCase() + scenario.slice(1),
        cv: parseFloat(cv.toFixed(1)),
        passRate: parseFloat(passRate.toFixed(1)),
      };
    });
  }, [batches, cqaResults]);

  // Titer distribution by stage
  const titerDistribution = useMemo(() => {
    const stages: Stage[] = ["Lab", "Pilot", "Manufacturing"];
    return stages.map((stage) => {
      const stageBatchIds = batches.filter((b) => b.stage === stage).map((b) => b.id);
      const titers = cqaResults
        .filter((c) => c.cqaName === "Titer" && stageBatchIds.includes(c.batchId))
        .map((c) => c.value);

      if (titers.length === 0) return { stage, min: 0, q1: 0, median: 0, q3: 0, max: 0 };

      const sorted = [...titers].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const median = sorted[Math.floor(sorted.length * 0.5)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];

      return {
        stage,
        min: parseFloat(sorted[0].toFixed(2)),
        q1: parseFloat(q1.toFixed(2)),
        median: parseFloat(median.toFixed(2)),
        q3: parseFloat(q3.toFixed(2)),
        max: parseFloat(sorted[sorted.length - 1].toFixed(2)),
      };
    });
  }, [batches, cqaResults]);

  // Scatter plot: DO Phase 3 vs Titer
  const scatterData = useMemo(() => {
    return batches.map((batch) => {
      const batchCpp = cppData.filter((c) => c.batchId === batch.id && c.phase === 3);
      const avgDO = batchCpp.length > 0
        ? batchCpp.reduce((sum, c) => sum + c.DO, 0) / batchCpp.length
        : 0;
      const titer = cqaResults.find((c) => c.batchId === batch.id && c.cqaName === "Titer");

      return {
        batchId: batch.id,
        avgDO: parseFloat(avgDO.toFixed(1)),
        titer: titer?.value || 0,
        stage: batch.stage,
      };
    });
  }, [batches, cppData, cqaResults]);

  // Cluster data (simplified)
  const clusterData = useMemo(() => {
    const lowRisk = mlOutputs.filter((m) => m.riskScore < 0.3).length;
    const highRisk = mlOutputs.filter((m) => m.riskScore >= 0.3).length;
    return [
      { name: "Stable Cluster", value: lowRisk, fill: "hsl(var(--chart-1))" },
      { name: "Variable Cluster", value: highRisk, fill: "hsl(var(--chart-4))" },
    ];
  }, [mlOutputs]);

  // Batch summary table
  const batchSummary = useMemo(() => {
    return batches.map((batch) => {
      const ml = mlOutputs.find((m) => m.batchId === batch.id);
      const titer = cqaResults.find((c) => c.batchId === batch.id && c.cqaName === "Titer");
      const glycan = cqaResults.find((c) => c.batchId === batch.id && c.cqaName === "GlycanQuality");

      return {
        batchId: batch.id,
        stage: batch.stage,
        product: batch.product,
        titer: titer?.value.toFixed(2) || "-",
        glycanScore: glycan?.value.toFixed(0) || "-",
        riskLevel: ml?.riskLevel || "Low",
        resultStatus: batch.resultStatus,
        scenario: batch.scenario,
      };
    });
  }, [batches, mlOutputs, cqaResults]);

  const tableColumns = [
    { key: "batchId", label: "Batch ID", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "product", label: "Product", sortable: true },
    { key: "titer", label: "Titer (g/L)", sortable: true },
    { key: "glycanScore", label: "Glycan Score", sortable: true },
    {
      key: "riskLevel",
      label: "Risk Level",
      render: (item: typeof batchSummary[0]) => <StatusBadge status={item.riskLevel} />,
    },
    {
      key: "resultStatus",
      label: "Status",
      render: (item: typeof batchSummary[0]) => <StatusBadge status={item.resultStatus} />,
    },
    { key: "scenario", label: "Scenario", sortable: true },
  ];

  const stageColors: Record<Stage, string> = {
    Lab: "hsl(var(--chart-1))",
    Pilot: "hsl(var(--chart-2))",
    Manufacturing: "hsl(var(--chart-3))",
  };

  // Calculate variability reduction
  const variabilityReduction = scenarioComparison.length === 2
    ? ((scenarioComparison[0].cv - scenarioComparison[1].cv) / scenarioComparison[0].cv * 100).toFixed(1)
    : "0";

  return (
    <div className="p-6 space-y-6">
      {/* Disclaimer */}
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-4 flex items-start gap-2">
          <InfoTooltip content="This prototype demonstrates how variability analysis and scale-up tracking would work in a production system." />
          <p className="text-sm text-muted-foreground">
            All results shown are demo data. This prototype illustrates variability reduction achieved through
            recommended CPP profile changes across manufacturing stages.
          </p>
        </CardContent>
      </Card>

      {/* Scale-up KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Titer CV% – Lab"
          value={`${cvByStage.Lab.cv}%`}
          subtitle={`n=${cvByStage.Lab.count}`}
          trend={cvByStage.Lab.cv < 15 ? "up" : "neutral"}
        />
        <KpiCard
          label="Titer CV% – Manufacturing"
          value={`${cvByStage.Manufacturing.cv}%`}
          subtitle={`n=${cvByStage.Manufacturing.count}`}
          trend={cvByStage.Manufacturing.cv < 20 ? "up" : "down"}
        />
        <KpiCard
          label="Avg Titer – Lab"
          value={`${cvByStage.Lab.mean} g/L`}
        />
        <KpiCard
          label="Scale-up Variability Reduction"
          value={`${variabilityReduction}%`}
          trend={parseFloat(variabilityReduction) > 0 ? "up" : "down"}
          subtitle="Baseline → Optimized"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Titer Distribution by Stage"
          subtitle={
            <span className="flex items-center gap-1">
              Min/Q1/Median/Q3/Max
              <InfoTooltip content="Shows the spread of titer values at each manufacturing scale. A narrower spread indicates more consistent production." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={titerDistribution}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="stage" className="text-xs" />
              <YAxis className="text-xs" unit=" g/L" />
              <Tooltip />
              <Legend />
              <Bar dataKey="min" fill="hsl(var(--chart-5))" name="Min" />
              <Bar dataKey="q1" fill="hsl(var(--chart-4))" name="Q1" />
              <Bar dataKey="median" fill="hsl(var(--chart-1))" name="Median" />
              <Bar dataKey="q3" fill="hsl(var(--chart-2))" name="Q3" />
              <Bar dataKey="max" fill="hsl(var(--chart-3))" name="Max" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="DO Phase 3 vs Titer"
          subtitle={
            <span className="flex items-center gap-1">
              Correlation by stage
              <InfoTooltip content="Each point represents a batch. Shows how dissolved oxygen in Phase 3 correlates with final titer across different scales." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" dataKey="avgDO" name="Avg DO Phase 3" unit="%" className="text-xs" />
              <YAxis type="number" dataKey="titer" name="Titer" unit=" g/L" className="text-xs" />
              <ZAxis range={[60, 60]} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Legend />
              {(["Lab", "Pilot", "Manufacturing"] as Stage[]).map((stage) => (
                <Scatter
                  key={stage}
                  name={stage}
                  data={scatterData.filter((d) => d.stage === stage)}
                  fill={stageColors[stage]}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Scenario Comparison"
          subtitle={
            <span className="flex items-center gap-1">
              Baseline vs Optimized
              <InfoTooltip content="Compares process variability (CV%) and pass rate between baseline conditions and optimized CPP profiles." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={scenarioComparison}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="scenario" className="text-xs" />
              <YAxis yAxisId="left" className="text-xs" unit="%" />
              <YAxis yAxisId="right" orientation="right" className="text-xs" unit="%" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="cv" fill="hsl(var(--chart-4))" name="Titer CV%" />
              <Bar yAxisId="right" dataKey="passRate" fill="hsl(var(--chart-1))" name="Pass Rate" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Batch Clustering"
          subtitle={
            <span className="flex items-center gap-1">
              Stable vs Variable batches
              <InfoTooltip content="Simplified clustering showing proportion of batches with low risk (stable) versus elevated risk (variable)." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={clusterData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                dataKey="value"
              >
                {clusterData.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Batch Summary Table */}
      <ChartCard
        title="Batch Summary"
        subtitle={
          <span className="flex items-center gap-1">
            All filtered batches
            <InfoTooltip content="Click on any row to view detailed batch analysis." />
          </span>
        }
      >
        <DataTable
          data={batchSummary}
          columns={tableColumns}
          onRowClick={(item) => navigate(`/batch/${item.batchId}`)}
        />
      </ChartCard>
    </div>
  );
}
