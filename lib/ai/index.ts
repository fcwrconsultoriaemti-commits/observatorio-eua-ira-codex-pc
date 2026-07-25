// ============================================================
// PREDICTIVE AI — Risk Assessment & Pattern Detection
// ============================================================

import type { GlobalEvent, RiskLevel, ImpactScores } from "../types";

interface Prediction {
  eventId: string;
  category: string;
  currentRisk: RiskLevel;
  predictedRisk: RiskLevel;
  probability: number;
  trend: "crescente" | "estavel" | "decrescente";
  timeframe: string;
  factors: string[];
  recommendations: string[];
}

interface Trend {
  category: string;
  direction: "crescente" | "estavel" | "decrescente";
  changePercent: number;
  period: string;
}

interface Anomaly {
  id: string;
  description: string;
  severity: RiskLevel;
  detectedAt: string;
  eventId?: string;
}

// ─── PREDICTION ENGINE ─────────────────────────────────────

export function predictRisk(event: GlobalEvent, historicalEvents: GlobalEvent[]): Prediction {
  const sameCategory = historicalEvents.filter(e => e.module === event.module);
  const recentEvents = sameCategory.filter(e =>
    new Date(e.timestamp).getTime() > Date.now() - 86400000 * 7
  );

  const trend = calculateTrend(recentEvents);
  const probability = calculateProbability(event, recentEvents);
  const factors = identifyFactors(event, recentEvents);
  const recommendations = generateRecommendations(event, trend, probability);

  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  const currentIdx = riskOrder.indexOf(event.riskLevel);
  let predictedIdx = currentIdx;

  if (trend === "crescente" && probability > 0.6) {
    predictedIdx = Math.min(currentIdx + 1, riskOrder.length - 1);
  } else if (trend === "decrescente" && probability > 0.7) {
    predictedIdx = Math.max(currentIdx - 1, 0);
  }

  return {
    eventId: event.id,
    category: event.module,
    currentRisk: event.riskLevel,
    predictedRisk: riskOrder[predictedIdx],
    probability,
    trend,
    timeframe: "24h",
    factors,
    recommendations,
  };
}

export function detectTrends(events: GlobalEvent[]): Trend[] {
  const categories = [...new Set(events.map(e => e.module))];
  const trends: Trend[] = [];

  for (const cat of categories) {
    const catEvents = events.filter(e => e.module === cat);
    const recent = catEvents.filter(e => new Date(e.timestamp).getTime() > Date.now() - 86400000);
    const older = catEvents.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t > Date.now() - 172800000 && t <= Date.now() - 86400000;
    });

    const changePercent = older.length > 0
      ? ((recent.length - older.length) / older.length) * 100
      : recent.length > 0 ? 100 : 0;

    let direction: Trend["direction"] = "estavel";
    if (changePercent > 20) direction = "crescente";
    else if (changePercent < -20) direction = "decrescente";

    trends.push({
      category: cat,
      direction,
      changePercent: Math.round(changePercent),
      period: "24h vs 24h anterior",
    });
  }

  return trends.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
}

export function detectAnomalies(events: GlobalEvent[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const categories = [...new Set(events.map(e => e.module))];

  for (const cat of categories) {
    const catEvents = events.filter(e => e.module === cat);
    if (catEvents.length < 3) continue;

    const magnitudes = catEvents.map(e => {
      const meta = e.metadata as Record<string, unknown>;
      return typeof meta.magnitude === "number" ? meta.magnitude : 0;
    });

    const avg = magnitudes.reduce((s, m) => s + m, 0) / magnitudes.length;
    const stdDev = Math.sqrt(magnitudes.reduce((s, m) => s + (m - avg) ** 2, 0) / magnitudes.length);

    for (const event of catEvents) {
      const meta = event.metadata as Record<string, unknown>;
      const mag = typeof meta.magnitude === "number" ? meta.magnitude : 0;
      if (stdDev > 0 && Math.abs(mag - avg) > 2 * stdDev) {
        anomalies.push({
          id: `anomaly-${event.id}`,
          description: `Evento com magnitude ${mag} significativamente acima da média (${avg.toFixed(1)}) para ${cat}`,
          severity: event.riskLevel,
          detectedAt: new Date().toISOString(),
          eventId: event.id,
        });
      }
    }
  }

  return anomalies;
}

export function calculateImpactScore(events: GlobalEvent[]): ImpactScores {
  if (events.length === 0) {
    return { operational: 0, humanitarian: 0, economic: 0, environmental: 0, security: 0 };
  }

  const totals = events.reduce(
    (acc, e) => ({
      operational: acc.operational + e.impact.operational,
      humanitarian: acc.humanitarian + e.impact.humanitarian,
      economic: acc.economic + e.impact.economic,
      environmental: acc.environmental + e.impact.environmental,
      security: acc.security + e.impact.security,
    }),
    { operational: 0, humanitarian: 0, economic: 0, environmental: 0, security: 0 }
  );

  const n = events.length;
  return {
    operational: Math.min(Math.round(totals.operational / n), 100),
    humanitarian: Math.min(Math.round(totals.humanitarian / n), 100),
    economic: Math.min(Math.round(totals.economic / n), 100),
    environmental: Math.min(Math.round(totals.environmental / n), 100),
    security: Math.min(Math.round(totals.security / n), 100),
  };
}

// ─── HELPERS ───────────────────────────────────────────────

function calculateTrend(events: GlobalEvent[]): Trend["direction"] {
  if (events.length < 2) return "estavel";
  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  const scores = events.map(e => riskOrder.indexOf(e.riskLevel));
  const recentAvg = scores.slice(0, Math.ceil(scores.length / 2)).reduce((s, v) => s + v, 0) / Math.ceil(scores.length / 2);
  const olderAvg = scores.slice(Math.ceil(scores.length / 2)).reduce((s, v) => s + v, 0) / Math.max(scores.length - Math.ceil(scores.length / 2), 1);

  if (recentAvg > olderAvg + 0.5) return "crescente";
  if (recentAvg < olderAvg - 0.5) return "decrescente";
  return "estavel";
}

function calculateProbability(event: GlobalEvent, historical: GlobalEvent[]): number {
  if (historical.length === 0) return 0.5;
  const highRiskCount = historical.filter(e => ["critico", "emergencia", "extremo"].includes(e.riskLevel)).length;
  return Math.min(0.3 + (highRiskCount / historical.length) * 0.7, 0.95);
}

function identifyFactors(event: GlobalEvent, historical: GlobalEvent[]): string[] {
  const factors: string[] = [];
  if (historical.length > 5) factors.push("Alta frequência de eventos na categoria");
  if (event.impact.operational > 70) factors.push("Alto impacto operacional");
  if (event.impact.humanitarian > 70) factors.push("Alto impacto humanitário");
  if (event.impact.economic > 70) factors.push("Alto impacto econômico");
  if (event.confidence < 0.5) factors.push("Baixa confiabilidade da informação");
  if (factors.length === 0) factors.push("Sem fatores de risco identificados");
  return factors;
}

function generateRecommendations(event: GlobalEvent, trend: Trend["direction"], probability: number): string[] {
  const recs: string[] = [];
  if (trend === "crescente") recs.push("Monitorar evolução com maior frequência");
  if (probability > 0.7) recs.push("Ativar protocolo de alerta máximo");
  if (event.impact.humanitarian > 50) recs.push("Acionar equipes de resposta humanitária");
  if (event.impact.operational > 50) recs.push("Avaliar impacto em operações críticas");
  if (event.impact.economic > 50) recs.push("Monitorar mercados e cadeias de suprimento");
  if (recs.length === 0) recs.push("Manter monitoramento de rotina");
  return recs;
}
