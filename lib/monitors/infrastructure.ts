// ============================================================
// CRITICAL INFRASTRUCTURE MONITOR
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "infra-001",
    source: "seed-data",
    module: "infraestrutura",
    title: "Barragem com risco de colapso - Minas Gerais",
    description: "Barragem da Vale em Brumadinho apresenta deformação estrutural. Nível de alerta máximo. Evacuação preventiva de 5.000 moradores.",
    location: { lat: -20.1342, lng: -44.1971, country: "Brasil", state: "Minas Gerais", city: "Brumadinho" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 70, humanitarian: 90, economic: 60, environmental: 95, security: 40 },
    confidence: 0.85,
    tags: ["infraestrutura", "barragem", "risco_colapso", "brumadinho"],
    relatedEvents: [],
    metadata: { structure_type: "tailings_dam", operator: "Vale", evacuation_radius: "5km", at_risk_pop: 5000 },
  },
  {
    id: "infra-002",
    source: "seed-data",
    module: "infraestrutura",
    title: "Duto de petróleo explodido - Nigéria",
    description: "Explosão em duto de petróleo na Nigéria causa incêndio de grandes proporções. Derramamento de 50.000 barris estimado.",
    location: { lat: 4.777, lng: 7.015, country: "Nigéria", state: "Rivers", city: "Port Harcourt" },
    timestamp: new Date().toISOString(),
    riskLevel: "critico",
    impact: { operational: 65, humanitarian: 70, economic: 55, environmental: 95, security: 60 },
    confidence: 0.80,
    tags: ["infraestrutura", "duto", "explosao", "derramamento", "nigeria"],
    relatedEvents: [],
    metadata: { pipeline_type: "oil", spill_bbl: 50000, fire_extent: "2km", operator: "NNPC" },
  },
  {
    id: "infra-003",
    source: "seed-data",
    module: "infraestrutura",
    title: "Ponte ferroviária colapsa - Índia",
    description: "Ponte ferroviária de 100 anos em Bengala Ocidental colapsa durante passagem de trem. 50 passageiros desaparecidos.",
    location: { lat: 22.3451, lng: 87.3127, country: "Índia", state: "Bengala Ocidental" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 85, humanitarian: 90, economic: 45, environmental: 20, security: 25 },
    confidence: 0.88,
    tags: ["infraestrutura", "ponte", "colapso", "ferrovia", "india"],
    relatedEvents: [],
    metadata: { structure_type: "railway_bridge", age_years: 100, passengers_missing: 50 },
  },
];

const MONITOR: MonitorModule = {
  name: "infrastructure-monitor",
  category: "infraestrutura",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [usgsRes, femaRes] = await Promise.allSettled([
        fetch("https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minmagnitude=5&limit=5", {
          signal: controller.signal,
        }),
        fetch("https://www.fema.gov/api/open/v2/Disasters?$filter=declarationDate ge " + new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) + "&$top=5", {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (usgsRes.status === "fulfilled" && usgsRes.value.ok) {
        const data = await usgsRes.value.json();
        for (const feature of (data.features || []).slice(0, 5)) {
          const props = feature.properties;
          const coords = feature.geometry.coordinates;
          const mag = props.mag || 0;

          events.push({
            id: `infra-seismic-${feature.id}`,
            source: "USGS",
            module: "infraestrutura",
            title: `Sismo M${mag} - Risco a infraestrutura`,
            description: `Sismo de magnitude ${mag} pode causar danos a infraestrutura crítica na região.`,
            location: { lat: coords[1], lng: coords[0], depth: coords[2], country: "Internacional" },
            timestamp: new Date(props.time).toISOString(),
            riskLevel: mag >= 7 ? "critico" : mag >= 5 ? "alto" : "moderado",
            impact: { operational: Math.round(mag * 10), humanitarian: Math.round(mag * 8), economic: Math.round(mag * 12), environmental: Math.round(mag * 5), security: Math.round(mag * 4) },
            confidence: 0.95,
            tags: ["infraestrutura", "sismo", "usgs", "terremoto"],
            relatedEvents: [],
            metadata: { magnitude: mag, depth_km: coords[2], source_type: "USGS" },
          });
        }
      }

      if (femaRes.status === "fulfilled" && femaRes.value.ok) {
        const data = await femaRes.value.json();
        for (const disaster of (data.Data || []).slice(0, 5)) {
          events.push({
            id: `infra-fema-${disaster.id || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "FEMA",
            module: "infraestrutura",
            title: `Desastre declarado - ${disaster.incidentType || "Não especificado"}`,
            description: `FEMA declarou desastre para ${disaster.declarationTitle || "área afetada"}.`,
            location: { lat: parseFloat(disaster.latitude) || 0, lng: parseFloat(disaster.longitude) || 0, country: "EUA" },
            timestamp: new Date(disaster.declarationDate || Date.now()).toISOString(),
            riskLevel: "alto",
            impact: { operational: 60, humanitarian: 70, economic: 55, environmental: 30, security: 25 },
            confidence: 0.85,
            tags: ["infraestrutura", "fema", "desastre", "declaracao"],
            relatedEvents: [],
            metadata: { source_type: "FEMA", incident_type: disaster.incidentType },
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
      const res = await fetch("https://earthquake.usgs.gov/fdsnws/event/1/count?minmagnitude=5", {
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
