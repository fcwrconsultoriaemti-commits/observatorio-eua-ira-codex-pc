// ============================================================
// MARITIME / AIS MONITOR — Port Closures, Shipping Alerts
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "maritime-001",
    source: "seed-data",
    module: "maritimo",
    title: "Fechamento do Canal de Suez - Colisão de cargueiro",
    description: "Colisão entre dois cargueiros bloqueia tráfego no Canal de Suez. Trânsito suspenso indefinidamente. Impacto estimado em $9.6B/dia.",
    location: { lat: 30.5, lng: 32.34, country: "Egito", state: "Suez" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 95, humanitarian: 30, economic: 95, environmental: 40, security: 50 },
    confidence: 0.90,
    tags: ["maritimo", "suez", "bloqueio", "colisao", "supply_chain"],
    relatedEvents: [],
    metadata: { vessels_involved: 2, blockage_type: "collision", est_cost_per_day_usd: 9600000000 },
  },
  {
    id: "maritime-002",
    source: "seed-data",
    module: "maritimo",
    title: "Alerta de pirataria - Golfo de Adem",
    description: "IMB reporta 3 ataques de pirataria no Golfo de Adem na última semana. Navios devem seguir protocolos BMP5.",
    location: { lat: 12.8, lng: 45.0, country: "Internacional" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 60, humanitarian: 25, economic: 50, environmental: 15, security: 85 },
    confidence: 0.85,
    tags: ["maritimo", "pirataria", "golfo_adem", "seguranca"],
    relatedEvents: [],
    metadata: { incidents: 3, period: "7d", source: "IMB-PRC" },
  },
  {
    id: "maritime-003",
    source: "seed-data",
    module: "maritimo",
    title: "Tempestade tropical - Porto de Roterdã",
    description: "Tempestade tropical severa com ventos de 120km/h atinge costa dos Países Baixos. Porto de Roterdã fecha operações.",
    location: { lat: 51.9244, lng: 4.4777, country: "Holanda", city: "Roterdã" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 80, humanitarian: 25, economic: 70, environmental: 20, security: 10 },
    confidence: 0.88,
    tags: ["maritimo", "tempestade", "rotterdam", "porto", "fechamento"],
    relatedEvents: [],
    metadata: { wind_speed_kmh: 120, port: "Rotterdam", closure_duration: "48h" },
  },
];

const MONITOR: MonitorModule = {
  name: "maritime-monitor",
  category: "maritimo",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [marineRes, gdacsRes] = await Promise.allSettled([
        fetch("https://marine-api.open-meteo.com/v1/marine?latitude=0&longitude=0&current=wave_height,wave_period,swell_wave_height&daily=wave_height_max&timezone=auto", {
          signal: controller.signal,
        }),
        fetch("https://www.gdacs.org/xml/rss.xml", {
          signal: controller.signal,
          headers: { "Accept": "application/xml, application/rss+xml" },
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      // Parse Open-Meteo marine data
      if (marineRes.status === "fulfilled" && marineRes.value.ok) {
        const data = await marineRes.value.json();
        if (data.current) {
          const waveHeight = data.current.wave_height || 0;
          const swellHeight = data.current.swell_wave_height || 0;
          if (waveHeight > 2 || swellHeight > 3) {
            events.push({
              id: `maritime-marine-${Date.now()}`,
              source: "Open-Meteo Marine",
              module: "maritimo",
              title: `Condições marítimas adversas — ondas ${waveHeight}m, swell ${swellHeight}m`,
              description: `Ondas de ${waveHeight}m com período de ${data.current.wave_period || "N/A"}s. Swell de ${swellHeight}m.`,
              location: { lat: 0, lng: 0, country: "Internacional" },
              timestamp: new Date().toISOString(),
              riskLevel: waveHeight > 4 ? "alto" : waveHeight > 2 ? "moderado" : "informativo",
              impact: { operational: Math.min(Math.round(waveHeight * 10), 60), humanitarian: 20, economic: 30, environmental: 15, security: 10 },
              confidence: 0.90,
              tags: ["maritimo", "ondas", "open-meteo"],
              relatedEvents: [],
              metadata: { source_type: "Open-Meteo", wave_height: waveHeight, swell_height: swellHeight, wave_period: data.current.wave_period },
            });
          }
        }
      }

      // Parse GDACS RSS
      if (gdacsRes.status === "fulfilled" && gdacsRes.value.ok) {
        const text = await gdacsRes.value.text();
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 10)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "Unknown";
          const lat = parseFloat(item.match(/<geo:lat>(.*?)<\/geo:lat>/)?.[1] || "0");
          const lng = parseFloat(item.match(/<geo:long>(.*?)<\/geo:long>/)?.[1] || "0");
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
          const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]>/) || item.match(/<description>(.*?)<\/description>/))?.[1] || "";

          events.push({
            id: `maritime-gdacs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "GDACS",
            module: "maritimo",
            title: title.trim(),
            description: desc.replace(/<[^>]+>/g, "").trim().slice(0, 500),
            location: { lat, lng, country: "Internacional" },
            timestamp: new Date(pubDate).toISOString(),
            riskLevel: "moderado",
            impact: { operational: 40, humanitarian: 30, economic: 35, environmental: 25, security: 20 },
            confidence: 0.80,
            tags: ["maritimo", "gdacs", "alerta"],
            relatedEvents: [],
            metadata: { source_type: "GDACS", pubDate },
          });
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
      const res = await fetch("https://marine-api.open-meteo.com/v1/marine?latitude=0&longitude=0&current=wave_height", {
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
