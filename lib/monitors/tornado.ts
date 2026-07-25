import type { GlobalEvent, MonitorModule } from "../types";

const SPC_REPORTS = "https://www.spc.noaa.gov/climo/reports/today.json";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "torn-seed-001",
    source: "SPC (seed)",
    module: "tornado",
    title: "EF2 Tornado — Oklahoma City, OK",
    description: "Confirmed EF2 tornado with estimated peak wind 135 mph. Multiple structures damaged.",
    location: { lat: 35.47, lng: -97.52, country: "US", state: "OK", city: "Oklahoma City" },
    timestamp: new Date(Date.now() - 2_000_000).toISOString(),
    riskLevel: "critico",
    impact: { operational: 75, humanitarian: 80, economic: 70, environmental: 40, security: 25 },
    confidence: 0.92,
    tags: ["tornado", "severe-weather", "oklahoma"],
    relatedEvents: [],
    metadata: { scale: "EF2", windMph: 135, pathLengthMi: 3.2, confirmed: true },
  },
  {
    id: "torn-seed-002",
    source: "SPC (seed)",
    module: "tornado",
    title: "Tornado Warning — Kansas",
    description: "Radar-indicated rotation. Tornado warning active for central Kansas.",
    location: { lat: 37.75, lng: -99.3, country: "US", state: "KS" },
    timestamp: new Date(Date.now() - 1_500_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 55, humanitarian: 60, economic: 50, environmental: 30, security: 20 },
    confidence: 0.75,
    tags: ["tornado", "warning", "radar-indicated"],
    relatedEvents: [],
    metadata: { scale: "radar-indicated", source: "NWS" },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const res = await fetch(SPC_REPORTS, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return seedData;
    const data = await res.json();
    const tornados: any[] = data?.report ?? data?.tornado ?? [];
    if (!Array.isArray(tornados) || tornados.length === 0) return seedData;
    return tornados.map((t) => ({
      id: `torn-spc-${t.Date?.replace(/-/g, "")}-${t.Time ?? Math.random().toString(36).slice(2, 6)}`,
      source: "SPC Storm Reports",
      module: "tornado" as const,
      title: `Tornado ${t.Scale ?? ""} — ${t.County ?? "Unknown County"}, ${t.State ?? ""}`,
      description: `Tornado reported: ${t.Scale ?? "unrated"} scale. Magnitude: ${t.Mag ?? "N/A"}. ${t.Comment ?? ""}`,
      location: { lat: t.Lat ?? 0, lng: t.Lon ?? 0, country: "US", state: t.State ?? "" },
      timestamp: new Date(`${t.Date}T${t.Time ?? "00:00"}`).toISOString(),
      riskLevel: scaleToRisk(t.Scale),
      impact: impactFromScale(t.Scale),
      confidence: 0.9,
      tags: ["tornado", "severe-weather"],
      relatedEvents: [],
      metadata: { scale: t.Scale, county: t.County, loss: t.Loss, injuries: t.Injuries },
    }));
  } catch {
    return seedData;
  }
}

function scaleToRisk(s?: string): GlobalEvent["riskLevel"] {
  const v = parseInt(s?.replace(/\D/g, "") ?? "0", 10);
  if (v >= 4) return "critico";
  if (v >= 3) return "alto";
  if (v >= 2) return "moderado";
  if (v >= 1) return "baixo";
  return "informativo";
}

function impactFromScale(s?: string): GlobalEvent["impact"] {
  const v = parseInt(s?.replace(/\D/g, "") ?? "0", 10);
  const b = Math.min(v * 20 + 20, 100);
  return { operational: b, humanitarian: Math.round(b * 1.1), economic: Math.round(b * 1.05), environmental: Math.round(b * 0.5), security: Math.round(b * 0.3) };
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(SPC_REPORTS, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const tornadoMonitor: MonitorModule = {
  name: "SPC Tornado Monitor",
  category: "tornado",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default tornadoMonitor;
