// ============================================================
// OBSERVABILITY — Structured Logging, Metrics, Health Checks
// ============================================================

import type { RiskCategory } from "../types.js";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  module: string;
  message: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export interface MonitorMetrics {
  source: string;
  category: RiskCategory;
  totalCollections: number;
  successfulCollections: number;
  failedCollections: number;
  totalEventsCollected: number;
  totalEventsDropped: number;
  totalEventsDuplicate: number;
  averageResponseTimeMs: number;
  lastCollectionAt: string;
  lastSuccessAt: string;
  lastFailureAt: string;
  lastError: string;
  uptime: number; // percentage
  eventsPerMinute: number;
  eventsPerHour: number;
  sourcesOnline: number;
  sourcesOffline: number;
}

export interface SystemMetrics {
  uptime: number;
  totalEventsCollected: number;
  totalEventsInStore: number;
  totalAlertsGenerated: number;
  totalCollections: number;
  totalCorrelations: number;
  averageCollectionTimeMs: number;
  eventsPerMinute: number;
  eventsPerHour: number;
  memoryUsageBytes: number;
  cacheHitRate: number;
  sourcesOnline: number;
  sourcesOffline: number;
  monitorsActive: number;
  monitorsTotal: number;
  lastCollectionAt: string;
  collectionsPerMinute: number;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 5000;
const monitorMetrics = new Map<string, MonitorMetrics>();
const collectionTimestamps: number[] = [];
const eventCountHistory: { timestamp: number; count: number }[] = [];

export function log(level: LogEntry["level"], module: string, message: string, metadata?: Record<string, unknown>, duration?: number): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    duration,
    metadata,
  };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.shift();
}

export function getLogs(filter?: { level?: string; module?: string; limit?: number }): LogEntry[] {
  let result = logs;
  if (filter?.level) result = result.filter(l => l.level === filter.level);
  if (filter?.module) result = result.filter(l => l.module === filter.module);
  if (filter?.limit) result = result.slice(-filter.limit);
  return result;
}

export function initMonitorMetrics(source: string, category: RiskCategory): void {
  if (monitorMetrics.has(source)) return;
  monitorMetrics.set(source, {
    source,
    category,
    totalCollections: 0,
    successfulCollections: 0,
    failedCollections: 0,
    totalEventsCollected: 0,
    totalEventsDropped: 0,
    totalEventsDuplicate: 0,
    averageResponseTimeMs: 0,
    lastCollectionAt: "",
    lastSuccessAt: "",
    lastFailureAt: "",
    lastError: "",
    uptime: 100,
    eventsPerMinute: 0,
    eventsPerHour: 0,
    sourcesOnline: 1,
    sourcesOffline: 0,
  });
}

export function recordCollection(source: string, success: boolean, eventCount: number, durationMs: number, error?: string, dropped?: number, duplicate?: number): void {
  const m = monitorMetrics.get(source);
  if (!m) return;
  const now = new Date().toISOString();
  m.totalCollections++;
  m.lastCollectionAt = now;
  if (success) {
    m.successfulCollections++;
    m.lastSuccessAt = now;
    m.totalEventsCollected += eventCount;
    m.sourcesOnline = 1;
    m.sourcesOffline = 0;
  } else {
    m.failedCollections++;
    m.lastFailureAt = now;
    m.lastError = error || "Unknown error";
    m.sourcesOnline = 0;
    m.sourcesOffline = 1;
  }
  if (dropped) m.totalEventsDropped += dropped;
  if (duplicate) m.totalEventsDuplicate += duplicate;

  // Update response time
  const times: number[] = [];
  times.push(durationMs);
  m.averageResponseTimeMs = Math.round((m.averageResponseTimeMs * (m.totalCollections - 1) + durationMs) / m.totalCollections);

  // Update uptime
  m.uptime = m.totalCollections > 0 ? (m.successfulCollections / m.totalCollections) * 100 : 100;

  // Events per minute/hour
  const recentEvents = eventCount;
  m.eventsPerMinute = Math.round(recentEvents * (60_000 / Math.max(durationMs, 1)));
  m.eventsPerHour = Math.round(m.eventsPerMinute * 60);

  // Track collection timestamps
  collectionTimestamps.push(Date.now());
  const oneMinAgo = Date.now() - 60_000;
  const oneHourAgo = Date.now() - 3_600_000;
  while (collectionTimestamps.length > 0 && collectionTimestamps[0] < oneMinAgo) collectionTimestamps.shift();

  // Track event counts
  eventCountHistory.push({ timestamp: Date.now(), count: eventCount });
  while (eventCountHistory.length > 0 && eventCountHistory[0].timestamp < oneHourAgo) eventCountHistory.shift();
}

export function getMonitorMetrics(source?: string): MonitorMetrics | MonitorMetrics[] {
  if (source) return monitorMetrics.get(source) || ({} as MonitorMetrics);
  return Array.from(monitorMetrics.values());
}

export function getSystemMetrics(eventStoreSize: number, alertStoreSize: number, totalCollected: number, totalCorrelations: number, monitorsTotal: number, monitorsActive: number): SystemMetrics {
  const oneMinAgo = Date.now() - 60_000;
  const recentCollections = collectionTimestamps.filter(t => t > oneMinAgo).length;
  const oneHourAgo = Date.now() - 3_600_000;
  const recentEvents = eventCountHistory.filter(e => e.timestamp > oneHourAgo).reduce((s, e) => s + e.count, 0);

  const allMetrics = Array.from(monitorMetrics.values());
  const sourcesOnline = allMetrics.reduce((s, m) => s + m.sourcesOnline, 0);
  const sourcesOffline = allMetrics.reduce((s, m) => s + m.sourcesOffline, 0);
  const avgResponseTime = allMetrics.length > 0 ? allMetrics.reduce((s, m) => s + m.averageResponseTimeMs, 0) / allMetrics.length : 0;

  return {
    uptime: Date.now(),
    totalEventsCollected: totalCollected,
    totalEventsInStore: eventStoreSize,
    totalAlertsGenerated: alertStoreSize,
    totalCollections: collectionTimestamps.length,
    totalCorrelations,
    averageCollectionTimeMs: Math.round(avgResponseTime),
    eventsPerMinute: recentEvents,
    eventsPerHour: Math.round(recentEvents),
    memoryUsageBytes: typeof process !== "undefined" ? process.memoryUsage?.().heapUsed || 0 : 0,
    cacheHitRate: 0,
    sourcesOnline,
    sourcesOffline,
    monitorsActive,
    monitorsTotal,
    lastCollectionAt: collectionTimestamps.length > 0 ? new Date(collectionTimestamps[collectionTimestamps.length - 1]).toISOString() : "",
    collectionsPerMinute: recentCollections,
  };
}

export function getOperationalPanel(eventStoreSize: number, alertStoreSize: number, monitorsTotal: number, monitorsActive: number) {
  const allMetrics = Array.from(monitorMetrics.values());
  const sources = allMetrics.map(m => ({
    name: m.source,
    category: m.category,
    online: m.sourcesOnline > 0,
    lastCollection: m.lastCollectionAt,
    lastSuccess: m.lastSuccessAt,
    lastError: m.lastError || null,
    responseTime: m.averageResponseTimeMs,
    uptime: Math.round(m.uptime),
    eventsCollected: m.totalEventsCollected,
    eventsDropped: m.totalEventsDropped,
    eventsDuplicate: m.totalEventsDuplicate,
    collections: m.totalCollections,
    failures: m.failedCollections,
  }));

  const oneMinAgo = Date.now() - 60_000;
  const recentCollections = collectionTimestamps.filter(t => t > oneMinAgo).length;

  return {
    sources,
    sourcesOnline: allMetrics.filter(m => m.sourcesOnline > 0).length,
    sourcesOffline: allMetrics.filter(m => m.sourcesOffline > 0).length,
    totalSources: allMetrics.length,
    monitorsActive,
    monitorsTotal,
    eventsInStore: eventStoreSize,
    alertsActive: alertStoreSize,
    collectionsLastMinute: recentCollections,
    lastCollection: collectionTimestamps.length > 0 ? new Date(collectionTimestamps[collectionTimestamps.length - 1]).toISOString() : null,
    nextCollection: collectionTimestamps.length > 0 ? new Date(Math.max(...collectionTimestamps) + 60_000).toISOString() : null,
    averageResponseTime: allMetrics.length > 0 ? Math.round(allMetrics.reduce((s, m) => s + m.averageResponseTimeMs, 0) / allMetrics.length) : 0,
    eventsPerMinute: allMetrics.reduce((s, m) => s + m.eventsPerMinute, 0),
    eventsPerHour: allMetrics.reduce((s, m) => s + m.eventsPerHour, 0),
  };
}
