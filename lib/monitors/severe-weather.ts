import type { GlobalEvent, MonitorModule } from "../types";

const STORM_EVENTS = "https://www.ncei.noaa.gov/cdo-web/api/v2/events?limit=20&dataset=STORM_EVENTS";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "sw-seed-001",
    source: "NOAA NCEI (seed)",
    module: "clima_severo",
    title: "Severe Thunderstorm — Dallas–Fort Worth, TX",
    description: "Severe thunderstorm with 70 mph winds and quarter-sized hail.",
    location: { lat: 32.78, lng: -96.8, country: "US", state: "TX", city: "Dallas" },
    timestamp: new Date(Date.now() - 3_000_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 45, humanitarian: 40, economic: 50, environmental: 25, security: 15 },
    confidence: 0.85,
    tags: ["severe-thunderstorm", "hail", "texas"],
    relatedEvents: [],
    metadata: { eventGroup: "Thunderstorm Wind", damage: "Moderate", injuries: 0, fatalities: 0 },
  },
  {
    id: "sw-seed-002",
    source: "NOAA NCEI (seed)",
    module: "clima_severo",
    title: "Flash Flood — St. Louis, MO",
    description: "Flash flood caused by prolonged heavy rainfall. Multiple roads flooded.",
    location: { lat: 38.63, lng: -90.2, country: "US", state: "MO", city: "St. Louis" },
    timestamp: new Date(Date.now() - 6_000_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 60, humanitarian: 65, economic: 55, environmental: 40, security: 20 },
    confidence: 0.82,
    tags: ["flash-flood", "heavy-rain", "missouri"],
    relatedEvents: [],
    metadata: { eventGroup: "Flash Flood", rainfallInches: 4.2, affectedArea: "St. Louis Metro" },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(`${STORM_EVENTS}&limit=20`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return seedData;
    const data = await res.json();
    const events: any[] = data?.results ?? [];
    if (!Array.isArray(events) || events.length === 0) return seedData;
    return events.map((e) => ({
      id: `sw-${e.id ?? e.event_id}`,
      source: "NOAA NCEI Storm Events",
      module: "clima_severo" as const,
      title: `${e.event_type ?? e.type} — ${e.state ?? ""}`,
      description: `${e.event_type ?? e.type}: ${e.description ?? e.episode_narrative ?? "No description"}. Injuries: ${e.injuries_direct ?? 0}. Fatalities: ${e.deaths_direct ?? 0}.`,
      location: { lat: e.begin_lat ?? 0, lng: e.begin_lon ?? 0, country: "US", state: e.state },
      timestamp: e.begin_date_time ? new Date(e.begin_date_time).toISOString() : new Date().toISOString(),
      riskLevel: eventToRisk(e.event_type),
      impact: impactFromSeverity(e),
      confidence: 0.8,
      tags: ["severe-weather", e.event_type?.toLowerCase().replace(/\s+/g, "-")].filter(Boolean),
      relatedEvents: [],
      metadata: { eventType: e.event_type, magnitude: e.magnitude, source: e.source },
    }));
  } catch {
    return seedData;
  }
}

function eventToRisk(type?: string): GlobalEvent["riskLevel"] {
  const t = (type ?? "").toLowerCase();
  if (t.includes("flash flood") || t.includes("tornado") || t.includes("hurricane")) return "alto";
  if (t.includes("severe thunderstorm") || t.includes("winter storm") || t.includes("ice storm")) return "moderado";
  if (t.includes("flood") || t.includes("wind") || t.includes("hail")) return "baixo";
  return "informativo";
}

function impactFromSeverity(e: any): GlobalEvent["impact"] {
  const base = Math.min((e.injuries_direct ?? 0) * 10 + (e.deaths_direct ?? 0) * 20 + 30, 100);
  return { operational: base, humanitarian: Math.round(base * 1.1), economic: Math.round(base * 0.9), environmental: Math.round(base * 0.5), security: Math.round(base * 0.3) };
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch("https://www.ncei.noaa.gov/cdo-web/api/v2/datasets?limit=1", { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const severeWeatherMonitor: MonitorModule = {
  name: "NOAA Severe Weather Monitor",
  category: "clima_severo",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default severeWeatherMonitor;
