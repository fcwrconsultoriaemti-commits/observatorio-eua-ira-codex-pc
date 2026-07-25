// ============================================================
// DECISION SUPPORT ENGINE — Actionable Intelligence
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory, ImpactScores } from "../types";

export type RecommendationPriority = "critical" | "high" | "medium" | "low";
export type AnalysisPriority = "immediate" | "short_term" | "medium_term";

export interface DecisionRecommendation {
  id: string;
  eventId: string;
  eventTitle: string;
  category: RiskCategory;
  riskLevel: RiskLevel;
  timestamp: string;
  recommendations: RecommendationItem[];
  priority: AnalysisPriority;
  confidence: number;
  sources: string[];
  disclaimer: string;
}

export interface RecommendationItem {
  id: string;
  action: string;
  description: string;
  responsible: string;
  timeframe: string;
  priority: RecommendationPriority;
  resources: string[];
  dependencies: string[];
  estimatedCost?: string;
  risks: string[];
}

export interface DecisionTree {
  id: string;
  rootEvent: string;
  branches: DecisionBranch[];
}

export interface DecisionBranch {
  condition: string;
  probability: number;
  recommendations: RecommendationItem[];
  childBranches?: DecisionBranch[];
}

// ─── STORE ─────────────────────────────────────────────────

const recommendations: Map<string, DecisionRecommendation> = new Map();
let recCounter = 0;

// ─── DECISION RULES ────────────────────────────────────────

interface CategoryRules {
  primary: string[];
  secondary: string[];
  responsible: string[];
  resources: string[];
  risks: string[];
}

const CATEGORY_RULES: Record<string, CategoryRules> = {
  terremoto: {
    primary: [
      "Verificar risco de tsunami em áreas costeiras",
      "Avaliar integridade de hospitais e unidades de saúde",
      "Inspecionar aeroportos e pistas de pouso",
      "Avaliar infraestrutura crítica (pontes, estradas, presas)",
      "Mapear rotas logísticas de emergência",
    ],
    secondary: [
      "Ativar protocolo de búsqueda e resgate",
      "Coordenar com defesa civil local",
      "Preparar abrigos temporários",
      "Avaliar riscos de deslizamento secundário",
    ],
    responsible: ["Defesa Civil", "Ministério da Saúde", "Agência Aviação Civil", "DNIT", "Comando Militar"],
    resources: ["Equipes SAR", "Médicos de emergência", "Engenheiros estruturais", "Veículos blindados", "Suprimentos médicos"],
    risks: ["Réplicas sísmicas", "Colapso estrutural tardio", "Interrupção de comunicações", "Escassez de água potável"],
  },
  furacao: {
    primary: [
      "Iniciar evacuação de zonas de risco",
      "Ativar abrigos de emergência",
      "Avaliar estado da rede elétrica",
      "Preparar cadeias de suprimento para pós-impacto",
    ],
    secondary: [
      "Coordenar bloqueio de estradas costeiras",
      "Posicionar equipes de resgate",
      "Estabelecer linhas de comunicação alternativas",
      "Monitorar nível de rios e canais",
    ],
    responsible: ["Proteção Civil", "Defesa Nacional", "Concessionárias de energia", "Portos e Aeroportos"],
    resources: ["Geradores de emergência", "Barcos de resgate", "Camhões-tanque", "Suprimentos alimentares", "Equipes de poda"],
    risks: ["Inundações costeiras", "Quedas de árvores e postes", "Contaminação de água", "Desabrigados em massa"],
  },
  incendio: {
    primary: [
      "Estabelecer zona de contenção",
      "Avaliar qualidade do ar em áreas afetadas",
      "Coordenar evacuação de populações próximas",
      "Processar sinistros de seguros",
    ],
    secondary: [
      "Posicionar aeronaves de combate a incêndio",
      "Estabelecer pontos de distribuição de máscaras",
      "Monitorar propagação com sensores térmicos",
      "Preparar reassentamento temporário",
    ],
    responsible: ["Corpo de Bombeiros", "IBAMA", "Defesa Civil", "Seguradoras", "Ministério Público"],
    resources: ["Aeronaves cisterna", "Equipes de brigadistas", "Máscaras N95", " Veículos de evacuação", "Abrigos temporários"],
    risks: ["Mudança de direção do vento", "Explosões secundárias", "Deslizamentos pós-incêndio", "Crise de saúde respiratória"],
  },
  conflito: {
    primary: [
      "Monitorar movimentação militar na região",
      "Avaliar segurança de fronteiras",
      "Proteger suprimentos de energia",
      "Avaliar impacto em mercados financeiros",
    ],
    secondary: [
      "Coordenar com forças de paz internacionais",
      "Estabelecer corredores humanitários",
      "Proteger infraestrutura crítica civil",
      "Preparar planos de contingência econômica",
    ],
    responsible: ["Ministério da Defesa", "Gabinete de Segurança", "Banco Central", "ONU", "Cruz Vermelha"],
    resources: ["Forças de segurança", "Veículos blindados", "Suprimentos humanitários", "Sistemas de vigilância", "Comunicações criptografadas"],
    risks: ["Escalação do conflito", "Refugiados em massa", "Colapso econômico", "Crise humanitária"],
  },
  cibernetico: {
    primary: [
      "Conter propagação do ataque cibernético",
      "Ativar sistemas de backup e recuperação",
      "Proteger canais de comunicação críticos",
      "Iniciar relatório regulatorio obrigatório",
    ],
    secondary: [
      "Isolar redes comprometidas",
      "Notificar autoridades e usuários afetados",
      "Recrutar equipe especializada de resposta",
      "Documentar evidências forenses digitais",
    ],
    responsible: ["Centro de Resposta a Incidentes", "CSIRT", "Autoridade Nacional de Proteção", "Polícia Federal", "Ministério da Justiça"],
    resources: ["Analistas forenses", "Servidores de backup", "Firewalls avançados", "Ferramentas de análise de malware", "Canais seguros de comunicação"],
    risks: ["Perda de dados sensíveis", "Propagação para sistemas críticos", "Dano à reputação", "Multas regulatorias"],
  },
  enchente: {
    primary: [
      "Iniciar evacuação de áreas alagadas",
      "Coordenar gestão de água e barragens",
      "Avaliar riscos epidemiológicos pós-enchente",
      "Mapear fechamento de vias e pontes",
    ],
    secondary: [
      "Posicionar bombas de desaguamento",
      "Distribuir água potável e purificadores",
      "Estabelecer postos de atendimento médico",
      "Avaliar danos em residências e comércios",
    ],
    responsible: ["Defesa Civil", "Secretaria de Saúde", "Empresa de Água", "DNIT", "Vigilância Sanitária"],
    resources: ["Bombas de alta capacidade", "Barcos infláveis", "Kaças fogão", "Suprimentos de purificação", "Equipes de resgate aquatico"],
    risks: ["Doenças de veiculação hídrica", "Colapso de barragens", "Deslizamentos", "Crise de moradia"],
  },
  vulcao: {
    primary: [
      "Estabelecer zona de exclusão vulcanica",
      "Monitorar atividade sísmica associada",
      "Evacuar populações em raio de impacto",
      "Avaliar impacto em rota aérea",
    ],
    secondary: [
      "Posicionar monitoramento de gases",
      "Preparar máscaras contra cinzas",
      "Avaliar impacto agrícola",
      "Coordenar com aviação civil",
    ],
    responsible: ["Observatório Vulcanológico", "Defesa Civil", "ANAC", "Ministério da Agricultura"],
    resources: ["Estações sísmicas", "Máscaras PFF3", "Satélites de monitoramento", "Veículos de evacuação"],
    risks: ["Fluxos piroclásticos", "Chuvas de cinzas", "Desabamento de telhados", "Contaminação de solo"],
  },
  economico: {
    primary: [
      "Avaliar impacto nos mercados financeiros",
      "Monitorar variação cambial e inflação",
      "Coordenar resposta com Banco Central",
      "Proteger cadeias de suprimento críticas",
    ],
    secondary: [
      "Estabelecer linhas de crédito de emergência",
      "Apoiar setores mais afetados",
      "Comunicar medidas ao público",
      "Coordenar com organismos internacionais",
    ],
    responsible: ["Banco Central", "Ministério da Fazenda", "Comissão de Valores", "FMI", "Banco Mundial"],
    resources: ["Reservas internacionais", "Equipes de análise econômica", "Canais de comunicação oficial"],
    risks: ["Pânico financeiro", "Capital flight", "Desemprego em massa", "Instabilidade social"],
  },
};

// ─── HELPER FUNCTIONS ──────────────────────────────────────

function generateId(): string {
  return `REC-${Date.now()}-${++recCounter}`;
}

function assessAnalysisPriority(event: GlobalEvent): AnalysisPriority {
  const risk = event.riskLevel;
  if (risk === "emergencia" || risk === "extremo") return "immediate";
  if (risk === "critico" || risk === "alto") return "short_term";
  return "medium_term";
}

function calculateConfidence(event: GlobalEvent): number {
  let confidence = event.confidence;
  const avgImpact = (event.impact.operational + event.impact.humanitarian + event.impact.economic + event.impact.environmental + event.impact.security) / 5;
  confidence = Math.min(1, confidence + (avgImpact / 500));
  return Math.round(confidence * 100) / 100;
}

function buildRecommendations(event: GlobalEvent, rules: CategoryRules): RecommendationItem[] {
  const items: RecommendationItem[] = [];
  const priority = assessAnalysisPriority(event);
  const impact = event.impact;
  const avgImpact = (impact.operational + impact.humanitarian + impact.economic + impact.environmental + impact.security) / 5;

  const allActions = [...rules.primary, ...rules.secondary];
  const count = priority === "immediate" ? 6 : priority === "short_term" ? 4 : 3;

  for (let i = 0; i < Math.min(count, allActions.length); i++) {
    const isPrimary = i < rules.primary.length;
    const actionPriority: RecommendationPriority = i < 2 ? "critical" : i < 4 ? "high" : isPrimary ? "medium" : "low";

    items.push({
      id: `ACT-${Date.now()}-${i}`,
      action: allActions[i],
      description: `Ação ${isPrimary ? "primária" : "secundária"} para gestão de ${event.module} — ${event.title}`,
      responsible: rules.responsible[i % rules.responsible.length],
      timeframe: priority === "immediate" ? "0-2 horas" : priority === "short_term" ? "2-12 horas" : "12-48 horas",
      priority: actionPriority,
      resources: rules.resources.slice(0, Math.min(3, rules.resources.length)),
      dependencies: i > 0 ? [items[i - 1].id] : [],
      estimatedCost: avgImpact > 70 ? "Alto" : avgImpact > 40 ? "Médio" : "Baixo",
      risks: rules.risks.slice(0, Math.min(2, rules.risks.length)),
    });
  }

  return items;
}

// ─── MAIN FUNCTIONS ────────────────────────────────────────

export function analyzeEvent(event: GlobalEvent): DecisionRecommendation {
  const rules = CATEGORY_RULES[event.module] || CATEGORY_RULES.terremoto;
  const priority = assessAnalysisPriority(event);
  const confidence = calculateConfidence(event);

  const rec: DecisionRecommendation = {
    id: generateId(),
    eventId: event.id,
    eventTitle: event.title,
    category: event.module,
    riskLevel: event.riskLevel,
    timestamp: new Date().toISOString(),
    recommendations: buildRecommendations(event, rules),
    priority,
    confidence,
    sources: [event.source, "Motor de Decisão Automatizada", "Base de Regras Históricas"],
    disclaimer: "Recomendações geradas por IA — devem ser revisadas por profissional qualificado antes da implementação.",
  };

  recommendations.set(rec.id, rec);
  return rec;
}

export function getRecommendationsByCategory(category: RiskCategory): DecisionRecommendation[] {
  return Array.from(recommendations.values())
    .filter(r => r.category === category)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getRecommendationsByRisk(riskLevel: RiskLevel): DecisionRecommendation[] {
  return Array.from(recommendations.values())
    .filter(r => r.riskLevel === riskLevel)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function buildDecisionTree(event: GlobalEvent): DecisionTree {
  const rules = CATEGORY_RULES[event.module] || CATEGORY_RULES.terremoto;

  const branches: DecisionBranch[] = [
    {
      condition: "Impacto alto — evacuação necessária",
      probability: 0.7,
      recommendations: buildRecommendations({ ...event, riskLevel: "emergencia" } as GlobalEvent, rules),
      childBranches: [
        {
          condition: "Rotas de evacuação bloqueadas",
          probability: 0.3,
          recommendations: buildRecommendations(event, rules),
        },
        {
          condition: "Rotas de evacuação livres",
          probability: 0.7,
          recommendations: buildRecommendations(event, rules),
        },
      ],
    },
    {
      condition: "Impacto moderado — contenção in situ",
      probability: 0.25,
      recommendations: buildRecommendations(event, rules),
      childBranches: [
        {
          condition: "Degradação progressiva",
          probability: 0.4,
          recommendations: buildRecommendations(event, rules),
        },
        {
          condition: "Estabilização",
          probability: 0.6,
          recommendations: buildRecommendations(event, rules),
        },
      ],
    },
    {
      condition: "Impacto baixo — monitoramento contínuo",
      probability: 0.05,
      recommendations: buildRecommendations(event, rules),
    },
  ];

  return {
    id: `TREE-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    rootEvent: event.id,
    branches,
  };
}

export function getActionableInsights(events: GlobalEvent[]): {
  summary: string;
  topActions: RecommendationItem[];
} {
  if (events.length === 0) {
    return { summary: "Nenhum evento analisado.", topActions: [] };
  }

  const critical = events.filter(e => e.riskLevel === "emergencia" || e.riskLevel === "extremo" || e.riskLevel === "critico");
  const high = events.filter(e => e.riskLevel === "alto");
  const categories = [...new Set(events.map(e => e.module))];
  const avgImpact = events.reduce((sum, e) => sum + (e.impact.operational + e.impact.humanitarian + e.impact.economic + e.impact.environmental + e.impact.security) / 5, 0) / events.length;

  const summary = `${events.length} eventos analisados. ${critical.length} críticos, ${high.length} de alto risco. ` +
    `Categorias: ${categories.join(", ")}. Impacto médio: ${avgImpact.toFixed(1)}/100.`;

  const allRecs: RecommendationItem[] = [];
  for (const event of events) {
    const rules = CATEGORY_RULES[event.module] || CATEGORY_RULES.terremoto;
    allRecs.push(...buildRecommendations(event, rules));
  }

  const topActions = allRecs
    .sort((a, b) => {
      const prioOrder: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return prioOrder[a.priority] - prioOrder[b.priority];
    })
    .slice(0, 10);

  return { summary, topActions };
}

export function assessResourceNeeds(event: GlobalEvent): {
  personnel: string;
  equipment: string;
  estimatedCost: string;
} {
  const rules = CATEGORY_RULES[event.module] || CATEGORY_RULES.terremoto;
  const impact = event.impact;
  const avgImpact = (impact.operational + impact.humanitarian + impact.economic + impact.environmental + impact.security) / 5;
  const isHighImpact = avgImpact > 60 || event.riskLevel === "emergencia" || event.riskLevel === "extremo";

  const personnel = isHighImpact
    ? `${rules.responsible.join(", ")} — ${rules.responsible.length * 50}+ profissionais`
    : `${rules.responsible[0]} — ${rules.responsible.length * 15} profissionais`;

  const equipment = isHighImpact
    ? `${rules.resources.join(", ")} — escalonamento máximo`
    : `${rules.resources.slice(0, 2).join(", ")} — nível padrão`;

  const costBase = isHighImpact ? 2500000 : avgImpact > 40 ? 800000 : 200000;
  const estimatedCost = `R$ ${costBase.toLocaleString("pt-BR")} — ${isHighImpact ? "estimativa alta" : "estimativa padrão"}`;

  return { personnel, equipment, estimatedCost };
}

// ─── QUERY ─────────────────────────────────────────────────

export function getAllRecommendations(): DecisionRecommendation[] {
  return Array.from(recommendations.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getRecommendation(id: string): DecisionRecommendation | undefined {
  return recommendations.get(id);
}

export function getRecommendationCount(): number {
  return recommendations.size;
}
