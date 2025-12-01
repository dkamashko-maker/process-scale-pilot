// Core data model types for bioprocessing analytics platform

export type Stage = "Lab" | "Pilot" | "Manufacturing";
export type Scenario = "baseline" | "optimized";

export interface Bioreactor {
  id: string;
  name: string;        // e.g. "BR-101"
  site: string;        // e.g. "Site A"
  stage: Stage;
  scaleL: number;      // working volume in liters
  status: "Idle" | "Running" | "Completed" | "Maintenance";
}

export interface Batch {
  id: string;
  bioreactorId: string;
  product: string;         // "mAb-01"
  cellLine: string;        // "CL-27"
  media: string;           // "Media-A"
  recipeVersion: string;   // "v3.2"
  stage: Stage;
  site: string;
  startTime: string;       // ISO
  endTime: string;
  resultStatus: "Pass" | "Fail" | "At Risk";
  scenario: Scenario;      // baseline vs optimized
}

export interface CppPoint {
  batchId: string;
  timestamp: string;
  phase: 1 | 2 | 3 | 4;
  pH: number;
  DO: number;         // %
  temp: number;       // C
  agitation: number;  // rpm
  feedRate: number;   // mL/h
  viableCellDensity: number; // 10^6 cells/mL
}

export interface CqaResult {
  batchId: string;
  cqaName: "Titer" | "GlycanQuality" | "Aggregation";
  value: number;
  specLow: number;
  specHigh: number;
  inSpec: boolean;
}

export interface MlOutput {
  batchId: string;
  predictedTiter: number;
  predictedGlycanScore: number; // 0-100
  riskScore: number;            // 0-1
  riskLevel: "Low" | "Medium" | "High";
  topDrivers: {
    parameter: string;          // "DO Phase 3"
    impact: "Positive" | "Negative";
    contribution: number;       // %
  }[];
}

export interface RecommendedProfile {
  batchId: string;
  stage: Stage;
  phase: number;
  targetDO: number;
  targetTemp: number;
  targetFeedRate: number;
  rationale: string;            // short 1-sentence explanation
}

export interface Experiment {
  id: string;
  name: string;                         // "Lab DoE: pH vs Temp"
  stage: Stage;                         // usually "Lab" or "Pilot"
  product: string;
  designType: "Full Factorial" | "Central Composite";
  factors: string[];                    // ["pH", "Temp"]
  runs: ExperimentRun[];
}

export interface ExperimentRun {
  id: string;
  experimentId: string;
  linkedBatchId?: string;               // manufacturing batch if scaled up
  factorValues: Record<string, number>; // e.g. {"pH": 7.0, "Temp": 36}
  titer: number;
  glycanScore: number;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;    // "Accepted recommended CPP profile"
  entityType: string;// "Batch" | "Experiment" | "Config"
  entityId: string;
  details: string;
}

// Aggregated dashboard data
export interface DashboardData {
  bioreactors: Bioreactor[];
  batches: Batch[];
  cppData: CppPoint[];
  cqaResults: CqaResult[];
  mlOutputs: MlOutput[];
  recommendations: RecommendedProfile[];
  experiments: Experiment[];
  auditEvents: AuditEvent[];
}
