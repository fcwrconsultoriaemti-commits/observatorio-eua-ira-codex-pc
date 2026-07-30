// ============================================================
// CACHE — Intelligent TTL Cache with Per-Monitor Support
// ============================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  createdAt: number;
  hits: number;
}

export interface CacheStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRate: number;
  memoryBytes: number;
  byPrefix: Record<string, { entries: number; hits: number; misses: number }>;
}

const store = new Map<string, CacheEntry<unknown>>();
let totalHits = 0;
let totalMisses = 0;
const prefixStats = new Map<string, { hits: number; misses: number }>();

// Default TTLs by category (ms)
const CATEGORY_TTL: Record<string, number> = {
  terremoto: 30_000,
  vulcao: 300_000,
  furacao: 60_000,
  tornado: 60_000,
  clima_severo: 60_000,
  incendio: 60_000,
  enchente: 60_000,
  seca: 600_000,
  espacial: 300_000,
  neo: 300_000,
  satelite: 300_000,
  saude: 600_000,
  cibernetico: 60_000,
  energia: 60_000,
  maritimo: 60_000,
  aereo: 60_000,
  economico: 300_000,
  infraestrutura: 60_000,
  conflito: 60_000,
  default: 60_000,
};

const SOURCE_TTL: Record<string, number> = {
  usgs: 30_000,
  emsc: 30_000,
  nhc: 60_000,
  noaa: 60_000,
  nasa_firms: 300_000,
  copernicus: 300_000,
  inpe: 300_000,
  who: 600_000,
  cdc: 600_000,
  cisa: 60_000,
  nvd: 60_000,
  acled: 300_000,
  gdelt: 60_000,
  coingecko: 300_000,
  eia: 300_000,
  opensky: 60_000,
  seed: 0, // seeds are never cached
};

export function cacheGet<T>(key: string): T | null {
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (!entry) {
    totalMisses++;
    trackPrefix(key, false);
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    totalMisses++;
    trackPrefix(key, false);
    return null;
  }
  entry.hits++;
  totalHits++;
  trackPrefix(key, true);
  return entry.value;
}

export function cacheSet<T>(key: string, value: T, ttlMs?: number): void {
  const ttl = ttlMs ?? resolveTTL(key);
  if (ttl <= 0) return; // don't cache seeds
  store.set(key, {
    value,
    expiresAt: Date.now() + ttl,
    createdAt: Date.now(),
    hits: 0,
  });
}

export function cacheDelete(key: string): boolean {
  return store.delete(key);
}

export function cacheClear(prefix?: string): number {
  if (!prefix) {
    const size = store.size;
    store.clear();
    return size;
  }
  let count = 0;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
      count++;
    }
  }
  return count;
}

export function cacheHas(key: string): boolean {
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  return true;
}

export function cacheStats(): CacheStats {
  const byPrefix: Record<string, { entries: number; hits: number; misses: number }> = {};
  for (const [key] of store) {
    const prefix = key.split(":")[0] || "unknown";
    if (!byPrefix[prefix]) byPrefix[prefix] = { entries: 0, hits: 0, misses: 0 };
    byPrefix[prefix].entries++;
  }
  for (const [prefix, stats] of prefixStats) {
    if (!byPrefix[prefix]) byPrefix[prefix] = { entries: 0, hits: 0, misses: 0 };
    byPrefix[prefix].hits += stats.hits;
    byPrefix[prefix].misses += stats.misses;
  }
  const total = totalHits + totalMisses;
  return {
    totalEntries: store.size,
    totalHits,
    totalMisses,
    hitRate: total > 0 ? totalHits / total : 0,
    memoryBytes: estimateMemory(),
    byPrefix,
  };
}

export function cacheCleanup(): number {
  const now = Date.now();
  let count = 0;
  for (const [key, entry] of store) {
    if (now > entry.expiresAt) {
      store.delete(key);
      count++;
    }
  }
  return count;
}

function resolveTTL(key: string): number {
  for (const [source, ttl] of Object.entries(SOURCE_TTL)) {
    if (key.includes(source)) return ttl;
  }
  for (const [cat, ttl] of Object.entries(CATEGORY_TTL)) {
    if (key.includes(cat)) return ttl;
  }
  return CATEGORY_TTL.default;
}

function trackPrefix(key: string, hit: boolean): void {
  const prefix = key.split(":")[0] || "unknown";
  if (!prefixStats.has(prefix)) prefixStats.set(prefix, { hits: 0, misses: 0 });
  const stats = prefixStats.get(prefix)!;
  if (hit) stats.hits++;
  else stats.misses++;
}

function estimateMemory(): number {
  let bytes = 0;
  for (const [, entry] of store) {
    bytes += JSON.stringify(entry.value).length * 2;
    bytes += 64; // overhead per entry
  }
  return bytes;
}

// Auto-cleanup every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cacheCleanup, 300_000);
}
