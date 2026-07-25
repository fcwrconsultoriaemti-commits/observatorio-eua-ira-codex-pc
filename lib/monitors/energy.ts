// ============================================================
// ENERGY GRID / POWER OUTAGE MONITOR
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "energy-001",
    source: "seed-data",
    module: "energia",
    title: "Apagão parcial no Texas - ERCOT",
    description: "Sistema ERCOT ativa estágios de emergência devido a demanda recorde de ar condicionado. Risco de apagão rotativo.",
    location: { lat: 31.9686, lng: -99.9018, country: "EUA", state: "Texas", city: "Austin" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 80, humanitarian: 45, economic: 70, environmental: 20, security: 30 },
    confidence: 0.88,
    tags: ["energia", "apagao", "ercot", "texas", "emergencia"],
    relatedEvents: [],
    metadata: { grid: "ERCOT", load_mw: 82000, capacity_mw: 85000, reserve_margin: "3.5%" },
  },
  {
    id: "energy-002",
    source: "seed-data",
    module: "energia",
    title: "Subestação destruída por sabotagem - Ucrânia",
    description: "Subestação de 330kV na região de Kharkiv destruída por ataque. 200.000 consumidores sem fornecimento.",
    location: { lat: 49.9935, lng: 36.2304, country: "Ucrânia", state: "Kharkiv" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 95, humanitarian: 80, economic: 60, environmental: 15, security: 90 },
    confidence: 0.92,
    tags: ["energia", "sabotagem", "ucrania", "subestacao", "apagao"],
    relatedEvents: [],
    metadata: { voltage_kv: 330, affected: 200000, restoration_estimate: "72h" },
  },
  {
    id: "energy-003",
    source: "seed-data",
    module: "energia",
    title: "Alerta de estresse na rede europeia - ENTSO-E",
    description: "ENTSO-E emite alerta de estresse na rede elétrica europeia devido a onda de calor. Capacidade de geração térmica comprometida.",
    location: { lat: 50.8503, lng: 4.3517, country: "Bélgica", city: "Bruxelas" },
    timestamp: new Date().toISOString(),
    riskLevel: "moderado",
    impact: { operational: 55, humanitarian: 30, economic: 50, environmental: 25, security: 20 },
    confidence: 0.75,
    tags: ["energia", "entso-e", "rede_europeia", "ondas_calor"],
    relatedEvents: [],
    metadata: { operator: "ENTSO-E", alert_type: "generation_shortfall", region: "Western Europe" },
  },
];

const MONITOR: MonitorModule = {
  name: "energy-monitor",
  category: "energia",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [eiaRes, gridWatchRes] = await Promise.allSettled([
        fetch("https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=DEMO_KEY&frequency=hourly&data[0]=value&facets[respondent][]=TEX&sort[0][column]=period&sort[0][direction]=desc&length=1", {
          signal: controller.signal,
        }),
        fetch("https://api.gridwatch.io/v1/current", {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (eiaRes.status === "fulfilled" && eiaRes.value.ok) {
        const data = await eiaRes.value.json();
        const rows = data.response?.data || [];
        for (const row of rows.slice(0, 5)) {
          events.push({
            id: `energy-eia-${row.period}-${Date.now()}`,
            source: "EIA",
            module: "energia",
            title: `Geração elétrica ERCOT - ${row.fueltype}`,
            description: `Geração atual: ${row.value} MW via ${row.fueltype} para ${row.respondent}.`,
            location: { lat: 31.9686, lng: -99.9018, country: "EUA", state: "Texas" },
            timestamp: new Date().toISOString(),
            riskLevel: "informativo",
            impact: { operational: 20, humanitarian: 5, economic: 15, environmental: 10, security: 5 },
            confidence: 0.90,
            tags: ["energia", "eia", "geracao", "ercot"],
            relatedEvents: [],
            metadata: { source_type: "EIA", fuel_type: row.fueltype, value_mw: row.value },
          });
        }
      }

      if (gridWatchRes.status === "fulfilled" && gridWatchRes.value.ok) {
        const data = await gridWatchRes.value.json();
        if (data.frequencies) {
          events.push({
            id: `energy-gridwatch-${Date.now()}`,
            source: "GridWatch",
            module: "energia",
            title: "Frequência da rede global",
            description: `Frequência média da rede: ${data.frequencies.na || "N/A"} Hz (América do Norte).`,
            location: { lat: 0, lng: 0, country: "Internacional" },
            timestamp: new Date().toISOString(),
            riskLevel: "informativo",
            impact: { operational: 10, humanitarian: 5, economic: 10, environmental: 5, security: 5 },
            confidence: 0.85,
            tags: ["energia", "frequencia", "rede"],
            relatedEvents: [],
            metadata: { source_type: "GridWatch", frequencies: data.frequencies },
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
      const res = await fetch("https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/?api_key=DEMO_KEY&length=1", {
        signal: AbortSignal.timeout(10000),
      });
      return res.ok || res.status === 400;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
