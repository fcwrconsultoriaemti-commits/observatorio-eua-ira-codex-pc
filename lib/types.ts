// ============================================================
// GLOBAL INTELLIGENCE PLATFORM — TYPES
// ============================================================

export type RiskLevel = "informativo" | "baixo" | "moderado" | "alto" | "critico" | "emergencia" | "extremo";
export type RiskCategory = "terremoto" | "vulcao" | "furacao" | "tornado" | "clima_severo" | "incendio" | "enchente" | "seca" | "espacial" | "neo" | "satelite" | "saude" | "cibernetico" | "energia" | "maritimo" | "aereo" | "economico" | "infraestrutura" | "conflito";
export type AlertStatus = "novo" | "atualizado" | "resolvido" | "expirado";

export interface GeoLocation {
  lat: number;
  lng: number;
  country?: string;
  state?: string;
  city?: string;
  depth?: number;
  altitude?: number;
}

export interface ImpactScores {
  operational: number;   // 0-100
  humanitarian: number;  // 0-100
  economic: number;      // 0-100
  environmental: number; // 0-100
  security: number;      // 0-100
}

export interface GlobalEvent {
  id: string;
  source: string;
  module: RiskCategory;
  title: string;
  description: string;
  location: GeoLocation;
  timestamp: string;
  riskLevel: RiskLevel;
  impact: ImpactScores;
  confidence: number;        // 0-1
  tags: string[];
  relatedEvents: string[];   // IDs de eventos correlacionados
  metadata: Record<string, unknown>;
  raw?: unknown;
}

export interface GlobalAlert {
  id: string;
  eventId: string;
  origin: RiskCategory;
  source: string;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  location: GeoLocation;
  timestamp: string;
  confidence: number;
  impact: ImpactScores;
  relatedEvents: string[];
  status: AlertStatus;
  acknowledged: boolean;
}

export interface MonitorModule {
  name: string;
  category: RiskCategory;
  version: string;
  enabled: boolean;
  fetch(): Promise<GlobalEvent[]>;
  health(): Promise<boolean>;
}

export interface CorrelationResult {
  eventId: string;
  linkedEvents: string[];
  chain: string[];
  cascadeRisk: RiskLevel;
  description: string;
}

export interface IntelligenceSummary {
  totalEvents: number;
  activeAlerts: number;
  criticalAlerts: number;
  eventsByCategory: Record<RiskCategory, number>;
  eventsByRisk: Record<RiskLevel, number>;
  topImpactZones: GeoLocation[];
  recentCorrelations: CorrelationResult[];
  lastUpdated: string;
}

export interface NotificationPayload {
  alert: GlobalAlert;
  channels: string[];
  message: string;
  timestamp: string;
}
