// ============================================================
// SCENARIO SIMULATOR — What-If Analysis Engine
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory, ImpactScores, GeoLocation } from "../types";
import { calculateImpactScore, getGlobalRiskIndex } from "../impact";
import { buildConsequenceTree } from "../correlation/advanced";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  type: "disaster" | "conflict" | "infrastructure" | "economic" | "health" | "cyber" | "custom";
  parameters: ScenarioParameters;
  createdAt: string;
  createdBy: string;
  results?: ScenarioResults;
}

export interface ScenarioParameters {
  category: RiskCategory;
  magnitude: number;
  location: GeoLocation;
  duration?: string;
  spread?: number;
  affectedPopulation?: number;
  infrastructureDamage?: number;
  economicImpact?: number;
  secondaryEffects?: string[];
  customFactors?: Record<string, unknown>;
}

export interface ScenarioResults {
  directImpact: ImpactAssessmentResult[];
  cascadeEffects: CascadeEffect[];
  economicImpact: EconomicImpactEstimate;
  humanitarianImpact: HumanitarianImpactEstimate;
  infrastructureImpact: InfrastructureImpactEstimate;
  timeline: ScenarioTimelineEntry[];
  riskScore: number;
  riskLevel: RiskLevel;
  summary: string;
  recommendations: string[];
  confidence: number;
  disclaimer: string;
}

export interface ImpactAssessmentResult {
  category: RiskCategory;
  description: string;
  severity: RiskLevel;
  probability: number;
  timeframe: string;
}

export interface CascadeEffect {
  trigger: string;
  consequence: string;
  probability: number;
  delay: string;
  impact: string;
}

export interface EconomicImpactEstimate {
  directCost: string;
  indirectCost: string;
  totalEstimate: string;
  affectedSectors: string[];
  recoveryTime: string;
}

export interface HumanitarianImpactEstimate {
  displacedPeople: string;
  casualties: string;
  infrastructureNeeded: string[];
  medicalNeeds: string[];
}

export interface InfrastructureImpactEstimate {
  affectedTypes: string[];
  criticalFacilities: string[];
  estimatedRepairTime: string;
  estimatedCost: string;
}

export interface ScenarioTimelineEntry {
  time: string;
  event: string;
  impact: string;
  probability: number;
}

// ─── STORE ─────────────────────────────────────────────────

const scenarios: Map<string, Scenario> = new Map();
let scenarioCounter = 0;

// ─── CASCADE RULES (same as advanced correlation) ──────────

const CASCADE_RULES: { from: string; to: string; probability: number; delay: string; description: string }[] = [
  { from: "terremoto", to: "enchente", probability: 0.4, delay: "0-6h", description: "Tsunami e deslizamentos" },
  { from: "terremoto", to: "infraestrutura", probability: 0.7, delay: "0-2h", description: "Danos a estruturas" },
  { from: "terremoto", to: "maritimo", probability: 0.5, delay: "0-24h", description: "Fechamento de portos" },
  { from: "furacao", to: "enchente", probability: 0.8, delay: "0-12h", description: "Inundações costeiras" },
  { from: "furacao", to: "infraestrutura", probability: 0.6, delay: "0-6h", description: "Danos por vento" },
  { from: "furacao", to: "maritimo", probability: 0.9, delay: "0-24h", description: "Fechamento de portos" },
  { from: "furacao", to: "aereo", probability: 0.85, delay: "0-12h", description: "Cancelamento de voos" },
  { from: "incendio", to: "saude", probability: 0.6, delay: "0-48h", description: "Poluição do ar" },
  { from: "enchente", to: "saude", probability: 0.5, delay: "0-72h", description: "Doenças hídricas" },
  { from: "enchente", to: "infraestrutura", probability: 0.6, delay: "0-12h", description: "Danos a estradas" },
  { from: "conflito", to: "maritimo", probability: 0.7, delay: "0-24h", description: "Bloqueio de rotas" },
  { from: "conflito", to: "energia", probability: 0.8, delay: "0-48h", description: "Interrupção de supply" },
  { from: "cibernetico", to: "energia", probability: 0.5, delay: "0-6h", description: "Ataque a SCADA" },
  { from: "cibernetico", to: "infraestrutura", probability: 0.6, delay: "0-12h", description: "Destruição de dados" },
  { from: "espacial", to: "aereo", probability: 0.6, delay: "0-4h", description: "Falha de GPS" },
  { from: "espacial", to: "energia", probability: 0.4, delay: "0-12h", description: "Tempestade geomagnética" },
];

// ─── SIMULATION ENGINE ─────────────────────────────────────

export function simulate(params: {
  name: string;
  description: string;
  type: Scenario["type"];
  parameters: ScenarioParameters;
  createdBy: string;
}): Scenario {
  const id = `SIM-${Date.now()}-${++scenarioCounter}`;
  const now = new Date().toISOString();

  const scenario: Scenario = {
    id,
    name: params.name,
    description: params.description,
    type: params.type,
    parameters: params.parameters,
    createdAt: now,
    createdBy: params.createdBy,
  };

  const results = runSimulation(params.parameters);
  scenario.results = results;

  scenarios.set(id, scenario);
  return scenario;
}

function runSimulation(params: ScenarioParameters): ScenarioResults {
  const directImpact = calculateDirectImpact(params);
  const cascadeEffects = calculateCascadeEffects(params);
  const economicImpact = estimateEconomicImpact(params);
  const humanitarianImpact = estimateHumanitarianImpact(params);
  const infrastructureImpact = estimateInfrastructureImpact(params);
  const timeline = buildScenarioTimeline(params, cascadeEffects);

  const riskScore = calculateScenarioRiskScore(params, directImpact, cascadeEffects);
  const riskLevel = scoreToRiskLevel(riskScore);

  const summary = generateScenarioSummary(params, riskLevel, directImpact, cascadeEffects);
  const recommendations = generateScenarioRecommendations(params, riskLevel);

  return {
    directImpact,
    cascadeEffects,
    economicImpact,
    humanitarianImpact,
    infrastructureImpact,
    timeline,
    riskScore,
    riskLevel,
    summary,
    recommendations,
    confidence: 0.6,
    disclaimer: "ESTA É UMA SIMULAÇÃO BASEADA EM MODELOS. NÃO É UMA PREVISÃO CONFIRMADA. Resultados são estimativas para planejamento e preparação.",
  };
}

function calculateDirectImpact(params: ScenarioParameters): ImpactAssessmentResult[] {
  const impacts: ImpactAssessmentResult[] = [];
  const { category, magnitude, location } = params;

  // Primary impact
  impacts.push({
    category,
    description: `Impacto direto de ${category} com magnitude ${magnitude}`,
    severity: magnitude >= 8 ? "extremo" : magnitude >= 6 ? "critico" : magnitude >= 4 ? "alto" : "moderado",
    probability: 0.95,
    timeframe: "0-6h",
  });

  // Secondary impacts based on category
  const secondaryMap: Record<string, { category: string; desc: string; prob: number }[]> = {
    terremoto: [
      { category: "enchente", desc: "Tsunami potencial", prob: 0.3 },
      { category: "infraestrutura", desc: "Danos a edificações", prob: 0.7 },
      { category: "saude", desc: "Vítimas e feridos", prob: 0.6 },
    ],
    furacao: [
      { category: "enchente", desc: "Inundações costeiras", prob: 0.8 },
      { category: "infraestrutura", desc: "Danos por vento", prob: 0.6 },
      { category: "aereo", desc: "Cancelamento de voos", prob: 0.85 },
    ],
    incendio: [
      { category: "saude", desc: "Poluição do ar", prob: 0.6 },
      { category: "infraestrutura", desc: "Destruição de área", prob: 0.5 },
    ],
    conflito: [
      { category: "maritimo", desc: "Bloqueio de rotas", prob: 0.7 },
      { category: "energia", desc: "Interrupção de supply", prob: 0.8 },
      { category: "economico", desc: "Incerteza de mercado", prob: 0.7 },
    ],
    cibernetico: [
      { category: "energia", desc: "Ataque a sistemas", prob: 0.5 },
      { category: "infraestrutura", desc: "Destruição de dados", prob: 0.6 },
    ],
  };

  const secondary = secondaryMap[category] || [];
  for (const s of secondary) {
    impacts.push({
      category: s.category as RiskCategory,
      description: s.desc,
      severity: magnitude >= 7 ? "critico" : magnitude >= 5 ? "alto" : "moderado",
      probability: s.prob,
      timeframe: "0-48h",
    });
  }

  return impacts;
}

function calculateCascadeEffects(params: ScenarioParameters): CascadeEffect[] {
  const effects: CascadeEffect[] = [];
  const rules = CASCADE_RULES.filter(r => r.from === params.category);

  for (const rule of rules) {
    effects.push({
      trigger: params.category,
      consequence: rule.to,
      probability: rule.probability * (params.magnitude / 10),
      delay: rule.delay,
      impact: rule.description,
    });
  }

  return effects;
}

function estimateEconomicImpact(params: ScenarioParameters): EconomicImpactEstimate {
  const baseCost = params.magnitude * 1000000000; // $1B per magnitude point
  const populationFactor = params.affectedPopulation ? Math.log10(params.affectedPopulation) : 1;
  const totalCost = baseCost * populationFactor;

  return {
    directCost: formatUSD(totalCost * 0.6),
    indirectCost: formatUSD(totalCost * 0.4),
    totalEstimate: formatUSD(totalCost),
    affectedSectors: getAffectedSectors(params.category),
    recoveryTime: params.magnitude >= 7 ? "6-24 meses" : params.magnitude >= 5 ? "1-6 meses" : "1-4 semanas",
  };
}

function estimateHumanitarianImpact(params: ScenarioParameters): HumanitarianImpactEstimate {
  const displaced = params.affectedPopulation ? Math.round(params.affectedPopulation * 0.1) : params.magnitude * 100000;
  const casualties = Math.round(displaced * 0.001);

  return {
    displacedPeople: displaced.toLocaleString("pt-BR"),
    casualties: casualties.toLocaleString("pt-BR"),
    infrastructureNeeded: ["Abrigos temporários", "Água potável", "Alimentos", "Assistência médica"],
    medicalNeeds: ["Traumatologia", "Cirurgia", "Psicologia", "Doenças infecciosas"],
  };
}

function estimateInfrastructureImpact(params: ScenarioParameters): InfrastructureImpactEstimate {
  return {
    affectedTypes: getAffectedInfrastructure(params.category),
    criticalFacilities: ["Hospitais", "Escolas", "Pontes", "Rodovias", "Rede elétrica"],
    estimatedRepairTime: params.magnitude >= 7 ? "6-12 meses" : "1-3 meses",
    estimatedCost: formatUSD(params.magnitude * 500000000),
  };
}

function buildScenarioTimeline(params: ScenarioParameters, cascades: CascadeEffect[]): ScenarioTimelineEntry[] {
  const timeline: ScenarioTimelineEntry[] = [];

  timeline.push({
    time: "T+0",
    event: `${params.category} ocorre`,
    impact: `Magnitude ${params.magnitude}`,
    probability: 0.95,
  });

  for (const cascade of cascades) {
    timeline.push({
      time: cascade.delay,
      event: cascade.consequence,
      impact: cascade.impact,
      probability: cascade.probability,
    });
  }

  timeline.push({
    time: "T+24h",
    event: "Avaliação de danos completa",
    impact: "Dados consolidados disponíveis",
    probability: 0.8,
  });

  timeline.push({
    time: "T+7d",
    event: "Início da recuperação",
    impact: "Estimativa de custos e prazos",
    probability: 0.7,
  });

  return timeline;
}

function calculateScenarioRiskScore(params: ScenarioParameters, impacts: ImpactAssessmentResult[], cascades: CascadeEffect[]): number {
  let score = 0;

  // Magnitude factor (0-30)
  score += Math.min(params.magnitude * 3.75, 30);

  // Population factor (0-25)
  if (params.affectedPopulation) {
    score += Math.min(Math.log10(params.affectedPopulation) * 5, 25);
  }

  // Cascade factor (0-20)
  score += Math.min(cascades.length * 3, 20);

  // Infrastructure factor (0-15)
  if (params.infrastructureDamage) {
    score += Math.min(params.infrastructureDamage * 0.15, 15);
  }

  // Economic factor (0-10)
  if (params.economicImpact) {
    score += Math.min(params.economicImpact / 1000000000, 10);
  }

  return Math.min(Math.round(score), 100);
}

function generateScenarioSummary(params: ScenarioParameters, risk: RiskLevel, impacts: ImpactAssessmentResult[], cascades: CascadeEffect[]): string {
  return `Simulação: ${params.category} com magnitude ${params.magnitude} em ${params.location.lat.toFixed(2)}°, ${params.location.lng.toFixed(2)}°. Risco estimado: ${risk}. ${impacts.length} impacto(s) direto(s), ${cascades.length} efeito(s) em cascata.`;
}

function generateScenarioRecommendations(params: ScenarioParameters, risk: RiskLevel): string[] {
  const recs: string[] = [];

  if (risk === "extremo" || risk === "emergencia") {
    recs.push("Ativar protocolo de emergência máxima");
    recs.push("Mobilizar recursos de resposta imediata");
    recs.push("Comunicar autoridades nacionais e internacionais");
  }
  if (risk === "critico" || risk === "alto") {
    recs.push("Preparar equipes de resposta");
    recs.push("Avaliar rotas de evacuação");
    recs.push("Estoque de suprimentos de emergência");
  }
  recs.push("Monitorar evolução em tempo real");
  recs.push("Manter canais de comunicação abertos");

  return recs;
}

// ─── HELPERS ───────────────────────────────────────────────

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 90) return "extremo";
  if (score >= 75) return "emergencia";
  if (score >= 60) return "critico";
  if (score >= 45) return "alto";
  if (score >= 30) return "moderado";
  if (score >= 15) return "baixo";
  return "informativo";
}

function formatUSD(amount: number): string {
  if (amount >= 1e12) return `$${(amount / 1e12).toFixed(1)}T`;
  if (amount >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  return `$${amount.toLocaleString("en-US")}`;
}

function getAffectedSectors(category: string): string[] {
  const map: Record<string, string[]> = {
    terremoto: ["Construção", "Seguros", "Turismo", "Logística", "Energia"],
    furacao: ["Aviação", "Marítimo", "Agronegócio", "Seguros", "Energia"],
    incendio: ["Agronegócio", "Turismo", "Saúde", "Seguros"],
    conflito: ["Petróleo", "Gás", "Logística", "Agronegócio", "Finanças"],
    cibernetico: ["Tecnologia", "Finanças", "Saúde", "Energia", "Telecomunicações"],
  };
  return map[category] || ["Geral"];
}

function getAffectedInfrastructure(category: string): string[] {
  const map: Record<string, string[]> = {
    terremoto: ["Edificações", "Pontes", "Rodovias", "Rede elétrica", "Tubulações"],
    furacao: ["Linhas de transmissão", "Edificações", "Portos", "Aeroportos"],
    incendio: ["Edificações", "Florestas", "Rede elétrica"],
    conflito: ["Portos", "Aeroportos", "Rodovias", "Rede elétrica", "Telecomunicações"],
    cibernetico: ["Data centers", "Redes", "Sistemas de controle"],
  };
  return map[category] || ["Infraestrutura geral"];
}

// ─── CRUD ──────────────────────────────────────────────────

export function getScenario(id: string): Scenario | undefined {
  return scenarios.get(id);
}

export function getAllScenarios(): Scenario[] {
  return Array.from(scenarios.values())
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function deleteScenario(id: string): boolean {
  return scenarios.delete(id);
}

// ─── PRESET SCENARIOS ──────────────────────────────────────

export function getPresetScenarios(): ScenarioParameters[] {
  return [
    {
      category: "terremoto",
      magnitude: 8.5,
      location: { lat: -33.45, lng: -70.67, country: "Chile", city: "Santiago" },
      affectedPopulation: 5000000,
      infrastructureDamage: 80,
      economicImpact: 50000000000,
    },
    {
      category: "furacao",
      magnitude: 5,
      location: { lat: 25.0, lng: -75.0, country: "Caribbean" },
      affectedPopulation: 2000000,
      infrastructureDamage: 60,
      economicImpact: 20000000000,
    },
    {
      category: "terremoto",
      magnitude: 9.0,
      location: { lat: 36.0, lng: 140.0, country: "Japan", city: "Tokyo" },
      affectedPopulation: 30000000,
      infrastructureDamage: 70,
      economicImpact: 200000000000,
    },
    {
      category: "conflito",
      magnitude: 6,
      location: { lat: 25.0, lng: 55.0, country: "UAE", city: "Dubai" },
      affectedPopulation: 1000000,
      infrastructureDamage: 40,
      economicImpact: 100000000000,
    },
    {
      category: "cibernetico",
      magnitude: 7,
      location: { lat: 40.71, lng: -74.01, country: "USA", city: "New York" },
      affectedPopulation: 20000000,
      infrastructureDamage: 50,
      economicImpact: 80000000000,
    },
  ];
}
