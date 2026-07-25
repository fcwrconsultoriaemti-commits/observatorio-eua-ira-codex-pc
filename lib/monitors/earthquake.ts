import type { GlobalEvent, MonitorModule } from "../../lib/types";

const USGS_API = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "eq-seed-001",
    source: "USGS (seed)",
    module: "terremoto",
    title: "M5.2 - 45km NE of Ridgecrest, CA",
    description: "Moderate earthquake near Ridgecrest, California. No tsunami warning issued.",
    location: { lat: 35.87, lng: -117.45, country: "US", state: "CA", depth: 8.2 },
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 40, humanitarian: 35, economic: 45, environmental: 20, security: 15 },
    confidence: 0.95,
    tags: ["earthquake", "seismic", "california"],
    relatedEvents: [],
    metadata: { magnitude: 5.2, depthKm: 8.2, tsunami: false, felt: 1200 },
  },
  {
    id: "eq-seed-002",
    source: "USGS (seed)",
    module: "terremoto",
    title: "M6.1 - 80km S of Tokyo, Japan",
    description: "Significant earthquake off the coast of Japan. Depth 35km.",
    location: { lat: 34.9, lng: 139.5, country: "JP", depth: 35 },
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 65, humanitarian: 60, economic: 70, environmental: 30, security: 20 },
    confidence: 0.92,
    tags: ["earthquake", "seismic", "japan", "tsunami-watch"],
    relatedEvents: [],
    metadata: { magnitude: 6.1, depthKm: 35, tsunami: false, felt: 5400 },
  },
];

function classifyRisk(mag: number, depth: number): GlobalEvent["riskLevel"] {
  if (mag >= 7.0) return "critico";
  if (mag >= 6.0) return "alto";
  if (mag >= 5.0) return "moderado";
  if (mag >= 4.0) return "baixo";
  return "informativo";
}

function buildImpact(mag: number, depth: number): GlobalEvent["impact"] {
  const base = Math.min(mag * 12, 100);
  const depthMod = depth < 10 ? 1.3 : depth < 30 ? 1.0 : 0.7;
  return {
    operational: Math.round(base * depthMod * 0.8),
    humanitarian: Math.round(base * depthMod),
    economic: Math.round(base * depthMod * 0.9),
    environmental: Math.round(base * 0.4),
    security: Math.round(base * 0.3),
  };
}

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(USGS_API, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return seedData;
    const data = await res.json();
    const features: any[] = data.features ?? [];
    return features.map((f) => {
      const p = f.properties;
      const c = f.geometry.coordinates;
      const mag = p.mag ?? 0;
      const depth = c[2] ?? 0;
      return {
        id: `eq-${f.id}`,
        source: "USGS Earthquake Hazards",
        module: "terremoto" as const,
        title: `${p.place ?? "Unknown location"}`,
        description: `${p.title ?? `M${mag}`}. Depth ${depth.toFixed(1)}km. ${p.tsunami ? "Tsunami advisory." : "No tsunami warning."}`,
        location: { lat: c[1], lng: c[0], country: "US", depth },
        timestamp: new Date(p.time).toISOString(),
        riskLevel: classifyRisk(mag, depth),
        impact: buildImpact(mag, depth),
        confidence: 0.95,
        tags: ["earthquake", "seismic"],
        relatedEvents: [],
        metadata: { magnitude: mag, depthKm: depth, tsunami: !!p.tsunami, felt: p.felt ?? 0, url: p.url },
      };
    });
  } catch {
    return seedData;
  }
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(USGS_API, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const earthquakeMonitor: MonitorModule = {
  name: "USGS Earthquake Monitor",
  category: "terremoto",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default earthquakeMonitor;
