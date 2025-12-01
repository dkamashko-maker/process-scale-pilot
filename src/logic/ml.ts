import type { Batch, CppPoint, MlOutput, RecommendedProfile, Stage, Scenario } from "@/data/types";

// Utility functions
function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp01((value - min) / (max - min));
}

// Feature extraction from CPP time-series
interface CppFeatures {
  hoursLowDOPhase3: number;
  hoursHighTempPhase2: number;
  lateFeedStartHours: number;
}

export function extractCppFeatures(batchId: string, cppData: CppPoint[]): CppFeatures {
  const batchCpp = cppData.filter((p) => p.batchId === batchId);
  
  let hoursLowDOPhase3 = 0;
  let hoursHighTempPhase2 = 0;
  let lateFeedStartHours = 0;

  // Calculate hours where DO < 30% in phase 3
  const phase3Points = batchCpp.filter((p) => p.phase === 3);
  hoursLowDOPhase3 = phase3Points.filter((p) => p.DO < 30).length * 2; // 2-hour intervals

  // Calculate hours where Temp > 37°C in phase 2
  const phase2Points = batchCpp.filter((p) => p.phase === 2);
  hoursHighTempPhase2 = phase2Points.filter((p) => p.temp > 37).length * 2;

  // Calculate late feed start (feed rate = 0 after phase 2 starts)
  const phase2Start = batchCpp.findIndex((p) => p.phase === 2);
  if (phase2Start !== -1) {
    const pointsAfterPhase2Start = batchCpp.slice(phase2Start);
    const firstFeedIdx = pointsAfterPhase2Start.findIndex((p) => p.feedRate > 1);
    if (firstFeedIdx > 0) {
      lateFeedStartHours = firstFeedIdx * 2;
    }
  }

  return {
    hoursLowDOPhase3,
    hoursHighTempPhase2,
    lateFeedStartHours,
  };
}

// Base titer lookup
function getBaseTiter(stage: Stage, scenario: Scenario, product: string): number {
  const baseTiters: Record<Stage, Record<Scenario, number>> = {
    Lab: {
      baseline: 4.2,
      optimized: 4.8,
    },
    Pilot: {
      baseline: 3.9,
      optimized: 4.5,
    },
    Manufacturing: {
      baseline: 3.6,
      optimized: 4.3,
    },
  };

  // Product-specific adjustment
  const productBonus = product === "mAb-01" ? 0.2 : product === "mAb-02" ? 0.1 : 0;
  
  return baseTiters[stage][scenario] + productBonus;
}

// Compute ML outputs
export function computeMlOutput(
  batch: Batch,
  cppData: CppPoint[]
): MlOutput {
  const features = extractCppFeatures(batch.id, cppData);

  // Risk score calculation
  const riskScore = clamp01(
    0.4 * normalize(features.hoursLowDOPhase3, 0, 6) +
    0.3 * normalize(features.hoursHighTempPhase2, 0, 4) +
    0.3 * normalize(features.lateFeedStartHours, 0, 4)
  );

  const riskLevel: "Low" | "Medium" | "High" =
    riskScore < 0.3 ? "Low" : riskScore < 0.6 ? "Medium" : "High";

  // Predicted titer
  const baseTiter = getBaseTiter(batch.stage, batch.scenario, batch.product);
  const predictedTiter = Math.max(
    0,
    baseTiter -
      0.3 * features.hoursLowDOPhase3 -
      0.2 * features.hoursHighTempPhase2 -
      0.2 * features.lateFeedStartHours
  );

  // Predicted glycan score (simplified)
  const baseGlycan = batch.scenario === "optimized" ? 88 : 78;
  const predictedGlycanScore = Math.max(
    0,
    Math.min(
      100,
      baseGlycan -
        2 * features.hoursLowDOPhase3 -
        3 * features.hoursHighTempPhase2
    )
  );

  // Top drivers
  const drivers: Array<{
    parameter: string;
    impact: "Positive" | "Negative";
    contribution: number;
  }> = [];

  const lowDOContrib = normalize(features.hoursLowDOPhase3, 0, 6) * 0.4 * 100;
  const highTempContrib = normalize(features.hoursHighTempPhase2, 0, 4) * 0.3 * 100;
  const lateFeedContrib = normalize(features.lateFeedStartHours, 0, 4) * 0.3 * 100;

  if (lowDOContrib > 20) {
    drivers.push({
      parameter: "DO below 30% in Phase 3",
      impact: "Negative",
      contribution: Math.round(lowDOContrib),
    });
  }

  if (highTempContrib > 20) {
    drivers.push({
      parameter: "Temp above 37°C in Phase 2",
      impact: "Negative",
      contribution: Math.round(highTempContrib),
    });
  }

  if (lateFeedContrib > 20) {
    drivers.push({
      parameter: "Late feed start",
      impact: "Negative",
      contribution: Math.round(lateFeedContrib),
    });
  }

  // If no negative drivers, add positive ones
  if (drivers.length === 0) {
    drivers.push(
      {
        parameter: "Optimal DO maintenance",
        impact: "Positive",
        contribution: 35,
      },
      {
        parameter: "Temperature stability",
        impact: "Positive",
        contribution: 28,
      }
    );
  }

  return {
    batchId: batch.id,
    predictedTiter,
    predictedGlycanScore,
    riskScore,
    riskLevel,
    topDrivers: drivers,
  };
}

// Generate recommended profile
export function generateRecommendedProfile(
  batch: Batch,
  cppData: CppPoint[]
): RecommendedProfile {
  const features = extractCppFeatures(batch.id, cppData);

  // Adjust targets based on identified issues
  let targetDO = 35;
  let targetTemp = 36.8;
  let targetFeedRate = 14.5;
  let rationale = "Optimized profile maintains process stability and improves product quality.";

  if (features.hoursLowDOPhase3 > 2) {
    targetDO = 38;
    rationale = "Increased DO setpoint reduces glycan variability and improves titer by 12%.";
  }

  if (features.hoursHighTempPhase2 > 2) {
    targetTemp = 36.5;
    rationale = "Lower temperature in Phase 2 prevents thermal stress and improves glycan profile.";
  }

  if (features.lateFeedStartHours > 2) {
    targetFeedRate = 16.0;
    rationale = "Earlier feed initiation maintains cell viability and boosts productivity.";
  }

  return {
    batchId: batch.id,
    stage: batch.stage,
    phase: 3,
    targetDO,
    targetTemp,
    targetFeedRate,
    rationale,
  };
}

// Recompute all ML outputs for batches
export function recomputeAllMlOutputs(
  batches: Batch[],
  cppData: CppPoint[]
): { mlOutputs: MlOutput[]; recommendations: RecommendedProfile[] } {
  const mlOutputs: MlOutput[] = [];
  const recommendations: RecommendedProfile[] = [];

  batches.forEach((batch) => {
    mlOutputs.push(computeMlOutput(batch, cppData));
    recommendations.push(generateRecommendedProfile(batch, cppData));
  });

  return { mlOutputs, recommendations };
}
