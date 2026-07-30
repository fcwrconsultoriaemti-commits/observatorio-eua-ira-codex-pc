// ============================================================
// PIPELINE — Complete Intelligence Pipeline
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel, RiskCategory } from "../types.js";
import { processBatch, getDedupStats, cleanupDedupStore } from "./dedup.js";
import { cacheGet, cacheSet, cacheStats } from "./cache.js";
import { log, recordCollection, initMonitorMetrics } from "./observability.js";

export interface PipelineResult {
  events: GlobalEvent[];
  alerts: GlobalAlert[];
  stats: {
    collected: number;
    normalized: number;
    validated: number;
    duplicates: number;
    correlated: number;
    highImpact: number;
    alertsGenerated: number;
  };
}

export interface PipelineStage {
  name: string;
  process: (events: GlobalEvent[]) => GlobalEvent[];
}

// ─── STAGE 1: NORMALIZATION ────────────────────────────────

function normalize(events: GlobalEvent[]): GlobalEvent[] {
  return events.map(ev => ({
    ...ev,
    id: ev.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: ev.source || "unknown",
    module: ev.module || "infraestrutura",
    title: (ev.title || "").trim().slice(0, 500),
    description: (ev.description || "").trim().slice(0, 2000),
    timestamp: ev.timestamp || new Date().toISOString(),
    riskLevel: normalizeRiskLevel(ev.riskLevel),
    confidence: Math.max(0, Math.min(1, ev.confidence || 0.5)),
    location: {
      lat: ev.location?.lat ?? 0,
      lng: ev.location?.lng ?? 0,
      country: ev.location?.country || undefined,
      city: ev.location?.city || undefined,
    },
    impact: {
      operational: Math.max(0, Math.min(100, ev.impact?.operational ?? 50)),
      humanitarian: Math.max(0, Math.min(100, ev.impact?.humanitarian ?? 50)),
      economic: Math.max(0, Math.min(100, ev.impact?.economic ?? 50)),
      environmental: Math.max(0, Math.min(100, ev.impact?.environmental ?? 50)),
      security: Math.max(0, Math.min(100, ev.impact?.security ?? 50)),
    },
    tags: ev.tags || [],
    relatedEvents: ev.relatedEvents || [],
    metadata: ev.metadata || {},
  }));
}

// ─── STAGE 2: VALIDATION ───────────────────────────────────

function validate(events: GlobalEvent[]): GlobalEvent[] {
  return events.filter(ev => {
    if (!ev.id) return false;
    if (!ev.title || ev.title.length < 3) return false;
    if (ev.confidence < 0 || ev.confidence > 1) return false;
    if (ev.location && (ev.location.lat < -90 || ev.location.lat > 90)) return false;
    if (ev.location && (ev.location.lng < -180 || ev.location.lng > 180)) return false;
    return true;
  });
}

// ─── STAGE 3: DEDUPLICATION ────────────────────────────────

function deduplicate(events: GlobalEvent[]): { events: GlobalEvent[]; stats: { duplicates: number; unique: number } } {
  const result = processBatch(events);
  return { events: result.processed, stats: { duplicates: result.duplicates, unique: result.unique } };
}

// ─── STAGE 4: CORRELATION ──────────────────────────────────

function correlate(events: GlobalEvent[], existingEvents: GlobalEvent[]): GlobalEvent[] {
  const allEvents = [...existingEvents, ...events];
  return events.map(ev => {
    const related: string[] = [];
    for (const other of allEvents) {
      if (other.id === ev.id) continue;
      if (isRelated(ev, other)) {
        related.push(other.id);
      }
    }
    return { ...ev, relatedEvents: [...new Set([...ev.relatedEvents, ...related])].slice(0, 20) };
  });
}

function isRelated(a: GlobalEvent, b: GlobalEvent): boolean {
  // Same country within 6h
  if (a.location?.country && a.location.country === b.location?.country) {
    const timeDiff = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (timeDiff < 21_600_000) return true;
  }
  // Same category within 200km and 12h
  if (a.module === b.module) {
    const dist = haversineKm(a.location?.lat ?? 0, a.location?.lng ?? 0, b.location?.lat ?? 0, b.location?.lng ?? 0);
    const timeDiff = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (dist < 200 && timeDiff < 43_200_000) return true;
  }
  // Cascading categories
  if (isCascading(a.module, b.module)) {
    const timeDiff = Math.abs(new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (timeDiff < 86_400_000) return true;
  }
  return false;
}

const CASCADE_PAIRS: [RiskCategory, RiskCategory][] = [
  ["terremoto", "enchente"], ["terremoto", "tsunami"], ["terremoto", "infraestrutura"],
  ["furacao", "enchente"], ["furacao", "maritimo"], ["furacao", "aereo"],
  ["incendio", "saude"], ["incendio", "infraestrutura"],
  ["conflito", "refugiados"], ["conflito", "energia"],
  ["cibernetico", "energia"], ["cibernetico", "infraestrutura"],
];

function isCascading(a: RiskCategory, b: RiskCategory): boolean {
  return CASCADE_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── STAGE 5: IMPACT SCORING ───────────────────────────────

function scoreImpact(events: GlobalEvent[]): GlobalEvent[] {
  return events.map(ev => {
    const impact = calculateEventImpact(ev);
    const maxScore = Math.max(impact.operational, impact.humanitarian, impact.economic, impact.environmental, impact.security);
    const riskLevel = scoreToRisk(maxScore);
    return { ...ev, impact, riskLevel };
  });
}

function calculateEventImpact(ev: GlobalEvent): GlobalEvent["impact"] {
  const base = ev.impact || { operational: 50, humanitarian: 50, economic: 50, environmental: 50, security: 50 };
  const confidenceMultiplier = 0.7 + ev.confidence * 0.3;
  return {
    operational: Math.round(base.operational * confidenceMultiplier),
    humanitarian: Math.round(base.humanitarian * confidenceMultiplier),
    economic: Math.round(base.economic * confidenceMultiplier),
    environmental: Math.round(base.environmental * confidenceMultiplier),
    security: Math.round(base.security * confidenceMultiplier),
  };
}

function scoreToRisk(score: number): RiskLevel {
  if (score >= 90) return "emergencia";
  if (score >= 80) return "extremo";
  if (score >= 70) return "critico";
  if (score >= 55) return "alto";
  if (score >= 35) return "moderado";
  if (score >= 15) return "baixo";
  return "informativo";
}

// ─── STAGE 6: AI ANALYSIS ──────────────────────────────────

function analyzeWithAI(events: GlobalEvent[]): GlobalEvent[] {
  return events.map(ev => {
    const summary = generateSummary(ev);
    const classification = classifyEvent(ev);
    return {
      ...ev,
      metadata: {
        ...(ev.metadata as Record<string, unknown> || {}),
        aiSummary: summary,
        aiClassification: classification,
        analyzedAt: new Date().toISOString(),
      },
    };
  });
}

function generateSummary(ev: GlobalEvent): string {
  const parts: string[] = [];
  if (ev.location?.country) parts.push(`Ocorrido em ${ev.location.country}`);
  if (ev.location?.city) parts.push(`(${ev.location.city})`);
  const riskDesc = ev.riskLevel === "emergencia" ? "Emergência" : ev.riskLevel === "critico" ? "Crítico" : ev.riskLevel === "alto" ? "Alto risco" : "Monitoramento";
  parts.push(`Classificação: ${riskDesc}.`);
  if (ev.confidence > 0.8) parts.push("Alta confiabilidade nas fontes.");
  if (ev.relatedEvents?.length) parts.push(`${ev.relatedEvents.length} evento(s) correlacionado(s).`);
  return parts.join(" ");
}

function classifyEvent(ev: GlobalEvent): string {
  const scores = ev.impact;
  if (!scores) return "Não classificado";
  const max = Math.max(scores.operational, scores.humanitarian, scores.economic, scores.environmental, scores.security);
  if (max === scores.humanitarian) return "Impacto Humanitário";
  if (max === scores.economic) return "Impacto Econômico";
  if (max === scores.operational) return "Impacto Operacional";
  if (max === scores.environmental) return "Impacto Ambiental";
  if (max === scores.security) return "Risco de Segurança";
  return "Geral";
}

// ─── STAGE 7: ALERT GENERATION ─────────────────────────────

function generateAlerts(events: GlobalEvent[]): GlobalAlert[] {
  return events
    .filter(ev => ["critico", "emergencia", "extremo", "alto"].includes(ev.riskLevel))
    .map(ev => ({
      id: `alert-${ev.id}`,
      eventId: ev.id,
      origin: ev.module as RiskCategory,
      source: ev.source,
      riskLevel: ev.riskLevel as RiskLevel,
      title: ev.title,
      description: ev.description,
      location: ev.location,
      timestamp: ev.timestamp,
      confidence: ev.confidence,
      impact: ev.impact,
      relatedEvents: ev.relatedEvents || [],
      status: "novo" as const,
      acknowledged: false,
    }));
}

// ─── MAIN PIPELINE ─────────────────────────────────────────

export function runPipeline(
  rawEvents: GlobalEvent[],
  existingEvents: GlobalEvent[],
  monitorSource: string,
  category: RiskCategory
): PipelineResult {
  const startTime = Date.now();

  initMonitorMetrics(monitorSource, category);

  // Stage 1: Normalize
  const normalized = normalize(rawEvents);

  // Stage 2: Validate
  const validated = validate(normalized);

  // Stage 3: Deduplicate
  const { events: deduped, stats: dedupStats } = deduplicate(validated);

  // Stage 4: Correlate
  const correlated = correlate(deduped, existingEvents);

  // Stage 5: Impact Scoring
  const scored = scoreImpact(correlated);

  // Stage 6: AI Analysis
  const analyzed = analyzeWithAI(scored);

  // Stage 7: Alert Generation
  const alerts = generateAlerts(analyzed);

  // Stats
  const highImpact = analyzed.filter(e => ["critico", "emergencia", "extremo"].includes(e.riskLevel)).length;
  const duration = Date.now() - startTime;

  recordCollection(monitorSource, true, analyzed.length, duration, undefined, dedupStats.duplicates, dedupStats.duplicates);
  log("info", monitorSource, `Pipeline complete: ${analyzed.length} events, ${alerts.length} alerts, ${dedupStats.duplicates} duplicates removed`, { duration, ...dedupStats });

  return {
    events: analyzed,
    alerts,
    stats: {
      collected: rawEvents.length,
      normalized: normalized.length,
      validated: validated.length,
      duplicates: dedupStats.duplicates,
      correlated: correlated.length,
      highImpact,
      alertsGenerated: alerts.length,
    },
  };
}

export function runPipelineBatch(
  monitorResults: { events: GlobalEvent[]; source: string; category: RiskCategory }[],
  existingEvents: GlobalEvent[]
): PipelineResult {
  let totalEvents: GlobalEvent[] = [];
  let totalAlerts: GlobalAlert[] = [];
  const stats = { collected: 0, normalized: 0, validated: 0, duplicates: 0, correlated: 0, highImpact: 0, alertsGenerated: 0 };

  for (const { events, source, category } of monitorResults) {
    const result = runPipeline(events, [...existingEvents, ...totalEvents], source, category);
    totalEvents = [...totalEvents, ...result.events];
    totalAlerts = [...totalAlerts, ...result.alerts];
    stats.collected += result.stats.collected;
    stats.normalized += result.stats.normalized;
    stats.validated += result.stats.validated;
    stats.duplicates += result.stats.duplicates;
    stats.correlated += result.stats.correlated;
    stats.highImpact += result.stats.highImpact;
    stats.alertsGenerated += result.stats.alertsGenerated;
  }

  return { events: totalEvents, alerts: totalAlerts, stats };
}
