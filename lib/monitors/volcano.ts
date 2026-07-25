import type { GlobalEvent, MonitorModule } from "../types";

const USGS_VP = "https://volcano.usgs.gov/vhp/api/json/volcanoes";
const SMITHSONIAN_GVP = "https://volcano.si.edu/api/volcanoes";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "vol-seed-001",
    source: "Smithsonian GVP (seed)",
    module: "vulcao",
    title: "Kilauea — Volcanic unrest",
    description: "Kilauea continues elevated seismic activity. HVO advisory level.",
    location: { lat: 19.42, lng: -155.29, country: "US", state: "HI" },
    timestamp: new Date(Date.now() - 4_000_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 50, humanitarian: 45, economic: 55, environmental: 60, security: 20 },
    confidence: 0.88,
    tags: ["volcano", "unrest", "hawaii"],
    relatedEvents: [],
    metadata: { alertLevel: "ADVISORY", volcanoId: "v273090" },
  },
  {
    id: "vol-seed-002",
    source: "USGS VHP (seed)",
    module: "vulcao",
    title: "Popocatépetl — Increased emissions",
    description: "Ash and gas emissions increased in the past 24 hours.",
    location: { lat: 19.02, lng: -98.62, country: "MX", state: "Puebla" },
    timestamp: new Date(Date.now() - 8_000_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 60, humanitarian: 55, economic: 65, environmental: 70, security: 25 },
    confidence: 0.85,
    tags: ["volcano", "ash-emission", "mexico"],
    relatedEvents: [],
    metadata: { alertLevel: "YELLOW", emissions: "ash-plume-5km" },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const [usgsRes, smithsonianRes] = await Promise.allSettled([
      fetch(USGS_VP, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
      fetch(`${SMITHSONIAN_GVP}?country=US`, { signal: AbortSignal.timeout(TIMEOUT_MS) }),
    ]);
    const events: GlobalEvent[] = [];
    if (usgsRes.status === "fulfilled" && usgsRes.value.ok) {
      const usgsData = await usgsRes.value.json();
      const vols: any[] = Array.isArray(usgsData) ? usgsData : [];
      for (const v of vols.filter((x) => x.VolcanoState === "Elevated") ?? []) {
        events.push({
          id: `vol-usgs-${v.VolcanoNumber}`,
          source: "USGS VHP",
          module: "vulcao",
          title: `${v.VolcanoName} — ${v.VolcanoState}`,
          description: `${v.VolcanoName} is in ${v.VolcanoState} state.`,
          location: { lat: v.Latitude ?? 0, lng: v.Longitude ?? 0, country: v.Country },
          timestamp: new Date().toISOString(),
          riskLevel: "moderado",
          impact: { operational: 45, humanitarian: 40, economic: 50, environmental: 55, security: 15 },
          confidence: 0.8,
          tags: ["volcano", "unrest"],
          relatedEvents: [],
          metadata: { usgsId: v.VolcanoNumber, alert: v.VolcanoState },
        });
      }
    }
    if (events.length === 0) return seedData;
    return events;
  } catch {
    return seedData;
  }
}

async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(USGS_VP, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const volcanoMonitor: MonitorModule = {
  name: "Volcano Monitor (USGS + Smithsonian)",
  category: "vulcao",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default volcanoMonitor;
