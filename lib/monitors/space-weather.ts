import type { GlobalEvent, MonitorModule } from "../types";

const SWPC_JSON = "https://services.swpc.noaa.gov/json/solar-activity.json";
const SWPC_KP = "https://services.swpc.noaa.gov/products/noaa-planetary-k-index-forecast.json";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "sw-x-seed-001",
    source: "NOAA SWPC (seed)",
    module: "espacial",
    title: "X1.2 Solar Flare — Active Region AR3842",
    description: "X1.2 class solar flare detected. Peak intensity at 14:32 UTC. Radio blackout warning for Pacific region.",
    location: { lat: 0, lng: 0, country: "SOLAR", altitude: 0 },
    timestamp: new Date(Date.now() - 7_200_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 70, humanitarian: 30, economic: 60, environmental: 20, security: 40 },
    confidence: 0.95,
    tags: ["solar-flare", "x-class", "radio-blackout"],
    relatedEvents: [],
    metadata: { class: "X1.2", region: "AR3842", peakFlux: "1.2e-4", radioBlackout: "R2" },
  },
  {
    id: "sw-x-seed-002",
    source: "NOAA SWPC (seed)",
    module: "espacial",
    title: "Geomagnetic Storm Kp=7 — G3 Level",
    description: "Strong geomagnetic storm (Kp=7, G3) ongoing. Aurora visible at 50° magnetic latitude.",
    location: { lat: 0, lng: 0, country: "GLOBAL" },
    timestamp: new Date(Date.now() - 3_600_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 55, humanitarian: 15, economic: 45, environmental: 10, security: 30 },
    confidence: 0.9,
    tags: ["geomagnetic-storm", "kp7", "g3", "aurora"],
    relatedEvents: [],
    metadata: { kpIndex: 7, gScale: "G3", dstNt: -120, solarWindKms: 650 },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const [actRes, kpRes] = await Promise.allSettled([
      fetch(SWPC_JSON, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
      fetch(SWPC_KP, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
    ]);
    const events: GlobalEvent[] = [];
    if (actRes.status === "fulfilled" && actRes.value.ok) {
      const acts = await actRes.value.json();
      const items: any[] = Array.isArray(acts) ? acts : [];
      for (const item of items) {
        const type = item.type ?? item.event_type ?? "";
        if (type.toLowerCase().includes("xray") || type.toLowerCase().includes("flare")) {
          const cls = item.class ?? item.flare_class ?? "";
          if (cls.startsWith("X") || cls.startsWith("M")) {
            events.push({
              id: `swpc-flare-${item.id ?? Date.now()}`,
              source: "NOAA SWPC",
              module: "espacial" as const,
              title: `Solar Flare ${cls} — ${item.source_location ?? "Active Region"}`,
              description: `${cls} class solar flare detected. Peak: ${item.peak_time ?? "N/A"}. Radio impact possible.`,
              location: { lat: 0, lng: 0, country: "SOLAR" },
              timestamp: item.begin_time ? new Date(item.begin_time).toISOString() : new Date().toISOString(),
              riskLevel: cls.startsWith("X") ? "alto" : "moderado",
              impact: { operational: cls.startsWith("X") ? 70 : 50, humanitarian: 20, economic: cls.startsWith("X") ? 60 : 40, environmental: 10, security: cls.startsWith("X") ? 35 : 20 },
              confidence: 0.92,
              tags: ["solar-flare", cls.toLowerCase()],
              relatedEvents: [],
              metadata: { flareClass: cls, region: item.source_location },
            });
          }
        }
      }
    }
    if (kpRes.status === "fulfilled" && kpRes.value.ok) {
      const kp = await kpRes.value.json();
      const rows: any[] = Array.isArray(kp) ? kp : [];
      if (rows.length > 0) {
        const latest = rows[rows.length - 1];
        const kpVal = parseInt(latest.kp_index ?? latest[1] ?? "0", 10);
        if (kpVal >= 5) {
          events.push({
            id: `swpc-kp-${Date.now()}`,
            source: "NOAA SWPC",
            module: "espacial" as const,
            title: `Geomagnetic Storm Kp=${kpVal}`,
            description: `Planetary K-index reached ${kpVal} (${kpScale(kpVal)}). Potential impacts on GPS, HF radio, and power grid.`,
            location: { lat: 0, lng: 0, country: "GLOBAL" },
            timestamp: new Date().toISOString(),
            riskLevel: kpVal >= 7 ? "alto" : kpVal >= 5 ? "moderado" : "baixo",
            impact: { operational: Math.min(kpVal * 12, 100), humanitarian: 15, economic: Math.min(kpVal * 10, 100), environmental: 5, security: Math.min(kpVal * 8, 100) },
            confidence: 0.9,
            tags: ["geomagnetic-storm", `kp${kpVal}`],
            relatedEvents: [],
            metadata: { kpIndex: kpVal },
          });
        }
      }
    }
    return events.length > 0 ? events : seedData;
  } catch {
    return seedData;
  }
}

function kpScale(k: number): string {
  if (k >= 9) return "G5";
  if (k >= 7) return "G3";
  if (k >= 5) return "G1";
  return "Quiet";
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(SWPC_JSON, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const spaceWeatherMonitor: MonitorModule = {
  name: "NOAA Space Weather Monitor",
  category: "espacial",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default spaceWeatherMonitor;
