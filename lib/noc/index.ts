// ============================================================
// GLOBAL OPERATIONS CENTER (NOC/SOC) — 24/7 Monitoring
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel, RiskCategory } from "../types";

export type CenterType = "global" | "national" | "regional" | "sector";
export type CenterStatus = "operational" | "degraded" | "maintenance";
export type OperatorRole = "commander" | "analyst" | "operator" | "viewer";
export type OperatorStatus = "online" | "away" | "offline";
export type PanelType = "global_map" | "national_map" | "regional_map" | "alerts" | "incidents" | "missions" | "metrics" | "timeline" | "cascade" | "communications";
export type CommType = "text" | "alert" | "directive" | "status";
export type CommPriority = "normal" | "urgent" | "critical";

export interface OperationCenter {
  id: string;
  name: string;
  type: CenterType;
  timezone: string;
  operators: Operator[];
  status: CenterStatus;
  metrics: CenterMetrics;
}

export interface Operator {
  id: string;
  name: string;
  role: OperatorRole;
  status: OperatorStatus;
  lastActive: string;
  currentMission?: string;
}

export interface CenterMetrics {
  totalEvents: number;
  criticalAlerts: number;
  activeIncidents: number;
  activeMissions: number;
  systemHealth: number;
  uptime: string;
  eventsLast24h: number;
  alertsLast24h: number;
  avgResponseTime: string;
}

export interface DashboardPanel {
  id: string;
  type: PanelType;
  title: string;
  position: { x: number; y: number; w: number; h: number };
  config: Record<string, unknown>;
  visible: boolean;
}

export interface Communication {
  id: string;
  from: string;
  to: string | "all";
  message: string;
  type: CommType;
  timestamp: string;
  priority: CommPriority;
}

// ─── STORE ─────────────────────────────────────────────────

const centers: Map<string, OperationCenter> = new Map();
const panels: Map<string, DashboardPanel[]> = new Map();
const communications: Map<string, Communication[]> = new Map();
const operators: Map<string, Operator> = new Map();

let centerCounter = 0;
let commCounter = 0;

// ─── PRESET LAYOUTS ────────────────────────────────────────

const GLOBAL_LAYOUT: Omit<DashboardPanel, "id">[] = [
  { type: "global_map", title: "Mapa Global de Eventos", position: { x: 0, y: 0, w: 8, h: 6 }, config: { autoRotate: true, showHeatmap: true }, visible: true },
  { type: "alerts", title: "Alertas Críticos", position: { x: 8, y: 0, w: 4, h: 3 }, config: { filter: "critico,emergencia,extremo", maxItems: 20 }, visible: true },
  { type: "metrics", title: "Métricas do Sistema", position: { x: 8, y: 3, w: 4, h: 3 }, config: { refreshInterval: 30 }, visible: true },
  { type: "incidents", title: "Incidentes Ativos", position: { x: 0, y: 6, w: 6, h: 4 }, config: { sortBy: "riskLevel" }, visible: true },
  { type: "cascade", title: "Análise de Cascata", position: { x: 6, y: 6, w: 6, h: 4 }, config: { depth: 3 }, visible: true },
  { type: "timeline", title: "Timeline 24h", position: { x: 0, y: 10, w: 12, h: 3 }, config: { resolution: "hourly" }, visible: true },
  { type: "missions", title: "Missões Ativas", position: { x: 0, y: 13, w: 4, h: 3 }, config: { showStatus: true }, visible: true },
  { type: "communications", title: "Comunicações", position: { x: 4, y: 13, w: 4, h: 3 }, config: { showPriority: true }, visible: true },
  { type: "national_map", title: "Foco: América do Sul", position: { x: 8, y: 13, w: 4, h: 3 }, config: { region: "south_america" }, visible: true },
  { type: "regional_map", title: "Foco: Europa", position: { x: 0, y: 16, w: 4, h: 3 }, config: { region: "europe" }, visible: true },
  { type: "national_map", title: "Foco: Ásia-Pacífico", position: { x: 4, y: 16, w: 4, h: 3 }, config: { region: "asia_pacific" }, visible: true },
  { type: "alerts", title: "Tendências de Risco", position: { x: 8, y: 16, w: 4, h: 3 }, config: { showTrends: true }, visible: true },
];

const BRAZIL_LAYOUT: Omit<DashboardPanel, "id">[] = [
  { type: "national_map", title: "Mapa do Brasil", position: { x: 0, y: 0, w: 8, h: 6 }, config: { country: "brasil", showStates: true }, visible: true },
  { type: "alerts", title: "Alertas Nacionais", position: { x: 8, y: 0, w: 4, h: 3 }, config: { filter: "alto,critico,emergencia" }, visible: true },
  { type: "metrics", title: "Métricas Brasil", position: { x: 8, y: 3, w: 4, h: 3 }, config: { country: "brasil" }, visible: true },
  { type: "incidents", title: "Incidentes Ativos", position: { x: 0, y: 6, w: 6, h: 4 }, config: { country: "brasil" }, visible: true },
  { type: "cascade", title: "Impacto Regional", position: { x: 6, y: 6, w: 6, h: 4 }, config: { depth: 2 }, visible: true },
  { type: "missions", title: "Operações Nacionais", position: { x: 0, y: 10, w: 4, h: 3 }, config: { country: "brasil" }, visible: true },
  { type: "communications", title: "Comunicação Central", position: { x: 4, y: 10, w: 4, h: 3 }, config: {}, visible: true },
  { type: "timeline", title: "Timeline Brasil 24h", position: { x: 8, y: 10, w: 4, h: 3 }, config: { resolution: "hourly" }, visible: true },
];

const REGIONAL_LAYOUT: Omit<DashboardPanel, "id">[] = [
  { type: "regional_map", title: "Mapa Regional", position: { x: 0, y: 0, w: 8, h: 6 }, config: { showDetails: true }, visible: true },
  { type: "alerts", title: "Alertas Regionais", position: { x: 8, y: 0, w: 4, h: 3 }, config: {}, visible: true },
  { type: "metrics", title: "Métricas Regionais", position: { x: 8, y: 3, w: 4, h: 3 }, config: {}, visible: true },
  { type: "incidents", title: "Incidentes", position: { x: 0, y: 6, w: 6, h: 4 }, config: {}, visible: true },
  { type: "timeline", title: "Timeline Regional", position: { x: 6, y: 6, w: 6, h: 4 }, config: {}, visible: true },
  { type: "communications", title: "Comunicações", position: { x: 0, y: 10, w: 12, h: 3 }, config: {}, visible: true },
];

const SECTOR_LAYOUT: Omit<DashboardPanel, "id">[] = [
  { type: "global_map", title: "Mapa do Setor", position: { x: 0, y: 0, w: 8, h: 6 }, config: { sectorFilter: true }, visible: true },
  { type: "alerts", title: "Alertas do Setor", position: { x: 8, y: 0, w: 4, h: 3 }, config: {}, visible: true },
  { type: "metrics", title: "Métricas Setoriais", position: { x: 8, y: 3, w: 4, h: 3 }, config: {}, visible: true },
  { type: "incidents", title: "Incidentes do Setor", position: { x: 0, y: 6, w: 6, h: 4 }, config: {}, visible: true },
  { type: "timeline", title: "Timeline Setor", position: { x: 6, y: 6, w: 6, h: 4 }, config: {}, visible: true },
];

function buildPanels(layout: Omit<DashboardPanel, "id">[]): DashboardPanel[] {
  return layout.map((p, i) => ({ ...p, id: `PNL-${Date.now()}-${i}` }));
}

function getDefaultLayout(type: CenterType): Omit<DashboardPanel, "id">[] {
  switch (type) {
    case "global": return GLOBAL_LAYOUT;
    case "national": return BRAZIL_LAYOUT;
    case "regional": return REGIONAL_LAYOUT;
    case "sector": return SECTOR_LAYOUT;
  }
}

function defaultMetrics(): CenterMetrics {
  return {
    totalEvents: 0,
    criticalAlerts: 0,
    activeIncidents: 0,
    activeMissions: 0,
    systemHealth: 100,
    uptime: "0h 0m",
    eventsLast24h: 0,
    alertsLast24h: 0,
    avgResponseTime: "0s",
  };
}

// ─── CENTER CRUD ───────────────────────────────────────────

export function createOperationCenter(params: {
  name: string;
  type: CenterType;
  timezone: string;
  status?: CenterStatus;
}): OperationCenter {
  const id = `NOC-${Date.now()}-${++centerCounter}`;
  const now = new Date().toISOString();

  const center: OperationCenter = {
    id,
    name: params.name,
    type: params.type,
    timezone: params.timezone,
    operators: [],
    status: params.status || "operational",
    metrics: defaultMetrics(),
  };

  centers.set(id, center);
  panels.set(id, buildPanels(getDefaultLayout(params.type)));
  communications.set(id, []);

  return center;
}

export function getOperationCenter(id: string): OperationCenter | undefined {
  return centers.get(id);
}

export function getAllCenters(): OperationCenter[] {
  return Array.from(centers.values());
}

// ─── DASHBOARD ─────────────────────────────────────────────

export function getDashboards(centerId: string): DashboardPanel[] {
  return panels.get(centerId) || [];
}

export function updateDashboardPanel(centerId: string, panelId: string, updates: Partial<Pick<DashboardPanel, "config" | "visible" | "position" | "title">>): boolean {
  const centerPanels = panels.get(centerId);
  if (!centerPanels) return false;

  const panel = centerPanels.find(p => p.id === panelId);
  if (!panel) return false;

  if (updates.config !== undefined) panel.config = { ...panel.config, ...updates.config };
  if (updates.visible !== undefined) panel.visible = updates.visible;
  if (updates.position !== undefined) panel.position = updates.position;
  if (updates.title !== undefined) panel.title = updates.title;

  return true;
}

// ─── OPERATORS ─────────────────────────────────────────────

export function getOperators(centerId: string): Operator[] {
  const center = centers.get(centerId);
  return center ? center.operators : [];
}

export function addOperator(centerId: string, params: {
  name: string;
  role: OperatorRole;
}): Operator | undefined {
  const center = centers.get(centerId);
  if (!center) return undefined;

  const op: Operator = {
    id: `OPR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: params.name,
    role: params.role,
    status: "online",
    lastActive: new Date().toISOString(),
  };

  center.operators.push(op);
  operators.set(op.id, op);
  return op;
}

export function updateOperatorStatus(operatorId: string, status: OperatorStatus): boolean {
  const op = operators.get(operatorId);
  if (!op) return false;

  op.status = status;
  op.lastActive = new Date().toISOString();

  for (const center of centers.values()) {
    const found = center.operators.find(o => o.id === operatorId);
    if (found) {
      found.status = status;
      found.lastActive = op.lastActive;
      return true;
    }
  }
  return true;
}

// ─── COMMUNICATIONS ────────────────────────────────────────

export function sendCommunication(params: {
  centerId: string;
  from: string;
  to?: string;
  message: string;
  type?: CommType;
  priority?: CommPriority;
}): Communication | undefined {
  const centerComms = communications.get(params.centerId);
  if (!centerComms) return undefined;

  const comm: Communication = {
    id: `COM-${Date.now()}-${++commCounter}`,
    from: params.from,
    to: params.to || "all",
    message: params.message,
    type: params.type || "text",
    timestamp: new Date().toISOString(),
    priority: params.priority || "normal",
  };

  centerComms.unshift(comm);
  return comm;
}

export function getCommunications(centerId: string, limit: number = 50): Communication[] {
  const centerComms = communications.get(centerId);
  if (!centerComms) return [];
  return centerComms.slice(0, limit);
}

// ─── METRICS ───────────────────────────────────────────────

export function getCenterMetrics(centerId: string): CenterMetrics | undefined {
  const center = centers.get(centerId);
  return center ? center.metrics : undefined;
}

export function updateCenterMetrics(centerId: string, metrics: Partial<CenterMetrics>): boolean {
  const center = centers.get(centerId);
  if (!center) return false;
  center.metrics = { ...center.metrics, ...metrics };
  return true;
}

export function getOperationalSummary(): {
  totalCenters: number;
  operational: number;
  degraded: number;
  maintenance: number;
  totalOperators: number;
  onlineOperators: number;
  totalEvents: number;
  criticalAlerts: number;
  activeIncidents: number;
  centers: { id: string; name: string; type: CenterType; status: CenterStatus }[];
} {
  const all = getAllCenters();
  let totalOperators = 0;
  let onlineOperators = 0;
  let totalEvents = 0;
  let criticalAlerts = 0;
  let activeIncidents = 0;
  let operational = 0;
  let degraded = 0;
  let maintenance = 0;

  for (const c of all) {
    if (c.status === "operational") operational++;
    else if (c.status === "degraded") degraded++;
    else maintenance++;

    totalOperators += c.operators.length;
    onlineOperators += c.operators.filter(o => o.status === "online").length;
    totalEvents += c.metrics.totalEvents;
    criticalAlerts += c.metrics.criticalAlerts;
    activeIncidents += c.metrics.activeIncidents;
  }

  return {
    totalCenters: all.length,
    operational,
    degraded,
    maintenance,
    totalOperators,
    onlineOperators,
    totalEvents,
    criticalAlerts,
    activeIncidents,
    centers: all.map(c => ({ id: c.id, name: c.name, type: c.type, status: c.status })),
  };
}

// ─── SEED ──────────────────────────────────────────────────

export function seedOperationCenters(): void {
  if (centers.size > 0) return;

  const global = createOperationCenter({ name: "Centro Global de Operações", type: "global", timezone: "UTC" });
  addOperator(global.id, { name: "Comandante Silva", role: "commander" });
  addOperator(global.id, { name: "Analista Costa", role: "analyst" });
  addOperator(global.id, { name: "Operador Santos", role: "operator" });
  updateCenterMetrics(global.id, { totalEvents: 1247, criticalAlerts: 8, activeIncidents: 15, activeMissions: 6, systemHealth: 97, uptime: "72d 14h 32m", eventsLast24h: 89, alertsLast24h: 12, avgResponseTime: "4m 23s" });

  const brazil = createOperationCenter({ name: "Centro Nacional Brasil", type: "national", timezone: "America/Sao_Paulo" });
  addOperator(brazil.id, { name: "Coord. Ferreira", role: "commander" });
  addOperator(brazil.id, { name: "Analista Lima", role: "analyst" });
  updateCenterMetrics(brazil.id, { totalEvents: 432, criticalAlerts: 3, activeIncidents: 7, activeMissions: 2, systemHealth: 99, uptime: "30d 8h 15m", eventsLast24h: 34, alertsLast24h: 4, avgResponseTime: "3m 10s" });

  const energy = createOperationCenter({ name: "Centro Setor Energia", type: "sector", timezone: "UTC" });
  addOperator(energy.id, { name: "Especialista Rocha", role: "analyst" });
  updateCenterMetrics(energy.id, { totalEvents: 198, criticalAlerts: 2, activeIncidents: 4, activeMissions: 1, systemHealth: 95, uptime: "15d 22h 5m", eventsLast24h: 22, alertsLast24h: 3, avgResponseTime: "2m 55s" });

  sendCommunication({ centerId: global.id, from: "Sistema", message: "Centro Global operacional — todas as redes ativas", type: "status", priority: "normal" });
  sendCommunication({ centerId: global.id, from: "Comandante Silva", message: "Atenção: elevação do nível de risco no Pacífico Sul", type: "alert", priority: "urgent" });
  sendCommunication({ centerId: brazil.id, from: "Coord. Ferreira", message: "Monitoramento reforçado para região amazônica", type: "directive", priority: "normal" });
}
