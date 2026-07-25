import type { GlobalEvent, MonitorModule } from "../../lib/types";

const NEO_API = "https://api.nasa.gov/neo/rest/v1/feed";
const NASA_KEY = process.env.NASA_API_KEY ?? "DEMO_KEY";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "neo-seed-001",
    source: "NASA NeoWs (seed)",
    module: "neo",
    title: "NEO 2024 PT5 — Close Approach",
    description: "Near-Earth Object 2024 PT5 will pass within 0.015 AU. Estimated diameter 11m. No impact risk.",
    location: { lat: 0, lng: 0, country: "SPACE" },
    timestamp: new Date(Date.now() + 86_400_000).toISOString(),
    riskLevel: "informativo",
    impact: { operational: 5, humanitarian: 0, economic: 5, environmental: 0, security: 10 },
    confidence: 0.98,
    tags: ["neo", "close-approach", "asteroid"],
    relatedEvents: [],
    metadata: { neoReferenceId: "2024PT5", diameterMinM: 8, diameterMaxM: 14, velocityKms: 6.2, missDistanceAu: 0.015, hazardous: false },
  },
  {
    id: "neo-seed-002",
    source: "NASA NeoWs (seed)",
    module: "neo",
    title: "Potentially Hazardous Asteroid 2023 RM4",
    description: "PHA 2023 RM4 approaching. Diameter ~180m. Closest approach in 72 hours.",
    location: { lat: 0, lng: 0, country: "SPACE" },
    timestamp: new Date(Date.now() + 259_200_000).toISOString(),
    riskLevel: "baixo",
    impact: { operational: 15, humanitarian: 10, economic: 20, environmental: 10, security: 15 },
    confidence: 0.85,
    tags: ["neo", "pha", "asteroid", "close-approach"],
    relatedEvents: [],
    metadata: { neoReferenceId: "2023RM4", diameterMinM: 150, diameterMaxM: 210, velocityKms: 12.5, missDistanceAu: 0.05, hazardous: true },
  },
];

function todayDate(): string {
  return new Date().toISOString().split("T")[0];
}

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const start = todayDate();
    const end = todayDate();
    const url = `${NEO_API}?start_date=${start}&end_date=${end}&api_key=${NASA_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return seedData;
    const data = await res.json();
    const neoMap: Record<string, any[]> = data?.near_earth_objects ?? {};
    const events: GlobalEvent[] = [];
    for (const [_date, neos] of Object.entries(neoMap)) {
      for (const neo of neos ?? []) {
        const closeApproach = neo.close_approach_data?.[0];
        const diameter = neo.estimated_diameter?.meters;
        const avgDiameter = diameter
          ? (diameter.estimated_diameter_min + diameter.estimated_diameter_max) / 2
          : 0;
        const velocity = parseFloat(closeApproach?.relative_velocity?.kilometers_per_second ?? "0");
        const missAu = parseFloat(closeApproach?.miss_distance?.astronomical ?? "1");
        const hazardous = neo.is_potentially_hazardous_asteroid ?? false;
        let risk: GlobalEvent["riskLevel"] = "informativo";
        if (hazardous && avgDiameter > 100 && missAu < 0.01) risk = "alto";
        else if (hazardous && avgDiameter > 50) risk = "moderado";
        else if (hazardous) risk = "baixo";

        events.push({
          id: `neo-${neo.id}`,
          source: "NASA NeoWs",
          module: "neo" as const,
          title: `${neo.name} — ${hazardous ? "Potentially Hazardous" : "Non-hazardous"}`,
          description: `Near-Earth Object ${neo.name}: diameter ~${avgDiameter.toFixed(0)}m, miss distance ${missAu.toFixed(4)} AU, velocity ${velocity.toFixed(1)} km/s. ${hazardous ? "PHI designation." : ""}`,
          location: { lat: 0, lng: 0, country: "SPACE" },
          timestamp: closeApproach?.close_approach_date_full
            ? new Date(closeApproach.close_approach_date_full).toISOString()
            : new Date().toISOString(),
          riskLevel: risk,
          impact: {
            operational: hazardous ? Math.min(Math.round(avgDiameter * 0.1), 100) : 5,
            humanitarian: hazardous ? Math.min(Math.round(avgDiameter * 0.08), 100) : 0,
            economic: hazardous ? Math.min(Math.round(avgDiameter * 0.12), 100) : 5,
            environmental: hazardous ? Math.min(Math.round(avgDiameter * 0.05), 100) : 0,
            security: hazardous ? Math.min(Math.round(avgDiameter * 0.06), 100) : 5,
          },
          confidence: 0.95,
          tags: hazardous ? ["neo", "pha", "asteroid"] : ["neo", "asteroid"],
          relatedEvents: [],
          metadata: {
            nasaId: neo.id,
            designation: neo.neo_reference_id,
            absoluteMagnitude: neo.absolute_magnitude_h,
            diameterMinM: diameter?.estimated_diameter_min,
            diameterMaxM: diameter?.estimated_diameter_max,
            velocityKms: velocity,
            missDistanceAu: missAu,
            hazardous,
          },
        });
      }
    }
    return events.length > 0 ? events : seedData;
  } catch {
    return seedData;
  }
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${NEO_API}?start_date=${todayDate()}&end_date=${todayDate()}&api_key=${NASA_KEY}`, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const neoMonitor: MonitorModule = {
  name: "NASA NeoWs Monitor",
  category: "neo",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default neoMonitor;
