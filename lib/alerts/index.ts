// ============================================================
// GLOBAL ALERT CENTER — Unified Alert Management
// ============================================================

import type { GlobalAlert, GlobalEvent, RiskLevel, RiskCategory, AlertStatus } from "../types";

const alertStore: Map<string, GlobalAlert> = new Map();
let alertCounter = 0;

// ─── ALERT CREATION ────────────────────────────────────────

export function createAlert(event: GlobalEvent): GlobalAlert {
  const id = `GA-${Date.now()}-${++alertCounter}`;

  const alert: GlobalAlert = {
    id,
    eventId: event.id,
    origin: event.module,
    source: event.source,
    riskLevel: event.riskLevel,
    title: event.title,
    description: event.description,
    location: event.location,
    timestamp: new Date().toISOString(),
    confidence: event.confidence,
    impact: event.impact,
    relatedEvents: event.relatedEvents,
    status: "novo",
    acknowledged: false,
  };

  alertStore.set(id, alert);
  return alert;
}

export function createAlertFromRaw(params: {
  origin: RiskCategory;
  source: string;
  riskLevel: RiskLevel;
  title: string;
  description: string;
  lat: number;
  lng: number;
  country?: string;
  confidence?: number;
  impact?: { operational: number; humanitarian: number; economic: number; environmental: number; security: number };
}): GlobalAlert {
  const id = `GA-${Date.now()}-${++alertCounter}`;
  const alert: GlobalAlert = {
    id,
    eventId: `evt-${Date.now()}-${alertCounter}`,
    origin: params.origin,
    source: params.source,
    riskLevel: params.riskLevel,
    title: params.title,
    description: params.description,
    location: { lat: params.lat, lng: params.lng, country: params.country },
    timestamp: new Date().toISOString(),
    confidence: params.confidence ?? 0.5,
    impact: params.impact ?? { operational: 0, humanitarian: 0, economic: 0, environmental: 0, security: 0 },
    relatedEvents: [],
    status: "novo",
    acknowledged: false,
  };
  alertStore.set(id, alert);
  return alert;
}

// ─── ALERT RETRIEVAL ───────────────────────────────────────

export function getAlert(id: string): GlobalAlert | undefined {
  return alertStore.get(id);
}

export function getAllAlerts(): GlobalAlert[] {
  return Array.from(alertStore.values())
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function queryAlerts(filters: {
  riskLevel?: RiskLevel;
  category?: RiskCategory;
  status?: AlertStatus;
  since?: string;
  limit?: number;
  unacknowledged?: boolean;
}): GlobalAlert[] {
  let alerts = getAllAlerts();

  if (filters.riskLevel) alerts = alerts.filter(a => a.riskLevel === filters.riskLevel);
  if (filters.category) alerts = alerts.filter(a => a.origin === filters.category);
  if (filters.status) alerts = alerts.filter(a => a.status === filters.status);
  if (filters.unacknowledged) alerts = alerts.filter(a => !a.acknowledged);
  if (filters.since) {
    const since = new Date(filters.since).getTime();
    alerts = alerts.filter(a => new Date(a.timestamp).getTime() >= since);
  }
  if (filters.limit) alerts = alerts.slice(0, filters.limit);

  return alerts;
}

// ─── ALERT ACTIONS ─────────────────────────────────────────

export function acknowledgeAlert(id: string): boolean {
  const alert = alertStore.get(id);
  if (!alert) return false;
  alert.acknowledged = true;
  alert.status = "resolvido";
  return true;
}

export function updateAlertStatus(id: string, status: AlertStatus): boolean {
  const alert = alertStore.get(id);
  if (!alert) return false;
  alert.status = status;
  return true;
}

// ─── ALERT STATISTICS ──────────────────────────────────────

export function getAlertStats(): {
  total: number;
  novo: number;
  atualizado: number;
  resolvido: number;
  byRisk: Record<RiskLevel, number>;
  byCategory: Record<string, number>;
} {
  const alerts = getAllAlerts();
  const byRisk: Record<RiskLevel, number> = {
    informativo: 0, baixo: 0, moderado: 0, alto: 0, critico: 0, emergencia: 0, extremo: 0,
  };
  const byCategory: Record<string, number> = {};

  for (const a of alerts) {
    byRisk[a.riskLevel]++;
    byCategory[a.origin] = (byCategory[a.origin] || 0) + 1;
  }

  return {
    total: alerts.length,
    novo: alerts.filter(a => a.status === "novo").length,
    atualizado: alerts.filter(a => a.status === "atualizado").length,
    resolvido: alerts.filter(a => a.status === "resolvido").length,
    byRisk,
    byCategory,
  };
}

// ─── CLEANUP ───────────────────────────────────────────────

export function cleanup(maxAge: number = 86400000): number {
  const cutoff = Date.now() - maxAge;
  let removed = 0;
  for (const [id, alert] of alertStore) {
    if (new Date(alert.timestamp).getTime() < cutoff && alert.status === "resolvido") {
      alertStore.delete(id);
      removed++;
    }
  }
  return removed;
}

export function getAlertCount(): number {
  return alertStore.size;
}
