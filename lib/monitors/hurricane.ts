import type { GlobalEvent, MonitorModule } from "../../lib/types";

const NHC_API = "https://www.nhc.noaa.gov/CurrentSummary.json";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "hur-seed-001",
    source: "NHC (seed)",
    module: "furacao",
    title: "Hurricane Watch — Gulf of Mexico",
    description: "Tropical system with sustained winds of 85 mph approaching the Gulf Coast.",
    location: { lat: 26.5, lng: -89.0, country: "US", state: "LA" },
    timestamp: new Date(Date.now() - 5_000_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 70, humanitarian: 75, economic: 80, environmental: 50, security: 30 },
    confidence: 0.88,
    tags: ["hurricane", "tropical-storm", "gulf"],
    relatedEvents: [],
    metadata: { windMph: 85, pressureMb: 975, category: 2, movement: "NW at 12mph" },
  },
  {
    id: "hur-seed-002",
    source: "NHC (seed)",
    module: "furacao",
    title: "Tropical Storm forming near Bermuda",
    description: "Tropical depression strengthening, expected to become tropical storm within 24h.",
    location: { lat: 31.0, lng: -64.5, country: "BM" },
    timestamp: new Date(Date.now() - 9_000_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 40, humanitarian: 45, economic: 50, environmental: 35, security: 15 },
    confidence: 0.78,
    tags: ["tropical-depression", "atlantic"],
    relatedEvents: [],
    metadata: { windMph: 45, pressureMb: 1005, category: "TD", movement: "NE at 8mph" },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(NHC_API, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return seedData;
    const data = await res.json();
    const cyclones: any[] = data?.activeCyclones ?? data?.cyclones ?? [];
    if (cyclones.length === 0) return seedData;
    return cyclones.map((c) => ({
      id: `hur-${c.stormid ?? c.name?.replace(/\s+/g, "-").toLowerCase()}`,
      source: "NOAA NHC",
      module: "furacao" as const,
      title: `${c.name ?? "Unnamed"} — ${c.classification ?? c.type ?? "Tropical System"}`,
      description: `${c.name ?? "Unnamed"}: ${c.classification ?? "tropical system"} with winds ${c.maxWind?.kt ? `${Math.round(c.maxWind.kt * 1.151)} mph` : "N/A"}. ${c.advisoryType ?? ""}`,
      location: {
        lat: c.lat ?? 0,
        lng: c.lon ?? 0,
        country: c.landfall?.country ?? "Atlantic",
      },
      timestamp: new Date(c.date ?? Date.now()).toISOString(),
      riskLevel: riskFromCategory(c.classification),
      impact: impactFromCategory(c.classification),
      confidence: 0.85,
      tags: ["hurricane", "tropical"],
      relatedEvents: [],
      metadata: { windKt: c.maxWind?.kt, pressureMb: c.pressure?.mb, movement: c.movement },
    }));
  } catch {
    return seedData;
  }
}

function riskFromCategory(cat?: string): GlobalEvent["riskLevel"] {
  const c = (cat ?? "").toLowerCase();
  if (c.includes("major") || c.includes("cat 4") || c.includes("cat 5")) return "critico";
  if (c.includes("hurricane") || c.includes("cat 3")) return "alto";
  if (c.includes("ts") || c.includes("tropical storm")) return "moderado";
  if (c.includes("td") || c.includes("tropical depression")) return "baixo";
  return "informativo";
}

function impactFromCategory(cat?: string): GlobalEvent["impact"] {
  const c = (cat ?? "").toLowerCase();
  const b = c.includes("major") || c.includes("cat 4") || c.includes("cat 5") ? 85
    : c.includes("hurricane") || c.includes("cat 3") ? 70
    : c.includes("ts") || c.includes("tropical storm") ? 50
    : 30;
  return { operational: b, humanitarian: Math.round(b * 1.1), economic: Math.round(b * 1.15), environmental: Math.round(b * 0.6), security: Math.round(b * 0.4) };
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(NHC_API, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const hurricaneMonitor: MonitorModule = {
  name: "NOAA Hurricane Monitor",
  category: "furacao",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default hurricaneMonitor;
