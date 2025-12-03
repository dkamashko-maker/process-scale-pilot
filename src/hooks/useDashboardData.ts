import { useMemo } from "react";
import { getDemoData } from "@/data/mockData";
import { useFilters } from "@/contexts/FilterContext";
import type { DashboardData, Batch, MlOutput, CqaResult, CppPoint } from "@/data/types";
import { subMonths, isAfter } from "date-fns";

export function useDashboardData(): DashboardData {
  return useMemo(() => getDemoData(), []);
}

export function useFilteredData() {
  const data = useDashboardData();
  const { filters } = useFilters();

  return useMemo(() => {
    const now = new Date();
    let dateThreshold: Date;
    
    switch (filters.dateRange) {
      case "3months":
        dateThreshold = subMonths(now, 3);
        break;
      case "6months":
        dateThreshold = subMonths(now, 6);
        break;
      default:
        dateThreshold = new Date(0);
    }

    const filteredBatches = data.batches.filter((batch) => {
      // Date filter
      if (!isAfter(new Date(batch.startTime), dateThreshold)) return false;
      
      // Product filter
      if (filters.products.length > 0 && !filters.products.includes(batch.product)) return false;
      
      // Stage filter
      if (filters.stages.length > 0 && !filters.stages.includes(batch.stage)) return false;
      
      // Scenario filter
      if (filters.scenario !== "all" && batch.scenario !== filters.scenario) return false;
      
      return true;
    });

    const batchIds = new Set(filteredBatches.map((b) => b.id));

    const filteredMlOutputs = data.mlOutputs.filter((m) => batchIds.has(m.batchId));
    const filteredCqaResults = data.cqaResults.filter((c) => batchIds.has(c.batchId));
    const filteredCppData = data.cppData.filter((c) => batchIds.has(c.batchId));
    const filteredRecommendations = data.recommendations.filter((r) => batchIds.has(r.batchId));

    return {
      ...data,
      batches: filteredBatches,
      mlOutputs: filteredMlOutputs,
      cqaResults: filteredCqaResults,
      cppData: filteredCppData,
      recommendations: filteredRecommendations,
    };
  }, [data, filters]);
}

// Calculate KPIs from filtered data
export function useKpis() {
  const { batches, mlOutputs, cqaResults } = useFilteredData();
  const allData = useDashboardData();

  return useMemo(() => {
    const titerResults = cqaResults.filter((c) => c.cqaName === "Titer");
    const avgTiter = titerResults.length > 0
      ? titerResults.reduce((sum, c) => sum + c.value, 0) / titerResults.length
      : 0;

    const passRate = batches.length > 0
      ? (batches.filter((b) => b.resultStatus === "Pass").length / batches.length) * 100
      : 0;

    // Titer CV%
    const titerValues = titerResults.map((t) => t.value);
    const titerMean = titerValues.length > 0 ? titerValues.reduce((a, b) => a + b, 0) / titerValues.length : 0;
    const titerStd = titerValues.length > 1
      ? Math.sqrt(titerValues.reduce((sum, v) => sum + Math.pow(v - titerMean, 2), 0) / (titerValues.length - 1))
      : 0;
    const titerCV = titerMean > 0 ? (titerStd / titerMean) * 100 : 0;

    // Baseline CV for comparison
    const baselineBatches = allData.batches.filter((b) => b.scenario === "baseline");
    const baselineTiters = allData.cqaResults.filter(
      (c) => c.cqaName === "Titer" && baselineBatches.some((b) => b.id === c.batchId)
    ).map((t) => t.value);
    const baselineMean = baselineTiters.length > 0 ? baselineTiters.reduce((a, b) => a + b, 0) / baselineTiters.length : 0;
    const baselineStd = baselineTiters.length > 1
      ? Math.sqrt(baselineTiters.reduce((sum, v) => sum + Math.pow(v - baselineMean, 2), 0) / (baselineTiters.length - 1))
      : 0;
    const baselineCV = baselineMean > 0 ? (baselineStd / baselineMean) * 100 : 0;

    const variabilityReduction = baselineCV > 0 ? ((baselineCV - titerCV) / baselineCV) * 100 : 0;

    const activeBatches = batches.filter((b) => {
      const br = allData.bioreactors.find((r) => r.id === b.bioreactorId);
      return br?.status === "Running";
    }).length;

    const highRiskBatches = mlOutputs.filter((m) => m.riskLevel === "High").length;

    return {
      avgTiter: avgTiter.toFixed(2),
      passRate: passRate.toFixed(1),
      titerCV: titerCV.toFixed(1),
      variabilityReduction: variabilityReduction.toFixed(1),
      activeBatches,
      highRiskBatches,
    };
  }, [batches, mlOutputs, cqaResults, allData]);
}
