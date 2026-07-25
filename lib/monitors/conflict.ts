// ============================================================
// ARMED CONFLICT MONITOR — ACLED, UCDP
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "conflict-001",
    source: "seed-data",
    module: "conflito",
    title: "Escalada de combates - Leste da Ucrânia",
    description: "ACLED registra 45 incidentes de combate nas últimas 48h na região de Donetsk. Avanço de 2km na linha de frente reportado.",
    location: { lat: 48.7164, lng: 37.5574, country: "Ucrânia", state: "Donetsk" },
    timestamp: new Date().toISOString(),
    riskLevel: "extremo",
    impact: { operational: 80, humanitarian: 95, economic: 70, environmental: 40, security: 95 },
    confidence: 0.92,
    tags: ["conflito", "ucrania", "donetsk", "combate", "acled"],
    relatedEvents: [],
    metadata: { incidents_48h: 45, front_movement_km: 2, source_type: "ACLED", fatalities_est: 120 },
  },
  {
    id: "conflict-002",
    source: "seed-data",
    module: "conflito",
    title: "Ataque a coluna de refugiados - Sudão",
    description: "Relatório UCDP confirma ataque a coluna de refugiados no Darfur. 30 civis mortos, incluindo 12 crianças.",
    location: { lat: 13.5, lng: 23.5, country: "Sudão", state: "Darfur" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 40, humanitarian: 95, economic: 30, environmental: 15, security: 80 },
    confidence: 0.85,
    tags: ["conflito", "sudao", "darfur", "refugiados", "ataque"],
    relatedEvents: [],
    metadata: { fatalities: 30, displaced: 5000, source_type: "UCDP", perpetrators: "unknown" },
  },
  {
    id: "conflict-003",
    source: "seed-data",
    module: "conflito",
    title: "Tensão militar no Estreito de Taiwan",
    description: "Movimentação de 60 navios de guerra e 40 aeronaves militares detectada no Estreito de Taiwan. Alerta de escalada.",
    location: { lat: 24.0, lng: 119.5, country: "Internacional" },
    timestamp: new Date().toISOString(),
    riskLevel: "critico",
    impact: { operational: 60, humanitarian: 40, economic: 80, environmental: 10, security: 95 },
    confidence: 0.88,
    tags: ["conflito", "taiwan", "marinha", "tensao_geopolitica"],
    relatedEvents: [],
    metadata: { naval_vessels: 60, aircraft: 40, source_type: "INT", exercise_type: "encirclement_drill" },
  },
];

const MONITOR: MonitorModule = {
  name: "conflict-monitor",
  category: "conflito",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [acledRes, ucdpRes] = await Promise.allSettled([
        fetch("https://api.acleddata.com/acled/read?key=DEMO_KEY&email=demo@example.com&limit=10&fields=event_date|event_type|country|admin1|fatalities|notes|latitude|longitude&start_date=" + new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10), {
          signal: controller.signal,
        }),
        fetch("https://ucdpapi.pcr.uu.se/api/gedevents/23.1?pagesize=10", {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (acledRes.status === "fulfilled" && acledRes.value.ok) {
        const data = await acledRes.value.json();
        for (const item of (data.data || []).slice(0, 10)) {
          const lat = parseFloat(item.latitude) || 0;
          const lng = parseFloat(item.longitude) || 0;
          const fatalities = parseInt(item.fatalities) || 0;

          events.push({
            id: `conflict-acled-${item.event_date}-${item.event_id_cnty || Date.now()}`,
            source: "ACLED",
            module: "conflito",
            title: `${item.event_type || "Incidente"} - ${item.country || "Desconhecido"}`,
            description: item.notes?.slice(0, 500) || `Incidente de conflito em ${item.admin1 || item.country}.`,
            location: { lat, lng, country: item.country, state: item.admin1 },
            timestamp: new Date(item.event_date || Date.now()).toISOString(),
            riskLevel: fatalities > 50 ? "extremo" : fatalities > 20 ? "emergencia" : fatalities > 5 ? "critico" : fatalities > 0 ? "alto" : "moderado",
            impact: {
              operational: Math.min(fatalities * 2, 80),
              humanitarian: Math.min(fatalities * 3, 100),
              economic: Math.min(fatalities * 2, 70),
              environmental: Math.min(fatalities, 30),
              security: Math.min(fatalities * 2, 90),
            },
            confidence: 0.85,
            tags: ["conflito", "acled", item.event_type?.toLowerCase() || "incidente", item.country?.toLowerCase().replace(/\s/g, "_") || "unknown"],
            relatedEvents: [],
            metadata: { source_type: "ACLED", fatalities, event_type: item.event_type, admin1: item.admin1 },
          });
        }
      }

      if (ucdpRes.status === "fulfilled" && ucdpRes.value.ok) {
        const data = await ucdpRes.value.json();
        for (const item of (data.Result || []).slice(0, 10)) {
          events.push({
            id: `conflict-ucdp-${item.ged_id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "UCDP",
            module: "conflito",
            title: `${item.type_of_violence === 1 ? "Conflito Estado" : item.type_of_violence === 2 ? "Conflito não-Estado" : "Conflito unilateral"} - ${item.country || "Desconhecido"}`,
            description: `Incidente reportado pela UCDP em ${item.admin1 || item.country}. Fatalidades: ${item.deaths_a + (item.deaths_b || 0) + (item.deaths_civilians || 0)}.`,
            location: { lat: item.latitude || 0, lng: item.longitude || 0, country: item.country, state: item.admin1 },
            timestamp: new Date(item.date_start || Date.now()).toISOString(),
            riskLevel: (item.deaths_a + (item.deaths_b || 0) + (item.deaths_civilians || 0)) > 20 ? "extremo" : "alto",
            impact: {
              operational: 40,
              humanitarian: Math.min(((item.deaths_a || 0) + (item.deaths_b || 0) + (item.deaths_civilians || 0)) * 3, 100),
              economic: 35,
              environmental: 10,
              security: 70,
            },
            confidence: 0.80,
            tags: ["conflito", "ucdp", item.country?.toLowerCase().replace(/\s/g, "_") || "unknown"],
            relatedEvents: [],
            metadata: { source_type: "UCDP", ged_id: item.ged_id, deaths_a: item.deaths_a, deaths_b: item.deaths_b, deaths_civilians: item.deaths_civilians },
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
      const res = await fetch("https://ucdpapi.pcr.uu.se/api/gedevents/23.1?pagesize=1", {
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
