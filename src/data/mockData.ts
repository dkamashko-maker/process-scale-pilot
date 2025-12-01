import { addDays, subDays, subMonths } from "date-fns";
import type {
  Bioreactor,
  Batch,
  CppPoint,
  CqaResult,
  MlOutput,
  RecommendedProfile,
  Experiment,
  ExperimentRun,
  AuditEvent,
  DashboardData,
  Stage,
  Scenario,
} from "./types";

// Seed for reproducible "random" data
let seed = 12345;
function seededRandom() {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

function randomBetween(min: number, max: number): number {
  return min + seededRandom() * (max - min);
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(seededRandom() * arr.length)];
}

// Generate bioreactors
function generateBioreactors(): Bioreactor[] {
  const sites = ["Site A", "Site B", "Site C"];
  const bioreactors: Bioreactor[] = [];

  sites.forEach((site, siteIdx) => {
    // Each site has a mix of stages
    const configs: Array<{ stage: Stage; count: number; baseScale: number }> = [
      { stage: "Lab", count: 1, baseScale: 2 },
      { stage: "Pilot", count: 1, baseScale: 50 },
      { stage: "Manufacturing", count: 1, baseScale: 2000 },
    ];

    configs.forEach(({ stage, count, baseScale }) => {
      for (let i = 0; i < count; i++) {
        const id = `BR-${siteIdx}${stage[0]}${i + 1}`;
        bioreactors.push({
          id,
          name: id,
          site,
          stage,
          scaleL: baseScale * (1 + seededRandom() * 0.2),
          status: randomChoice(["Idle", "Running", "Completed", "Maintenance"]),
        });
      }
    });
  });

  return bioreactors;
}

// Generate batches
function generateBatches(bioreactors: Bioreactor[]): Batch[] {
  const batches: Batch[] = [];
  const products = ["mAb-01", "mAb-02", "mAb-03"];
  const cellLines = ["CL-27", "CL-34", "CL-42"];
  const medias = ["Media-A", "Media-B", "Media-C"];
  const recipes = ["v3.0", "v3.1", "v3.2", "v4.0"];

  const now = new Date();
  const startDate = subMonths(now, 3);

  let batchCounter = 1;

  // Generate 35-40 batches
  for (let i = 0; i < 38; i++) {
    const bioreactor = randomChoice(bioreactors);
    const scenario: Scenario = i < 20 ? "baseline" : "optimized";
    
    const batchStart = addDays(startDate, i * 2.5);
    const batchEnd = addDays(batchStart, 10 + seededRandom() * 4);

    // Optimized scenario has better pass rates
    let resultStatus: "Pass" | "Fail" | "At Risk";
    if (scenario === "optimized") {
      const rand = seededRandom();
      resultStatus = rand < 0.85 ? "Pass" : rand < 0.95 ? "At Risk" : "Fail";
    } else {
      const rand = seededRandom();
      resultStatus = rand < 0.60 ? "Pass" : rand < 0.85 ? "At Risk" : "Fail";
    }

    batches.push({
      id: `B-${String(batchCounter).padStart(4, "0")}`,
      bioreactorId: bioreactor.id,
      product: randomChoice(products),
      cellLine: randomChoice(cellLines),
      media: randomChoice(medias),
      recipeVersion: randomChoice(recipes),
      stage: bioreactor.stage,
      site: bioreactor.site,
      startTime: batchStart.toISOString(),
      endTime: batchEnd.toISOString(),
      resultStatus,
      scenario,
    });

    batchCounter++;
  }

  return batches;
}

// Generate CPP time-series for a batch
function generateCppData(batch: Batch): CppPoint[] {
  const points: CppPoint[] = [];
  const start = new Date(batch.startTime);
  const end = new Date(batch.endTime);
  const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  const numPoints = Math.floor(duration / 2); // one point every 2 hours

  // Variability factor: baseline has more drift
  const variabilityFactor = batch.scenario === "baseline" ? 1.5 : 0.8;

  for (let i = 0; i < numPoints; i++) {
    const timestamp = new Date(start.getTime() + i * 2 * 60 * 60 * 1000);
    const phase = i < numPoints * 0.2 ? 1 : i < numPoints * 0.5 ? 2 : i < numPoints * 0.8 ? 3 : 4;

    // Target values with some drift
    const pHTarget = 7.0;
    const DOTarget = phase === 2 ? 40 : phase === 3 ? 30 : 50;
    const tempTarget = phase === 3 ? 36.5 : 37.0;
    const agitationTarget = phase === 2 ? 120 : 150;
    const feedRateTarget = phase === 3 ? 15 : phase === 4 ? 10 : 5;

    points.push({
      batchId: batch.id,
      timestamp: timestamp.toISOString(),
      phase: phase as 1 | 2 | 3 | 4,
      pH: pHTarget + randomBetween(-0.15, 0.15) * variabilityFactor,
      DO: Math.max(0, DOTarget + randomBetween(-8, 8) * variabilityFactor),
      temp: tempTarget + randomBetween(-0.5, 0.5) * variabilityFactor,
      agitation: Math.max(0, agitationTarget + randomBetween(-15, 15) * variabilityFactor),
      feedRate: Math.max(0, feedRateTarget + randomBetween(-2, 2) * variabilityFactor),
      viableCellDensity: Math.max(
        0,
        (i / numPoints) * 25 * (1 + randomBetween(-0.2, 0.2))
      ),
    });
  }

  return points;
}

// Generate CQA results
function generateCqaResults(batch: Batch): CqaResult[] {
  const results: CqaResult[] = [];
  const scenario = batch.scenario;

  // Titer
  const titerMean = scenario === "optimized" ? 4.5 : 3.8;
  const titerStd = scenario === "optimized" ? 0.3 : 0.6;
  const titerValue = titerMean + randomBetween(-titerStd, titerStd);
  results.push({
    batchId: batch.id,
    cqaName: "Titer",
    value: Math.max(0, titerValue),
    specLow: 3.0,
    specHigh: 5.5,
    inSpec: titerValue >= 3.0 && titerValue <= 5.5,
  });

  // Glycan Quality
  const glycanMean = scenario === "optimized" ? 88 : 78;
  const glycanStd = scenario === "optimized" ? 4 : 8;
  const glycanValue = glycanMean + randomBetween(-glycanStd, glycanStd);
  results.push({
    batchId: batch.id,
    cqaName: "GlycanQuality",
    value: Math.max(0, Math.min(100, glycanValue)),
    specLow: 70,
    specHigh: 100,
    inSpec: glycanValue >= 70,
  });

  // Aggregation
  const aggMean = scenario === "optimized" ? 2.5 : 4.0;
  const aggStd = scenario === "optimized" ? 0.5 : 1.0;
  const aggValue = aggMean + randomBetween(-aggStd, aggStd);
  results.push({
    batchId: batch.id,
    cqaName: "Aggregation",
    value: Math.max(0, aggValue),
    specLow: 0,
    specHigh: 5.0,
    inSpec: aggValue <= 5.0,
  });

  return results;
}

// Generate ML output
function generateMlOutput(batch: Batch, cqaResults: CqaResult[]): MlOutput {
  const titerResult = cqaResults.find((r) => r.cqaName === "Titer");
  const glycanResult = cqaResults.find((r) => r.cqaName === "GlycanQuality");

  const predictedTiter = (titerResult?.value || 3.5) * (1 + randomBetween(-0.05, 0.05));
  const predictedGlycanScore = glycanResult?.value || 75;

  // Risk score based on scenario
  const baseRisk = batch.scenario === "optimized" ? 0.15 : 0.45;
  const riskScore = Math.max(0, Math.min(1, baseRisk + randomBetween(-0.1, 0.1)));

  const riskLevel: "Low" | "Medium" | "High" =
    riskScore < 0.3 ? "Low" : riskScore < 0.6 ? "Medium" : "High";

  // Top drivers
  const drivers = [
    { parameter: "DO Phase 3", impact: "Positive" as const, contribution: 28 },
    { parameter: "pH Stability", impact: "Positive" as const, contribution: 22 },
    { parameter: "Feed Rate Phase 4", impact: "Negative" as const, contribution: 18 },
    { parameter: "Temperature Drift", impact: "Negative" as const, contribution: 15 },
  ];

  return {
    batchId: batch.id,
    predictedTiter,
    predictedGlycanScore,
    riskScore,
    riskLevel,
    topDrivers: drivers.slice(0, 3 + Math.floor(seededRandom() * 2)),
  };
}

// Generate recommendations
function generateRecommendation(batch: Batch): RecommendedProfile {
  return {
    batchId: batch.id,
    stage: batch.stage,
    phase: 3,
    targetDO: 32,
    targetTemp: 36.8,
    targetFeedRate: 14.5,
    rationale: "Optimized profile reduces glycan variability and improves titer by 12%.",
  };
}

// Generate experiments
function generateExperiments(batches: Batch[]): Experiment[] {
  const experiments: Experiment[] = [];

  // Experiment 1: Lab DoE
  const exp1Runs: ExperimentRun[] = [];
  const pHLevels = [6.8, 7.0, 7.2];
  const tempLevels = [36, 37, 38];
  let runId = 1;
  pHLevels.forEach((pH) => {
    tempLevels.forEach((temp) => {
      const titer = 3.5 + (pH - 6.8) * 2 + (37 - temp) * 0.5 + randomBetween(-0.3, 0.3);
      const glycan = 80 + (pH - 7.0) * 10 + randomBetween(-5, 5);
      exp1Runs.push({
        id: `R-001-${runId++}`,
        experimentId: "EXP-001",
        factorValues: { pH, Temp: temp },
        titer: Math.max(0, titer),
        glycanScore: Math.max(0, Math.min(100, glycan)),
      });
    });
  });

  experiments.push({
    id: "EXP-001",
    name: "Lab DoE: pH vs Temp",
    stage: "Lab",
    product: "mAb-01",
    designType: "Full Factorial",
    factors: ["pH", "Temp"],
    runs: exp1Runs,
  });

  // Experiment 2: Pilot Scale-up
  const exp2Runs: ExperimentRun[] = [];
  const doLevels = [25, 30, 35, 40];
  runId = 1;
  doLevels.forEach((doLevel) => {
    const titer = 4.0 + (doLevel - 30) * 0.05 + randomBetween(-0.4, 0.4);
    const glycan = 85 + randomBetween(-6, 6);
    exp2Runs.push({
      id: `R-002-${runId++}`,
      experimentId: "EXP-002",
      factorValues: { DO: doLevel },
      titer: Math.max(0, titer),
      glycanScore: Math.max(0, Math.min(100, glycan)),
    });
  });

  experiments.push({
    id: "EXP-002",
    name: "Pilot: DO Optimization",
    stage: "Pilot",
    product: "mAb-01",
    designType: "Central Composite",
    factors: ["DO"],
    runs: exp2Runs,
  });

  return experiments;
}

// Generate audit events
function generateAuditEvents(batches: Batch[]): AuditEvent[] {
  const events: AuditEvent[] = [];
  const users = ["Dr. Smith", "Dr. Jones", "Dr. Lee", "J. Williams"];
  const roles = ["Scientist", "Process Engineer", "QA Manager", "Manufacturing Lead"];
  const actions = [
    "Accepted recommended CPP profile",
    "Modified batch parameters",
    "Reviewed CQA results",
    "Approved scale-up transfer",
    "Updated recipe version",
    "Exported batch data",
  ];

  batches.forEach((batch, idx) => {
    if (idx % 3 === 0) {
      events.push({
        id: `AE-${String(events.length + 1).padStart(4, "0")}`,
        timestamp: new Date(
          new Date(batch.startTime).getTime() + 2 * 24 * 60 * 60 * 1000
        ).toISOString(),
        user: randomChoice(users),
        role: randomChoice(roles),
        action: randomChoice(actions),
        entityType: "Batch",
        entityId: batch.id,
        details: `Action performed on batch ${batch.id} for ${batch.product}`,
      });
    }
  });

  return events;
}

// Main data generator
export function generateDemoData(): DashboardData {
  seed = 12345; // Reset seed for consistency

  const bioreactors = generateBioreactors();
  const batches = generateBatches(bioreactors);

  const cppData: CppPoint[] = [];
  const cqaResults: CqaResult[] = [];
  const mlOutputs: MlOutput[] = [];
  const recommendations: RecommendedProfile[] = [];

  batches.forEach((batch) => {
    const cpp = generateCppData(batch);
    const cqa = generateCqaResults(batch);
    const ml = generateMlOutput(batch, cqa);
    const rec = generateRecommendation(batch);

    cppData.push(...cpp);
    cqaResults.push(...cqa);
    mlOutputs.push(ml);
    recommendations.push(rec);
  });

  const experiments = generateExperiments(batches);
  const auditEvents = generateAuditEvents(batches);

  return {
    bioreactors,
    batches,
    cppData,
    cqaResults,
    mlOutputs,
    recommendations,
    experiments,
    auditEvents,
  };
}

// Singleton instance
let demoData: DashboardData | null = null;

export function getDemoData(): DashboardData {
  if (!demoData) {
    demoData = generateDemoData();
  }
  return demoData;
}
