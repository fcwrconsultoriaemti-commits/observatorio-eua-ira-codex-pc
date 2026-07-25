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
    name: "Energy Sector Intelligence",
    type: "energy",
    description: "Power plants, refineries, pipelines, grid infrastructure, outages, and energy supply chain monitoring.",
    relevantCategories: ["energia", "infraestrutura", "clima_severo", "incendio", "cibernetico"],
    kpis: [],
    dashboards: [
      {
        id: "energy-overview",
        title: "Energy Infrastructure Overview",
        panels: [
          { type: "map", title: "Critical Infrastructure Map", config: { layers: ["power_plants", "pipelines", "substations"] } },
          { type: "chart", title: "Grid Load Distribution", config: { aggregation: "region" } },
          { type: "gauge", title: "System Reliability Index", config: { threshold: 99.5 } },
        ],
      },
    ],
    alerts: [],
  },
  logistics: {
    id: "SEC-LOGISTICS",
    name: "Logistics Sector Intelligence",
    type: "logistics",
    description: "Ports, airports, highways, railways, and global supply chain monitoring.",
    relevantCategories: ["maritimo", "aereo", "infraestrutura", "clima_severo", "economico"],
    kpis: [],
    dashboards: [
      {
        id: "logistics-overview",
        title: "Logistics Operations Dashboard",
        panels: [
          { type: "map", title: "Active Transport Routes", config: { modes: ["sea", "air", "road", "rail"] } },
          { type: "table", title: "Port Congestion Index", config: { sortBy: "waitTime" } },
          { type: "chart", title: "Supply Chain Risk Trend", config: { period: "7d" } },
        ],
      },
    ],
    alerts: [],
  },
  health: {
    id: "SEC-HEALTH",
    name: "Health Sector Intelligence",
    type: "health",
    description: "Epidemic monitoring, air quality, hospital capacity, and disease outbreak tracking.",
    relevantCategories: ["saude", "clima_severo", "incendio", "infraestrutura"],
    kpis: [],
    dashboards: [
      {
        id: "health-overview",
        title: "Public Health Monitoring",
        panels: [
          { type: "map", title: "Disease Outbreak Zones", config: { sources: ["WHO", "CDC", "local"] } },
          { type: "chart", title: "Air Quality Index Trends", config: { pollutants: ["PM2.5", "NO2", "O3"] } },
          { type: "gauge", title: "Hospital Bed Occupancy", config: { regions: "all" } },
        ],
      },
    ],
    alerts: [],
  },
  defense: {
    id: "SEC-DEFENSE",
    name: "Defense Sector Intelligence",
    type: "defense",
    description: "Military movements, border security, conflict zones, and geopolitical threat monitoring.",
    relevantCategories: ["conflito", "cibernetico", "neo", "satelite", "infraestrutura"],
    kpis: [],
    dashboards: [
      {
        id: "defense-overview",
        title: "Defense & Security Operations",
        panels: [
          { type: "map", title: "Conflict Zone Monitoring", config: { sources: ["ACLED", "satellite"] } },
          { type: "table", title: "Border Incident Log", config: { filters: ["severity", "type"] } },
          { type: "timeline", title: "Military Movement Timeline", config: { actors: "all" } },
        ],
      },
    ],
    alerts: [],
  },
  finance: {
    id: "SEC-FINANCE",
    name: "Financial Sector Intelligence",
    type: "finance",
    description: "Market volatility, oil prices, currency fluctuations, commodities, and economic risk analysis.",
    relevantCategories: ["economico", "cibernetico", "neo", "maritimo", "infraestrutura"],
    kpis: [],
    dashboards: [
      {
        id: "finance-overview",
        title: "Financial Risk Dashboard",
        panels: [
          { type: "chart", title: "Market Volatility Index", config: { indices: ["VIX", "S&P500", "IBOV"] } },
          { type: "gauge", title: "Oil Price Tracker", config: { benchmarks: ["WTI", "Brent", "Dubai"] } },
          { type: "table", title: "Currency Exchange Rates", config: { pairs: ["USD/BRL", "EUR/BRL", "CNY/BRL"] } },
        ],
      },
    ],
    alerts: [],
  },
  telecom: {
    id: "SEC-TELECOM",
    name: "Telecom Sector Intelligence",
    type: "telecom",
    description: "Network outages, cyber attacks, satellite communications, and fiber infrastructure monitoring.",
    relevantCategories: ["cibernetico", "infraestrutura", "satelite", "neo"],
    kpis: [],
    dashboards: [
      {
        id: "telecom-overview",
        title: "Telecom Infrastructure Monitor",
        panels: [
          { type: "map", title: "Network Status Map", config: { providers: "all" } },
          { type: "chart", title: "Cyber Attack Attempts", config: { period: "24h" } },
          { type: "table", title: "Satellite Coverage Status", config: { constellation: "all" } },
        ],
      },
    ],
    alerts: [],
  },
  agriculture: {
    id: "SEC-AGRICULTURE",
    name: "Agriculture Sector Intelligence",
    type: "agriculture",
    description: "Crop monitoring, drought tracking, commodity prices, and food security analysis.",
    relevantCategories: ["clima_severo", "seca", "enchente", "economico", "incendio"],
    kpis: [],
    dashboards: [
      {
        id: "agriculture-overview",
        title: "Agricultural Intelligence Dashboard",
        panels: [
          { type: "map", title: "Crop Health Satellite View", config: { indices: ["NDVI", "EVI"] } },
          { type: "chart", title: "Precipitation vs Normal", config: { period: "30d" } },
          { type: "gauge", title: "Food Security Index", config: { regions: "global" } },
        ],
      },
    ],
    alerts: [],
  },
  manufacturing: {
    id: "SEC-MANUFACTURING",
    name: "Manufacturing Sector Intelligence",
    type: "manufacturing",
    description: "Industrial production, supply chain disruptions, raw material availability, and factory monitoring.",
    relevantCategories: ["infraestrutura", "economico", "cibernetico", "logistics", "clima_severo"],
    kpis: [],
    dashboards: [
      {
        id: "manufacturing-overview",
        title: "Manufacturing Operations Monitor",
        panels: [
          { type: "map", title: "Industrial Facility Map", config: { sectors: "all" } },
          { type: "chart", title: "Raw Material Price Trends", config: { commodities: ["steel", "aluminum", "copper", "lithium"] } },
          { type: "table", title: "Supply Chain Disruption Log", config: { severity: "all" } },
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
      name: "Total Events",
      value: String(totalEvents),
      unit: "events",
      trend: trendUp ? "up" : trendDown ? "down" : "stable",
      status: totalEvents > 100 ? "warning" : "normal",
    },
    {
      name: "Critical Events",
      value: String(criticalEvents),
      unit: "events",
      trend: "stable",
      status: criticalEvents > 10 ? "critical" : criticalEvents > 5 ? "warning" : "normal",
    },
    {
      name: "Moderate+ Events",
      value: String(moderateEvents),
      unit: "events",
      trend: trendUp ? "up" : trendDown ? "down" : "stable",
      status: moderateEvents > 30 ? "warning" : "normal",
    },
    {
      name: "Avg Impact Score",
      value: avgImpact.toFixed(1),
      unit: "score",
      trend: "stable",
      status: avgImpact > 70 ? "critical" : avgImpact > 40 ? "warning" : "normal",
    },
    {
      name: "24h Event Volume",
      value: String(recentEvents),
      unit: "events",
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

  const summary = `${profile.name} Report: Analyzed ${sectorEvents.length} events across categories [${profile.relevantCategories.join(", ")}]. ${criticalCount} critical events detected. Average confidence: ${(avgConfidence * 100).toFixed(1)}%.`;

  const risks: string[] = [];
  if (criticalCount > 5) risks.push("High volume of critical events requires immediate attention.");
  if (kpis.some((k) => k.status === "critical")) risks.push("One or more KPIs in critical status.");
  if (avgConfidence < 0.6) risks.push("Low average confidence in event data - verify sources.");
  if (sectorEvents.length > 100) risks.push("Elevated event volume may indicate cascading risk scenarios.");

  const recommendations: string[] = [];
  if (criticalCount > 0) recommendations.push("Prioritize response to critical events in this sector.");
  recommendations.push("Review and update sector-specific monitoring thresholds.");
  recommendations.push("Cross-reference events with other sectors for cascade analysis.");
  if (avgConfidence < 0.7) recommendations.push("Increase validation of incoming data sources.");

  return { summary, risks, recommendations };
}
