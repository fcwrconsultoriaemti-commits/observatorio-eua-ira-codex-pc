// ============================================================
// PREDICTION ENGINE — Multi-Model Forecasting System
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory } from "../types";

export interface Prediction {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  probability: number;        // 0-1
  confidence: number;         // 0-1
  timeframe: string;
  riskLevel: RiskLevel;
  factors: string[];
  limitations: string[];
  basedOnEvents: string[];
  modelType: "statistical" | "pattern" | "trend" | "heuristic";
  generatedAt: string;
}

export interface PredictionModel {
  name: string;
  category: RiskCategory;
  version: string;
  accuracy: number;
  lastTrained: string;
}

// ─── MODELS ────────────────────────────────────────────────

const MODELS: PredictionModel[] = [
  { name: "Modelo de Padrão Sísmico", category: "terremoto", version: "1.0", accuracy: 0.35, lastTrained: "2026-01-01" },
  { name: "Modelo de Propagação de Incêndios", category: "incendio", version: "1.0", accuracy: 0.65, lastTrained: "2026-01-01" },
  { name: "Modelo de Trajetória de Furacões", category: "furacao", version: "1.0", accuracy: 0.70, lastTrained: "2026-01-01" },
  { name: "Modelo de Risco de Enchentes", category: "enchente", version: "1.0", accuracy: 0.60, lastTrained: "2026-01-01" },
  { name: "Modelo de Escalada de Crises", category: "conflito", version: "1.0", accuracy: 0.45, lastTrained: "2026-01-01" },
  { name: "Modelo de Ameaças Cibernéticas", category: "cibernetico", version: "1.0", accuracy: 0.40, lastTrained: "2026-01-01" },
  { name: "Modelo de Interrupção Logística", category: "maritimo", version: "1.0", accuracy: 0.55, lastTrained: "2026-01-01" },
  { name: "Modelo de Volatilidade Econômica", category: "economico", version: "1.0", accuracy: 0.50, lastTrained: "2026-01-01" },
];

// ─── PREDICTION GENERATORS ─────────────────────────────────

function predictEarthquake(events: GlobalEvent[]): Prediction[] {
  const seismicEvents = events.filter(e => e.module === "terremoto");
  const predictions: Prediction[] = [];

  if (seismicEvents.length >= 2) {
    const avgMagnitude = seismicEvents.reduce((s, e) => {
      const mag = (e.metadata as Record<string, unknown>).magnitude;
      return s + (typeof mag === "number" ? mag : 0);
    }, 0) / seismicEvents.length;

    const recentCount = seismicEvents.filter(e =>
      new Date(e.timestamp).getTime() > Date.now() - 86400000
    ).length;

    if (recentCount >= 3 || avgMagnitude >= 5.0) {
      predictions.push({
        id: `pred-eq-${Date.now()}`,
        category: "terremoto",
        title: "Possível atividade sísmica continuada",
        description: `Baseado em ${recentCount} evento(s) recente(s) com magnitude média de ${avgMagnitude.toFixed(1)}, modelos estatísticos indicam probabilidade de réplicas ou eventos subsequentes.`,
        probability: Math.min(0.3 + recentCount * 0.1, 0.8),
        confidence: 0.35,
        timeframe: "24-72h",
        riskLevel: avgMagnitude >= 6.0 ? "critico" : avgMagnitude >= 5.0 ? "alto" : "moderado",
        factors: [`${recentCount} eventos recentes`, `Magnitude média ${avgMagnitude.toFixed(1)}`, "Padrão de atividade sísmica"],
        limitations: ["Terremotos não podem ser previstos com precisão", "Modelo baseado em padrões históricos", "Alta incerteza inerente"],
        basedOnEvents: seismicEvents.map(e => e.id),
        modelType: "statistical",
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return predictions;
}

function predictWildfire(events: GlobalEvent[]): Prediction[] {
  const fireEvents = events.filter(e => e.module === "incendio");
  const predictions: Prediction[] = [];

  if (fireEvents.length >= 1) {
    const activeFires = fireEvents.filter(e => e.riskLevel === "alto" || e.riskLevel === "critico");

    if (activeFires.length > 0) {
      predictions.push({
        id: `pred-fire-${Date.now()}`,
        category: "incendio",
        title: "Risco de propagação de incêndios",
        description: `${activeFires.length} incêndio(s) ativo(s) de alto risco detectado(s). Condições ambientais podem favorecer propagação.`,
        probability: 0.6,
        confidence: 0.65,
        timeframe: "12-48h",
        riskLevel: "alto",
        factors: ["Condições de seca", "Velocidade do vento", "Densidade de vegetação", "Proximidade de áreas urbanas"],
        limitations: ["Propagação depende de condições meteorológicas em tempo real", "Modelo simplificado"],
        basedOnEvents: activeFires.map(e => e.id),
        modelType: "pattern",
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return predictions;
}

function predictHurricane(events: GlobalEvent[]): Prediction[] {
  const hurricaneEvents = events.filter(e => e.module === "furacao");
  const predictions: Prediction[] = [];

  for (const event of hurricaneEvents) {
    const meta = event.metadata as Record<string, unknown>;
    const category = typeof meta.category === "number" ? meta.category : 0;

    if (category >= 2) {
      predictions.push({
        id: `pred-hur-${event.id}`,
        category: "furacao",
        title: `Trajetória projetada: ${event.title}`,
        description: `Furacão de categoria ${category} em monitoramento. Modelo projeta possível impacto em áreas costeiras nas próximas 24-72h.`,
        probability: 0.7,
        confidence: 0.70,
        timeframe: "24-72h",
        riskLevel: category >= 4 ? "emergencia" : category >= 3 ? "critico" : "alto",
        factors: ["Categoria do furacão", "Condições oceânicas", "Padrão de movimento", "Pressão atmosférica"],
        limitations: ["Trajetória pode mudar significativamente", "Modelo baseado em dados em tempo real"],
        basedOnEvents: [event.id],
        modelType: "trend",
        generatedAt: new Date().toISOString(),
      });
    }
  }

  return predictions;
}

function predictFlood(events: GlobalEvent[]): Prediction[] {
  const floodEvents = events.filter(e => e.module === "enchente");
  const predictions: Prediction[] = [];

  if (floodEvents.length >= 1) {
    predictions.push({
      id: `pred-flood-${Date.now()}`,
      category: "enchente",
      title: "Risco de enchentes em áreas monitoradas",
      description: `${floodEvents.length} evento(s) de inundação detectado(s). Áreas baixas e靠近 rios podem ser afetadas nas próximas horas.`,
      probability: 0.55,
      confidence: 0.60,
      timeframe: "6-24h",
      riskLevel: floodEvents.some(e => e.riskLevel === "critico") ? "critico" : "alto",
      factors: ["Níveis de água", "Precipitação acumulada", "Capacidade de drenagem", "Topografia"],
        limitations: ["Enchentes dependem de fatores meteorológicos locais", "Modelo simplificado"],
        basedOnEvents: floodEvents.map(e => e.id),
        modelType: "heuristic",
        generatedAt: new Date().toISOString(),
      });
  }

  return predictions;
}

function predictCrisis(events: GlobalEvent[]): Prediction[] {
  const conflictEvents = events.filter(e => e.module === "conflito");
  const predictions: Prediction[] = [];

  if (conflictEvents.length >= 2) {
    const escalationRisk = conflictEvents.filter(e => e.riskLevel === "critico" || e.riskLevel === "emergencia").length;

    predictions.push({
      id: `pred-crisis-${Date.now()}`,
      category: "conflito",
      title: "Risco de escalada em zonas de conflito",
      description: `${conflictEvents.length} evento(s) de conflito monitorado(s). ${escalationRisk} evento(s) de alto risco indicam possível escalada.`,
      probability: Math.min(0.3 + escalationRisk * 0.15, 0.85),
      confidence: 0.45,
      timeframe: "24-168h",
      riskLevel: escalationRisk >= 3 ? "emergencia" : escalationRisk >= 2 ? "critico" : "alto",
      factors: ["Número de eventos de conflito", "Nível de risco acumulado", "Proximidade geográfica", "Histórico de tensões"],
      limitations: ["Conflitos são influenciados por fatores políticos imprevisíveis", "Modelo baseado em padrões observados"],
      basedOnEvents: conflictEvents.map(e => e.id),
      modelType: "pattern",
      generatedAt: new Date().toISOString(),
    });
  }

  return predictions;
}

function predictCyber(events: GlobalEvent[]): Prediction[] {
  const cyberEvents = events.filter(e => e.module === "cibernetico");
  const predictions: Prediction[] = [];

  if (cyberEvents.length >= 1) {
    predictions.push({
      id: `pred-cyber-${Date.now()}`,
      category: "cibernetico",
      title: "Risco de ataques cibernéticos em crescimento",
      description: `${cyberEvents.length} evento(s) cibernético(s) detectado(s). Tendência de crescimento de ameaças.`,
      probability: 0.5,
      confidence: 0.40,
      timeframe: "24-72h",
      riskLevel: cyberEvents.some(e => e.riskLevel === "critico") ? "critico" : "alto",
      factors: ["Volume de ameaças", "Novos vetores de ataque", "Setores-alvo"],
      limitations: ["Ataques cibernéticos são difíceis de prever", "Dados podem estar incompletos"],
      basedOnEvents: cyberEvents.map(e => e.id),
      modelType: "trend",
      generatedAt: new Date().toISOString(),
    });
  }

  return predictions;
}

function predictLogistics(events: GlobalEvent[]): Prediction[] {
  const maritimeEvents = events.filter(e => e.module === "maritimo" || e.module === "aereo");
  const predictions: Prediction[] = [];

  if (maritimeEvents.length >= 2) {
    predictions.push({
      id: `pred-log-${Date.now()}`,
      category: "maritimo",
      title: "Risco de interrupção logística",
      description: `${maritimeEvents.length} evento(s) de transporte afetado(s). Possível impacto em cadeias de suprimento.`,
      probability: 0.45,
      confidence: 0.55,
      timeframe: "12-48h",
      riskLevel: "alto",
      factors: ["Eventos marítimos", "Eventos aéreos", "Rotas comerciais afetadas"],
      limitations: ["Logística depende de múltiplas variáveis", "Modelo simplificado"],
      basedOnEvents: maritimeEvents.map(e => e.id),
      modelType: "heuristic",
      generatedAt: new Date().toISOString(),
    });
  }

  return predictions;
}

function predictEconomic(events: GlobalEvent[]): Prediction[] {
  const economicEvents = events.filter(e => e.module === "economico");
  const predictions: Prediction[] = [];

  if (economicEvents.length >= 1) {
    predictions.push({
      id: `pred-econ-${Date.now()}`,
      category: "economico",
      title: "Volatilidade econômica projetada",
      description: `${economicEvents.length} evento(s) econômico(s) detectado(s). Tendência de volatilidade em mercados.`,
      probability: 0.5,
      confidence: 0.50,
      timeframe: "24-168h",
      riskLevel: economicEvents.some(e => e.riskLevel === "critico") ? "critico" : "moderado",
      factors: ["Indicadores de mercado", "Eventos geopolíticos", "Tendências macroeconômicas"],
      limitations: ["Mercados são influenciados por fatores imprevisíveis", "Modelo baseado em tendências"],
      basedOnEvents: economicEvents.map(e => e.id),
      modelType: "trend",
      generatedAt: new Date().toISOString(),
    });
  }

  return predictions;
}

// ─── MAIN PREDICTION FUNCTION ──────────────────────────────

export function generatePredictions(events: GlobalEvent[]): Prediction[] {
  const allPredictions: Prediction[] = [];

  allPredictions.push(...predictEarthquake(events));
  allPredictions.push(...predictWildfire(events));
  allPredictions.push(...predictHurricane(events));
  allPredictions.push(...predictFlood(events));
  allPredictions.push(...predictCrisis(events));
  allPredictions.push(...predictCyber(events));
  allPredictions.push(...predictLogistics(events));
  allPredictions.push(...predictEconomic(events));

  return allPredictions.sort((a, b) => b.probability * b.confidence - a.probability * a.confidence);
}

export function getModels(): PredictionModel[] {
  return MODELS;
}

export function getPredictionById(id: string, events: GlobalEvent[]): Prediction | undefined {
  const predictions = generatePredictions(events);
  return predictions.find(p => p.id === id);
}

export function getPredictionsByCategory(category: RiskCategory, events: GlobalEvent[]): Prediction[] {
  return generatePredictions(events).filter(p => p.category === category);
}
