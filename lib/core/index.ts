// ============================================================
// GLOBAL INTELLIGENCE CORE — Central Event Processing Hub
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel, RiskCategory, ImpactScores, CorrelationResult, IntelligenceSummary, MonitorModule } from "../types";
import { runPipeline, runPipelineBatch } from "../infrastructure/pipeline.js";
import { startScheduler, stopScheduler, registerTask, getSchedulerStatus } from "../infrastructure/scheduler.js";
import { getOperationalPanel, getSystemMetrics, getMonitorMetrics, log as obsLog } from "../infrastructure/observability.js";
import { cacheStats } from "../infrastructure/cache.js";
import { getAllCircuitBreakers } from "../infrastructure/retry.js";

// In-memory store (em produção usar Redis/DB)
const eventStore: Map<string, GlobalEvent> = new Map();
const alertStore: Map<string, GlobalAlert> = new Map();
const correlationStore: Map<string, CorrelationResult> = new Map();
const moduleRegistry: Map<string, MonitorModule> = new Map();

let totalEventsCollected = 0;
let totalCorrelations = 0;
let collectionRunning = false;
let autoStarted = false;

// ─── EVENT PROCESSING ──────────────────────────────────────

export function registerModule(mod: MonitorModule): void {
  moduleRegistry.set(mod.name, mod);
}

export function getRegisteredModules(): MonitorModule[] {
  return Array.from(moduleRegistry.values());
}

export async function collectAll(): Promise<GlobalEvent[]> {
  if (collectionRunning) return Array.from(eventStore.values());
  collectionRunning = true;
  const startTime = Date.now();

  try {
    const modules = getRegisteredModules().filter(m => m.enabled);
    const existingEvents = Array.from(eventStore.values());

    // Collect from all modules in parallel
    const results = await Promise.allSettled(
      modules.map(async (mod) => {
        const modStart = Date.now();
        try {
          const events = await mod.fetch();
          obsLog("info", mod.name, `Collected ${events.length} events`, { duration: Date.now() - modStart });
          return { events, source: mod.name, category: mod.category };
        } catch (err) {
          obsLog("error", mod.name, `Collection failed: ${err instanceof Error ? err.message : "unknown"}`, { duration: Date.now() - modStart });
          return { events: [] as GlobalEvent[], source: mod.name, category: mod.category };
        }
      })
    );

    // Process through pipeline
    const monitorResults = results
      .filter((r): r is PromiseFulfilledResult<{ events: GlobalEvent[]; source: string; category: RiskCategory }> => r.status === "fulfilled")
      .map(r => r.value);

    const pipelineResult = runPipelineBatch(monitorResults, existingEvents);

    // Store events
    for (const event of pipelineResult.events) {
      eventStore.set(event.id, event);
    }

    // Store alerts
    for (const alert of pipelineResult.alerts) {
      const existing = alertStore.get(alert.id);
      if (!existing) {
        alertStore.set(alert.id, alert);
      } else {
        existing.status = "atualizado";
        existing.timestamp = new Date().toISOString();
        existing.impact = alert.impact;
        existing.riskLevel = alert.riskLevel;
      }
    }

    // Correlate events
    const correlations = correlateEvents(pipelineResult.events);
    for (const corr of correlations) {
      correlationStore.set(corr.eventId, corr);
    }

    totalEventsCollected += pipelineResult.events.length;
    totalCorrelations += correlations.length;

    // Auto-create missions for high-impact events
    for (const event of pipelineResult.events) {
      const maxImpact = Math.max(
        event.impact.operational, event.impact.humanitarian,
        event.impact.economic, event.impact.environmental, event.impact.security
      );
      if (maxImpact > 85) {
        try {
          const { createMission } = await import("../missions/index.js");
          createMission({
            title: `Missão Automática: ${event.title}`,
            description: `Evento de alto impacto detectado: ${event.description?.slice(0, 200)}`,
            priority: maxImpact > 95 ? "urgente" : "alta",
            lat: event.location?.lat ?? 0,
            lng: event.location?.lng ?? 0,
            address: event.location?.country || "Desconhecido",
            team: ["Sistema"],
            createdBy: "Pipeline Automático",
            relatedEvents: [event.id],
            tags: [event.module, "automático", "alto-impacto"],
          });
        } catch { /* missions module may not be available */ }
      }
    }

    const duration = Date.now() - startTime;
    obsLog("info", "core", `Collection cycle complete: ${pipelineResult.events.length} events, ${pipelineResult.alertsGenerated} alerts, ${correlations.length} correlations`, {
      duration,
      stats: pipelineResult.stats,
    });

    return pipelineResult.events;
  } catch (err) {
    obsLog("error", "core", `Collection cycle failed: ${err instanceof Error ? err.message : "unknown"}`);
    return [];
  } finally {
    collectionRunning = false;
  }
}

export function startAutoCollection(): void {
  if (autoStarted) return;
  autoStarted = true;

  // Register collection tasks for each module
  for (const [name, mod] of moduleRegistry) {
    if (mod.enabled) {
      registerTask(name, mod.name, mod.category, async () => {
        try {
          const events = await mod.fetch();
          const existingEvents = Array.from(eventStore.values());
          const result = runPipeline(events, existingEvents, mod.name, mod.category);

          for (const event of result.events) {
            eventStore.set(event.id, event);
          }
          for (const alert of result.alerts) {
            if (!alertStore.has(alert.id)) {
              alertStore.set(alert.id, alert);
            }
          }
          totalEventsCollected += result.events.length;
        } catch (err) {
          obsLog("error", name, `Scheduled collection failed: ${err instanceof Error ? err.message : "unknown"}`);
        }
      });
    }
  }

  startScheduler();
  obsLog("info", "core", "Auto-collection started", { modules: moduleRegistry.size });
}

export function stopAutoCollection(): void {
  stopScheduler();
  autoStarted = false;
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

// ─── OPERATIONAL PANEL ──────────────────────────────────────

export function getOperationalData() {
  return getOperationalPanel(
    eventStore.size,
    alertStore.size,
    moduleRegistry.size,
    getRegisteredModules().filter(m => m.enabled).length
  );
}

export function getSystemData() {
  return getSystemMetrics(
    eventStore.size,
    alertStore.size,
    totalEventsCollected,
    totalCorrelations,
    moduleRegistry.size,
    getRegisteredModules().filter(m => m.enabled).length
  );
}

export function getSchedulerData() {
  return getSchedulerStatus();
}

export function getCacheData() {
  return cacheStats();
}

export function getCircuitBreakerData() {
  return getAllCircuitBreakers();
}

export function getMonitorMetricsData(source?: string) {
  return getMonitorMetrics(source);
}

export function triggerCollection(): Promise<GlobalEvent[]> {
  return collectAll();
}

export function getEventStoreSize(): number {
  return eventStore.size;
}

export function getAlertStoreSize(): number {
  return alertStore.size;
}
