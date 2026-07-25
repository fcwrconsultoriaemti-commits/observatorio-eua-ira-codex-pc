import type { GlobalEvent, MonitorModule } from "../../lib/types";

const FIRMS_BASE = "https://firms.modaps.eosdis.nasa.gov/api/country/csv";
const TIMEOUT_MS = 15_000;

const seedData: GlobalEvent[] = [
  {
    id: "wf-seed-001",
    source: "NASA FIRMS (seed)",
    module: "incendio",
    title: "Wildfire — Northern California",
    description: "Large wildfire burning near Redding, CA. 15,000 acres, 30% contained.",
    location: { lat: 40.59, lng: -122.39, country: "US", state: "CA", city: "Redding" },
    timestamp: new Date(Date.now() - 4_000_000).toISOString(),
    riskLevel: "alto",
    impact: { operational: 65, humanitarian: 60, economic: 75, environmental: 80, security: 25 },
    confidence: 0.9,
    tags: ["wildfire", "california", "evacuation"],
    relatedEvents: [],
    metadata: { acresBurned: 15000, containment: 0.3, frp: 450, brightTi4: 340 },
  },
  {
    id: "wf-seed-002",
    source: "NASA FIRMS (seed)",
    module: "incendio",
    title: "Brush Fire — Central Florida",
    description: "Active brush fire in Osceola County. 2,000 acres, threatening structures.",
    location: { lat: 28.2, lng: -81.3, country: "US", state: "FL" },
    timestamp: new Date(Date.now() - 2_500_000).toISOString(),
    riskLevel: "moderado",
    impact: { operational: 45, humanitarian: 40, economic: 50, environmental: 55, security: 20 },
    confidence: 0.82,
    tags: ["brush-fire", "florida"],
    relatedEvents: [],
    metadata: { acresBurned: 2000, containment: 0.15, frp: 280 },
  },
];

async function fetchEvents(): Promise<GlobalEvent[]> {
  try {
    const key = process.env.FIRMS_API_KEY ?? "";
    if (!key) return seedData;
    const url = `${FIRMS_BASE}/USA/1/12/${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return seedData;
    const csv = await res.text();
    const lines = csv.trim().split("\n");
    if (lines.length < 2) return seedData;
    const headers = lines[0].split(",");
    return lines.slice(1, 50).map((line) => {
      const cols = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => (row[h.trim()] = cols[i]?.trim() ?? ""));
      const lat = parseFloat(row.latitude ?? "0");
      const lng = parseFloat(row.longitude ?? "0");
      const frp = parseFloat(row.frp ?? "0");
      return {
        id: `wf-firms-${row.latitude}-${row.longitude}-${row.acq_date}`,
        source: "NASA FIRMS",
        module: "incendio" as const,
        title: `Active Fire — ${row.country ?? "USA"}`,
        description: `Fire radiative power: ${frp.toFixed(0)} MW. Brightness: ${row.bright_ti4 ?? "N/A"}. Satellite: ${row.satellite ?? "N/A"}.`,
        location: { lat, lng, country: row.country ?? "US" },
        timestamp: row.acq_date ? `${row.acq_date}T${row.acq_time ?? "00:00"}:00Z` : new Date().toISOString(),
        riskLevel: frp > 500 ? "alto" : frp > 200 ? "moderado" : "baixo",
        impact: { operational: Math.min(Math.round(frp * 0.15), 100), humanitarian: Math.min(Math.round(frp * 0.12), 100), economic: Math.min(Math.round(frp * 0.18), 100), environmental: Math.min(Math.round(frp * 0.2), 100), security: Math.min(Math.round(frp * 0.08), 100) },
        confidence: 0.85,
        tags: ["wildfire", "active-fire", "satellite-detection"],
        relatedEvents: [],
        metadata: { frp, brightTi4: row.bright_ti4, satellite: row.satellite, confidence: row.confidence },
      };
    });
  } catch {
    return seedData;
  }
}

async function healthCheck(): Promise<boolean> {
  try {
    const key = process.env.FIRMS_API_KEY ?? "";
    if (!key) return false;
    const res = await fetch(`${FIRMS_BASE}/USA/1/1/${key}`, { signal: AbortSignal.timeout(8_000) });
    return res.ok;
  } catch {
    return false;
  }
}

const wildfireMonitor: MonitorModule = {
  name: "NASA FIRMS Wildfire Monitor",
  category: "incendio",
  version: "1.0.0",
  enabled: true,
  fetch: fetchEvents,
  health: healthCheck,
};

export default wildfireMonitor;
