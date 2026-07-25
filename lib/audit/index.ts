// ============================================================
// AUDIT SYSTEM — Complete Action Logging
// ============================================================

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userIp: string;
  details?: string;
  previousValue?: unknown;
  newValue?: unknown;
  version: number;
  metadata: Record<string, unknown>;
}

const auditLog: AuditEntry[] = [];
let auditCounter = 0;

export function logAudit(params: {
  action: string;
  entity: string;
  entityId: string;
  userId: string;
  userName: string;
  userIp: string;
  details?: string;
  previousValue?: unknown;
  newValue?: unknown;
  metadata?: Record<string, unknown>;
}): AuditEntry {
  const entry: AuditEntry = {
    id: `AUD-${Date.now()}-${++auditCounter}`,
    timestamp: new Date().toISOString(),
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    userId: params.userId,
    userName: params.userName,
    userIp: params.userIp,
    details: params.details,
    previousValue: params.previousValue,
    newValue: params.newValue,
    version: auditLog.filter(e => e.entity === params.entity && e.entityId === params.entityId).length + 1,
    metadata: params.metadata || {},
  };
  auditLog.push(entry);
  return entry;
}

export function getAuditLog(filters?: {
  entity?: string;
  entityId?: string;
  userId?: string;
  action?: string;
  since?: string;
  limit?: number;
}): AuditEntry[] {
  let entries = [...auditLog];

  if (filters?.entity) entries = entries.filter(e => e.entity === filters.entity);
  if (filters?.entityId) entries = entries.filter(e => e.entityId === filters.entityId);
  if (filters?.userId) entries = entries.filter(e => e.userId === filters.userId);
  if (filters?.action) entries = entries.filter(e => e.action === filters.action);
  if (filters?.since) {
    const since = new Date(filters.since).getTime();
    entries = entries.filter(e => new Date(e.timestamp).getTime() >= since);
  }

  entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) entries = entries.slice(0, filters.limit);
  return entries;
}

export function getAuditStats(): {
  totalEntries: number;
  byEntity: Record<string, number>;
  byUser: Record<string, number>;
  byAction: Record<string, number>;
} {
  const byEntity: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const byAction: Record<string, number> = {};

  for (const entry of auditLog) {
    byEntity[entry.entity] = (byEntity[entry.entity] || 0) + 1;
    byUser[entry.userName] = (byUser[entry.userName] || 0) + 1;
    byAction[entry.action] = (byAction[entry.action] || 0) + 1;
  }

  return { totalEntries: auditLog.length, byEntity, byUser, byAction };
}

export function exportAuditLog(format: "json" | "csv" = "json"): string {
  if (format === "csv") {
    const headers = "ID,Timestamp,Action,Entity,EntityID,User,IP,Details\n";
    const rows = auditLog.map(e =>
      `${e.id},${e.timestamp},${e.action},${e.entity},${e.entityId},${e.userName},${e.userIp},"${(e.details || "").replace(/"/g, '""')}"`
    ).join("\n");
    return headers + rows;
  }
  return JSON.stringify(auditLog, null, 2);
}

export function seedAudit(): void {
  if (auditLog.length > 0) return;
  logAudit({ action: "system_init", entity: "system", entityId: "global", userId: "system", userName: "Sistema", userIp: "127.0.0.1", details: "Plataforma inicializada" });
}
