// ============================================================
// GLOBAL INTELLIGENCE CORE — Central Event Processing Hub
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel, RiskCategory, ImpactScores, CorrelationResult, IntelligenceSummary, MonitorModule } from "../types";

// In-memory store (em produção usar Redis/DB)
const eventStore: Map<string, GlobalEvent> = new Map();
const alertStore: Map<string, GlobalAlert> = new Map();
const correlationStore: Map<string, CorrelationResult> = new Map();
const moduleRegistry: Map<string, MonitorModule> = new Map();

// ─── EVENT PROCESSING ──────────────────────────────────────

export function registerModule(mod: MonitorModule): void {
  moduleRegistry.set(mod.name, mod);
}

export function getRegisteredModules(): MonitorModule[] {
  return Array.from(moduleRegistry.values());
}

export async function collectAll(): Promise<GlobalEvent[]> {
  const allEvents: GlobalEvent[] = [];
  const modules = getRegisteredModules().filter(m => m.enabled);

  const results = await Promise.allSettled(
    modules.map(async (mod) => {
      try {
        const events = await mod.fetch();
        return events;
      } catch {
        return [] as GlobalEvent[];
      }
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allEvents.push(...result.value);
    }
  }

  // Normalizar e armazenar
  for (const event of allEvents) {
    eventStore.set(event.id, event);
  }

  // Gerar alertas para eventos de alto risco
  for (const event of allEvents) {
    if (isHighRisk(event.riskLevel)) {
      generateAlert(event);
    }
  }

  // Correlacionar eventos
  const correlations = correlateEvents(allEvents);
  for (const corr of correlations) {
    correlationStore.set(corr.eventId, corr);
  }

  return allEvents;
}

export function ingestEvent(event: GlobalEvent): void {
  eventStore.set(event.id, event);
  if (isHighRisk(event.riskLevel)) {
    generateAlert(event);
  }
}

export function getEvents(filters?: {
  category?: RiskCategory;
  riskLevel?: RiskLevel;
  since?: string;
  limit?: number;
}): GlobalEvent[] {
  let events = Array.from(eventStore.values());

  if (filters?.category) {
    events = events.filter(e => e.module === filters.category);
  }
  if (filters?.riskLevel) {
    events = events.filter(e => e.riskLevel === filters.riskLevel);
  }
  if (filters?.since) {
    const since = new Date(filters.since).getTime();
    events = events.filter(e => new Date(e.timestamp).getTime() >= since);
  }

  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    events = events.slice(0, filters.limit);
  }

  return events;
}

export function getEvent(id: string): GlobalEvent | undefined {
  return eventStore.get(id);
}

// ─── ALERT SYSTEM ──────────────────────────────────────────

export function generateAlert(event: GlobalEvent): GlobalAlert {
  const alertId = `alert-${event.id}`;
  const existing = alertStore.get(alertId);

  if (existing) {
    existing.status = "atualizado";
    existing.timestamp = new Date().toISOString();
    existing.impact = event.impact;
    existing.riskLevel = event.riskLevel;
    return existing;
  }

  const alert: GlobalAlert = {
    id: alertId,
    eventId: event.id,
    origin: event.module,
    source: event.source,
    riskLevel: event.riskLevel,
    title: event.title,
    description: event.description,
    location: event.location,
    timestamp: new Date().toISOString(),
    confidence: event.confidence,
    impact: event.impact,
    relatedEvents: event.relatedEvents,
    status: "novo",
    acknowledged: false,
  };

  alertStore.set(alertId, alert);
  return alert;
}

export function getAlerts(filters?: {
  riskLevel?: RiskLevel;
  category?: RiskCategory;
  status?: string;
  limit?: number;
}): GlobalAlert[] {
  let alerts = Array.from(alertStore.values());

  if (filters?.riskLevel) {
    alerts = alerts.filter(a => a.riskLevel === filters.riskLevel);
  }
  if (filters?.category) {
    alerts = alerts.filter(a => a.origin === filters.category);
  }
  if (filters?.status) {
    alerts = alerts.filter(a => a.status === filters.status);
  }

  alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    alerts = alerts.slice(0, filters.limit);
  }

  return alerts;
}

export function acknowledgeAlert(alertId: string): boolean {
  const alert = alertStore.get(alertId);
  if (!alert) return false;
  alert.acknowledged = true;
  alert.status = "resolvido";
  return true;
}

// ─── CORRELATION ENGINE ────────────────────────────────────

function correlateEvents(events: GlobalEvent[]): CorrelationResult[] {
  const results: CorrelationResult[] = [];

  for (const event of events) {
    const linked = findRelatedEvents(event, events);
    if (linked.length > 0) {
      const chain = buildCascadeChain(event, linked, events);
      const cascadeRisk = assessCascadeRisk(chain, events);
      results.push({
        eventId: event.id,
        linkedEvents: linked.map(e => e.id),
        chain,
        cascadeRisk,
        description: generateCorrelationDescription(event, linked, cascadeRisk),
      });
    }
  }

  return results;
}

function findRelatedEvents(event: GlobalEvent, allEvents: GlobalEvent[]): GlobalEvent[] {
  return allEvents.filter(other => {
    if (other.id === event.id) return false;

    // Proximidade geográfica (raio ~500km)
    const dist = haversineDistance(event.location.lat, event.location.lng, other.location.lat, other.location.lng);
    if (dist < 500) return true;

    // Mesmo país/região
    if (event.location.country && event.location.country === other.location.country) return true;

    // Tags em comum
    const commonTags = event.tags.filter(t => other.tags.includes(t));
    if (commonTags.length >= 2) return true;

    // Temporalidade (dentro de 24h)
    const timeDiff = Math.abs(new Date(event.timestamp).getTime() - new Date(other.timestamp).getTime());
    if (timeDiff < 86400000 && event.module === other.module) return true;

    return false;
  });
}

function buildCascadeChain(event: GlobalEvent, linked: GlobalEvent[], _all: GlobalEvent[]): string[] {
  const chain = [event.id];
  for (const l of linked) {
    chain.push(l.id);
  }
  return chain;
}

function assessCascadeRisk(chain: string[], events: GlobalEvent[]): RiskLevel {
  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  let maxRiskIdx = 0;

  for (const id of chain) {
    const ev = events.find(e => e.id === id);
    if (ev) {
      const idx = riskOrder.indexOf(ev.riskLevel);
      if (idx > maxRiskIdx) maxRiskIdx = idx;
    }
  }

  // Cascata aumenta o risco
  if (chain.length >= 3 && maxRiskIdx < riskOrder.length - 1) {
    maxRiskIdx = Math.min(maxRiskIdx + 1, riskOrder.length - 1);
  }

  return riskOrder[maxRiskIdx];
}

function generateCorrelationDescription(event: GlobalEvent, linked: GlobalEvent[], cascadeRisk: RiskLevel): string {
  const categories = [...new Set(linked.map(e => e.module))];
  return `Evento ${event.module} correlacionado com ${linked.length} evento(s) de ${categories.join(", ")}. Risco de cascata: ${cascadeRisk}.`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isHighRisk(level: RiskLevel): boolean {
  return ["alto", "critico", "emergencia", "extremo"].includes(level);
}

// ─── SUMMARY ───────────────────────────────────────────────

export function getSummary(): IntelligenceSummary {
  const events = Array.from(eventStore.values());
  const alerts = Array.from(alertStore.values());
  const correlations = Array.from(correlationStore.values());

  const eventsByCategory = {} as Record<RiskCategory, number>;
  const eventsByRisk = {} as Record<RiskLevel, number>;

  const categories: RiskCategory[] = ["terremoto", "vulcao", "furacao", "tornado", "clima_severo", "incendio", "enchente", "seca", "espacial", "neo", "satelite", "saude", "cibernetico", "energia", "maritimo", "aereo", "economico", "infraestrutura", "conflito"];
  const risks: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];

  for (const c of categories) eventsByCategory[c] = 0;
  for (const r of risks) eventsByRisk[r] = 0;

  for (const e of events) {
    eventsByCategory[e.module]++;
    eventsByRisk[e.riskLevel]++;
  }

  return {
    totalEvents: events.length,
    activeAlerts: alerts.filter(a => a.status !== "resolvido").length,
    criticalAlerts: alerts.filter(a => ["critico", "emergencia", "extremo"].includes(a.riskLevel)).length,
    eventsByCategory,
    eventsByRisk,
    topImpactZones: [],
    recentCorrelations: correlations.slice(0, 10),
    lastUpdated: new Date().toISOString(),
  };
}

// ─── RISK CALCULATION ──────────────────────────────────────

export function calculateRisk(params: {
  magnitude?: number;
  depth?: number;
  distance?: number;
  windSpeed?: number;
  waveHeight?: number;
  affectedPopulation?: number;
}): { level: RiskLevel; score: number } {
  let score = 0;

  if (params.magnitude) {
    score += Math.min(params.magnitude * 10, 50);
  }
  if (params.depth !== undefined && params.depth < 70) {
    score += (70 - params.depth) * 0.3;
  }
  if (params.windSpeed) {
    score += Math.min(params.windSpeed * 0.5, 40);
  }
  if (params.waveHeight) {
    score += Math.min(params.waveHeight * 5, 30);
  }
  if (params.affectedPopulation) {
    score += Math.min(Math.log10(params.affectedPopulation) * 10, 30);
  }

  score = Math.min(Math.round(score), 100);

  let level: RiskLevel = "informativo";
  if (score >= 90) level = "extremo";
  else if (score >= 75) level = "emergencia";
  else if (score >= 60) level = "critico";
  else if (score >= 45) level = "alto";
  else if (score >= 30) level = "moderado";
  else if (score >= 15) level = "baixo";

  return { level, score };
}

// ─── HEALTH CHECK ──────────────────────────────────────────

export async function healthCheck(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  for (const [name, mod] of moduleRegistry) {
    try {
      results[name] = await mod.health();
    } catch {
      results[name] = false;
    }
  }
  return results;
}
