// ============================================================
// MODULE REGISTRY — Auto-register all monitors
// ============================================================

import { registerModule } from "../core";
import type { MonitorModule } from "../types";

import earthquake from "./earthquake";
import volcano from "./volcano";
import hurricane from "./hurricane";
import tornado from "./tornado";
import severeWeather from "./severe-weather";
import wildfire from "./wildfire";
import flood from "./flood";
import drought from "./drought";
import spaceWeather from "./space-weather";
import neo from "./neo";
import satellite from "./satellite";
import health from "./health";
import cyber from "./cyber";
import energy from "./energy";
import maritime from "./maritime";
import air from "./air";
import economic from "./economic";
import infrastructure from "./infrastructure";
import conflict from "./conflict";

const allMonitors: MonitorModule[] = [
  earthquake,
  volcano,
  hurricane,
  tornado,
  severeWeather,
  wildfire,
  flood,
  drought,
  spaceWeather,
  neo,
  satellite,
  health,
  cyber,
  energy,
  maritime,
  air,
  economic,
  infrastructure,
  conflict,
];

export function registerAllModules(): void {
  for (const mod of allMonitors) {
    registerModule(mod);
  }
}

export function getMonitorList(): { name: string; category: string; version: string; enabled: boolean }[] {
  return allMonitors.map(m => ({
    name: m.name,
    category: m.category,
    version: m.version,
    enabled: m.enabled,
  }));
}

export { allMonitors };
