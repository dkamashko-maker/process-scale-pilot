import type { Run, ParameterDef, TimeseriesPoint, ProcessEvent } from "./runTypes";

// ── RUNS ──
export const RUNS: Run[] = [
  {
    run_id: "CHO-r-hFSG-456-250308-2", batch_id: "CHO-r-hFSG-456-250308-2",
    reactor_id: "003-p", bioreactor_run: "R-456", operator_id: "20-456",
    cell_line: "CHO-DG44/r-hFSHβ-α-clone_127",
    target_protein: "Recombinant human FSH",
    process_strategy: "Fed-Batch", basal_medium: "CHO Medium",
    feed_medium: "Gibco OneFeed Supplement",
    start_time: "2026-02-14T08:00:00", end_time: "2026-02-28T08:00:00",
    sampling_interval_sec: 60, timeline_version: "Timeline 2",
    timezone: "Europe/Zurich", seed: 456,
  },
  {
    run_id: "CHO-r-hFSG-457-250308-2", batch_id: "CHO-r-hFSG-457-250308-2",
    reactor_id: "004-p", bioreactor_run: "R-457", operator_id: "20-457",
    cell_line: "CHO-DG44/r-hFSHβ-α-clone_127",
    target_protein: "Recombinant human FSH",
    process_strategy: "Fed-Batch", basal_medium: "CHO Medium",
    feed_medium: "Gibco OneFeed Supplement",
    start_time: "2026-02-14T08:00:00", end_time: "2026-02-28T08:00:00",
    sampling_interval_sec: 60, timeline_version: "Timeline 2",
    timezone: "Europe/Zurich", seed: 457,
  },
  {
    run_id: "CHO-r-hFSG-458-250308-2", batch_id: "CHO-r-hFSG-458-250308-2",
    reactor_id: "005-p", bioreactor_run: "R-458", operator_id: "20-458",
    cell_line: "CHO-DG44/r-hFSHβ-α-clone_127",
    target_protein: "Recombinant human FSH",
    process_strategy: "Fed-Batch", basal_medium: "CHO Medium",
    feed_medium: "Gibco OneFeed Supplement",
    start_time: "2026-02-14T08:00:00", end_time: "2026-02-28T08:00:00",
    sampling_interval_sec: 60, timeline_version: "Timeline 2",
    timezone: "Europe/Zurich", seed: 458,
  },
];

// ── PARAMETERS ──
export const PARAMETERS: ParameterDef[] = [
  { parameter_code: "TEMP", display_name: "Temperature", unit: "°C", min_value: 32.0, max_value: 37.5, type_priority: "Critical", is_critical: true },
  { parameter_code: "PH", display_name: "pH", unit: "pH", min_value: 6.8, max_value: 7.2, type_priority: "Critical", is_critical: true },
  { parameter_code: "DO", display_name: "Dissolved O₂", unit: "% air sat", min_value: 30.0, max_value: 60.0, type_priority: "Important", is_critical: false },
  { parameter_code: "AGIT", display_name: "Agitation", unit: "rpm", min_value: 50.0, max_value: 200.0, type_priority: "Important", is_critical: false },
  { parameter_code: "AIR_VVM", display_name: "Air Flow", unit: "VVM", min_value: 0.0, max_value: 0.12, type_priority: "Important", is_critical: false },
  { parameter_code: "O2_PCT", display_name: "O₂ Flow", unit: "% gas", min_value: 0.0, max_value: 25.0, type_priority: "Important", is_critical: false },
  { parameter_code: "N2_PCT", display_name: "N₂ Flow", unit: "% gas", min_value: 0.0, max_value: 10.0, type_priority: "Monitored", is_critical: false },
  { parameter_code: "CO2_PCT", display_name: "CO₂ Sparge", unit: "% gas", min_value: 0.0, max_value: 5.0, type_priority: "Monitored", is_critical: false },
  { parameter_code: "VOLUME", display_name: "Volume", unit: "L", min_value: 1.0, max_value: 1.2, type_priority: "Critical", is_critical: true },
  { parameter_code: "VCD", display_name: "Viable Cell Density", unit: "×10⁶ cells/mL", min_value: 0.5, max_value: 18.0, type_priority: "Monitored", is_critical: false },
  { parameter_code: "VIAB", display_name: "Viability", unit: "%", min_value: 60.0, max_value: 100.0, type_priority: "Monitored", is_critical: false },
  { parameter_code: "GLU", display_name: "Glucose", unit: "g/L", min_value: 2.0, max_value: 8.0, type_priority: "Important", is_critical: false },
  { parameter_code: "LAC", display_name: "Lactate", unit: "g/L", min_value: 0.0, max_value: 4.0, type_priority: "Monitored", is_critical: false },
  { parameter_code: "OSMO", display_name: "Osmolality", unit: "mOsm/kg", min_value: 280.0, max_value: 420.0, type_priority: "Important", is_critical: false },
];

// ── TIMESERIES GENERATOR ──
function seededPRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const tsCache: Record<string, TimeseriesPoint[]> = {};

export function getTimeseries(runId: string): TimeseriesPoint[] {
  if (tsCache[runId]) return tsCache[runId];
  const run = RUNS.find((r) => r.run_id === runId);
  if (!run) return [];

  const rand = seededPRNG(run.seed);
  const r = () => rand() - 0.5; // centered ±0.5
  const start = new Date(run.start_time).getTime();
  const end = new Date(run.end_time).getTime();
  const totalH = (end - start) / 3600000;
  const pts: TimeseriesPoint[] = [];

  for (let h = 0; h <= totalH; h++) {
    const t = h / totalH; // 0→1
    const tempShift = h < 72 ? 0 : Math.min(1, (h - 72) / 12);
    const cellGrowth = Math.min(1, h / 120);
    const vcdMax = 14 + (run.seed % 10) * 0.4;

    pts.push({
      elapsed_h: h,
      timestamp: new Date(start + h * 3600000).toISOString(),
      TEMP: 37.0 - tempShift * 4.0 + r() * 0.3,
      PH: 7.0 + Math.sin(h / 48) * 0.03 + r() * 0.1,
      DO: Math.max(20, 50 - cellGrowth * 18 + (h > 72 ? 8 : 0) + r() * 4),
      AGIT: 80 + cellGrowth * 70 + r() * 5,
      AIR_VVM: Math.max(0, 0.05 + cellGrowth * 0.05 + r() * 0.01),
      O2_PCT: Math.max(0, Math.min(25, cellGrowth * 15 + r() * 2)),
      N2_PCT: Math.max(0, 3 - cellGrowth * 2 + r() * 0.5),
      CO2_PCT: Math.max(0, 2 + cellGrowth * 1.5 + r() * 0.3),
      VOLUME: 1.0 + t * 0.15 + r() * 0.005,
      VCD: Math.max(0, vcdMax * (1 - Math.exp(-0.025 * h)) * Math.max(0.7, 1 - Math.max(0, (h - 260) / 200))),
      VIAB: Math.min(100, 98 - Math.max(0, (h - 168) / 168) * 15 + r() * 1),
      GLU: Math.max(2, Math.min(8, 6 - t * 3.5 + Math.sin((h / 24) * Math.PI * 2) * 1.5 + r() * 0.5)),
      LAC: Math.max(0, Math.min(4, t * 3.2 + r() * 0.3)),
      OSMO: 300 + t * 90 + r() * 8,
    });
  }
  tsCache[runId] = pts;
  return pts;
}

// ── EVENTS (from CSV) ──
const EVENTS_RAW = `CHO-r-hFSG-456-250308-2,2026-02-15 08:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-456,manual,pH control pulse
CHO-r-hFSG-456-250308-2,2026-02-15 20:00:00,FEED,OneFeed Supplement,5.0,mL,operator_20-456,manual,Daily feed (Day 1)
CHO-r-hFSG-456-250308-2,2026-02-15 20:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-456,manual,pH control pulse
CHO-r-hFSG-456-250308-2,2026-02-16 02:00:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-456,manual,foam control
CHO-r-hFSG-456-250308-2,2026-02-16 08:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-456,manual,pH control pulse
CHO-r-hFSG-456-250308-2,2026-02-16 20:00:00,FEED,OneFeed Supplement,10.0,mL,operator_20-456,manual,Daily feed (Day 2)
CHO-r-hFSG-456-250308-2,2026-02-16 20:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-456,manual,pH control pulse
CHO-r-hFSG-456-250308-2,2026-02-17 02:00:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-456,manual,foam control
CHO-r-hFSG-456-250308-2,2026-02-17 08:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-456,manual,pH control pulse
CHO-r-hFSG-456-250308-2,2026-02-17 12:48:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-456,manual,pH control pulse
CHO-r-hFSG-456-250308-2,2026-02-17 17:36:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (transition)
CHO-r-hFSG-456-250308-2,2026-02-17 20:00:00,FEED,OneFeed Supplement,15.0,mL,operator_20-456,manual,Daily feed (Day 3)
CHO-r-hFSG-456-250308-2,2026-02-17 22:24:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (transition)
CHO-r-hFSG-456-250308-2,2026-02-18 02:00:00,INDUCER,Sodium Butyrate,2.0,mM_final,operator_20-456,manual,Expression enhancer addition
CHO-r-hFSG-456-250308-2,2026-02-18 03:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (transition)
CHO-r-hFSG-456-250308-2,2026-02-18 06:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (transition)
CHO-r-hFSG-456-250308-2,2026-02-18 08:24:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-456,manual,foam control (low)
CHO-r-hFSG-456-250308-2,2026-02-18 15:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-18 17:00:00,ADDITIVE,Galactose,10.0,mM_final,operator_20-456,manual,Glycan precursor addition
CHO-r-hFSG-456-250308-2,2026-02-18 20:00:00,FEED,OneFeed Supplement,20.0,mL,operator_20-456,manual,Daily feed (Day 4)
CHO-r-hFSG-456-250308-2,2026-02-19 06:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-19 20:00:00,FEED,OneFeed Supplement,18.75,mL,operator_20-456,manual,Daily feed (Day 5)
CHO-r-hFSG-456-250308-2,2026-02-19 22:24:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-20 14:00:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-20 20:00:00,FEED,OneFeed Supplement,17.5,mL,operator_20-456,manual,Daily feed (Day 6)
CHO-r-hFSG-456-250308-2,2026-02-21 00:00:00,ANTIFOAM,Antifoam,0.1,mL,operator_20-456,manual,as needed
CHO-r-hFSG-456-250308-2,2026-02-21 05:36:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-21 20:00:00,FEED,OneFeed Supplement,16.25,mL,operator_20-456,manual,Daily feed (Day 7)
CHO-r-hFSG-456-250308-2,2026-02-21 21:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-22 12:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-22 20:00:00,FEED,OneFeed Supplement,15.0,mL,operator_20-456,manual,Daily feed (Day 8)
CHO-r-hFSG-456-250308-2,2026-02-23 04:24:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-23 20:00:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-23 20:00:00,FEED,OneFeed Supplement,13.75,mL,operator_20-456,manual,Daily feed (Day 9)
CHO-r-hFSG-456-250308-2,2026-02-24 11:36:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-24 20:00:00,FEED,OneFeed Supplement,12.5,mL,operator_20-456,manual,Daily feed (Day 10)
CHO-r-hFSG-456-250308-2,2026-02-25 03:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-25 18:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-456,manual,pH control pulse (production)
CHO-r-hFSG-456-250308-2,2026-02-25 20:00:00,FEED,OneFeed Supplement,11.25,mL,operator_20-456,manual,Daily feed (Day 11)
CHO-r-hFSG-456-250308-2,2026-02-26 20:00:00,FEED,OneFeed Supplement,10.0,mL,operator_20-456,manual,Daily feed (Day 12)
CHO-r-hFSG-456-250308-2,2026-02-27 20:00:00,HARVEST,Harvest Culture Fluid,,,system,system,End of run / harvest
CHO-r-hFSG-457-250308-2,2026-02-15 07:59:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-457,manual,pH control pulse
CHO-r-hFSG-457-250308-2,2026-02-15 19:59:00,FEED,OneFeed Supplement,5.0,mL,operator_20-457,manual,Daily feed (Day 1)
CHO-r-hFSG-457-250308-2,2026-02-15 19:59:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-457,manual,pH control pulse
CHO-r-hFSG-457-250308-2,2026-02-16 02:02:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-457,manual,foam control
CHO-r-hFSG-457-250308-2,2026-02-16 08:02:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-457,manual,pH control pulse
CHO-r-hFSG-457-250308-2,2026-02-16 19:58:00,FEED,OneFeed Supplement,10.0,mL,operator_20-457,manual,Daily feed (Day 2)
CHO-r-hFSG-457-250308-2,2026-02-16 20:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-457,manual,pH control pulse
CHO-r-hFSG-457-250308-2,2026-02-17 02:01:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-457,manual,foam control
CHO-r-hFSG-457-250308-2,2026-02-17 08:02:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-457,manual,pH control pulse
CHO-r-hFSG-457-250308-2,2026-02-17 12:47:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-457,manual,pH control pulse
CHO-r-hFSG-457-250308-2,2026-02-17 17:34:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (transition)
CHO-r-hFSG-457-250308-2,2026-02-17 20:01:00,FEED,OneFeed Supplement,15.0,mL,operator_20-457,manual,Daily feed (Day 3)
CHO-r-hFSG-457-250308-2,2026-02-17 22:24:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (transition)
CHO-r-hFSG-457-250308-2,2026-02-18 02:01:00,INDUCER,Sodium Butyrate,2.0,mM_final,operator_20-457,manual,Expression enhancer addition
CHO-r-hFSG-457-250308-2,2026-02-18 03:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (transition)
CHO-r-hFSG-457-250308-2,2026-02-18 06:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (transition)
CHO-r-hFSG-457-250308-2,2026-02-18 08:24:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-457,manual,foam control (low)
CHO-r-hFSG-457-250308-2,2026-02-18 15:14:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-18 17:00:00,ADDITIVE,Galactose,10.0,mM_final,operator_20-457,manual,Glycan precursor addition
CHO-r-hFSG-457-250308-2,2026-02-18 19:58:00,FEED,OneFeed Supplement,20.0,mL,operator_20-457,manual,Daily feed (Day 4)
CHO-r-hFSG-457-250308-2,2026-02-19 06:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-19 20:00:00,FEED,OneFeed Supplement,18.75,mL,operator_20-457,manual,Daily feed (Day 5)
CHO-r-hFSG-457-250308-2,2026-02-19 22:24:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-20 13:58:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-20 19:58:00,FEED,OneFeed Supplement,17.5,mL,operator_20-457,manual,Daily feed (Day 6)
CHO-r-hFSG-457-250308-2,2026-02-20 23:59:00,ANTIFOAM,Antifoam,0.1,mL,operator_20-457,manual,as needed
CHO-r-hFSG-457-250308-2,2026-02-21 05:36:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-21 19:59:00,FEED,OneFeed Supplement,16.25,mL,operator_20-457,manual,Daily feed (Day 7)
CHO-r-hFSG-457-250308-2,2026-02-21 21:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-22 12:50:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-22 20:01:00,FEED,OneFeed Supplement,15.0,mL,operator_20-457,manual,Daily feed (Day 8)
CHO-r-hFSG-457-250308-2,2026-02-23 04:23:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-23 20:00:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-23 19:58:00,FEED,OneFeed Supplement,13.75,mL,operator_20-457,manual,Daily feed (Day 9)
CHO-r-hFSG-457-250308-2,2026-02-24 11:36:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-24 20:00:00,FEED,OneFeed Supplement,12.5,mL,operator_20-457,manual,Daily feed (Day 10)
CHO-r-hFSG-457-250308-2,2026-02-25 03:14:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-25 18:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-457,manual,pH control pulse (production)
CHO-r-hFSG-457-250308-2,2026-02-25 20:02:00,FEED,OneFeed Supplement,11.25,mL,operator_20-457,manual,Daily feed (Day 11)
CHO-r-hFSG-457-250308-2,2026-02-26 20:01:00,FEED,OneFeed Supplement,10.0,mL,operator_20-457,manual,Daily feed (Day 12)
CHO-r-hFSG-457-250308-2,2026-02-27 20:00:00,HARVEST,Harvest Culture Fluid,,,operator_20-457,system,End of run / harvest
CHO-r-hFSG-458-250308-2,2026-02-15 07:59:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-458,manual,pH control pulse
CHO-r-hFSG-458-250308-2,2026-02-15 20:01:00,FEED,OneFeed Supplement,5.0,mL,operator_20-458,manual,Daily feed (Day 1)
CHO-r-hFSG-458-250308-2,2026-02-15 20:01:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-458,manual,pH control pulse
CHO-r-hFSG-458-250308-2,2026-02-16 01:59:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-458,manual,foam control
CHO-r-hFSG-458-250308-2,2026-02-16 08:01:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-458,manual,pH control pulse
CHO-r-hFSG-458-250308-2,2026-02-16 19:58:00,FEED,OneFeed Supplement,10.0,mL,operator_20-458,manual,Daily feed (Day 2)
CHO-r-hFSG-458-250308-2,2026-02-16 20:00:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-458,manual,pH control pulse
CHO-r-hFSG-458-250308-2,2026-02-17 01:58:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-458,manual,foam control
CHO-r-hFSG-458-250308-2,2026-02-17 08:01:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-458,manual,pH control pulse
CHO-r-hFSG-458-250308-2,2026-02-17 12:50:00,BASE_ADDITION,NaHCO3,0.83,mL,operator_20-458,manual,pH control pulse
CHO-r-hFSG-458-250308-2,2026-02-17 17:35:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (transition)
CHO-r-hFSG-458-250308-2,2026-02-17 20:01:00,FEED,OneFeed Supplement,15.0,mL,operator_20-458,manual,Daily feed (Day 3)
CHO-r-hFSG-458-250308-2,2026-02-17 22:24:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (transition)
CHO-r-hFSG-458-250308-2,2026-02-18 02:02:00,INDUCER,Sodium Butyrate,2.0,mM_final,operator_20-458,manual,Expression enhancer addition
CHO-r-hFSG-458-250308-2,2026-02-18 03:12:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (transition)
CHO-r-hFSG-458-250308-2,2026-02-18 06:48:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (transition)
CHO-r-hFSG-458-250308-2,2026-02-18 08:23:00,ANTIFOAM,Antifoam,0.05,mL,operator_20-458,manual,foam control (low)
CHO-r-hFSG-458-250308-2,2026-02-18 15:14:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-18 16:59:00,ADDITIVE,Galactose,10.0,mM_final,operator_20-458,manual,Glycan precursor addition
CHO-r-hFSG-458-250308-2,2026-02-18 20:02:00,FEED,OneFeed Supplement,20.0,mL,operator_20-458,manual,Daily feed (Day 4)
CHO-r-hFSG-458-250308-2,2026-02-19 06:50:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-19 20:01:00,FEED,OneFeed Supplement,18.75,mL,operator_20-458,manual,Daily feed (Day 5)
CHO-r-hFSG-458-250308-2,2026-02-19 22:25:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-20 13:58:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-20 20:02:00,FEED,OneFeed Supplement,17.5,mL,operator_20-458,manual,Daily feed (Day 6)
CHO-r-hFSG-458-250308-2,2026-02-20 23:58:00,ANTIFOAM,Antifoam,0.1,mL,operator_20-458,manual,as needed
CHO-r-hFSG-458-250308-2,2026-02-21 05:35:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-21 20:01:00,FEED,OneFeed Supplement,16.25,mL,operator_20-458,manual,Daily feed (Day 7)
CHO-r-hFSG-458-250308-2,2026-02-21 21:14:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-22 12:47:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-22 20:02:00,FEED,OneFeed Supplement,15.0,mL,operator_20-458,manual,Daily feed (Day 8)
CHO-r-hFSG-458-250308-2,2026-02-23 04:26:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-23 20:02:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-23 19:59:00,FEED,OneFeed Supplement,13.75,mL,operator_20-458,manual,Daily feed (Day 9)
CHO-r-hFSG-458-250308-2,2026-02-24 11:38:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-24 19:59:00,FEED,OneFeed Supplement,12.5,mL,operator_20-458,manual,Daily feed (Day 10)
CHO-r-hFSG-458-250308-2,2026-02-25 03:10:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-25 18:47:00,BASE_ADDITION,NaHCO3,1.25,mL,operator_20-458,manual,pH control pulse (production)
CHO-r-hFSG-458-250308-2,2026-02-25 19:59:00,FEED,OneFeed Supplement,11.25,mL,operator_20-458,manual,Daily feed (Day 11)
CHO-r-hFSG-458-250308-2,2026-02-26 20:00:00,FEED,OneFeed Supplement,10.0,mL,operator_20-458,manual,Daily feed (Day 12)
CHO-r-hFSG-458-250308-2,2026-02-27 20:00:00,HARVEST,Harvest Culture Fluid,,,operator_20-458,system,End of run / harvest`;

function parseEvents(): ProcessEvent[] {
  return EVENTS_RAW.trim()
    .split("\n")
    .map((line, i) => {
      const p = line.split(",");
      return {
        id: `EVT-${String(i + 1).padStart(4, "0")}`,
        run_id: p[0],
        timestamp: p[1].replace(" ", "T"),
        event_type: p[2],
        subtype: p[3],
        amount: p[4] ? parseFloat(p[4]) : null,
        amount_unit: p[5] || "",
        actor: p[6],
        entry_mode: p[7],
        notes: p.slice(8).join(","),
      };
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

let _events: ProcessEvent[] | null = null;
export function getInitialEvents(): ProcessEvent[] {
  if (!_events) _events = parseEvents();
  return [..._events];
}
