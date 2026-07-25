import type { GlobalEvent, RiskLevel, RiskCategory, GeoLocation, ImpactScores } from "../types";

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  riskLevel: RiskLevel;
  status: "novo" | "em_monitoramento" | "confirmado" | "resolvido";
  location: GeoLocation;
  radius: number; // km
  sources: IncidentSource[];
  media: IncidentMedia[];
  predictions: string[];
  relatedIncidents: string[];
  impact: ImpactScores;
  globalScore: number;
  firstSeen: string;
  lastUpdated: string;
  timeline: { timestamp: string; event: string; source: string }[];
  metadata: Record<string, unknown>;
}

export interface IncidentSource {
  eventId: string;
  source: string;
  reliability: number; // 0-100
  confidence: number;  // 0-1
  timestamp: string;
  url?: string;
}

export interface IncidentMedia {
  type: "image" | "video" | "document" | "satellite";
  url: string;
  source: string;
  timestamp: string;
  description?: string;
}

// In-memory store for incidents
const incidents: Map<string, Incident> = new Map();

// Helper function to calculate distance between two geo points (Haversine formula)
function calculateDistance(loc1: GeoLocation, loc2: GeoLocation): number {
  const R = 6371; // Earth's radius in km
  const dLat = (loc2.lat - loc1.lat) * Math.PI / 180;
  const dLng = (loc2.lng - loc1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * Math.PI / 180) * Math.cos(loc2.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper function to calculate string similarity (Jaccard similarity)
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.toLowerCase().split(/\s+/));
  const words2 = new Set(str2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Helper function to generate unique ID
function generateId(): string {
  return `inc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper function to calculate global score based on source reliabilities
function calculateGlobalScore(sources: IncidentSource[]): number {
  if (sources.length === 0) return 0;
  const totalWeight = sources.reduce((sum, src) => sum + src.reliability, 0);
  const weightedSum = sources.reduce((sum, src) => sum + (src.reliability * src.confidence), 0);
  return totalWeight === 0 ? 0 : weightedSum / totalWeight;
}

// 1. ingestEvent(event: GlobalEvent): Incident
export function ingestEvent(event: GlobalEvent): Incident {
  // Find matching incidents based on category, location, and time
  const now = new Date(event.timestamp);
  let matchedIncident: Incident | undefined;

  for (const incident of incidents.values()) {
    // Check category match
    if (incident.category !== event.module) continue;

    // Check time within 24 hours
    const incidentTime = new Date(incident.lastSeen);
    const timeDiffHours = Math.abs(now.getTime() - incidentTime.getTime()) / (1000 * 60 * 60);
    if (timeDiffHours > 24) continue;

    // Check location within 200km
    const distance = calculateDistance(incident.location, event.location);
    if (distance > 200) continue;

    // Check title similarity > 70%
    const similarity = calculateSimilarity(incident.title, event.title);
    if (similarity > 0.7) {
      matchedIncident = incident;
      break;
    }
  }

  if (matchedIncident) {
    // Merge event into existing incident
    const source: IncidentSource = {
      eventId: event.id,
      source: event.source,
      reliability: 80, // Default reliability, could be fetched from source system
      confidence: event.confidence,
      timestamp: event.timestamp,
      url: event.metadata.url as string | undefined
    };
    matchedIncident.sources.push(source);
    matchedIncident.lastUpdated = new Date().toISOString();
    matchedIncident.globalScore = calculateGlobalScore(matchedIncident.sources);
    
    // Update risk level if new event is more severe
    const riskLevels: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
    const currentRiskIndex = riskLevels.indexOf(matchedIncident.riskLevel);
    const newRiskIndex = riskLevels.indexOf(event.riskLevel);
    if (newRiskIndex > currentRiskIndex) {
      matchedIncident.riskLevel = event.riskLevel;
    }
    
    // Add to timeline
    matchedIncident.timeline.push({
      timestamp: event.timestamp,
      event: `Novo evento recebido: ${event.title}`,
      source: event.source
    });
    
    return matchedIncident;
  }

  // Create new incident
  const newIncident: Incident = {
    id: generateId(),
    title: event.title,
    description: event.description,
    category: event.module,
    riskLevel: event.riskLevel,
    status: "novo",
    location: event.location,
    radius: 200, // Default radius in km
    sources: [{
      eventId: event.id,
      source: event.source,
      reliability: 80,
      confidence: event.confidence,
      timestamp: event.timestamp,
      url: event.metadata.url as string | undefined
    }],
    media: [],
    predictions: [],
    relatedIncidents: [],
    impact: event.impact,
    globalScore: 0,
    firstSeen: event.timestamp,
    lastUpdated: event.timestamp,
    timeline: [{
      timestamp: event.timestamp,
      event: "Incidente criado",
      source: event.source
    }],
    metadata: event.metadata
  };

  newIncident.globalScore = calculateGlobalScore(newIncident.sources);
  incidents.set(newIncident.id, newIncident);
  return newIncident;
}

// 2. getIncidents(filters?): Incident[]
export function getIncidents(filters?: {
  category?: RiskCategory;
  riskLevel?: RiskLevel;
  status?: Incident["status"];
  location?: GeoLocation;
  radius?: number;
  startDate?: string;
  endDate?: string;
}): Incident[] {
  let result = Array.from(incidents.values());

  if (filters) {
    if (filters.category) {
      result = result.filter(i => i.category === filters.category);
    }
    if (filters.riskLevel) {
      result = result.filter(i => i.riskLevel === filters.riskLevel);
    }
    if (filters.status) {
      result = result.filter(i => i.status === filters.status);
    }
    if (filters.location && filters.radius) {
      result = result.filter(i => calculateDistance(i.location, filters.location!) <= filters.radius!);
    }
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter(i => new Date(i.firstSeen) >= start);
    }
    if (filters.endDate) {
      const end = new Date(filters.endDate);
      result = result.filter(i => new Date(i.lastUpdated) <= end);
    }
  }

  return result.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
}

// 3. getIncident(id: string): Incident | undefined
export function getIncident(id: string): Incident | undefined {
  return incidents.get(id);
}

// 4. mergeIncidents(source: string, target: string): boolean
export function mergeIncidents(source: string, target: string): boolean {
  const sourceIncident = incidents.get(source);
  const targetIncident = incidents.get(target);
  
  if (!sourceIncident || !targetIncident) return false;
  if (source === target) return false;

  // Keep the incident with higher reliability sources as the base
  const [base, other] = sourceIncident.globalScore >= targetIncident.globalScore 
    ? [sourceIncident, targetIncident] 
    : [targetIncident, sourceIncident];

  // Merge sources
  base.sources.push(...other.sources);
  
  // Merge media
  base.media.push(...other.media);
  
  // Merge timeline
  base.timeline.push(...other.timeline);
  base.timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  // Merge related incidents
  base.relatedIncidents = [...new Set([...base.relatedIncidents, ...other.relatedIncidents, source, target])];
  
  // Update global score
  base.globalScore = calculateGlobalScore(base.sources);
  
  // Update risk level to the more severe one
  const riskLevels: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  const baseRiskIndex = riskLevels.indexOf(base.riskLevel);
  const otherRiskIndex = riskLevels.indexOf(other.riskLevel);
  if (otherRiskIndex > baseRiskIndex) {
    base.riskLevel = other.riskLevel;
  }
  
  // Update timestamps
  base.firstSeen = new Date(Math.min(new Date(base.firstSeen).getTime(), new Date(other.firstSeen).getTime())).toISOString();
  base.lastUpdated = new Date().toISOString();
  
  // Add merge event to timeline
  base.timeline.push({
    timestamp: new Date().toISOString(),
    event: `Incidente mesclado com ${other.id}`,
    source: "fusion_center"
  });
  
  // Remove the other incident and update the base
  incidents.delete(other.id);
  incidents.set(base.id, base);
  
  return true;
}

// 5. addMedia(incidentId: string, media: IncidentMedia): boolean
export function addMedia(incidentId: string, media: IncidentMedia): boolean {
  const incident = incidents.get(incidentId);
  if (!incident) return false;
  
  incident.media.push(media);
  incident.lastUpdated = new Date().toISOString();
  
  // Add to timeline
  incident.timeline.push({
    timestamp: media.timestamp,
    event: `Mídia adicionada: ${media.type}`,
    source: media.source
  });
  
  return true;
}

// 6. getStats(): stats
export function getStats(): {
  totalIncidents: number;
  byStatus: Record<Incident["status"], number>;
  byCategory: Record<string, number>;
  byRiskLevel: Record<string, number>;
  averageGlobalScore: number;
  recentIncidents: number;
} {
  const allIncidents = Array.from(incidents.values());
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  const byStatus: Record<Incident["status"], number> = {
    novo: 0,
    em_monitoramento: 0,
    confirmado: 0,
    resolvido: 0
  };
  
  const byCategory: Record<string, number> = {};
  const byRiskLevel: Record<string, number> = {};
  
  let totalScore = 0;
  let recentCount = 0;
  
  for (const incident of allIncidents) {
    byStatus[incident.status]++;
    byCategory[incident.category] = (byCategory[incident.category] || 0) + 1;
    byRiskLevel[incident.riskLevel] = (byRiskLevel[incident.riskLevel] || 0) + 1;
    totalScore += incident.globalScore;
    
    if (new Date(incident.lastUpdated) >= oneDayAgo) {
      recentCount++;
    }
  }
  
  return {
    totalIncidents: allIncidents.length,
    byStatus,
    byCategory,
    byRiskLevel,
    averageGlobalScore: allIncidents.length === 0 ? 0 : totalScore / allIncidents.length,
    recentIncidents: recentCount
  };
}

// Additional helper function to get all incidents (for external use)
export function getAllIncidents(): Incident[] {
  return Array.from(incidents.values());
}