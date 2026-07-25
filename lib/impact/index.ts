// ============================================================
// GLOBAL IMPACT SCORE — Weighted Event Scoring Engine
// ============================================================

import type { GlobalEvent, ImpactScores, RiskLevel } from "../types";

export interface ImpactAssessment {
  eventId: string;
  globalScore: number;          // 0-100
  dimensionScores: {
    magnitude: number;          // 0-25
    population: number;         // 0-25
    infrastructure: number;     // 0-20
    proximity: number;          // 0-15
    confidence: number;         // 0-10
    cascade: number;            // 0-5
  };
  riskLevel: RiskLevel;
  category: string;
  summary: string;
  factors: string[];
}

// ─── POPULATION DENSITY DATABASE (major regions) ───────────

const POPULATION_DENSITY: { country: string; density: number; majorCities: { name: string; lat: number; lng: number; pop: number }[] }[] = [
  { country: "United States", density: 36, majorCities: [
    { name: "New York", lat: 40.71, lng: -74.01, pop: 8300000 },
    { name: "Los Angeles", lat: 34.05, lng: -118.24, pop: 3900000 },
    { name: "Chicago", lat: 41.88, lng: -87.63, pop: 2700000 },
  ]},
  { country: "Japan", density: 347, majorCities: [
    { name: "Tokyo", lat: 35.68, lng: 139.69, pop: 13900000 },
    { name: "Osaka", lat: 34.69, lng: 135.50, pop: 2700000 },
  ]},
  { country: "Iran", density: 52, majorCities: [
    { name: "Tehran", lat: 35.69, lng: 51.39, pop: 8700000 },
    { name: "Isfahan", lat: 32.65, lng: 51.68, pop: 1900000 },
  ]},
  { country: "Turkey", density: 110, majorCities: [
    { name: "Istanbul", lat: 41.01, lng: 28.98, pop: 15500000 },
    { name: "Ankara", lat: 39.93, lng: 32.86, pop: 5600000 },
  ]},
  { country: "Indonesia", density: 151, majorCities: [
    { name: "Jakarta", lat: -6.21, lng: 106.85, pop: 10600000 },
  ]},
  { country: "China", density: 153, majorCities: [
    { name: "Shanghai", lat: 31.23, lng: 121.47, pop: 24900000 },
    { name: "Beijing", lat: 39.90, lng: 116.40, pop: 21500000 },
  ]},
  { country: "India", density: 464, majorCities: [
    { name: "Mumbai", lat: 19.08, lng: 72.88, pop: 20400000 },
    { name: "Delhi", lat: 28.61, lng: 77.21, pop: 19000000 },
  ]},
  { country: "Brazil", density: 25, majorCities: [
    { name: "São Paulo", lat: -23.55, lng: -46.63, pop: 12300000 },
    { name: "Rio de Janeiro", lat: -22.91, lng: -43.17, pop: 6700000 },
  ]},
  { country: "Mexico", density: 66, majorCities: [
    { name: "Mexico City", lat: 19.43, lng: -99.13, pop: 9200000 },
  ]},
  { country: "Germany", density: 240, majorCities: [
    { name: "Berlin", lat: 52.52, lng: 13.41, pop: 3600000 },
    { name: "Hamburg", lat: 53.55, lng: 10.00, pop: 1900000 },
  ]},
  { country: "United Kingdom", density: 281, majorCities: [
    { name: "London", lat: 51.51, lng: -0.13, pop: 8900000 },
  ]},
  { country: "France", density: 119, majorCities: [
    { name: "Paris", lat: 48.86, lng: 2.35, pop: 2100000 },
  ]},
  { country: "Russia", density: 9, majorCities: [
    { name: "Moscow", lat: 55.76, lng: 37.62, pop: 12500000 },
  ]},
  { country: "South Korea", density: 527, majorCities: [
    { name: "Seoul", lat: 37.57, lng: 126.98, pop: 9700000 },
  ]},
  { country: "Australia", density: 3, majorCities: [
    { name: "Sydney", lat: -33.87, lng: 151.21, pop: 5300000 },
  ]},
];

// ─── CRITICAL INFRASTRUCTURE DATABASE ──────────────────────

const CRITICAL_INFRASTRUCTURE: { type: string; locations: { name: string; lat: number; lng: number; importance: number }[] }[] = [
  { type: "strait", locations: [
    { name: "Strait of Hormuz", lat: 26.57, lng: 56.25, importance: 100 },
    { name: "Strait of Malacca", lat: 2.50, lng: 101.50, importance: 95 },
    { name: "Suez Canal", lat: 30.58, lng: 32.34, importance: 90 },
    { name: "Panama Canal", lat: 9.08, lng: -79.68, importance: 85 },
    { name: "Bosphorus", lat: 41.12, lng: 29.05, importance: 80 },
  ]},
  { type: "pipeline", locations: [
    { name: "Druzhba Pipeline", lat: 52.00, lng: 30.00, importance: 75 },
    { name: "East Siberia–Pacific", lat: 55.00, lng: 110.00, importance: 70 },
  ]},
  { type: "cable", locations: [
    { name: "Mediterranean Cable Hub", lat: 36.00, lng: 15.00, importance: 80 },
    { name: "US-East Cable Landing", lat: 40.50, lng: -74.00, importance: 85 },
  ]},
];

// ─── SCORING FUNCTIONS ─────────────────────────────────────

export function calculateImpactScore(event: GlobalEvent, relatedEvents: GlobalEvent[] = []): ImpactAssessment {
  const magnitudeScore = scoreMagnitude(event);
  const populationScore = scorePopulation(event);
  const infrastructureScore = scoreInfrastructure(event);
  const proximityScore = scoreProximity(event);
  const confidenceScore = scoreConfidence(event);
  const cascadeScore = scoreCascade(event, relatedEvents);

  const globalScore = Math.min(
    Math.round(
      magnitudeScore +
      populationScore +
      infrastructureScore +
      proximityScore +
      confidenceScore +
      cascadeScore
    ),
    100
  );

  const riskLevel = scoreToRiskLevel(globalScore);
  const factors = identifyImpactFactors(event, magnitudeScore, populationScore, infrastructureScore, proximityScore, cascadeScore);
  const summary = generateImpactSummary(event, globalScore, riskLevel, factors);

  return {
    eventId: event.id,
    globalScore,
    dimensionScores: {
      magnitude: magnitudeScore,
      population: populationScore,
      infrastructure: infrastructureScore,
      proximity: proximityScore,
      confidence: confidenceScore,
      cascade: cascadeScore,
    },
    riskLevel,
    category: event.module,
    summary,
    factors,
  };
}

function scoreMagnitude(event: GlobalEvent): number {
  const meta = event.metadata as Record<string, unknown>;

  // Earthquake magnitude
  if (typeof meta.magnitude === "number") {
    const mag = meta.magnitude;
    if (mag >= 8.0) return 25;
    if (mag >= 7.0) return 22;
    if (mag >= 6.0) return 18;
    if (mag >= 5.0) return 14;
    if (mag >= 4.0) return 10;
    if (mag >= 3.0) return 6;
    return 3;
  }

  // Hurricane category
  if (typeof meta.category === "number") {
    return Math.min(meta.category * 5 + 5, 25);
  }

  // Wind speed (km/h)
  if (typeof meta.windSpeed === "number") {
    const ws = meta.windSpeed;
    if (ws >= 250) return 25;
    if (ws >= 200) return 22;
    if (ws >= 150) return 18;
    if (ws >= 100) return 14;
    if (ws >= 60) return 10;
    return 5;
  }

  // Generic risk-based scoring
  const riskScores: Record<RiskLevel, number> = {
    informativo: 2, baixo: 5, moderado: 10, alto: 15, critico: 20, emergencia: 23, extremo: 25,
  };
  return riskScores[event.riskLevel] || 5;
}

function scorePopulation(event: GlobalEvent): number {
  const { lat, lng, country } = event.location;

  // Check population density for country
  const countryData = POPULATION_DENSITY.find(c => c.country === country);
  if (countryData) {
    const densityScore = Math.min(countryData.density / 25, 10);

    // Check proximity to major cities
    let minCityDist = Infinity;
    for (const city of countryData.majorCities) {
      const dist = haversineDistance(lat, lng, city.lat, city.lng);
      if (dist < minCityDist) minCityDist = dist;
      if (dist < 50) return 25; // Direct hit on major city
      if (dist < 100) return 22;
      if (dist < 200) return 18;
    }

    if (minCityDist < 500) return Math.round(densityScore + 8);
    return Math.round(densityScore + 3);
  }

  // Default scoring based on coordinates
  return 10;
}

function scoreInfrastructure(event: GlobalEvent): number {
  const { lat, lng } = event.location;
  let score = 0;

  for (const infra of CRITICAL_INFRASTRUCTURE) {
    for (const loc of infra.locations) {
      const dist = haversineDistance(lat, lng, loc.lat, loc.lng);
      if (dist < 100) {
        score = Math.max(score, Math.round(loc.importance * 0.2));
      } else if (dist < 300) {
        score = Math.max(score, Math.round(loc.importance * 0.1));
      }
    }
  }

  return Math.min(score, 20);
}

function scoreProximity(event: GlobalEvent): number {
  const { lat, lng } = event.location;

  // Proximity to geopolitical hotspots
  const hotspots = [
    { name: "Middle East", lat: 30, lng: 45, weight: 1.2 },
    { name: "Korean Peninsula", lat: 37, lng: 127, weight: 1.1 },
    { name: "South China Sea", lat: 15, lng: 115, weight: 1.1 },
    { name: "Eastern Europe", lat: 50, lng: 30, weight: 1.0 },
    { name: "Arctic", lat: 75, lng: 0, weight: 0.8 },
  ];

  let maxWeight = 0.5;
  for (const hs of hotspots) {
    const dist = haversineDistance(lat, lng, hs.lat, hs.lng);
    if (dist < 500) maxWeight = Math.max(maxWeight, hs.weight);
  }

  return Math.round(10 * maxWeight);
}

function scoreConfidence(event: GlobalEvent): number {
  return Math.round(event.confidence * 10);
}

function scoreCascade(event: GlobalEvent, related: GlobalEvent[]): number {
  if (related.length === 0) return 0;
  if (related.length >= 5) return 5;
  if (related.length >= 3) return 4;
  if (related.length >= 2) return 3;
  return 2;
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

function identifyImpactFactors(
  event: GlobalEvent,
  mag: number, pop: number, infra: number, prox: number, cascade: number
): string[] {
  const factors: string[] = [];
  if (mag >= 20) factors.push("Magnitude extrema");
  if (pop >= 20) factors.push("Alta densidade populacional afetada");
  if (infra >= 15) factors.push("Infraestrutura crítica em risco");
  if (prox >= 12) factors.push("Região geopoliticamente sensível");
  if (cascade >= 3) factors.push("Múltiplos eventos em cascata");
  if (event.confidence < 0.5) factors.push("Informação de baixa confiabilidade");
  if (factors.length === 0) factors.push("Impacto moderado estimado");
  return factors;
}

function generateImpactSummary(event: GlobalEvent, score: number, risk: RiskLevel, factors: string[]): string {
  return `Evento ${event.module} com score de impacto global ${score}/100 (risco ${risk}). ${factors.join(". ")}.`;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── BATCH ASSESSMENT ──────────────────────────────────────

export function assessAllEvents(events: GlobalEvent[]): ImpactAssessment[] {
  return events.map(event => {
    const related = events.filter(e =>
      e.id !== event.id &&
      haversineDistance(event.location.lat, event.location.lng, e.location.lat, e.location.lng) < 500
    );
    return calculateImpactScore(event, related);
  }).sort((a, b) => b.globalScore - a.globalScore);
}

export function getGlobalRiskIndex(assessments: ImpactAssessment[]): {
  index: number;
  level: RiskLevel;
  trend: "crescente" | "estavel" | "decrescente";
  topThreats: { category: string; score: number }[];
} {
  if (assessments.length === 0) {
    return { index: 0, level: "informativo", trend: "estavel", topThreats: [] };
  }

  const avgScore = assessments.reduce((s, a) => s + a.globalScore, 0) / assessments.length;
  const maxScore = Math.max(...assessments.map(a => a.globalScore));
  const index = Math.round(avgScore * 0.6 + maxScore * 0.4);

  const categoryScores = new Map<string, number[]>();
  for (const a of assessments) {
    if (!categoryScores.has(a.category)) categoryScores.set(a.category, []);
    categoryScores.get(a.category)!.push(a.globalScore);
  }

  const topThreats = Array.from(categoryScores.entries())
    .map(([cat, scores]) => ({ category: cat, score: Math.round(Math.max(...scores)) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return {
    index,
    level: scoreToRiskLevel(index),
    trend: "estavel",
    topThreats,
  };
}
