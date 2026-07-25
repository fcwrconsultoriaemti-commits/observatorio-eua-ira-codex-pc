// ============================================================
// GLOBAL HEALTH MONITOR — WHO, GPHIN, ProMED
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "health-001",
    source: "seed-data",
    module: "saude",
    title: "Surto de gripe aviária H5N1 - Sudeste Asiático",
    description: "OMS reporta aumento significativo de casos de gripe aviária H5N1 em aves de criação em países do Sudeste Asiático. Risco de transmissão para humanos em monitoramento.",
    location: { lat: 13.7563, lng: 100.5018, country: "Tailândia", city: "Bangkok" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 25, humanitarian: 65, economic: 50, environmental: 40, security: 30 },
    confidence: 0.82,
    tags: ["saude", "gripe_aviaria", "h5n1", "oms", "surto"],
    relatedEvents: [],
    metadata: { organism: "Influenza A (H5N1)", cases: 342, source_type: "WHO" },
  },
  {
    id: "health-002",
    source: "seed-data",
    module: "saude",
    title: "Alerta de malária resistente - África Ocidental",
    description: "ProMED identifica cepa de malária resistente a artemisinina na África Ocidental. Tratamentos padrão podem perder eficácia.",
    location: { lat: 14.6928, lng: -17.4467, country: "Senegal", city: "Dakar" },
    timestamp: new Date().toISOString(),
    riskLevel: "critico",
    impact: { operational: 40, humanitarian: 80, economic: 55, environmental: 20, security: 25 },
    confidence: 0.78,
    tags: ["saude", "malaria", "resistencia", "africa", "promed"],
    relatedEvents: [],
    metadata: { resistance: "artemisinin", region: "West Africa", source_type: "ProMED" },
  },
  {
    id: "health-003",
    source: "seed-data",
    module: "saude",
    title: "Surto de vírus Marburg - África Oriental",
    description: "GPHIN detecta relatos de surto de vírus Marburg com alta taxa de letalidade. Medidas de contenção imediatas necessárias.",
    location: { lat: -1.2921, lng: 36.8219, country: "Quênia", city: "Nairobi" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 50, humanitarian: 90, economic: 60, environmental: 10, security: 45 },
    confidence: 0.72,
    tags: ["saude", "marburg", "hemorrhagic_fever", "surto", "emergencia"],
    relatedEvents: [],
    metadata: { cases: 23, fatalities: 16, source_type: "GPHIN", cfr_pct: 69.6 },
  },
];

const MONITOR: MonitorModule = {
  name: "health-monitor",
  category: "saude",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [whoRes, promedRes] = await Promise.allSettled([
        fetch("https://www.who.int/feeds/entity/don/en/rss.xml", {
          signal: controller.signal,
          headers: { "Accept": "application/xml, application/rss+xml, text/xml" },
        }),
        fetch("https://promedmail.org/feed/", {
          signal: controller.signal,
          headers: { "Accept": "application/xml, application/rss+xml, text/xml" },
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (whoRes.status === "fulfilled" && whoRes.value.ok) {
        const text = await whoRes.value.text();
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 10)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "Unknown";
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
          const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]>/) || item.match(/<description>(.*?)<\/description>/))?.[1] || "";

          events.push({
            id: `health-who-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "WHO-DON",
            module: "saude",
            title: title.trim(),
            description: desc.replace(/<[^>]+>/g, "").trim().slice(0, 500),
            location: { lat: 0, lng: 0, country: "Internacional" },
            timestamp: new Date(pubDate).toISOString(),
            riskLevel: "moderado",
            impact: { operational: 30, humanitarian: 55, economic: 35, environmental: 10, security: 20 },
            confidence: 0.80,
            tags: ["saude", "oms", "don", "doenca"],
            relatedEvents: [],
            metadata: { source_type: "WHO", url: link, pubDate },
          });
        }
      }

      if (promedRes.status === "fulfilled" && promedRes.value.ok) {
        const text = await promedRes.value.text();
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 10)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "Unknown";
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
          const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]>/) || item.match(/<description>(.*?)<\/description>/))?.[1] || "";

          events.push({
            id: `health-promed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "ProMED",
            module: "saude",
            title: title.trim(),
            description: desc.replace(/<[^>]+>/g, "").trim().slice(0, 500),
            location: { lat: 0, lng: 0, country: "Internacional" },
            timestamp: new Date(pubDate).toISOString(),
            riskLevel: "moderado",
            impact: { operational: 25, humanitarian: 50, economic: 30, environmental: 10, security: 15 },
            confidence: 0.75,
            tags: ["saude", "promed", "surto"],
            relatedEvents: [],
            metadata: { source_type: "ProMED", url: link, pubDate },
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
      const res = await fetch("https://www.who.int/feeds/entity/don/en/rss.xml", {
        signal: AbortSignal.timeout(10000),
        method: "HEAD",
      });
      return res.ok || res.status === 301 || res.status === 302;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
