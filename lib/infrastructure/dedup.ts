// ============================================================
// DEDUPLICATION — Event Deduplication Across Collections
// ============================================================

import type { GlobalEvent, RiskCategory } from "../types.js";

interface DedupKey {
  category: RiskCategory;
  locationHash: string;
  timeWindow: string; // rounded to nearest hour
}

interface DedupEntry {
  event: GlobalEvent;
  sources: string[];
  firstSeen: string;
  lastSeen: string;
  confirmations: number;
  confidence: number;
}

const dedupStore = new Map<string, DedupEntry>();
const DEDUP_WINDOW_MS = 3_600_000; // 1 hour
const GEO_HASH_PRECISION = 1; // ~111km

export function deduplicationKey(event: GlobalEvent): string {
  const locHash = geoHash(event.location?.lat ?? 0, event.location?.lng ?? 0);
  const timeWindow = roundToWindow(event.timestamp, DEDUP_WINDOW_MS);
  return `${event.module}:${locHash}:${timeWindow}`;
}

export function processEvent(event: GlobalEvent): { event: GlobalEvent; isDuplicate: boolean; confirmations: number } {
  const key = deduplicationKey(event);
  const existing = dedupStore.get(key);

  if (!existing) {
    dedupStore.set(key, {
      event,
      sources: [event.source],
      firstSeen: event.timestamp,
      lastSeen: event.timestamp,
      confirmations: 1,
      confidence: event.confidence,
    });
    return { event, isDuplicate: false, confirmations: 1 };
  }

  // Merge sources
  if (!existing.sources.includes(event.source)) {
    existing.sources.push(event.source);
  }
  existing.confirmations++;
  existing.lastSeen = event.timestamp;

  // Boost confidence based on confirmations
  const confirmationBonus = Math.min(existing.confirmations * 0.05, 0.3);
  existing.confidence = Math.min(1, Math.max(existing.confidence, event.confidence) + confirmationBonus);

  // Keep the event with higher impact
  if (event.impact && existing.event.impact) {
    const newScore = Object.values(event.impact).reduce((a, b) => a + b, 0);
    const oldScore = Object.values(existing.event.impact).reduce((a, b) => a + b, 0);
    if (newScore > oldScore) {
      existing.event = event;
    }
  }

  // Update the event's source list and confirmation count
  const mergedEvent = { ...existing.event };
  (mergedEvent as any).metadata = {
    ...(mergedEvent.metadata as Record<string, unknown> || {}),
    confirmedBy: existing.sources,
    confirmations: existing.confirmations,
    mergedConfidence: existing.confidence,
  };

  return { event: mergedEvent, isDuplicate: true, confirmations: existing.confirmations };
}

export function processBatch(events: GlobalEvent[]): { processed: GlobalEvent[]; duplicates: number; unique: number } {
  const processed: GlobalEvent[] = [];
  let duplicates = 0;

  for (const event of events) {
    const result = processEvent(event);
    if (!result.isDuplicate || result.confirmations <= 3) {
      processed.push(result.event);
    }
    if (result.isDuplicate) duplicates++;
  }

  return { processed, duplicates, unique: processed.length - duplicates };
}

export function getDedupStats(): { totalEntries: number; byCategory: Record<string, number>; averageSources: number } {
  const byCategory: Record<string, number> = {};
  let totalSources = 0;

  for (const [, entry] of dedupStore) {
    const cat = entry.event.module;
    byCategory[cat] = (byCategory[cat] || 0) + 1;
    totalSources += entry.sources.length;
  }

  return {
    totalEntries: dedupStore.size,
    byCategory,
    averageSources: dedupStore.size > 0 ? totalSources / dedupStore.size : 0,
  };
}

export function cleanupDedupStore(): number {
  const cutoff = Date.now() - DEDUP_WINDOW_MS * 2;
  let count = 0;
  for (const [key, entry] of dedupStore) {
    if (new Date(entry.lastSeen).getTime() < cutoff) {
      dedupStore.delete(key);
      count++;
    }
  }
  return count;
}

function geoHash(lat: number, lng: number): string {
  const latR = Math.round(lat / GEO_HASH_PRECISION) * GEO_HASH_PRECISION;
  const lngR = Math.round(lng / GEO_HASH_PRECISION) * GEO_HASH_PRECISION;
  return `${latR},${lngR}`;
}

function roundToWindow(timestamp: string, windowMs: number): string {
  const ms = new Date(timestamp).getTime();
  const rounded = Math.round(ms / windowMs) * windowMs;
  return new Date(rounded).toISOString();
}
