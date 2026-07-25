// ============================================================
// SECTOR INTELLIGENCE — Domain-Specific Intelligence Views
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory, GlobalAlert } from "../types";

export type SectorType = "energy" | "logistics" | "health" | "defense" | "finance" | "telecom" | "agriculture" | "manufacturing";

export interface SectorProfile {
  id: string;
  name: string;
  type: SectorType;
  description: string;
  relevantCategories: RiskCategory[];
  kpis: SectorKPI[];
  dashboards: SectorDashboard[];
  alerts: SectorAlert[];
}

export interface SectorKPI {
  name: string;
  value: string;
  unit: string;
  trend: "up" | "down" | "stable";
  status: "normal" | "warning" | "critical";
}

export interface SectorDashboard {
  id: string;
  title: string;
  panels: { type: string; title: string; config: Record<string, unknown> }[];
}

export interface SectorAlert {
  id: string;
  title: string;
  severity: RiskLevel;
  description: string;
  timestamp: string;
  relatedEvents: string[];
}

// ─── SECTOR PROFILES ───────────────────────────────────────

const sectorProfiles: Record<SectorType, SectorProfile> = {
  energy: {
    id: "SEC-ENERGY",
    name: "Inteligência do Setor de Energia",
    type: "energy",
    description: "Usinas, refinarias, dutos, infraestrutura de rede, interrupções e monitoramento da cadeia de suprimentos de energia.",
    relevantCategories: ["energia", "infraestrutura", "clima_severo", "incendio", "cibernetico"],
    kpis: [],
    dashboards: [
      {
        id: "energy-overview",
        title: "Visão Geral da Infraestrutura de Energia",
        panels: [
          { type: "map", title: "Mapa de Infraestrutura Crítica", config: { layers: ["power_plants", "pipelines", "substations"] } },
          { type: "chart", title: "Distribuição de Carga da Rede", config: { aggregation: "region" } },
          { type: "gauge", title: "Índice de Confiabilidade do Sistema", config: { threshold: 99.5 } },
        ],
      },
    ],
    alerts: [],
  },
  logistics: {
    id: "SEC-LOGISTICS",
    name: "Inteligência do Setor de Logística",
    type: "logistics",
    description: "Portos, aeroportos, rodovias, ferrovias e monitoramento da cadeia de suprimentos global.",
    relevantCategories: ["maritimo", "aereo", "infraestrutura", "clima_severo", "economico"],
    kpis: [],
    dashboards: [
      {
        id: "logistics-overview",
        title: "Painel de Operações de Logística",
        panels: [
          { type: "map", title: "Rotas de Transporte Ativas", config: { modes: ["sea", "air", "road", "rail"] } },
          { type: "table", title: "Índice de Congestionamento Portuário", config: { sortBy: "waitTime" } },
          { type: "chart", title: "Tendência de Risco na Cadeia de Suprimentos", config: { period: "7d" } },
        ],
      },
    ],
    alerts: [],
  },
  health: {
    id: "SEC-HEALTH",
    name: "Inteligência do Setor de Saúde",
    type: "health",
    description: "Monitoramento de epidemias, qualidade do ar, capacidade hospitalar e rastreamento de surtos de doenças.",
    relevantCategories: ["saude", "clima_severo", "incendio", "infraestrutura"],
    kpis: [],
    dashboards: [
      {
        id: "health-overview",
        title: "Monitoramento de Saúde Pública",
        panels: [
          { type: "map", title: "Zonas de Surto de Doenças", config: { sources: ["WHO", "CDC", "local"] } },
          { type: "chart", title: "Tendências do Índice de Qualidade do Ar", config: { pollutants: ["PM2.5", "NO2", "O3"] } },
          { type: "gauge", title: "Ocupação de Leitos Hospitalares", config: { regions: "all" } },
        ],
      },
    ],
    alerts: [],
  },
  defense: {
    id: "SEC-DEFENSE",
    name: "Inteligência do Setor de Defesa",
    type: "defense",
    description: "Movimentações militares, segurança de fronteiras, zonas de conflito e monitoramento de ameaças geopolíticas.",
    relevantCategories: ["conflito", "cibernetico", "neo", "satelite", "infraestrutura"],
    kpis: [],
    dashboards: [
      {
        id: "defense-overview",
        title: "Operações de Defesa e Segurança",
        panels: [
          { type: "map", title: "Monitoramento de Zonas de Conflito", config: { sources: ["ACLED", "satellite"] } },
          { type: "table", title: "Registro de Incidentes de Fronteira", config: { filters: ["severity", "type"] } },
          { type: "timeline", title: "Linha do Tempo de Movimentações Militares", config: { actors: "all" } },
        ],
      },
    ],
    alerts: [],
  },
  finance: {
    id: "SEC-FINANCE",
    name: "Inteligência do Setor Financeiro",
    type: "finance",
    description: "Volatilidade de mercado, preços de petróleo, flutuações cambiais, commodities e análise de risco econômico.",
    relevantCategories: ["economico", "cibernetico", "neo", "maritimo", "infraestrutura"],
    kpis: [],
    dashboards: [
      {
        id: "finance-overview",
        title: "Painel de Risco Financeiro",
        panels: [
          { type: "chart", title: "Índice de Volatilidade do Mercado", config: { indices: ["VIX", "S&P500", "IBOV"] } },
          { type: "gauge", title: "Monitor de Preços de Petróleo", config: { benchmarks: ["WTI", "Brent", "Dubai"] } },
          { type: "table", title: "Taxas de Câmbio", config: { pairs: ["USD/BRL", "EUR/BRL", "CNY/BRL"] } },
        ],
      },
    ],
    alerts: [],
  },
  telecom: {
    id: "SEC-TELECOM",
    name: "Inteligência do Setor de Telecomunicações",
    type: "telecom",
    description: "Interrupções de rede, ataques cibernéticos, comunicações por satélite e monitoramento de infraestrutura de fibra.",
    relevantCategories: ["cibernetico", "infraestrutura", "satelite", "neo"],
    kpis: [],
    dashboards: [
      {
        id: "telecom-overview",
        title: "Monitor de Infraestrutura de Telecomunicações",
        panels: [
          { type: "map", title: "Mapa de Status da Rede", config: { providers: "all" } },
          { type: "chart", title: "Tentativas de Ataque Cibernético", config: { period: "24h" } },
          { type: "table", title: "Status de Cobertura por Satélite", config: { constellation: "all" } },
        ],
      },
    ],
    alerts: [],
  },
  agriculture: {
    id: "SEC-AGRICULTURE",
    name: "Inteligência do Setor Agrícola",
    type: "agriculture",
    description: "Monitoramento de culturas, rastreamento de secas, preços de commodities e análise de segurança alimentar.",
    relevantCategories: ["clima_severo", "seca", "enchente", "economico", "incendio"],
    kpis: [],
    dashboards: [
      {
        id: "agriculture-overview",
        title: "Painel de Inteligência Agrícola",
        panels: [
          { type: "map", title: "Visão Satelital da Saúde das Culturas", config: { indices: ["NDVI", "EVI"] } },
          { type: "chart", title: "Precipitação vs Normal", config: { period: "30d" } },
          { type: "gauge", title: "Índice de Segurança Alimentar", config: { regions: "global" } },
        ],
      },
    ],
    alerts: [],
  },
  manufacturing: {
    id: "SEC-MANUFACTURING",
    name: "Inteligência do Setor de Manufatura",
    type: "manufacturing",
    description: "Produção industrial, interrupções na cadeia de suprimentos, disponibilidade de matérias-primas e monitoramento de fábricas.",
    relevantCategories: ["infraestrutura", "economico", "cibernetico", "logistics", "clima_severo"],
    kpis: [],
    dashboards: [
      {
        id: "manufacturing-overview",
        title: "Monitor de Operações de Manufatura",
        panels: [
          { type: "map", title: "Mapa de Instalações Industriais", config: { sectors: "all" } },
          { type: "chart", title: "Tendências de Preços de Matérias-Primas", config: { commodities: ["steel", "aluminum", "copper", "lithium"] } },
          { type: "table", title: "Registro de Interrupções na Cadeia de Suprimentos", config: { severity: "all" } },
        ],
      },
    ],
    alerts: [],
  },
};

// ─── SECTOR FUNCTIONS ──────────────────────────────────────

export function getSectorProfile(type: SectorType): SectorProfile {
  return sectorProfiles[type];
}

export function getSectorEvents(type: SectorType, events: GlobalEvent[]): GlobalEvent[] {
  const profile = sectorProfiles[type];
  return events.filter((event) => {
    if (profile.relevantCategories.includes(event.module)) return true;
    const tagsLower = event.tags.map((t) => t.toLowerCase());
    return tagsLower.some((t) => t.includes(type) || profile.relevantCategories.some((c) => t.includes(c)));
  });
}

export function getSectorKPIs(type: SectorType, events: GlobalEvent[]): SectorKPI[] {
  const sectorEvents = getSectorEvents(type, events);
  const totalEvents = sectorEvents.length;
  const criticalEvents = sectorEvents.filter((e) => e.riskLevel === "critico" || e.riskLevel === "emergencia" || e.riskLevel === "extremo").length;
  const moderateEvents = sectorEvents.filter((e) => e.riskLevel === "alto" || e.riskLevel === "moderado").length;

  const avgImpact = sectorEvents.length > 0
    ? sectorEvents.reduce((sum, e) => sum + (e.impact.operational + e.impact.economic + e.impact.security) / 3, 0) / sectorEvents.length
    : 0;

  const recentEvents = sectorEvents.filter((e) => {
    const ts = new Date(e.timestamp).getTime();
    return Date.now() - ts < 86400000; // last 24h
  }).length;

  const previousDay = sectorEvents.filter((e) => {
    const ts = new Date(e.timestamp).getTime();
    return ts >= Date.now() - 172800000 && ts < Date.now() - 86400000;
  }).length;

  const trendUp = recentEvents > previousDay;
  const trendDown = recentEvents < previousDay;

  return [
    {
      name: "Total de Eventos",
      value: String(totalEvents),
      unit: "eventos",
      trend: trendUp ? "up" : trendDown ? "down" : "stable",
      status: totalEvents > 100 ? "warning" : "normal",
    },
    {
      name: "Eventos Críticos",
      value: String(criticalEvents),
      unit: "eventos",
      trend: "stable",
      status: criticalEvents > 10 ? "critical" : criticalEvents > 5 ? "warning" : "normal",
    },
    {
      name: "Eventos Moderados+",
      value: String(moderateEvents),
      unit: "eventos",
      trend: trendUp ? "up" : trendDown ? "down" : "stable",
      status: moderateEvents > 30 ? "warning" : "normal",
    },
    {
      name: "Pontuação Média de Impacto",
      value: avgImpact.toFixed(1),
      unit: "pontuação",
      trend: "stable",
      status: avgImpact > 70 ? "critical" : avgImpact > 40 ? "warning" : "normal",
    },
    {
      name: "Volume de Eventos em 24h",
      value: String(recentEvents),
      unit: "eventos",
      trend: trendUp ? "up" : trendDown ? "down" : "stable",
      status: recentEvents > 20 ? "warning" : "normal",
    },
  ];
}

export function getSectorAlerts(type: SectorType, alerts: GlobalAlert[]): SectorAlert[] {
  const profile = sectorProfiles[type];
  return alerts
    .filter((alert) => profile.relevantCategories.includes(alert.origin))
    .map((alert) => ({
      id: alert.id,
      title: alert.title,
      severity: alert.riskLevel,
      description: alert.description,
      timestamp: alert.timestamp,
      relatedEvents: alert.relatedEvents,
    }));
}

export function generateSectorReport(
  type: SectorType,
  events: GlobalEvent[]
): { summary: string; risks: string[]; recommendations: string[] } {
  const profile = sectorProfiles[type];
  const sectorEvents = getSectorEvents(type, events);
  const kpis = getSectorKPIs(type, events);
  const criticalCount = sectorEvents.filter(
    (e) => e.riskLevel === "critico" || e.riskLevel === "emergencia" || e.riskLevel === "extremo"
  ).length;
  const avgConfidence = sectorEvents.length > 0
    ? sectorEvents.reduce((sum, e) => sum + e.confidence, 0) / sectorEvents.length
    : 0;

  const summary = `Relatório ${profile.name}: Analisados ${sectorEvents.length} eventos nas categorias [${profile.relevantCategories.join(", ")}]. ${criticalCount} eventos críticos detectados. Confiança média: ${(avgConfidence * 100).toFixed(1)}%.`;

  const risks: string[] = [];
  if (criticalCount > 5) risks.push("Alto volume de eventos críticos requer atenção imediata.");
  if (kpis.some((k) => k.status === "critical")) risks.push("Um ou mais KPIs em estado crítico.");
  if (avgConfidence < 0.6) risks.push("Baixa confiança média nos dados de eventos - verificar fontes.");
  if (sectorEvents.length > 100) risks.push("Volume elevado de eventos pode indicar cenários de risco em cascata.");

  const recommendations: string[] = [];
  if (criticalCount > 0) recommendations.push("Priorizar resposta a eventos críticos neste setor.");
  recommendations.push("Revisar e atualizar limites de monitoramento específicos do setor.");
  recommendations.push("Referenciar cruzadamente eventos com outros setores para análise de cascata.");
  if (avgConfidence < 0.7) recommendations.push("Aumentar a validação de fontes de dados recebidas.");

  return { summary, risks, recommendations };
}
