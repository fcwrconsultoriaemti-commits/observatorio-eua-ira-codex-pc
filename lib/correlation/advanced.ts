// ============================================================
// ADVANCED CORRELATION ENGINE — Consequence Tree Builder
// ============================================================

import type { GlobalEvent, RiskLevel } from "../types";

export interface ConsequenceNode {
  eventId: string;
  title: string;
  category: string;
  timestamp: string;
  riskLevel: RiskLevel;
  impactScore: number;
  children: ConsequenceNode[];
  depth: number;
}

export interface ConsequenceTree {
  rootEvent: GlobalEvent;
  tree: ConsequenceNode;
  totalImpact: number;
  cascadeDepth: number;
  affectedCategories: string[];
  estimatedRecovery: string;
}

export interface CorrelationChain {
  id: string;
  events: GlobalEvent[];
  causeEffectPairs: { cause: string; effect: string; probability: number; delay: string }[];
  totalRisk: RiskLevel;
  geoSpread: number;
  temporalSpread: string;
}

// ─── CASCADE RULES ─────────────────────────────────────────

const CASCADE_RULES: {
  trigger: string;
  consequence: string;
  probability: number;
  delay: string;
  description: string;
}[] = [
  // Natural disasters
  { trigger: "terremoto", consequence: "enchente", probability: 0.4, delay: "0-6h", description: "Terremoto pode causar tsunamis e deslizamentos" },
  { trigger: "terremoto", consequence: "infraestrutura", probability: 0.7, delay: "0-2h", description: "Danos imediatos a infraestrutura" },
  { trigger: "terremoto", consequence: "vulcao", probability: 0.15, delay: "0-48h", description: "Atividade sísmica pode desencadear erupções" },
  { trigger: "furacao", consequence: "enchente", probability: 0.8, delay: "0-12h", description: "Tempestades causam inundações" },
  { trigger: "furacao", consequence: "infraestrutura", probability: 0.6, delay: "0-6h", description: "Danos a infraestrutura por ventos e água" },
  { trigger: "furacao", consequence: "maritimo", probability: 0.9, delay: "0-24h", description: "Fechamento de portos e rotas marítimas" },
  { trigger: "furacao", consequence: "aereo", probability: 0.85, delay: "0-12h", description: "Cancelamento de voos e fechamento de espaço aéreo" },
  { trigger: "tornado", consequence: "infraestrutura", probability: 0.7, delay: "0-1h", description: "Destrução localizada de infraestrutura" },
  { trigger: "incendio", consequence: "saude", probability: 0.6, delay: "0-48h", description: "Poluição do ar afeta saúde pública" },
  { trigger: "incendio", consequence: "infraestrutura", probability: 0.5, delay: "0-24h", description: "Destruição de edificações e equipamentos" },
  { trigger: "enchente", consequence: "saude", probability: 0.5, delay: "0-72h", description: "Enchentes causam doenças" },
  { trigger: "enchente", consequence: "infraestrutura", probability: 0.6, delay: "0-12h", description: "Danos a estruturas e estradas" },
  { trigger: "seca", consequence: "energia", probability: 0.4, delay: "30-90d", description: "Secas afetam geração hidrelétrica" },
  { trigger: "seca", consequence: "infraestrutura", probability: 0.3, delay: "60-180d", description: "Crise hídrica afeta abastecimento" },

  // Space weather
  { trigger: "espacial", consequence: "aereo", probability: 0.6, delay: "0-4h", description: "Tempestades solares afetam navegação aérea" },
  { trigger: "espacial", consequence: "cibernetico", probability: 0.3, delay: "0-24h", description: "Radiação pode afetar equipamentos eletrônicos" },
  { trigger: "espacial", consequence: "energia", probability: 0.4, delay: "0-12h", description: "GICs podem afetar redes elétricas" },

  // Cyber
  { trigger: "cibernetico", consequence: "energia", probability: 0.5, delay: "0-6h", description: "Ataques a sistemas de controle industrial" },
  { trigger: "cibernetico", consequence: "infraestrutura", probability: 0.6, delay: "0-12h", description: "Ataques a infraestrutura crítica" },
  { trigger: "cibernetico", consequence: "economico", probability: 0.4, delay: "0-48h", description: "Vazamento de dados afeta mercados" },

  // Conflict
  { trigger: "conflito", consequence: "maritimo", probability: 0.7, delay: "0-24h", description: "Conflitos afetam rotas comerciais" },
  { trigger: "conflito", consequence: "aereo", probability: 0.6, delay: "0-12h", description: "Fechamento de espaço aéreo" },
  { trigger: "conflito", consequence: "energia", probability: 0.8, delay: "0-48h", description: "Conflitos afetam produção e distribuição de energia" },
  { trigger: "conflito", consequence: "economico", probability: 0.7, delay: "0-72h", description: "Incerteza geopolítica afeta mercados" },
  { trigger: "conflito", consequence: "infraestrutura", probability: 0.5, delay: "0-24h", description: "Destruição de infraestrutura" },

  // Economic
  { trigger: "economico", consequence: "infraestrutura", probability: 0.3, delay: "30-180d", description: "Crises afetam manutenção de infraestrutura" },
  { trigger: "economico", consequence: "energia", probability: 0.4, delay: "0-30d", description: "Volatilidade afeta investimentos em energia" },
];

// ─── TREE BUILDER ──────────────────────────────────────────

export function buildConsequenceTree(
  rootEvent: GlobalEvent,
  allEvents: GlobalEvent[],
  maxDepth: number = 5
): ConsequenceTree {
  const tree = buildNode(rootEvent, allEvents, 0, maxDepth, new Set());
  const stats = collectStats(tree);

  return {
    rootEvent,
    tree,
    totalImpact: stats.totalImpact,
    cascadeDepth: stats.maxDepth,
    affectedCategories: stats.categories,
    estimatedRecovery: estimateRecovery(stats.maxDepth, stats.totalImpact),
  };
}

function buildNode(
  event: GlobalEvent,
  allEvents: GlobalEvent[],
  depth: number,
  maxDepth: number,
  visited: Set<string>
): ConsequenceNode {
  visited.add(event.id);

  const children: ConsequenceNode[] = [];

  if (depth < maxDepth) {
    // Find direct consequences
    const directConsequences = CASCADE_RULES.filter(r => r.trigger === event.module);

    for (const rule of directConsequences) {
      // Find matching events
      const matching = allEvents.filter(e =>
        !visited.has(e.id) &&
        e.module === rule.consequence &&
        new Date(e.timestamp).getTime() > new Date(event.timestamp).getTime() &&
        new Date(e.timestamp).getTime() < new Date(event.timestamp).getTime() + parseDelay(rule.delay)
      );

      for (const match of matching) {
        children.push(buildNode(match, allEvents, depth + 1, maxDepth, new Set(visited)));
      }
    }

    // Also find geographic consequences
    const nearby = allEvents.filter(e =>
      !visited.has(e.id) &&
      e.id !== event.id &&
      haversineDistance(event.location.lat, event.location.lng, e.location.lat, e.location.lng) < 300 &&
      new Date(e.timestamp).getTime() > new Date(event.timestamp).getTime() &&
      new Date(e.timestamp).getTime() < new Date(event.timestamp).getTime() + 86400000
    );

    for (const n of nearby.slice(0, 3)) {
      children.push(buildNode(n, allEvents, depth + 1, maxDepth, new Set(visited)));
    }
  }

  return {
    eventId: event.id,
    title: event.title,
    category: event.module,
    timestamp: event.timestamp,
    riskLevel: event.riskLevel,
    impactScore: event.impact.operational + event.impact.humanitarian + event.impact.economic,
    children,
    depth,
  };
}

function collectStats(node: ConsequenceNode): {
  totalImpact: number;
  maxDepth: number;
  categories: Set<string>;
} {
  let totalImpact = node.impactScore;
  let maxDepth = node.depth;
  const categories = new Set<string>([node.category]);

  for (const child of node.children) {
    const childStats = collectStats(child);
    totalImpact += childStats.totalImpact;
    maxDepth = Math.max(maxDepth, childStats.maxDepth);
    childStats.categories.forEach(c => categories.add(c));
  }

  return { totalImpact, maxDepth, categories };
}

function parseDelay(delay: string): number {
  const match = delay.match(/(\d+)-(\d+)([hm])/);
  if (!match) return 86400000;
  const [, min, max, unit] = match;
  const maxMs = parseInt(max) * (unit === "h" ? 3600000 : 86400000);
  return maxMs;
}

function estimateRecovery(depth: number, impact: number): string {
  if (impact > 500 || depth > 4) return "Semanas a meses";
  if (impact > 200 || depth > 3) return "Dias a semanas";
  if (impact > 100 || depth > 2) return "24-72 horas";
  if (impact > 50 || depth > 1) return "6-24 horas";
  return "0-6 horas";
}

// ─── CHAIN FINDER ──────────────────────────────────────────

export function findCorrelationChains(events: GlobalEvent[]): CorrelationChain[] {
  const chains: CorrelationChain[] = [];
  const processed = new Set<string>();

  for (const event of events) {
    if (processed.has(event.id)) continue;

    const chain = buildChain(event, events, processed);
    if (chain.events.length > 1) {
      chains.push(chain);
    }
  }

  return chains.sort((a, b) => b.events.length - a.events.length);
}

function buildChain(start: GlobalEvent, allEvents: GlobalEvent[], processed: Set<string>): CorrelationChain {
  const chainEvents: GlobalEvent[] = [start];
  processed.add(start.id);

  // Forward chain
  let current = start;
  while (true) {
    const next = findNextInChain(current, allEvents, processed);
    if (!next) break;
    chainEvents.push(next);
    processed.add(next.id);
    current = next;
  }

  const causeEffectPairs = buildCauseEffectPairs(chainEvents);
  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  const maxRisk = Math.max(...chainEvents.map(e => riskOrder.indexOf(e.riskLevel)));

  const lats = chainEvents.map(e => e.location.lat);
  const lngs = chainEvents.map(e => e.location.lng);
  const geoSpread = haversineDistance(
    Math.min(...lats), Math.min(...lngs),
    Math.max(...lats), Math.max(...lngs)
  );

  const timeSpan = new Date(chainEvents[chainEvents.length - 1].timestamp).getTime() - new Date(chainEvents[0].timestamp).getTime();
  const temporalSpread = timeSpan < 3600000 ? `${Math.round(timeSpan / 60000)}min`
    : timeSpan < 86400000 ? `${Math.round(timeSpan / 3600000)}h`
    : `${Math.round(timeSpan / 86400000)}d`;

  return {
    id: `chain-${start.id}`,
    events: chainEvents,
    causeEffectPairs,
    totalRisk: riskOrder[maxRisk],
    geoSpread: Math.round(geoSpread),
    temporalSpread,
  };
}

function findNextInChain(current: GlobalEvent, allEvents: GlobalEvent[], processed: Set<string>): GlobalEvent | null {
  const rules = CASCADE_RULES.filter(r => r.trigger === current.module);

  for (const rule of rules) {
    const candidate = allEvents.find(e =>
      !processed.has(e.id) &&
      e.module === rule.consequence &&
      new Date(e.timestamp).getTime() > new Date(current.timestamp).getTime() &&
      new Date(e.timestamp).getTime() < new Date(current.timestamp).getTime() + parseDelay(rule.delay)
    );
    if (candidate) return candidate;
  }

  return null;
}

function buildCauseEffectPairs(events: GlobalEvent[]): { cause: string; effect: string; probability: number; delay: string }[] {
  const pairs: { cause: string; effect: string; probability: number; delay: string }[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const rule = CASCADE_RULES.find(r => r.trigger === events[i].module && r.consequence === events[i + 1].module);
    pairs.push({
      cause: events[i].title,
      effect: events[i + 1].title,
      probability: rule?.probability || 0.5,
      delay: rule?.delay || "desconhecido",
    });
  }
  return pairs;
}

// ─── QUERY CORRELATIONS ────────────────────────────────────

export function queryCorrelations(events: GlobalEvent[], filters: {
  category?: string;
  minChainLength?: number;
  maxGeoSpread?: number;
}): CorrelationChain[] {
  let chains = findCorrelationChains(events);

  if (filters.category) {
    chains = chains.filter(c => c.events.some(e => e.module === filters.category));
  }
  if (filters.minChainLength) {
    chains = chains.filter(c => c.events.length >= filters.minChainLength);
  }
  if (filters.maxGeoSpread) {
    chains = chains.filter(c => c.geoSpread <= filters.maxGeoSpread);
  }

  return chains;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
