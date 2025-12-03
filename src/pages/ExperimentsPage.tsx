import { useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDashboardData } from "@/hooks/useDashboardData";
import { ChartCard } from "@/components/shared/ChartCard";
import { DataTable } from "@/components/shared/DataTable";
import { InfoTooltip } from "@/components/shared/InfoTooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "recharts";
import type { Experiment, ExperimentRun } from "@/data/types";

export default function ExperimentsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get("highlight");
  const data = useDashboardData();

  const [selectedExperiment, setSelectedExperiment] = useState<Experiment | null>(
    highlightId ? data.experiments.find((e) => e.id === highlightId) || data.experiments[0] : data.experiments[0]
  );

  // Experiments list data
  const experimentsTableData = useMemo(() => {
    return data.experiments.map((exp) => {
      const avgTiter = exp.runs.length > 0
        ? exp.runs.reduce((sum, r) => sum + r.titer, 0) / exp.runs.length
        : 0;
      return {
        ...exp,
        numRuns: exp.runs.length,
        avgTiter: avgTiter.toFixed(2),
      };
    });
  }, [data.experiments]);

  const experimentColumns = [
    { key: "name", label: "Name", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "product", label: "Product", sortable: true },
    { key: "designType", label: "Design", sortable: true },
    { key: "numRuns", label: "# Runs", sortable: true },
    { key: "avgTiter", label: "Avg Titer", sortable: true },
  ];

  // Factor-response heatmap data (for 2-factor experiments)
  const heatmapData = useMemo(() => {
    if (!selectedExperiment || selectedExperiment.factors.length !== 2) return null;

    const [factor1, factor2] = selectedExperiment.factors;
    const factor1Values = [...new Set(selectedExperiment.runs.map((r) => r.factorValues[factor1]))].sort((a, b) => a - b);
    const factor2Values = [...new Set(selectedExperiment.runs.map((r) => r.factorValues[factor2]))].sort((a, b) => a - b);

    const matrix = factor2Values.map((f2) => {
      const row: Record<string, number | string> = { [factor2]: f2 };
      factor1Values.forEach((f1) => {
        const run = selectedExperiment.runs.find(
          (r) => r.factorValues[factor1] === f1 && r.factorValues[factor2] === f2
        );
        row[`${factor1}_${f1}`] = run ? parseFloat(run.titer.toFixed(2)) : 0;
      });
      return row;
    });

    return { matrix, factor1, factor2, factor1Values, factor2Values };
  }, [selectedExperiment]);

  // Single factor response data
  const singleFactorData = useMemo(() => {
    if (!selectedExperiment || selectedExperiment.factors.length !== 1) return null;

    const factor = selectedExperiment.factors[0];
    return selectedExperiment.runs.map((run) => ({
      [factor]: run.factorValues[factor],
      titer: parseFloat(run.titer.toFixed(2)),
      glycanScore: run.glycanScore,
    })).sort((a, b) => a[factor] - b[factor]);
  }, [selectedExperiment]);

  // Runs table data
  const runsTableData = useMemo(() => {
    if (!selectedExperiment) return [];
    return selectedExperiment.runs.map((run) => ({
      ...run,
      factorValuesStr: Object.entries(run.factorValues)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", "),
      titer: run.titer.toFixed(2),
      glycanScore: run.glycanScore.toFixed(0),
    }));
  }, [selectedExperiment]);

  const runsColumns = [
    { key: "id", label: "Run ID" },
    { key: "factorValuesStr", label: "Factor Values" },
    { key: "titer", label: "Titer (g/L)", sortable: true },
    { key: "glycanScore", label: "Glycan Score", sortable: true },
    {
      key: "linkedBatchId",
      label: "Linked Batch",
      render: (item: typeof runsTableData[0]) =>
        item.linkedBatchId ? (
          <Button variant="link" className="p-0 h-auto" onClick={() => navigate(`/batch/${item.linkedBatchId}`)}>
            {item.linkedBatchId}
          </Button>
        ) : (
          "-"
        ),
    },
  ];

  // Scale-up comparison: best experiment conditions vs manufacturing
  const scaleUpComparison = useMemo(() => {
    if (!selectedExperiment) return [];

    const bestRun = selectedExperiment.runs.reduce((best, run) => (run.titer > best.titer ? run : best));
    
    const mfgBatches = data.batches.filter(
      (b) => b.stage === "Manufacturing" && b.product === selectedExperiment.product
    );
    const mfgTiters = mfgBatches.map((b) => {
      const titer = data.cqaResults.find((c) => c.batchId === b.id && c.cqaName === "Titer");
      return titer?.value || 0;
    });
    const avgMfgTiter = mfgTiters.length > 0 ? mfgTiters.reduce((a, b) => a + b, 0) / mfgTiters.length : 0;

    return [
      { name: "Experiment Best", titer: parseFloat(bestRun.titer.toFixed(2)) },
      { name: "Mfg Average", titer: parseFloat(avgMfgTiter.toFixed(2)) },
    ];
  }, [selectedExperiment, data]);

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel: Experiments List */}
        <div className="lg:col-span-1">
          <ChartCard
            title="Experiments"
            subtitle={
              <span className="flex items-center gap-1">
                DoE studies
                <InfoTooltip content="Design of Experiments studies exploring optimal process parameters." />
              </span>
            }
          >
            <DataTable
              data={experimentsTableData}
              columns={experimentColumns}
              onRowClick={(item) => setSelectedExperiment(data.experiments.find((e) => e.id === item.id) || null)}
              className={selectedExperiment ? "" : ""}
            />
          </ChartCard>
        </div>

        {/* Right Panel: Experiment Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedExperiment ? (
            <>
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedExperiment.name}</span>
                    <Badge variant="outline">{selectedExperiment.designType}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Stage</span>
                      <p className="font-medium">{selectedExperiment.stage}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Product</span>
                      <p className="font-medium">{selectedExperiment.product}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Factors</span>
                      <p className="font-medium">{selectedExperiment.factors.join(", ")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Runs</span>
                      <p className="font-medium">{selectedExperiment.runs.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Factor-Response Chart */}
              {heatmapData && (
                <ChartCard
                  title="Factor-Response Heatmap"
                  subtitle={
                    <span className="flex items-center gap-1">
                      {heatmapData.factor1} vs {heatmapData.factor2} → Titer
                      <InfoTooltip content="Shows how different combinations of factors affect titer. Darker colors indicate higher titer values." />
                    </span>
                  }
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 text-left font-medium">{heatmapData.factor2}</th>
                          {heatmapData.factor1Values.map((v) => (
                            <th key={v} className="p-2 text-center font-medium">
                              {heatmapData.factor1}={v}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.matrix.map((row, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium">{row[heatmapData.factor2]}</td>
                            {heatmapData.factor1Values.map((f1v) => {
                              const value = row[`${heatmapData.factor1}_${f1v}`] as number;
                              const intensity = value / 5; // Normalize to 0-1
                              return (
                                <td
                                  key={f1v}
                                  className="p-2 text-center"
                                  style={{
                                    backgroundColor: `hsl(142, ${intensity * 60}%, ${90 - intensity * 30}%)`,
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
              )}

              {/* Single Factor Response */}
              {singleFactorData && selectedExperiment.factors.length === 1 && (
                <ChartCard
                  title="Factor-Response Curve"
                  subtitle={`${selectedExperiment.factors[0]} vs Titer`}
                >
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={singleFactorData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey={selectedExperiment.factors[0]} className="text-xs" />
                      <YAxis className="text-xs" unit=" g/L" />
                      <Tooltip />
                      <Bar dataKey="titer" fill="hsl(var(--chart-1))" name="Titer" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Runs Table */}
              <ChartCard title="Experiment Runs" subtitle="Individual run results">
                <DataTable data={runsTableData} columns={runsColumns} />
              </ChartCard>

              {/* Scale-up Comparison */}
              <ChartCard
                title="Scale-up Comparison"
                subtitle={
                  <span className="flex items-center gap-1">
                    Experiment best vs Manufacturing
                    <InfoTooltip content="Compares the best titer achieved in this experiment to average manufacturing titer for the same product." />
                  </span>
                }
              >
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={scaleUpComparison} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" unit=" g/L" />
                    <YAxis type="category" dataKey="name" width={120} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="titer" fill="hsl(var(--chart-2))" />
                  </BarChart>
                </ResponsiveContainer>

                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      navigate(
                        `/analytics?product=${selectedExperiment.product}&stage=Manufacturing`
                      )
                    }
                  >
                    View Linked Manufacturing Batches
                  </Button>
                </div>
              </ChartCard>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                Select an experiment from the list to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
