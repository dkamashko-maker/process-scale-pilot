/**
 * Shared sensor catalog.
 *
 * Each sensor is attached to one piece of equipment and exposes a
 * physical measurand. Used by Sensor Map, hover tooltips, Workflow
 * Canvas, and the metadata configurator.
 */

export type SensorKind =
  | "temperature" | "ph" | "do" | "agitation" | "co2" | "pressure"
  | "uv" | "conductivity" | "flow" | "weight" | "vacuum" | "vision" | "wfi";

export type SensorHealth = "ok" | "drift" | "fault" | "offline";

export interface Sensor {
  id: string;
  name: string;
  kind: SensorKind;
  unit: string;
  /** Equipment this sensor is bolted to */
  equipmentId: string;
  /** Operating range used for tooltips / map color coding */
  range: { min: number; max: number };
  /** Last reading (display-only) */
  lastValue: number;
  health: SensorHealth;
  lastReadingAt: string;
  criticality: "high" | "medium" | "low";
}

export const SENSORS: Sensor[] = [
  // UP-001 Seed Bioreactor
  { id: "S-UP001-TEMP", name: "Temperature",   kind: "temperature", unit: "°C",     equipmentId: "UP-001", range: { min: 36.5, max: 37.5 }, lastValue: 37.0, health: "ok", lastReadingAt: "2026-04-21T18:30:00", criticality: "high" },
  { id: "S-UP001-PH",   name: "pH",            kind: "ph",          unit: "pH",     equipmentId: "UP-001", range: { min: 6.9,  max: 7.3  }, lastValue: 7.10, health: "ok", lastReadingAt: "2026-04-21T18:30:00", criticality: "high" },
  { id: "S-UP001-DO",   name: "Dissolved O₂",  kind: "do",          unit: "% sat",  equipmentId: "UP-001", range: { min: 30,   max: 80   }, lastValue: 55,   health: "ok", lastReadingAt: "2026-04-21T18:30:00", criticality: "high" },
  { id: "S-UP001-AGI",  name: "Agitation",     kind: "agitation",   unit: "rpm",    equipmentId: "UP-001", range: { min: 80,   max: 250  }, lastValue: 150,  health: "ok", lastReadingAt: "2026-04-21T18:30:00", criticality: "medium" },

  // UP-002 Prod Bioreactor (active, harvesting)
  { id: "S-UP002-TEMP", name: "Temperature",   kind: "temperature", unit: "°C",     equipmentId: "UP-002", range: { min: 36.5, max: 37.5 }, lastValue: 36.2, health: "drift", lastReadingAt: "2026-04-23T11:59:00", criticality: "high" },
  { id: "S-UP002-PH",   name: "pH",            kind: "ph",          unit: "pH",     equipmentId: "UP-002", range: { min: 6.9,  max: 7.3  }, lastValue: 6.95, health: "ok",    lastReadingAt: "2026-04-23T11:59:00", criticality: "high" },
  { id: "S-UP002-DO",   name: "Dissolved O₂",  kind: "do",          unit: "% sat",  equipmentId: "UP-002", range: { min: 30,   max: 80   }, lastValue: 24,   health: "drift", lastReadingAt: "2026-04-23T11:59:00", criticality: "high" },
  { id: "S-UP002-AGI",  name: "Agitation",     kind: "agitation",   unit: "rpm",    equipmentId: "UP-002", range: { min: 80,   max: 250  }, lastValue: 210,  health: "ok",    lastReadingAt: "2026-04-23T11:59:00", criticality: "medium" },
  { id: "S-UP002-CO2",  name: "CO₂",           kind: "co2",         unit: "%",      equipmentId: "UP-002", range: { min: 2,    max: 8    }, lastValue: 5.4,  health: "ok",    lastReadingAt: "2026-04-23T11:59:00", criticality: "medium" },

  // Downstream
  { id: "S-DS101-RPM",  name: "Bowl RPM",      kind: "agitation",   unit: "rpm",    equipmentId: "DS-101", range: { min: 0, max: 12000 }, lastValue: 4500, health: "ok", lastReadingAt: "2026-04-23T11:35:00", criticality: "medium" },
  { id: "S-DS101-TEMP", name: "Bowl Temp",     kind: "temperature", unit: "°C",     equipmentId: "DS-101", range: { min: 4, max: 25    }, lastValue: 8,    health: "ok", lastReadingAt: "2026-04-23T11:35:00", criticality: "low" },
  { id: "S-DS102-RPM",  name: "Bowl RPM",      kind: "agitation",   unit: "rpm",    equipmentId: "DS-102", range: { min: 0, max: 12000 }, lastValue: 0,    health: "ok", lastReadingAt: "2026-04-22T16:10:00", criticality: "medium" },
  { id: "S-DS102-TEMP", name: "Bowl Temp",     kind: "temperature", unit: "°C",     equipmentId: "DS-102", range: { min: 4, max: 25    }, lastValue: 18,   health: "ok", lastReadingAt: "2026-04-22T16:10:00", criticality: "low" },

  { id: "S-DS201-UV280", name: "UV 280",       kind: "uv",          unit: "mAU",    equipmentId: "DS-201", range: { min: 0, max: 3000 }, lastValue: 1820, health: "ok",    lastReadingAt: "2026-04-23T12:02:00", criticality: "high" },
  { id: "S-DS201-COND",  name: "Conductivity", kind: "conductivity",unit: "mS/cm",  equipmentId: "DS-201", range: { min: 0, max: 60   }, lastValue: 22,   health: "ok",    lastReadingAt: "2026-04-23T12:02:00", criticality: "medium" },
  { id: "S-DS201-PRES",  name: "Inlet Pressure", kind: "pressure",  unit: "bar",    equipmentId: "DS-201", range: { min: 0, max: 5    }, lastValue: 3.1,  health: "drift", lastReadingAt: "2026-04-23T12:02:00", criticality: "high" },

  { id: "S-DS202-TMP",   name: "TMP",          kind: "pressure",    unit: "bar",    equipmentId: "DS-202", range: { min: 0, max: 2 },  lastValue: 0.9, health: "ok", lastReadingAt: "2026-04-23T11:55:00", criticality: "medium" },
  { id: "S-DS202-FLOW",  name: "Permeate Flow",kind: "flow",        unit: "L/min",  equipmentId: "DS-202", range: { min: 0, max: 5 },  lastValue: 1.4, health: "ok", lastReadingAt: "2026-04-23T11:55:00", criticality: "medium" },

  { id: "S-DS301-WFI",   name: "WFI Flow",     kind: "wfi",         unit: "L/min",  equipmentId: "DS-301", range: { min: 0, max: 30 }, lastValue: 0,   health: "ok", lastReadingAt: "2026-04-21T11:00:00", criticality: "low" },
  { id: "S-DS302-TEMP",  name: "Chamber Temp", kind: "temperature", unit: "°C",     equipmentId: "DS-302", range: { min: 20, max: 320 }, lastValue: 298, health: "ok", lastReadingAt: "2026-04-23T11:50:00", criticality: "medium" },

  { id: "S-DS401-VAC",   name: "Vacuum",       kind: "vacuum",      unit: "mTorr",  equipmentId: "DS-401", range: { min: 50, max: 200 },  lastValue: 410, health: "fault", lastReadingAt: "2026-04-23T07:42:00", criticality: "high" },
  { id: "S-DS401-SHELF", name: "Shelf Temp",   kind: "temperature", unit: "°C",     equipmentId: "DS-401", range: { min: -50, max: 40 },  lastValue: -18, health: "drift", lastReadingAt: "2026-04-23T07:42:00", criticality: "high" },
  { id: "S-DS401-COND",  name: "Condenser",    kind: "temperature", unit: "°C",     equipmentId: "DS-401", range: { min: -80, max: -40 }, lastValue: -62, health: "ok",    lastReadingAt: "2026-04-23T07:42:00", criticality: "medium" },

  { id: "S-DS402-FLOW",  name: "Fill Flow",    kind: "flow",        unit: "mL/s",   equipmentId: "DS-402", range: { min: 0, max: 5  }, lastValue: 1.0, health: "ok", lastReadingAt: "2026-04-23T11:58:00", criticality: "medium" },
  { id: "S-DS402-WEIGHT",name: "Vial Weight",  kind: "weight",      unit: "g",      equipmentId: "DS-402", range: { min: 0, max: 5  }, lastValue: 1.05,health: "ok", lastReadingAt: "2026-04-23T11:58:00", criticality: "medium" },
  { id: "S-DS403-VISION",name: "Vision Check", kind: "vision",      unit: "pass/fail", equipmentId: "DS-403", range: { min: 0, max: 1 }, lastValue: 1, health: "ok", lastReadingAt: "2026-04-23T11:55:00", criticality: "low" },

  // Analytical (one signature sensor per device)
  { id: "S-AN101-UV",   name: "UV Detector",   kind: "uv",          unit: "mAU",    equipmentId: "AN-101", range: { min: 0, max: 3000 }, lastValue: 1240, health: "ok", lastReadingAt: "2026-04-23T10:32:00", criticality: "high" },
  { id: "S-AN101-PRES", name: "System Pressure", kind: "pressure",  unit: "bar",    equipmentId: "AN-101", range: { min: 0, max: 400  }, lastValue: 180,  health: "ok", lastReadingAt: "2026-04-23T10:32:00", criticality: "medium" },
  { id: "S-AN102-UV",   name: "UV Detector",   kind: "uv",          unit: "mAU",    equipmentId: "AN-102", range: { min: 0, max: 3000 }, lastValue: 980,  health: "ok", lastReadingAt: "2026-04-23T09:47:00", criticality: "high" },
  { id: "S-AN102-COND", name: "Conductivity",  kind: "conductivity",unit: "mS/cm",  equipmentId: "AN-102", range: { min: 0, max: 80   }, lastValue: 45,   health: "ok", lastReadingAt: "2026-04-23T09:47:00", criticality: "medium" },
  { id: "S-AN103-UV",   name: "UV Detector",   kind: "uv",          unit: "mAU",    equipmentId: "AN-103", range: { min: 0, max: 3000 }, lastValue: 540,  health: "ok", lastReadingAt: "2026-04-22T18:10:00", criticality: "medium" },
];

export function getSensorById(id: string): Sensor | undefined {
  return SENSORS.find((s) => s.id === id);
}

export function getSensorsForEquipment(equipmentId: string): Sensor[] {
  return SENSORS.filter((s) => s.equipmentId === equipmentId);
}
