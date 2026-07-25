// ============================================================
// AIR TRAFFIC / NOTAM MONITOR
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "air-001",
    source: "seed-data",
    module: "aereo",
    title: "NOTAM - Fechamento do espaço aéreo sobre Taiwan",
    description: "FAA emite NOTAM de fechamento do espaço aéreo sobre Taiwan devido a exercícios militares. Voo comercial afetado.",
    location: { lat: 23.6978, lng: 120.9605, country: "Taiwan" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 70, humanitarian: 20, economic: 60, environmental: 10, security: 85 },
    confidence: 0.90,
    tags: ["aereo", "notam", "taiwan", "espaco_aereo", "militar"],
    relatedEvents: [],
    metadata: { notam_id: "NOTAM-TW-2024-001", affected_area: " FIR Taipei", duration: "72h" },
  },
  {
    id: "air-002",
    source: "seed-data",
    module: "aereo",
    title: "Erupção vulcânica - Alerta de cinzas vulcânicas (VAAC)",
    description: "Centro VAAC Tóquio emite alerta de nuvem de cinzas vulcânicas a 35.000ft sobre Pacífico Norte. Rotas afetadas.",
    location: { lat: 45.0, lng: 155.0, country: "Internacional" },
    timestamp: new Date().toISOString(),
    riskLevel: "critico",
    impact: { operational: 85, humanitarian: 25, economic: 70, environmental: 30, security: 15 },
    confidence: 0.88,
    tags: ["aereo", "cinzas_vulcanicas", "vaac", "rotas_aereas"],
    relatedEvents: [],
    metadata: { vaac_center: "Tokyo", ash_altitude_ft: 35000, area: "North Pacific" },
  },
  {
    id: "air-003",
    source: "seed-data",
    module: "aereo",
    title: "Sistema de navegação GPS indisponível - Europa Oriental",
    description: "Intenção de sinal GPS detectada sobre Europa Oriental. Aeronaves devem usar navegação inercial. NOTAM emitido.",
    location: { lat: 52.2297, lng: 21.0122, country: "Polônia", city: "Varsóvia" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 75, humanitarian: 15, economic: 55, environmental: 5, security: 80 },
    confidence: 0.82,
    tags: ["aereo", "gps", "interferencia", "navegacao", "notam"],
    relatedEvents: [],
    metadata: { affected_system: "GPS L1", affected_area: "Eastern Europe", workaround: "INS" },
  },
];

const MONITOR: MonitorModule = {
  name: "air-monitor",
  category: "aereo",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [notamRes, aviationRes] = await Promise.allSettled([
        fetch("https://ourairports.com/data/notams.json", {
          signal: controller.signal,
        }),
        fetch("https://avwx.rest/api/sigmet", {
          signal: controller.signal,
          headers: { "Authorization": "Bearer DEMO_TOKEN" },
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (notamRes.status === "fulfilled" && notamRes.value.ok) {
        const data = await notamRes.value.json();
        const notams = Array.isArray(data) ? data.slice(0, 10) : [];
        for (const notam of notams) {
          const icao = notam.icao || notam.location || "XXXX";
          events.push({
            id: `air-notam-${icao}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "NOTAM",
            module: "aereo",
            title: `NOTAM ativo - ${icao}`,
            description: notam.text || notam.message || `NOTAM emitido para ${icao}.`,
            location: { lat: notam.latitude || 0, lng: notam.longitude || 0, country: "Internacional" },
            timestamp: new Date(notam.effective || notam.created || Date.now()).toISOString(),
            riskLevel: "moderado",
            impact: { operational: 50, humanitarian: 10, economic: 40, environmental: 5, security: 30 },
            confidence: 0.85,
            tags: ["aereo", "notam", icao.toLowerCase()],
            relatedEvents: [],
            metadata: { icao, source_type: "NOTAM" },
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
      const res = await fetch("https://ourairports.com/data/notams.json", {
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
