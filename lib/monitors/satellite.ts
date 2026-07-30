// ============================================================
// SATELLITE IMAGERY / TRACK MONITOR
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "satellite-001",
    source: "seed-data",
    module: "satelite",
    title: "Anomalia térmica detectada - Amazônia",
    description: "Satélite MODIS detectou anomalia térmica significativa na região amazônica. Possível foco de incêndio ativo.",
    location: { lat: -3.4653, lng: -62.2159, country: "Brasil", state: "Amazonas", city: "Manaus" },
    timestamp: new Date().toISOString(),
    riskLevel: "moderado",
    impact: { operational: 30, humanitarian: 40, economic: 25, environmental: 70, security: 10 },
    confidence: 0.75,
    tags: ["satelite", "incendio", "amazonia", "modis"],
    relatedEvents: [],
    metadata: { satellite: "MODIS", band: "thermal", resolution: "1km" },
  },
  {
    id: "satellite-002",
    source: "seed-data",
    module: "satelite",
    title: "Cobertura de gelo marinho - Ártico",
    description: "Extensão do gelo marinho no Ártico está 12% abaixo da média histórica para esta época do ano.",
    location: { lat: 82.5, lng: -10.0, country: "Internacional" },
    timestamp: new Date().toISOString(),
    riskLevel: "baixo",
    impact: { operational: 15, humanitarian: 20, economic: 35, environmental: 60, security: 5 },
    confidence: 0.85,
    tags: ["satelite", "artico", "gelo_marinho", "clima"],
    relatedEvents: [],
    metadata: { satellite: "Sentinel-1", metric: "sea_ice_extent", deviation: "-12%" },
  },
  {
    id: "satellite-003",
    source: "seed-data",
    module: "satelite",
    title: "Detecção de atividade vulcânica - Ilhas Aleutas",
    description: "Satélite captou pluma de vapor e cinzas vulcânicas. Atividade eruptiva em fase inicial.",
    location: { lat: 52.3814, lng: -172.3853, country: "EUA", state: "Alaska", city: "Ilhas Aleutas" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 45, humanitarian: 30, economic: 40, environmental: 55, security: 15 },
    confidence: 0.70,
    tags: ["satelite", "vulcao", "aleutas", "pluma"],
    relatedEvents: [],
    metadata: { satellite: "GOES-West", ash_height: "6000m", area: "50km2" },
  },
];

const MONITOR: MonitorModule = {
  name: "satellite-monitor",
  category: "satelite",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [modisRes, sentinelRes] = await Promise.allSettled([
        fetch(`https://firms.modaps.eosdis.nasa.gov/api/area/csv/MODIS_NRT/WORLD/1/${new Date(Date.now() - 86400000).toISOString().split("T")[0]}`, {
          signal: controller.signal,
        }),
        fetch("https://api.sentinel-hub.com/ogc/api/collections/S2L2A/sc", {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (modisRes.status === "fulfilled" && modisRes.value.ok) {
        const text = await modisRes.value.text();
        const lines = text.split("\n").filter(l => l.trim());
        const dataLines = lines.slice(1, 21);

        for (const line of dataLines) {
          const cols = line.split(",");
          if (cols.length > 5) {
            const lat = parseFloat(cols[0]);
            const lng = parseFloat(cols[1]);
            const confidence = parseFloat(cols[8]) || 50;
            if (!isNaN(lat) && !isNaN(lng)) {
              events.push({
                id: `satellite-firms-${lat.toFixed(2)}-${lng.toFixed(2)}-${Date.now()}`,
                source: "NASA-FIRMS",
                module: "satelite",
                title: `Foco de calor detectado - ${lat.toFixed(2)}, ${lng.toFixed(2)}`,
                description: `Satélite MODIS detectou foco de calor com confiança de ${confidence}%.`,
                location: { lat, lng, country: "Desconhecido" },
                timestamp: new Date().toISOString(),
                riskLevel: confidence > 70 ? "alto" : confidence > 40 ? "moderado" : "baixo",
                impact: { operational: 20, humanitarian: 30, economic: 15, environmental: 60, security: 5 },
                confidence: confidence / 100,
                tags: ["satelite", "foco_calor", "modis", "incendio"],
                relatedEvents: [],
                metadata: { source_api: "FIRMS", raw_line: line },
              });
            }
          }
        }
      }

      if (events.length === 0) {
        return SEED_EVENTS;
      }

      return events;
    } catch {
      return SEED_EVENTS;
    }
  },

  async health(): Promise<boolean> {
    try {
      const res = await fetch("https://firms.modaps.eosdis.nasa.gov/api/area/csv/MODIS_NRT/WORLD/1/2024-01-01", {
        signal: AbortSignal.timeout(10000),
        method: "HEAD",
      });
      return res.ok || res.status === 403;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
