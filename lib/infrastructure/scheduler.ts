// ============================================================
// SCHEDULER — Continuous Collection Scheduler
// ============================================================

export interface ScheduledTask {
  id: string;
  name: string;
  category: string;
  intervalMs: number;
  lastRunAt: string;
  nextRunAt: string;
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageDurationMs: number;
  enabled: boolean;
  fn: () => Promise<void>;
}

export interface SchedulerStatus {
  running: boolean;
  tasks: {
    id: string;
    name: string;
    category: string;
    intervalMs: number;
    lastRunAt: string;
    nextRunAt: string;
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageDurationMs: number;
    enabled: boolean;
  }[];
  totalRuns: number;
  uptime: number;
}

const tasks = new Map<string, ScheduledTask>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let running = false;
let startedAt = 0;

const INTERVALS: Record<string, number> = {
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
};

export function registerTask(id: string, name: string, category: string, fn: () => Promise<void>, intervalMs?: number): void {
  const interval = intervalMs || INTERVALS[category] || 60_000;
  tasks.set(id, {
    id,
    name,
    category,
    intervalMs: interval,
    lastRunAt: "",
    nextRunAt: new Date(Date.now() + interval).toISOString(),
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    averageDurationMs: 0,
    enabled: true,
    fn,
  });
}

export function unregisterTask(id: string): void {
  const timer = timers.get(id);
  if (timer) clearTimeout(timer);
  timers.delete(id);
  tasks.delete(id);
}

export function enableTask(id: string): void {
  const task = tasks.get(id);
  if (task) task.enabled = true;
}

export function disableTask(id: string): void {
  const task = tasks.get(id);
  if (task) task.enabled = false;
}

export function startScheduler(): void {
  if (running) return;
  running = true;
  startedAt = Date.now();

  for (const [id, task] of tasks) {
    if (task.enabled) scheduleNext(id);
  }
}

export function stopScheduler(): void {
  running = false;
  for (const [id, timer] of timers) {
    clearTimeout(timer);
  }
  timers.clear();
}

export function getSchedulerStatus(): SchedulerStatus {
  const totalRuns = Array.from(tasks.values()).reduce((s, t) => s + t.totalRuns, 0);
  return {
    running,
    tasks: Array.from(tasks.values()).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      intervalMs: t.intervalMs,
      lastRunAt: t.lastRunAt,
      nextRunAt: t.nextRunAt,
      totalRuns: t.totalRuns,
      successfulRuns: t.successfulRuns,
      failedRuns: t.failedRuns,
      averageDurationMs: t.averageDurationMs,
      enabled: t.enabled,
    })),
    totalRuns,
    uptime: running ? Date.now() - startedAt : 0,
  };
}

function scheduleNext(id: string): void {
  if (!running) return;
  const task = tasks.get(id);
  if (!task || !task.enabled) return;

  const timer = setTimeout(async () => {
    const start = Date.now();
    task.totalRuns++;
    task.lastRunAt = new Date().toISOString();

    try {
      await task.fn();
      task.successfulRuns++;
    } catch (err) {
      task.failedRuns++;
    }

    const duration = Date.now() - start;
    task.averageDurationMs = Math.round(
      (task.averageDurationMs * (task.totalRuns - 1) + duration) / task.totalRuns
    );

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 2000 - 1000;
    task.nextRunAt = new Date(Date.now() + task.intervalMs + jitter).toISOString();

    scheduleNext(id);
  }, task.intervalMs);

  timers.set(id, timer);
}

export function runTaskNow(id: string): Promise<void> {
  const task = tasks.get(id);
  if (!task) return Promise.resolve();
  return task.fn();
}
