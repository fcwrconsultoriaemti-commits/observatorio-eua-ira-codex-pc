// ============================================================
// INVESTIGATIVE AI — Natural Language Intelligence Queries
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel, RiskCategory } from "../types";
import { buildConsequenceTree } from "../correlation/advanced";
import { assessAllEvents, getGlobalRiskIndex } from "../impact";
import { buildTimeline } from "../timeline";

export interface InvestigationQuery {
  question: string;
  category?: RiskCategory;
  timeframe?: string;
  country?: string;
  region?: string;
}

export interface InvestigationResult {
  answer: string;
  confidence: number;
  sources: { eventId: string; title: string; relevance: number }[];
  relatedQuestions: string[];
  riskAssessment: RiskLevel;
  timeline: { time: string; event: string; impact: string }[];
  recommendations: string[];
  disclaimer: string;
}

// ─── QUESTION PATTERNS ─────────────────────────────────────

const QUESTION_PATTERNS: {
  pattern: RegExp;
  handler: (events: GlobalEvent[], alerts: GlobalAlert[], match: RegExpMatchArray) => InvestigationResult;
}[] = [
  {
    pattern: /(?:quais?|que)\s+eventos?\s+(?:podem?|vão|irão?)\s+afetar\s+(.+?)(?:\s+nas?\s+próximas?\s+(\d+)\s*(?:horas?|dias?))?$/i,
    handler: handleRegionalImpactQuery,
  },
  {
    pattern: /(?:existe?|há)\s+relação\s+entre\s+(.+?)\s+e\s+(.+)/i,
    handler: handleCorrelationQuery,
  },
  {
    pattern: /(?:qual|qual é)\s+o\s+risco\s+(?:para|de)\s+(.+)/i,
    handler: handleRiskQuery,
  },
  {
    pattern: /(?:quais?\s+países?|quais?\s+nações?)\s+(?:apresentam?|têm?|mostram?)\s+(?:maior|maior)\s+instabilidade/i,
    handler: handleInstabilityQuery,
  },
  {
    pattern: /(?:resumo|sumário|resuma)\s+(?:de\s+)?(?:hoje|atual|situação)/i,
    handler: handleSummaryQuery,
  },
  {
    pattern: /(?:previsão|prever|estimar)\s+(.+)/i,
    handler: handlePredictionQuery,
  },
  {
    pattern: /(?:impacto|afeta|afetar)\s+(?:econômico|mercado|economia)/i,
    handler: handleEconomicImpactQuery,
  },
  {
    pattern: /(?:emergência|crise|alerta)\s+(?:máximo|global|ativo)/i,
    handler: handleEmergencyQuery,
  },
];

// ─── QUESTION HANDLERS ─────────────────────────────────────

function handleRegionalImpactQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): InvestigationResult {
  const region = match[1].toLowerCase();
  const timeframe = match[2] ? parseInt(match[2]) : 48;

  const relevantEvents = events.filter(e =>
    (e.location.country?.toLowerCase().includes(region) ||
     e.location.state?.toLowerCase().includes(region) ||
     e.description.toLowerCase().includes(region))
  );

  const assessments = assessAllEvents(relevantEvents);
  const riskIndex = getGlobalRiskIndex(assessments);

  const futureEvents = relevantEvents.filter(e => {
    const hoursAhead = (new Date(e.timestamp).getTime() - Date.now()) / 3600000;
    return hoursAhead >= 0 && hoursAhead <= timeframe;
  });

  const sources = assessments.slice(0, 5).map(a => {
    const event = relevantEvents.find(e => e.id === a.eventId)!;
    return { eventId: a.eventId, title: event.title, relevance: a.globalScore / 100 };
  });

  const recommendations: string[] = [];
  if (riskIndex.index > 60) recommendations.push("Ativar monitoramento contínuo da região");
  if (assessments.some(a => a.category === "terremoto")) recommendations.push("Verificar status de infraestrutura crítica");
  if (assessments.some(a => a.category === "furacao")) recommendations.push("Avaliar rotas de evacuação");
  if (assessments.some(a => a.category === "conflito")) recommendations.push("Monitorar movimentações militares");

  return {
    answer: `Identifiquei ${relevantEvents.length} evento(s) potencialmente impactantes para ${region} nas próximas ${timeframe}h. Índice de risco regional: ${riskIndex.index}/100 (${riskIndex.level}). ${futureEvents.length} evento(s) com potencial de impacto direto.`,
    confidence: relevantEvents.length > 0 ? 0.75 : 0.3,
    sources,
    relatedQuestions: [
      `Qual é a cadeia de consequências para ${region}?`,
      `Quais infraestruturas em ${region} estão em risco?`,
      `Existe correlação entre os eventos em ${region}?`,
    ],
    riskAssessment: riskIndex.level,
    timeline: relevantEvents.slice(0, 5).map(e => ({
      time: new Date(e.timestamp).toLocaleString("pt-BR"),
      event: e.title,
      impact: `${e.impact.operational + e.impact.humanitarian + e.impact.economic}/300`,
    })),
    recommendations,
    disclaimer: "Esta análise é baseada em dados coletados e modelos estatísticos. Não substitui avaliação profissional especializada.",
  };
}

function handleCorrelationQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): InvestigationResult {
  const entity1 = match[1].toLowerCase();
  const entity2 = match[2].toLowerCase();

  const relatedEvents = events.filter(e =>
    e.title.toLowerCase().includes(entity1) || e.title.toLowerCase().includes(entity2) ||
    e.description.toLowerCase().includes(entity1) || e.description.toLowerCase().includes(entity2)
  );

  const tree = relatedEvents.length > 0
    ? buildConsequenceTree(relatedEvents[0], relatedEvents)
    : null;

  const sources = relatedEvents.slice(0, 5).map(e => ({
    eventId: e.id, title: e.title, relevance: 0.8,
  }));

  const answer = tree && tree.cascadeDepth > 0
    ? `Encontrei ${relatedEvents.length} evento(s) correlacionados. Árvore de consequências com ${tree.cascadeDepth} nível(is) de profundidade. Categorias afetadas: ${tree.affectedCategories.join(", ")}. Tempo estimado de recuperação: ${tree.estimatedRecovery}.`
    : `Encontrei ${relatedEvents.length} evento(s) relacionados a "${entity1}" e "${entity2}". A correlação direta requer análise adicional.`;

  return {
    answer,
    confidence: relatedEvents.length >= 2 ? 0.7 : 0.4,
    sources,
    relatedQuestions: [
      `Qual é a probabilidade de cascata entre esses eventos?`,
      `Quais outros eventos podem ser afetados?`,
      `Qual o impacto combinado?`,
    ],
    riskAssessment: relatedEvents.length > 0 ? relatedEvents[0].riskLevel : "informativo",
    timeline: relatedEvents.slice(0, 5).map(e => ({
      time: new Date(e.timestamp).toLocaleString("pt-BR"),
      event: e.title,
      impact: e.description.slice(0, 100),
    })),
    recommendations: ["Monitorar evolução da correlação", "Verificar fontes adicionais"],
    disclaimer: "Análise de correlação baseada em proximidade temporal e geográfica. Não confirma causalidade.",
  };
}

function handleRiskQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): InvestigationResult {
  const target = match[1].toLowerCase();

  const relevantEvents = events.filter(e =>
    e.description.toLowerCase().includes(target) ||
    e.tags.some(t => t.toLowerCase().includes(target))
  );

  const assessments = assessAllEvents(relevantEvents);
  const riskIndex = getGlobalRiskIndex(assessments);

  const sources = assessments.slice(0, 3).map(a => {
    const event = relevantEvents.find(e => e.id === a.eventId)!;
    return { eventId: a.eventId, title: event.title, relevance: a.globalScore / 100 };
  });

  return {
    answer: `Risco para "${target}": ${riskIndex.index}/100 (${riskIndex.level}). ${relevantEvents.length} evento(s) identificado(s) com potencial de impacto. Principais ameaças: ${riskIndex.topThreats.slice(0, 3).map(t => t.category).join(", ")}.`,
    confidence: relevantEvents.length > 0 ? 0.65 : 0.3,
    sources,
    relatedQuestions: [
      `Quais são os principais vetores de risco?`,
      `Como mitigar esses riscos?`,
      `Qual a tendência de risco?`,
    ],
    riskAssessment: riskIndex.level,
    timeline: [],
    recommendations: riskIndex.index > 50
      ? ["Aumentar frequência de monitoramento", "Avaliar protocolos de resposta"]
      : ["Manter monitoramento de rotina"],
    disclaimer: "Avaliação de risco baseada em modelos estatísticos. Consulte especialistas para decisões críticas.",
  };
}

function handleInstabilityQuery(events: GlobalEvent[], _alerts: GlobalAlert[]): InvestigationResult {
  const countryRisk = new Map<string, number>();
  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];

  for (const e of events) {
    if (e.location.country) {
      const current = countryRisk.get(e.location.country) || 0;
      countryRisk.set(e.location.country, current + riskOrder.indexOf(e.riskLevel));
    }
  }

  const sorted = Array.from(countryRisk.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10);

  const sources = sorted.slice(0, 5).map(([country, risk]) => ({
    eventId: `country-${country}`,
    title: `${country} (risco acumulado: ${risk})`,
    relevance: risk / (sorted[0]?.[1] || 1),
  }));

  return {
    answer: `Países com maior instabilidade: ${sorted.slice(0, 5).map(([c, r]) => `${c} (${r})`).join(", ")}. Total de ${events.length} evento(s) monitorado(s).`,
    confidence: 0.6,
    sources,
    relatedQuestions: [
      `Quais eventos estão ocorrendo em ${sorted[0]?.[0] || "país principal"}?`,
      `Existe correlação entre instabilidades regionais?`,
      `Qual a tendência de instabilidade global?`,
    ],
    riskAssessment: sorted.length > 0 && sorted[0][1] > 20 ? "alto" : "moderado",
    timeline: [],
    recommendations: ["Focar monitoramento nos países de maior risco", "Avaliar correlações regionais"],
    disclaimer: "Classificação de instabilidade baseada em volume e gravidade de eventos.",
  };
}

function handleSummaryQuery(events: GlobalEvent[], alerts: GlobalAlert[]): InvestigationResult {
  const assessments = assessAllEvents(events);
  const riskIndex = getGlobalRiskIndex(assessments);

  const categoryCounts = new Map<string, number>();
  for (const e of events) {
    categoryCounts.set(e.module, (categoryCounts.get(e.module) || 0) + 1);
  }

  const topCategories = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return {
    answer: `Resumo Global: ${events.length} evento(s) ativo(s), ${alerts.filter(a => a.status !== "resolvido").length} alerta(s) ativo(s). Índice de risco global: ${riskIndex.index}/100 (${riskIndex.level}). Principais categorias: ${topCategories.map(([c, n]) => `${c} (${n})`).join(", ")}.`,
    confidence: 0.8,
    sources: events.slice(0, 5).map(e => ({ eventId: e.id, title: e.title, relevance: 0.7 })),
    relatedQuestions: [
      "Quais são as principais ameaças hoje?",
      "Existe alguma emergência ativa?",
      "Qual a tendência de risco?",
    ],
    riskAssessment: riskIndex.level,
    timeline: events.slice(0, 5).map(e => ({
      time: new Date(e.timestamp).toLocaleString("pt-BR"),
      event: e.title,
      impact: `${e.impact.operational}/100`,
    })),
    recommendations: riskIndex.index > 60 ? ["Ativar protocolo de alerta", "Revisar planos de resposta"] : ["Manter monitoramento"],
    disclaimer: "Resumo gerado automaticamente. Para análise detalhada, consulte especialistas.",
  };
}

function handlePredictionQuery(events: GlobalEvent[], _alerts: GlobalAlert[], match: RegExpMatchArray): InvestigationResult {
  const target = match[1].toLowerCase();
  const relevant = events.filter(e => e.description.toLowerCase().includes(target) || e.module.includes(target as any));

  return {
    answer: `Baseado em ${relevant.length} evento(s) histórico(s) para "${target}", modelos estatísticos indicam tendência ${relevant.length > 5 ? "crescente" : "estável"}. IMPORTANTE: Estas são estimativas baseadas em padrões, não previsões confirmadas.`,
    confidence: 0.4,
    sources: relevant.slice(0, 3).map(e => ({ eventId: e.id, title: e.title, relevance: 0.6 })),
    relatedQuestions: [
      "Quais fatores influenciam essa previsão?",
      "Qual a margem de erro?",
      "Existem sinais de alerta?",
    ],
    riskAssessment: "moderado",
    timeline: [],
    recommendations: ["Monitorar sinais de alerta", "Atualizar modelos com dados recentes"],
    disclaimer: "PREVIÇÕES SÃO ESTIMATIVAS BASEADAS EM MODELOS ESTATÍSTICOS. NÃO SÃO PREVISÕES CONFIRMADAS. Use apenas como referência.",
  };
}

function handleEconomicImpactQuery(events: GlobalEvent[], _alerts: GlobalAlert[]): InvestigationResult {
  const economicEvents = events.filter(e => e.module === "economico" || e.impact.economic > 30);
  const assessments = assessAllEvents(economicEvents);

  return {
    answer: `Impacto econômico estimado: ${economicEvents.length} evento(s) com impacto econômico significativo. Score médio: ${assessments.length > 0 ? Math.round(assessments.reduce((s, a) => s + a.globalScore, 0) / assessments.length) : 0}/100.`,
    confidence: 0.5,
    sources: economicEvents.slice(0, 3).map(e => ({ eventId: e.id, title: e.title, relevance: 0.7 })),
    relatedQuestions: [
      "Quais setores são mais afetados?",
      "Qual a tendência de mercado?",
      "Existem oportunidades?",
    ],
    riskAssessment: economicEvents.length > 3 ? "alto" : "moderado",
    timeline: [],
    recommendations: ["Monitorar indicadores-chave", "Avaliar exposição a riscos"],
    disclaimer: "Análise econômica baseada em eventos coletados. Não constitui aconselhamento financeiro.",
  };
}

function handleEmergencyQuery(events: GlobalEvent[], alerts: GlobalAlert[]): InvestigationResult {
  const emergencies = alerts.filter(a => ["critico", "emergencia", "extremo"].includes(a.riskLevel) && a.status !== "resolvido");
  const criticalEvents = events.filter(e => ["critico", "emergencia", "extremo"].includes(e.riskLevel));

  return {
    answer: emergencies.length > 0
      ? `${emergencies.length} emergência(s) ativa(s). Nível máximo: ${emergencies[0].riskLevel.toUpperCase()}. ${criticalEvents.length} evento(s) crítico(s) monitorado(s).`
      : `Nenhuma emergência ativa no momento. ${events.length} evento(s) monitorado(s).`,
    confidence: 0.85,
    sources: emergencies.slice(0, 5).map(a => ({ eventId: a.eventId, title: a.title, relevance: 1.0 })),
    relatedQuestions: [
      "Quais ações estão sendo tomadas?",
      "Quais regiões são mais afetadas?",
      "Qual a previsão de resolução?",
    ],
    riskAssessment: emergencies.length > 0 ? "emergencia" : "informativo",
    timeline: emergencies.slice(0, 5).map(a => ({
      time: new Date(a.timestamp).toLocaleString("pt-BR"),
      event: a.title,
      impact: a.description.slice(0, 100),
    })),
    recommendations: emergencies.length > 0 ? ["Ativar protocolo de emergência", "Comunicar autoridades", "Mobilizar recursos"] : ["Manter vigilância"],
    disclaimer: "Status de emergência baseado em alertas coletados. Confirme com fontes oficiais.",
  };
}

// ─── MAIN QUERY FUNCTION ───────────────────────────────────

export function investigate(
  question: string,
  events: GlobalEvent[],
  alerts: GlobalAlert[]
): InvestigationResult {
  for (const { pattern, handler } of QUESTION_PATTERNS) {
    const match = question.match(pattern);
    if (match) {
      return handler(events, alerts, match);
    }
  }

  // Default: generic search
  const keywords = question.toLowerCase().split(/\s+/);
  const relevant = events.filter(e =>
    keywords.some(k => e.title.toLowerCase().includes(k) || e.description.toLowerCase().includes(k))
  );

  return {
    answer: `Encontrei ${relevant.length} evento(s) relacionado(s) à sua pergunta. Para uma análise mais específica, reformule sua consulta.`,
    confidence: 0.3,
    sources: relevant.slice(0, 5).map(e => ({ eventId: e.id, title: e.title, relevance: 0.5 })),
    relatedQuestions: [
      "Resumo da situação atual",
      "Quais são os principais riscos?",
      "Existe alguma emergência?",
    ],
    riskAssessment: "moderado",
    timeline: [],
    recommendations: ["Reformule sua pergunta para uma análise mais detalhada"],
    disclaimer: "Resposta genérica. Forneça mais detalhes para uma análise específica.",
  };
}

export function getSuggestedQuestions(): string[] {
  return [
    "Quais eventos podem afetar o Brasil nas próximas 48 horas?",
    "Existe relação entre este terremoto e o fechamento do porto?",
    "Qual o risco para o setor elétrico?",
    "Quais países apresentam maior instabilidade hoje?",
    "Resumo da situação atual",
    "Impacto econômico dos eventos ativos",
    "Existe alguma emergência ativa?",
  ];
}
