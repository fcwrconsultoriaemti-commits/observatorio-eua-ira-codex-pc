// ============================================================
// RETRY — Exponential Backoff + Circuit Breaker
// ============================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

export interface CircuitBreakerState {
  state: "closed" | "open" | "half-open";
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
  averageResponseTime: number;
  openSince: number;
}

export interface FetchResult<T> {
  data: T | null;
  error: string | null;
  attempts: number;
  durationMs: number;
  fromCache: boolean;
  source: string;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  timeoutMs: 15000,
};

const circuitBreakers = new Map<string, CircuitBreakerState>();
const responseTimes = new Map<string, number[]>();
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_RESET_MS = 60_000;

export function getCircuitBreaker(source: string): CircuitBreakerState {
  if (!circuitBreakers.has(source)) {
    circuitBreakers.set(source, {
      state: "closed",
      failureCount: 0,
      successCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
      averageResponseTime: 0,
      openSince: 0,
    });
  }
  return circuitBreakers.get(source)!;
}

export function isCircuitOpen(source: string): boolean {
  const cb = getCircuitBreaker(source);
  if (cb.state === "closed") return false;
  if (cb.state === "open") {
    if (Date.now() - cb.openSince > CIRCUIT_BREAKER_RESET_MS) {
      cb.state = "half-open";
      return false;
    }
    return true;
  }
  return false; // half-open allows one request
}

export function recordSuccess(source: string, durationMs: number): void {
  const cb = getCircuitBreaker(source);
  cb.successCount++;
  cb.totalSuccesses++;
  cb.lastSuccessTime = Date.now();
  cb.totalRequests++;
  if (cb.state === "half-open") {
    cb.state = "closed";
    cb.failureCount = 0;
  }
  if (cb.failureCount > 0) cb.failureCount = Math.max(0, cb.failureCount - 1);
  updateAvgResponseTime(source, durationMs);
}

export function recordFailure(source: string, durationMs: number): void {
  const cb = getCircuitBreaker(source);
  cb.failureCount++;
  cb.totalFailures++;
  cb.lastFailureTime = Date.now();
  cb.totalRequests++;
  updateAvgResponseTime(source, durationMs);
  if (cb.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
    cb.state = "open";
    cb.openSince = Date.now();
  }
}

export function resetCircuit(source: string): void {
  circuitBreakers.delete(source);
}

export function getAllCircuitBreakers(): Record<string, CircuitBreakerState> {
  const result: Record<string, CircuitBreakerState> = {};
  for (const [key, value] of circuitBreakers) {
    result[key] = { ...value };
  }
  return result;
}

export async function fetchWithRetry<T>(
  url: string,
  config: Partial<RetryConfig> & { source: string; cacheKey?: string } & Record<string, unknown>
): Promise<FetchResult<T>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const source = config.source;
  const cacheKey = config.cacheKey;
  const startTime = Date.now();
  let lastError = "";
  let attempts = 0;

  if (isCircuitOpen(source)) {
    return { data: null, error: `Circuit breaker OPEN for ${source}`, attempts: 0, durationMs: 0, fromCache: false, source };
  }

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    attempts = attempt + 1;
    const attemptStart = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), cfg.timeoutMs);

      const fetchOpts: RequestInit = { signal: controller.signal, headers: {} };
      if (config) {
        const { source: _s, cacheKey: _c, maxRetries: _mr, baseDelayMs: _bd, maxDelayMs: _md, backoffMultiplier: _bm, timeoutMs: _tm, ...rest } = config as any;
        Object.assign(fetchOpts, rest);
      }

      const response = await fetch(url, fetchOpts);
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as T;
      const duration = Date.now() - startTime;

      recordSuccess(source, duration);

      return { data, error: null, attempts, durationMs: duration, fromCache: false, source };
    } catch (err) {
      const duration = Date.now() - attemptStart;
      lastError = err instanceof Error ? err.message : String(err);

      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.baseDelayMs * Math.pow(cfg.backoffMultiplier, attempt),
          cfg.maxDelayMs
        );
        await sleep(delay);
      }
    }
  }

  const totalDuration = Date.now() - startTime;
  recordFailure(source, totalDuration);

  return { data: null, error: lastError, attempts, durationMs: totalDuration, fromCache: false, source };
}

export async function fetchWithCacheAndRetry<T>(
  url: string,
  config: Partial<RetryConfig> & { source: string; cacheKey: string; cacheTtlMs?: number } & Record<string, unknown>
): Promise<FetchResult<T>> {
  const { cacheKey, cacheTtlMs, ...retryConfig } = config;

  // Try cache first
  try {
    const { cacheGet } = await import("./cache.js");
    const cached = cacheGet<T>(cacheKey);
    if (cached !== null) {
      return { data: cached, error: null, attempts: 0, durationMs: 0, fromCache: true, source: config.source };
    }
  } catch { /* cache unavailable */ }

  // Fetch with retry
  const result = await fetchWithRetry<T>(url, retryConfig);

  // Cache successful result
  if (result.data !== null) {
    try {
      const { cacheSet } = await import("./cache.js");
      cacheSet(cacheKey, result.data, cacheTtlMs);
    } catch { /* cache unavailable */ }
  }

  return result;
}

function updateAvgResponseTime(source: string, durationMs: number): void {
  if (!responseTimes.has(source)) responseTimes.set(source, []);
  const times = responseTimes.get(source)!;
  times.push(durationMs);
  if (times.length > 100) times.shift();
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const cb = getCircuitBreaker(source);
  cb.averageResponseTime = Math.round(avg);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
