// ============================================================
// INTELLIGENT TIMELINE — Correlated Event Timeline
// ============================================================

import type { GlobalEvent, RiskLevel } from "../types";

export interface TimelineNode {
  id: string;
  event: GlobalEvent;
  timestamp: string;
  timeLabel: string;
  category: string;
  riskLevel: RiskLevel;
  impactScore: number;
  isKeyFrame: boolean;
  causalChain: string[];
  annotations: string[];
}

export interface TimelineCluster {
  id: string;
  startTime: string;
  endTime: string;
  events: TimelineNode[];
  dominantCategory: string;
  maxRisk: RiskLevel;
  summary: string;
  locationCenter: { lat: number; lng: number };
}

export interface TimelineView {
  nodes: TimelineNode[];
  clusters: TimelineCluster[];
  totalTimeSpan: string;
  eventDensity: number;
  keyMoments: TimelineNode[];
}

// ─── TIMELINE BUILDER ──────────────────────────────────────

export function buildTimeline(events: GlobalEvent[]): TimelineView {
  if (events.length === 0) {
    return { nodes: [], clusters: [], totalTimeSpan: "0h", eventDensity: 0, keyMoments: [] };
  }

  const sorted = [...events].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const nodes: TimelineNode[] = sorted.map((event, idx) => {
    const causalChain = findCausalChain(event, sorted.slice(0, idx));
    const annotations = generateAnnotations(event, causalChain);
    const isKeyFrame = determineKeyFrame(event, causalChain, annotations);

    return {
      id: `tl-${event.id}`,
      event,
      timestamp: event.timestamp,
      timeLabel: formatTimeLabel(event.timestamp, idx === 0 ? null : sorted[idx - 1].timestamp),
      category: event.module,
      riskLevel: event.riskLevel,
      impactScore: event.impact.operational + event.impact.humanitarian + event.impact.economic,
      isKeyFrame,
      causalChain,
      annotations,
    };
  });

  const clusters = clusterEvents(nodes);
  const totalTimeSpan = calculateTimeSpan(sorted);
  const eventDensity = nodes.length / Math.max(parseTimeSpan(totalTimeSpan), 1);
  const keyMoments = nodes.filter(n => n.isKeyFrame);

  return { nodes, clusters, totalTimeSpan, eventDensity, keyMoments };
}

// ─── CAUSAL CHAIN FINDER ───────────────────────────────────

function findCausalChain(event: GlobalEvent, previous: GlobalEvent[]): string[] {
  const chain: string[] = [];

  for (const prev of previous) {
    // Same category, recent
    if (prev.module === event.module) {
      const timeDiff = new Date(event.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (timeDiff < 86400000) {
        chain.push(prev.id);
      }
    }

    // Geographic proximity
    const dist = haversineDistance(event.location.lat, event.location.lng, prev.location.lat, prev.location.lng);
    if (dist < 200) {
      const timeDiff = new Date(event.timestamp).getTime() - new Date(prev.timestamp).getTime();
      if (timeDiff < 43200000) {
        chain.push(prev.id);
      }
    }
  }

  return [...new Set(chain)];
}

function generateAnnotations(event: GlobalEvent, causalChain: string[]): string[] {
  const annotations: string[] = [];

  if (causalChain.length > 0) {
    annotations.push(`${causalChain.length} evento(s) anterior(es) relacionado(s)`);
  }

  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  if (riskOrder.indexOf(event.riskLevel) >= 4) {
    annotations.push("Risco elevado detectado");
  }

  const impact = event.impact.operational + event.impact.humanitarian + event.impact.economic;
  if (impact > 150) {
    annotations.push("Alto impacto combinado");
  }

  return annotations;
}

function determineKeyFrame(event: GlobalEvent, causalChain: string[], annotations: string[]): boolean {
  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  if (riskOrder.indexOf(event.riskLevel) >= 4) return true;
  if (causalChain.length >= 2) return true;
  if (annotations.some(a => a.includes("Alto impacto"))) return true;
  return false;
}

// ─── CLUSTERING ────────────────────────────────────────────

function clusterEvents(nodes: TimelineNode[]): TimelineCluster[] {
  if (nodes.length === 0) return [];

  const clusters: TimelineCluster[] = [];
  let currentCluster: TimelineNode[] = [nodes[0]];

  for (let i = 1; i < nodes.length; i++) {
    const timeDiff = new Date(nodes[i].timestamp).getTime() - new Date(currentCluster[currentCluster.length - 1].timestamp).getTime();

    if (timeDiff < 3600000) { // 1 hour cluster
      currentCluster.push(nodes[i]);
    } else {
      clusters.push(buildCluster(currentCluster));
      currentCluster = [nodes[i]];
    }
  }

  clusters.push(buildCluster(currentCluster));
  return clusters;
}

function buildCluster(nodes: TimelineNode[]): TimelineCluster {
  const lats = nodes.map(n => n.event.location.lat);
  const lngs = nodes.map(n => n.event.location.lng);
  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];

  const categoryCounts = new Map<string, number>();
  for (const n of nodes) {
    categoryCounts.set(n.category, (categoryCounts.get(n.category) || 0) + 1);
  }
  const dominantCategory = Array.from(categoryCounts.entries()).sort((a, b) => b[1] - a[1])[0][0];

  const maxRiskIdx = Math.max(...nodes.map(n => riskOrder.indexOf(n.riskLevel)));

  return {
    id: `cluster-${nodes[0].id}`,
    startTime: nodes[0].timestamp,
    endTime: nodes[nodes.length - 1].timestamp,
    events: nodes,
    dominantCategory,
    maxRisk: riskOrder[maxRiskIdx],
    summary: `${nodes.length} evento(s) de ${dominantCategory} entre ${formatTime(nodes[0].timestamp)} e ${formatTime(nodes[nodes.length - 1].timestamp)}`,
    locationCenter: {
      lat: lats.reduce((s, l) => s + l, 0) / lats.length,
      lng: lngs.reduce((s, l) => s + l, 0) / lngs.length,
    },
  };
}

// ─── HELPERS ───────────────────────────────────────────────

function formatTimeLabel(current: string, previous: string | null): string {
  if (!previous) return formatTime(current);
  const diff = new Date(current).getTime() - new Date(previous).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `+${mins}min`;
  return `+${Math.round(mins / 60)}h${mins % 60 > 0 ? ` ${mins % 60}min` : ""}`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function calculateTimeSpan(events: GlobalEvent[]): string {
  if (events.length < 2) return "0h";
  const span = new Date(events[events.length - 1].timestamp).getTime() - new Date(events[0].timestamp).getTime();
  if (span < 3600000) return `${Math.round(span / 60000)}min`;
  if (span < 86400000) return `${Math.round(span / 3600000)}h`;
  return `${Math.round(span / 86400000)}d`;
}

function parseTimeSpan(span: string): number {
  const match = span.match(/(\d+)(min|h|d)/);
  if (!match) return 1;
  const [, val, unit] = match;
  if (unit === "min") return parseInt(val) / 60;
  if (unit === "h") return parseInt(val);
  return parseInt(val) * 24;
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
