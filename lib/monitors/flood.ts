import type { GlobalEvent, MonitorModule } from "../../lib/types";

const USGS_WATER = "https://waterservices.usgs.gov/nwis/iv/?format=json&sites=*&parameterCd=00065,00060&siteStatus=all";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "fl-seed-001",
    source: "USGS Water (seed)",
    module: "enchente",
    title: "Flood Warning — Mississippi River at Memphis",
    description: "Mississippi River at Memphis cresting above flood stage (45 ft). Moderate flooding expected.",
    location: { lat: 35.15, lng: -90.05, country: "US", state: "TN", city: "Memphis" },
    timestamp: new Date(Date.now() - 3_500_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 60, humanitarian: 65, economic: 55, environmental: 45, security: 20 },
    confidence: 0.92,
    tags: ["flood", "mississippi-river", "tennessee"],
    relatedEvents: [],
    metadata: { stageFt: 45, floodStageFt: 40, gaugeId: "07032000", trend: "rising" },
  },
  {
    id: "fl-seed-002",
    source: "USGS Water (seed)",
    module: "enchente",
    title: "Flash Flood — San Antonio, TX",
    description: "San Antonio River above flood stage after 6 inches of rain in 3 hours.",
    location: { lat: 29.42, lng: -98.49, country: "US", state: "TX", city: "San Antonio" },
    timestamp: new Date(Date.now() - 2_000_000).toISOString(),
    riskLevel: "critico",
    impact: { operational: 75, humanitarian: 80, economic: 70, environmental: 50, security: 30 },
    confidence: 0.88,
    tags: ["flash-flood", "texas", "urban-flooding"],
    relatedEvents: [],
    metadata: { rainfallInches: 6, durationHours: 3, gaugeAboveFloodFt: 4.5 },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(USGS_WATER, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return seedData;
    const data = await res.json();
    const ts: any[] = data?.value?.timeSeries ?? [];
    if (!Array.isArray(ts) || ts.length === 0) return seedData;
    const groups: Record<string, any[]> = {};
    for (const t of ts) {
      const site = t.sourceInfo?.siteCode?.[0]?.value ?? "unknown";
      if (!groups[site]) groups[site] = [];
      groups[site].push(t);
    }
    const events: GlobalEvent[] = [];
    for (const [site, series] of Object.entries(groups)) {
      const latest = series[0];
      const lat = latest.sourceInfo?.geoLocation?.geogLocation?.latitude ?? 0;
      const lng = latest.sourceInfo?.geoLocation?.geogLocation?.longitude ?? 0;
      const val = parseFloat(latest.values?.[0]?.value?.[0]?.value ?? "0");
      const unit = latest.variable?.unit?.unitCode ?? "ft";
      if (val <= 0) continue;
      events.push({
        id: `fl-usgs-${site}`,
        source: "USGS Water Services",
        module: "enchente" as const,
        title: `Water Level — ${latest.sourceInfo?.siteName ?? site}`,
        description: `Current water level: ${val.toFixed(2)} ${unit} at gauge ${site}.`,
        location: { lat, lng, country: "US", state: latest.sourceInfo?.siteName?.split(",")?.[1]?.trim() },
        timestamp: latest.values?.[0]?.value?.[0]?.dateTime ?? new Date().toISOString(),
        riskLevel: val > 20 ? "alto" : val > 15 ? "moderado" : "baixo",
        impact: { operational: Math.min(Math.round(val * 3), 100), humanitarian: Math.min(Math.round(val * 2.8), 100), economic: Math.min(Math.round(val * 2.5), 100), environmental: Math.round(val * 1.5), security: Math.round(val) },
        confidence: 0.88,
        tags: ["flood", "water-level", "usgs-gauge"],
        relatedEvents: [],
        metadata: { siteCode: site, value: val, unit, sourceName: latest.sourceInfo?.siteName },
      });
    }
    return events.length > 0 ? events.slice(0, 20) : seedData;
  } catch {
    return seedData;
  }
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch("https://waterservices.usgs.gov/nwis/site/?format=rdb&siteStatus=all&limit=1", { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const floodMonitor: MonitorModule = {
  name: "USGS Flood Monitor",
  category: "enchente",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default floodMonitor;
