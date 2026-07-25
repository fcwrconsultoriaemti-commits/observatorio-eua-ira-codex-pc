// ============================================================
// CORRELATION ENGINE — Event Chain Detection & Cascade Analysis
// ============================================================

import type { GlobalEvent, RiskLevel, CorrelationResult } from "../types";

const CORRELATION_RULES: {
  from: string[];
  to: string[];
  cascadeRisk: RiskLevel;
  description: string;
}[] = [
  {
    from: ["terremoto"],
    to: ["enchente", "infraestrutura"],
    cascadeRisk: "critico",
    description: "Terremoto pode causar tsunamis, deslizamentos e danos a infraestrutura",
  },
  {
    from: ["terremoto"],
    to: ["vulcao"],
    cascadeRisk: "emergencia",
    description: "Atividade sísmica pode desencadear erupções vulcânicas",
  },
  {
    from: ["furacao", "tornado", "clima_severo"],
    to: ["enchente", "infraestrutura"],
    cascadeRisk: "alto",
    description: "Tempestades causam inundações e danos à infraestrutura",
  },
  {
    from: ["furacao"],
    to: ["maritimo", "aereo"],
    cascadeRisk: "critico",
    description: "Furacões afetam rotas marítimas e aéreas",
  },
  {
    from: ["incendio"],
    to: ["saude", "infraestrutura"],
    cascadeRisk: "alto",
    description: "Incêndios causam poluição do ar e destruição de infraestrutura",
  },
  {
    from: ["enchente"],
    to: ["saude", "infraestrutura"],
    cascadeRisk: "alto",
    description: "Enchentes causam doenças e danos a infraestrutura",
  },
  {
    from: ["seca"],
    to: ["energia", "infraestrutura"],
    cascadeRisk: "moderado",
    description: "Secas afetam geração hidrelétrica e abastecimento de água",
  },
  {
    from: ["espacial"],
    to: ["aereo", "cibernetico"],
    cascadeRisk: "alto",
    description: "Tempestades solares afetam GPS, comunicações e aviação",
  },
  {
    from: ["cibernetico"],
    to: ["energia", "infraestrutura"],
    cascadeRisk: "critico",
    description: "Ataques cibernéticos podem comprometer infraestrutura crítica",
  },
  {
    from: ["conflito"],
    to: ["maritimo", "aereo", "energia", "infraestrutura"],
    cascadeRisk: "emergencia",
    description: "Conflitos armados afetam comércio, transporte e infraestrutura",
  },
  {
    from: ["economico"],
    to: ["infraestrutura", "energia"],
    cascadeRisk: "alto",
    description: "Crises econômicas afetam manutenção de infraestrutura",
  },
];

export function findCorrelations(event: GlobalEvent, allEvents: GlobalEvent[]): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  // 1. Regras predefinidas
  for (const rule of CORRELATION_RULES) {
    if (rule.from.includes(event.module)) {
      const related = allEvents.filter(e => rule.to.includes(e.module) && e.id !== event.id);
      if (related.length > 0) {
        results.push({
          eventId: event.id,
          linkedEvents: related.map(e => e.id),
          chain: [event.id, ...related.map(e => e.id)],
          cascadeRisk: rule.cascadeRisk,
          description: rule.description,
        });
      }
    }
  }

  // 2. Proximidade geográfica
  const nearby = allEvents.filter(e =>
    e.id !== event.id &&
    haversineDistance(event.location.lat, event.location.lng, e.location.lat, e.location.lng) < 300
  );
  if (nearby.length > 0) {
    const worstRisk = getWorstRisk([event, ...nearby]);
    results.push({
      eventId: event.id,
      linkedEvents: nearby.map(e => e.id),
      chain: [event.id, ...nearby.map(e => e.id)],
      cascadeRisk: worstRisk,
      description: `${nearby.length} evento(s) dentro de 300km. Risco de cascata: ${worstRisk}`,
    });
  }

  // 3. Mesmo país, ±6h
  const sameCountry = allEvents.filter(e =>
    e.id !== event.id &&
    event.location.country &&
    e.location.country === event.location.country &&
    Math.abs(new Date(event.timestamp).getTime() - new Date(e.timestamp).getTime()) < 21600000
  );
  if (sameCountry.length > 0) {
    results.push({
      eventId: event.id,
      linkedEvents: sameCountry.map(e => e.id),
      chain: [event.id, ...sameCountry.map(e => e.id)],
      cascadeRisk: "moderado",
      description: `${sameCountry.length} evento(s) no mesmo país nas últimas 6 horas`,
    });
  }

  return results;
}

export function analyzeCascade(events: GlobalEvent[]): {
  chains: { start: GlobalEvent; steps: GlobalEvent[]; endRisk: RiskLevel }[];
  totalImpact: number;
} {
  const chains: { start: GlobalEvent; steps: GlobalEvent[]; endRisk: RiskLevel }[] = [];
  const visited = new Set<string>();

  for (const event of events) {
    if (visited.has(event.id)) continue;
    visited.add(event.id);

    const correlations = findCorrelations(event, events);
    if (correlations.length > 0) {
      const chain = correlations[0];
      const steps = chain.linkedEvents
        .map(id => events.find(e => e.id === id))
        .filter((e): e is GlobalEvent => e !== undefined);
      chains.push({
        start: event,
        steps,
        endRisk: chain.cascadeRisk,
      });
    }
  }

  const totalImpact = chains.reduce((sum, c) => {
    const riskScore: Record<RiskLevel, number> = {
      informativo: 0, baixo: 10, moderado: 25, alto: 50, critico: 75, emergencia: 90, extremo: 100,
    };
    return sum + riskScore[c.endRisk];
  }, 0);

  return { chains, totalImpact };
}

function getWorstRisk(events: GlobalEvent[]): RiskLevel {
  const order: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  let worst = 0;
  for (const e of events) {
    const idx = order.indexOf(e.riskLevel);
    if (idx > worst) worst = idx;
  }
  return order[worst];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
