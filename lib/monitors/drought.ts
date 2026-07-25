import type { GlobalEvent, MonitorModule } from "../../lib/types";

const DROUGHT_API = "https://usdmdataservices.unl.edu/api/StateStatistics/GetDroughtSeverityStatisticsByArea";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "dr-seed-001",
    source: "US Drought Monitor (seed)",
    module: "seca",
    title: "Extreme Drought — Western Kansas",
    description: "Extreme drought (D3) covering 45% of western Kansas. Agricultural losses mounting.",
    location: { lat: 38.5, lng: -100.5, country: "US", state: "KS" },
    timestamp: new Date(Date.now() - 86_400_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 55, humanitarian: 60, economic: 70, environmental: 75, security: 25 },
    confidence: 0.9,
    tags: ["drought", "extreme-drought", "agriculture", "kansas"],
    relatedEvents: [],
    metadata: { droughtLevel: "D3", areaPct: 45, category: "Extreme", validStart: new Date(Date.now() - 86_400_000).toISOString() },
  },
  {
    id: "dr-seed-002",
    source: "US Drought Monitor (seed)",
    module: "seca",
    title: "Severe Drought — Southern California",
    description: "Severe drought (D2) across Southern California. Reservoir levels critically low.",
    location: { lat: 34.05, lng: -118.25, country: "US", state: "CA" },
    timestamp: new Date(Date.now() - 172_800_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 50, humanitarian: 55, economic: 65, environmental: 70, security: 20 },
    confidence: 0.88,
    tags: ["drought", "severe-drought", "water-supply", "california"],
    relatedEvents: [],
    metadata: { droughtLevel: "D2", areaPct: 38, category: "Severe" },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(DROUGHT_API, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return seedData;
    const data = await res.json();
    const states: any[] = Array.isArray(data) ? data : data?.data ?? [];
    if (!Array.isArray(states) || states.length === 0) return seedData;
    const severe = states.filter(
      (s) => (s.droughtLevel ?? s.DroughtLevel ?? 0) >= 2
    );
    if (severe.length === 0) return seedData;
    return severe.slice(0, 15).map((s) => {
      const level = s.droughtLevel ?? s.DroughtLevel ?? 0;
      const stateName = s.stateName ?? s.StateName ?? s.state ?? "Unknown";
      return {
        id: `dr-${stateName.toLowerCase().replace(/\s+/g, "-")}-${level}`,
        source: "US Drought Monitor",
        module: "seca" as const,
        title: `${levelLabel(level)} Drought — ${stateName}`,
        description: `${levelLabel(level)} drought conditions affecting ${stateName}. US Drought Monitor update.`,
        location: { lat: s.lat ?? 0, lng: s.lon ?? 0, country: "US", state: stateName },
        timestamp: s.validStart ? new Date(s.validStart).toISOString() : new Date().toISOString(),
        riskLevel: levelToRisk(level),
        impact: impactFromLevel(level),
        confidence: 0.85,
        tags: ["drought", levelLabel(level).toLowerCase(), stateName.toLowerCase()],
        relatedEvents: [],
        metadata: { droughtLevel: `D${level}`, areaPct: s.areaPct ?? s.totalAreaPct ?? 0, stateAbbr: s.stateAbbr },
      };
    });
  } catch {
    return seedData;
  }
}

function levelLabel(l: number): string {
  if (l >= 4) return "Exceptional";
  if (l >= 3) return "Extreme";
  if (l >= 2) return "Severe";
  if (l >= 1) return "Moderate";
  return "Abnormally Dry";
}

function levelToRisk(l: number): GlobalEvent["riskLevel"] {
  if (l >= 4) return "critico";
  if (l >= 3) return "alto";
  if (l >= 2) return "moderado";
  if (l >= 1) return "baixo";
  return "informativo";
}

function impactFromLevel(l: number): GlobalEvent["impact"] {
  const b = Math.min(l * 20 + 25, 100);
  return { operational: b, humanitarian: Math.round(b * 1.05), economic: Math.round(b * 1.15), environmental: Math.round(b * 1.2), security: Math.round(b * 0.4) };
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(DROUGHT_API, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const droughtMonitor: MonitorModule = {
  name: "US Drought Monitor",
  category: "seca",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default droughtMonitor;
