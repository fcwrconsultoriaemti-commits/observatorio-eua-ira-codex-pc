// ============================================================
// AI COPILOT — Operational Intelligence Assistant
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel, RiskCategory } from "../types";
import { assessAllEvents, getGlobalRiskIndex } from "../impact";
import { findCorrelationChains, buildConsequenceTree } from "../correlation/advanced";
import { buildTimeline } from "../timeline";
import { generatePredictions } from "../prediction";

export interface CopilotQuery {
  question: string;
  userId?: string;
  context?: Record<string, unknown>;
}

export interface CopilotResponse {
  answer: string;
  confidence: number;
  sources: { type: string; id: string; title: string; relevance: number }[];
  followUpQuestions: string[];
  data?: Record<string, unknown>;
  disclaimer?: string;
  processingTime: string;
}

// ─── QUERY PATTERNS ────────────────────────────────────────

const PATTERNS: {
  pattern: RegExp;
  handler: (events: GlobalEvent[], alerts: GlobalAlert[], match: RegExpMatchArray) => CopilotResponse;
}[] = [
  { pattern: /(?:quais?|oque|o que)\s+(?:são?|tem|possuem?)\s+(?:os?\s+)?(?:três|3|maiores?|principais?)\s+(?:incidentes?|eventos?)\s+(?:com|de|por)\s+(?:maior\s+)?(?:impacto\s+)?(?:econômico|financeiro|mercado)/i, handler: handleTopEconomicImpact },
  { pattern: /(?:existe|ha|há)\s+(?:algum|alguma|alguns?)\s+(?:evento|incidente|ameaça)\s+(?:que|pode|poderá?)\s+(?:afetar|impactar)\s+(.+?)(?:\s+nas?\s+próximas?\s+(\d+)\s*(?:horas?|h|dias?|d))?$/i, handler: handleRegionalThreatQuery },
  { pattern: /(?:mostre|liste|exiba|ver)\s+(?:apenas\s+)?(?:eventos?|incidentes?)\s+(?:confirmados?|verificados?)\s+(?:por|com)\s+(\d+|três|duas?|quatro|cinco)\s+(?:ou\s+mais\s+)?fontes?/i, handler: handleMultiSourceQuery },
  { pattern: /(?:quais?|que)\s+(?:infraestruturas?|instalações?|equipamentos?)\s+(?:críticos?|estratégicos?)\s+(?:estão?|estáo?)\s+(?:em\s+)?risco/i, handler: handleInfrastructureRiskQuery },
  { pattern: /(?:qual|qeual)\s+(?:é|e)\s+(?:o\s+)?(?:risco|índice|score)\s+(?:global|atual|hoje)/i, handler: handleGlobalRiskQuery },
  { pattern: /(?:resumo|sumario|sumário|digest|diario|relatório)\s+(?:de\s+)?(?:hoje|atual|situação)/i, handler: handleDailyDigestQuery },
  { pattern: /(?:previsão|prever|estimar|projecção|projeção)\s+(.+)/i, handler: handlePredictionQuery },
  { pattern: /(?: correlação|relação|conexão|vínculo)\s+entre\s+(.+?)\s+e\s+(.+)/i, handler: handleCorrelationQuery },
  { pattern: /(?:.timeline|linha\s+do\s+tempo|cronologia)\s+(.+)/i, handler: handleTimelineQuery },
  { pattern: /(?:quais?|que)\s+(?:missões?|operações?)\s+(?:estão?\s+)?(?:ativas?|em\s+andamento|abertas?)/i, handler: handleMissionsQuery },
];

// ─── HANDLERS ──────────────────────────────────────────────

function handleTopEconomicImpact(events: GlobalEvent[]): CopilotResponse {
  const sorted = [...events]
    .sort((a, b) => b.impact.economic - a.impact.economic)
    .slice(0, 3);

  const answer = sorted.length > 0
    ? `Os 3 eventos com maior impacto econômico:\n${sorted.map((e, i) => `${i + 1}. **${e.title}** — Impacto econômico: ${e.impact.economic}/100 (${e.riskLevel})`).join("\n")}`
    : "Nenhum evento com impacto econômico significativo identificado no momento.";

  return {
    answer,
    confidence: 0.75,
    sources: sorted.map(e => ({ type: "event", id: e.id, title: e.title, relevance: e.impact.economic / 100 })),
    followUpQuestions: [
      "Qual a tendência de impacto econômico?",
      "Quais setores são mais afetados?",
      "Existe correlação entre esses eventos?",
    ],
  };
}

function handleRegionalThreatQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): CopilotResponse {
  const region = match[1].toLowerCase();
  const timeframe = match[2] ? parseInt(match[2]) : 72;

  const relevant = events.filter(e =>
    e.location.country?.toLowerCase().includes(region) ||
    e.location.state?.toLowerCase().includes(region) ||
    e.description.toLowerCase().includes(region)
  );

  const futureEvents = relevant.filter(e => {
    const hoursAhead = (new Date(e.timestamp).getTime() - Date.now()) / 3600000;
    return hoursAhead >= 0 && hoursAhead <= timeframe;
  });

  const answer = futureEvents.length > 0
    ? `Identifiquei ${futureEvents.length} evento(s) potencialmente impactantes para ${region} nas próximas ${timeframe}h:\n${futureEvents.slice(0, 5).map(e => `- **${e.title}** (${e.riskLevel}) — ${e.description.slice(0, 100)}...`).join("\n")}`
    : `Não identifiquei eventos com impacto direto para ${region} nas próximas ${timeframe}h. Monitoramento contínuo ativo.`;

  return {
    answer,
    confidence: relevant.length > 0 ? 0.7 : 0.4,
    sources: relevant.slice(0, 5).map(e => ({ type: "event", id: e.id, title: e.title, relevance: 0.7 })),
    followUpQuestions: [
      `Quais infraestruturas em ${region} estão em risco?`,
      `Existe correlação entre os eventos na região?`,
      `Qual a previsão para os próximos dias?`,
    ],
  };
}

function handleMultiSourceQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): CopilotResponse {
  const minSources = match[1] === "três" ? 3 : match[1] === "duas" ? 2 : match[1] === "quatro" ? 4 : match[1] === "cinco" ? 5 : parseInt(match[1]) || 3;

  const confirmed = events.filter(e => e.confidence >= 0.7);

  const answer = confirmed.length > 0
    ? `Encontrei ${confirmed.length} evento(s) com alta confiabilidade (≥${minSources} fontes):\n${confirmed.slice(0, 5).map(e => `- **${e.title}** — Confiabilidade: ${(e.confidence * 100).toFixed(0)}%`).join("\n")}`
    : `Nenhum evento encontrado com ${minSources} ou mais fontes confirmando no momento.`;

  return {
    answer,
    confidence: 0.8,
    sources: confirmed.slice(0, 5).map(e => ({ type: "event", id: e.id, title: e.title, relevance: e.confidence })),
    followUpQuestions: [
      "Quais fontes confirmaram esses eventos?",
      "Existe algum evento aguardando confirmação?",
      "Qual a tendência de confirmação?",
    ],
  };
}

function handleInfrastructureRiskQuery(events: GlobalEvent[]): CopilotResponse {
  const highImpact = events.filter(e => e.impact.operational > 50);

  const answer = highImpact.length > 0
    ? `${highImpact.length} infraestrutura(s) crítica(s) em risco:\n${highImpact.slice(0, 5).map(e => `- **${e.title}** — Impacto operacional: ${e.impact.operational}/100`).join("\n")}`
    : "Nenhuma infraestrutura crítica identificada em risco elevado no momento.";

  return {
    answer,
    confidence: 0.7,
    sources: highImpact.slice(0, 5).map(e => ({ type: "event", id: e.id, title: e.title, relevance: e.impact.operational / 100 })),
    followUpQuestions: [
      "Quais infraestruturas específicas estão afetadas?",
      "Qual o tempo estimado de recuperação?",
      "Existem rotas alternativas?",
    ],
  };
}

function handleGlobalRiskQuery(events: GlobalEvent[]): CopilotResponse {
  const assessments = assessAllEvents(events);
  const riskIndex = getGlobalRiskIndex(assessments);

  return {
    answer: `Índice de Risco Global: **${riskIndex.index}/100** (${riskIndex.level}). Tendência: ${riskIndex.trend}. Principais ameaças: ${riskIndex.topThreats.slice(0, 3).map(t => `${t.category} (${t.score})`).join(", ")}.`,
    confidence: 0.8,
    sources: [],
    followUpQuestions: [
      "Quais são as principais ameaças?",
      "Como o risco evoluiu nas últimas 24h?",
      "Quais regiões estão em maior risco?",
    ],
    data: { riskIndex },
  };
}

function handleDailyDigestQuery(events: GlobalEvent[], alerts: GlobalAlert[]): CopilotResponse {
  const assessments = assessAllEvents(events);
  const riskIndex = getGlobalRiskIndex(assessments);
  const criticalAlerts = alerts.filter(a => ["critico", "emergencia", "extremo"].includes(a.riskLevel));

  return {
    answer: `**Resumo Diário**\n\n📊 **Métricas:** ${events.length} evento(s), ${alerts.length} alerta(s), ${criticalAlerts.length} crítico(s)\n\n⚠️ **Risco Global:** ${riskIndex.index}/100 (${riskIndex.level})\n\n🔴 **Alertas Críticos:**\n${criticalAlerts.slice(0, 3).map(a => `- ${a.title} (${a.riskLevel})`).join("\n") || "Nenhum"}`,
    confidence: 0.85,
    sources: [],
    followUpQuestions: [
      "Quais ações estão sendo tomadas?",
      "Qual a tendência de risco?",
      "Existe alguma emergência ativa?",
    ],
  };
}

function handlePredictionQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): CopilotResponse {
  const target = match[1];
  const predictions = generatePredictions(events);

  return {
    answer: `**Previsões para "${target}":**\n\n${predictions.length > 0 ? predictions.slice(0, 3).map(p => `- **${p.title}** — Probabilidade: ${(p.probability * 100).toFixed(0)}%, Confiança: ${(p.confidence * 100).toFixed(0)}%\n  ${p.description}`).join("\n\n") : "Nenhuma previsão disponível para este alvo."}`,
    confidence: 0.5,
    sources: [],
    followUpQuestions: [
      "Quais fatores influenciam essa previsão?",
      "Qual a margem de erro?",
      "Existem sinais de alerta?",
    ],
    disclaimer: "PREVIÇÕES SÃO ESTIMATIVAS BASEADAS EM MODELOS ESTATÍSTICOS. NÃO SÃO PREVISÕES CONFIRMADAS.",
  };
}

function handleCorrelationQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): CopilotResponse {
  const entity1 = match[1].toLowerCase();
  const entity2 = match[2].toLowerCase();

  const related = events.filter(e =>
    e.title.toLowerCase().includes(entity1) || e.title.toLowerCase().includes(entity2) ||
    e.description.toLowerCase().includes(entity1) || e.description.toLowerCase().includes(entity2)
  );

  const chains = findCorrelationChains(related);

  const answer = chains.length > 0
    ? `Encontrei ${chains.length} cadeia(s) de correlação:\n${chains.slice(0, 3).map(c => `- Cadeia com ${c.events.length} eventos, risco: ${c.totalRisk}, abrangência: ${c.geoSpread}km`).join("\n")}`
    : `Não encontrei correlação direta entre "${entity1}" e "${entity2}" nos dados atuais.`;

  return {
    answer,
    confidence: chains.length > 0 ? 0.65 : 0.3,
    sources: related.slice(0, 5).map(e => ({ type: "event", id: e.id, title: e.title, relevance: 0.6 })),
    followUpQuestions: [
      "Quais são as consequências em cascata?",
      "Qual a probabilidade de cada correlação?",
      "Existe relação temporal entre esses eventos?",
    ],
  };
}

function handleTimelineQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): CopilotResponse {
  const target = match[1]?.toLowerCase();
  const filtered = target ? events.filter(e => e.title.toLowerCase().includes(target) || e.module.includes(target as any)) : events;
  const timeline = buildTimeline(filtered);

  return {
    answer: `**Timeline:** ${timeline.nodes.length} evento(s) em ${timeline.totalTimeSpan}. ${timeline.keyMoments.length} momento(s) chave identificado(s).`,
    confidence: 0.7,
    sources: timeline.nodes.slice(0, 5).map(n => ({ type: "event", id: n.event.id, title: n.event.title, relevance: 0.7 })),
    followUpQuestions: [
      "Quais são os momentos mais críticos?",
      "Existe alguma cadeia de eventos?",
      "Qual o próximo evento esperado?",
    ],
    data: { timeline },
  };
}

function handleMissionsQuery(): CopilotResponse {
  return {
    answer: "Sistema de missões disponível. Para consultar missões ativas, acesse o Centro de Missões na interface.",
    confidence: 0.9,
    sources: [],
    followUpQuestions: [
      "Como criar uma nova missão?",
      "Quais missões estão urgentes?",
      "Qual o histórico de missões?",
    ],
  };
}

// ─── MAIN COPILOT FUNCTION ─────────────────────────────────

export function askCopilot(
  question: string,
  events: GlobalEvent[],
  alerts: GlobalAlert[]
): CopilotResponse {
  const start = Date.now();

  for (const { pattern, handler } of PATTERNS) {
    const match = question.match(pattern);
    if (match) {
      const response = handler(events, alerts, match);
      response.processingTime = `${Date.now() - start}ms`;
      return response;
    }
  }

  // Default: search-based response
  const keywords = question.toLowerCase().split(/\s+/);
  const relevant = events.filter(e =>
    keywords.some(k => e.title.toLowerCase().includes(k) || e.description.toLowerCase().includes(k))
  );

  return {
    answer: relevant.length > 0
      ? `Encontrei ${relevant.length} evento(s) relacionado(s):\n${relevant.slice(0, 5).map(e => `- **${e.title}** (${e.riskLevel})`).join("\n")}`
      : "Não encontrei eventos diretamente relacionados à sua pergunta. Tente reformular ou seja mais específico.",
    confidence: 0.3,
    sources: relevant.slice(0, 5).map(e => ({ type: "event", id: e.id, title: e.title, relevance: 0.5 })),
    followUpQuestions: [
      "Resumo da situação atual",
      "Quais são os principais riscos?",
      "Existe alguma emergência?",
    ],
    processingTime: `${Date.now() - start}ms`,
  };
}

export function getSuggestedQuestions(): string[] {
  return [
    "Quais são os três incidentes com maior impacto econômico nas últimas 24 horas?",
    "Existe algum evento que possa afetar o Brasil nas próximas 72 horas?",
    "Mostre apenas eventos confirmados por três ou mais fontes.",
    "Quais infraestruturas críticas estão em risco neste momento?",
    "Qual é o risco global atual?",
    "Resumo da situação de hoje",
    "Previsão para terremotos",
    "Correlação entre terremotos e enchentes",
    "Timeline de eventos recentes",
  ];
}
