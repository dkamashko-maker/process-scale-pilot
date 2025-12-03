import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { KpiCard } from "@/components/shared/KpiCard";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { useFilteredData, useKpis, useDashboardData } from "@/hooks/useDashboardData";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts";
import type { Batch, MlOutput } from "@/data/types";

export default function OverviewPage() {
  const navigate = useNavigate();
  const { batches, mlOutputs, cqaResults } = useFilteredData();
  const allData = useDashboardData();
  const kpis = useKpis();

  // Batch outcomes by stage
  const outcomesByStage = useMemo(() => {
    const stages = ["Lab", "Pilot", "Manufacturing"] as const;
    return stages.map((stage) => {
      const stageBatches = batches.filter((b) => b.stage === stage);
      return {
        stage,
        Pass: stageBatches.filter((b) => b.resultStatus === "Pass").length,
        "At Risk": stageBatches.filter((b) => b.resultStatus === "At Risk").length,
        Fail: stageBatches.filter((b) => b.resultStatus === "Fail").length,
      };
    });
  }, [batches]);

  // Titer CV by stage
  const titerCVByStage = useMemo(() => {
    const stages = ["Lab", "Pilot", "Manufacturing"] as const;
    return stages.map((stage) => {
      const stageBatchIds = batches.filter((b) => b.stage === stage).map((b) => b.id);
      const titers = cqaResults
        .filter((c) => c.cqaName === "Titer" && stageBatchIds.includes(c.batchId))
        .map((c) => c.value);
      
      if (titers.length === 0) return { stage, cv: 0 };
      
      const mean = titers.reduce((a, b) => a + b, 0) / titers.length;
      const std = Math.sqrt(titers.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / titers.length);
      const cv = mean > 0 ? (std / mean) * 100 : 0;
      
      return { stage, cv: parseFloat(cv.toFixed(1)) };
    });
  }, [batches, cqaResults]);

  // Heatmap data (Site x Product -> Avg Risk)
  const heatmapData = useMemo(() => {
    const sites = [...new Set(batches.map((b) => b.site))];
    const products = [...new Set(batches.map((b) => b.product))];
    
    return products.map((product) => {
      const row: Record<string, string | number> = { product };
      sites.forEach((site) => {
        const batchIds = batches
          .filter((b) => b.site === site && b.product === product)
          .map((b) => b.id);
        const risks = mlOutputs
          .filter((m) => batchIds.includes(m.batchId))
          .map((m) => m.riskScore);
        row[site] = risks.length > 0 ? parseFloat((risks.reduce((a, b) => a + b, 0) / risks.length).toFixed(2)) : 0;
      });
      return row;
    });
  }, [batches, mlOutputs]);

  // Trend data (monthly)
  const trendData = useMemo(() => {
    const months: Record<string, { baseline: number[]; optimized: number[] }> = {};
    
    batches.forEach((batch) => {
      const month = batch.startTime.substring(0, 7);
      if (!months[month]) months[month] = { baseline: [], optimized: [] };
      
      const titer = cqaResults.find((c) => c.batchId === batch.id && c.cqaName === "Titer");
      if (titer) {
        months[month][batch.scenario].push(titer.value);
      }
    });
    
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        baseline: data.baseline.length > 0
          ? parseFloat((data.baseline.reduce((a, b) => a + b, 0) / data.baseline.length).toFixed(2))
          : null,
        optimized: data.optimized.length > 0
          ? parseFloat((data.optimized.reduce((a, b) => a + b, 0) / data.optimized.length).toFixed(2))
          : null,
      }));
  }, [batches, cqaResults]);

  // At-risk batches table
  const atRiskBatches = useMemo(() => {
    return mlOutputs
      .filter((m) => m.riskLevel === "High" || m.riskLevel === "Medium")
      .map((m) => {
        const batch = batches.find((b) => b.id === m.batchId);
        return {
          batchId: m.batchId,
          stage: batch?.stage || "-",
          product: batch?.product || "-",
          site: batch?.site || "-",
          riskLevel: m.riskLevel,
          predictedTiter: m.predictedTiter.toFixed(2),
        };
      })
      .sort((a, b) => (a.riskLevel === "High" ? -1 : 1));
  }, [mlOutputs, batches]);

  const tableColumns = [
    { key: "batchId", label: "Batch ID", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "product", label: "Product", sortable: true },
    { key: "site", label: "Site", sortable: true },
    {
      key: "riskLevel",
      label: "Risk Level",
      render: (item: typeof atRiskBatches[0]) => <StatusBadge status={item.riskLevel} />,
    },
    { key: "predictedTiter", label: "Predicted Titer (g/L)", sortable: true },
  ];

  const sites = [...new Set(batches.map((b) => b.site))];

  return (
    <div className="p-6 space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Avg Titer (g/L)"
          value={kpis.avgTiter}
          trend="up"
          trendValue="+5%"
          subtitle="Selected period"
        />
        <KpiCard
          label="Batch Pass Rate"
          value={`${kpis.passRate}%`}
          trend={parseFloat(kpis.passRate) > 70 ? "up" : "down"}
          trendValue=""
        />
        <KpiCard
          label="Titer CV%"
          value={`${kpis.titerCV}%`}
          trend={parseFloat(kpis.titerCV) < 15 ? "up" : "down"}
          subtitle="Current variability"
        />
        <KpiCard
          label="Variability Reduction"
          value={`${kpis.variabilityReduction}%`}
          trend={parseFloat(kpis.variabilityReduction) > 0 ? "up" : "neutral"}
          subtitle="vs. baseline"
        />
        <KpiCard
          label="Active Batches"
          value={kpis.activeBatches}
          trend="neutral"
        />
        <KpiCard
          label="High-Risk Batches"
          value={kpis.highRiskBatches}
          trend={kpis.highRiskBatches > 0 ? "down" : "up"}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Batch Outcomes by Stage"
          subtitle={
            <span className="flex items-center gap-1">
              Count of batches by result status
              <InfoTooltip content="Shows how batches performed at each manufacturing stage. Green = Pass, Yellow = At Risk, Red = Fail." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={outcomesByStage}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="stage" className="text-xs" />
              <YAxis className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Pass" stackId="a" fill="hsl(var(--chart-1))" />
              <Bar dataKey="At Risk" stackId="a" fill="hsl(var(--chart-4))" />
              <Bar dataKey="Fail" stackId="a" fill="hsl(var(--chart-5))" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Titer CV% by Stage"
          subtitle={
            <span className="flex items-center gap-1">
              Process variability across scales
              <InfoTooltip content="Lower CV% indicates more consistent production. The optimized scenario should show reduced variability at manufacturing scale." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={titerCVByStage}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="stage" className="text-xs" />
              <YAxis className="text-xs" unit="%" />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="cv" fill="hsl(var(--chart-2))" name="Titer CV%" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title="Risk Heatmap (Site × Product)"
          subtitle={
            <span className="flex items-center gap-1">
              Average risk score by site and product
              <InfoTooltip content="Darker colors indicate higher average risk scores. Helps identify problematic site-product combinations." />
            </span>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium">Product</th>
                  {sites.map((site) => (
                    <th key={site} className="text-center p-2 font-medium">{site}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.map((row) => (
                  <tr key={row.product as string}>
                    <td className="p-2 font-medium">{row.product}</td>
                    {sites.map((site) => {
                      const value = row[site] as number;
                      const intensity = Math.min(value * 1.5, 1);
                      return (
                        <td
                          key={site}
                          className="p-2 text-center"
                          style={{
                            backgroundColor: `hsl(0, ${intensity * 70}%, ${90 - intensity * 40}%)`,
                          }}
                        >
                          {value.toFixed(2)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard
          title="Avg Titer Trend"
          subtitle={
            <span className="flex items-center gap-1">
              Monthly average titer: Baseline vs Optimized
              <InfoTooltip content="Compares average titer performance between baseline and optimized process conditions over time." />
            </span>
          }
        >
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="month" className="text-xs" />
              <YAxis className="text-xs" unit=" g/L" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="baseline"
                stroke="hsl(var(--chart-3))"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Baseline"
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="optimized"
                stroke="hsl(var(--chart-1))"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Optimized"
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* At-Risk Batches Table */}
      <ChartCard
        title="Top At-Risk Batches"
        subtitle={
          <span className="flex items-center gap-1">
            Batches requiring attention
            <InfoTooltip content="Click on any row to view detailed batch analysis and recommendations." />
          </span>
        }
      >
        <DataTable
          data={atRiskBatches}
          columns={tableColumns}
          onRowClick={(item) => navigate(`/batch/${item.batchId}`)}
        />
      </ChartCard>
    </div>
  );
}
