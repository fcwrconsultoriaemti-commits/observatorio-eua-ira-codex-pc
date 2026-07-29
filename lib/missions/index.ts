// ============================================================
// MISSION CENTER — Operational Mission Management
// ============================================================

export type MissionStatus = "criada" | "atribuida" | "em_andamento" | "concluida" | "cancelada";
export type MissionPriority = "baixa" | "media" | "alta" | "urgente";

export interface Mission {
  id: string;
  title: string;
  description: string;
  status: MissionStatus;
  priority: MissionPriority;
  location: { lat: number; lng: number; address?: string };
  team: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  attachments: MissionAttachment[];
  communications: MissionCommunication[];
  history: MissionHistoryEntry[];
  relatedEvents: string[];
  tags: string[];
  notes: string;
}

export interface MissionAttachment {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface MissionCommunication {
  id: string;
  sender: string;
  message: string;
  timestamp: string;
  type: "text" | "status_update" | "alert" | "file";
}

export interface MissionHistoryEntry {
  action: string;
  by: string;
  timestamp: string;
  details?: string;
}

// ─── STORE ─────────────────────────────────────────────────

const missions: Map<string, Mission> = new Map();
let missionCounter = 0;

// ─── SEED MISSIONS ──────────────────────────────────────────

(function seedMissions() {
  const seeds = [
    { title: "Avaliação de Impacto - Terremoto Pacífico", description: "Avaliar impactos de atividade sísmica no anel de fogo do Pacífico", priority: "alta" as const, lat: 35.6762, lng: 139.6503, address: "Tokyo, Japão", team: ["Alpha", "Gamma"], createdBy: "Sistema", tags: ["sísmico", "pacifico"], status: "em_andamento" as const },
    { title: "Monitoramento de Furacão Ativo", description: "Rastreamento de trajetória e previsão de impacto costeiro", priority: "urgente" as const, lat: 25.7617, lng: -80.1918, address: "Miami, EUA", team: ["Bravo"], createdBy: "Sistema", tags: ["furacão", "atlântico"], status: "em_andamento" as const },
    { title: "Análise de Correlações Geopolíticas", description: "Investigar correlações entre eventos no Oriente Médio e mercados energéticos", priority: "media" as const, lat: 25.2048, lng: 55.2708, address: "Dubai, EAU", team: ["Charlie"], createdBy: "Sistema", tags: ["geopolítica", "energia"], status: "atribuida" as const },
  ];
  for (const s of seeds) {
    const id = `MSN-${Date.now()}-${++missionCounter}`;
    const now = new Date().toISOString();
    missions.set(id, {
      id, title: s.title, description: s.description, status: s.status, priority: s.priority,
      location: { lat: s.lat, lng: s.lng, address: s.address }, team: s.team, createdBy: s.createdBy,
      createdAt: now, updatedAt: now, deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
      attachments: [], communications: [],
      history: [{ action: "Missão criada", by: s.createdBy, timestamp: now }],
      relatedEvents: [], tags: s.tags, notes: "",
    });
  }
})();

// ─── CRUD ──────────────────────────────────────────────────

export function createMission(params: {
  title: string;
  description: string;
  priority: MissionPriority;
  lat: number;
  lng: number;
  address?: string;
  team?: string[];
  createdBy: string;
  deadline?: string;
  relatedEvents?: string[];
  tags?: string[];
}): Mission {
  const id = `MSN-${Date.now()}-${++missionCounter}`;
  const now = new Date().toISOString();

  const mission: Mission = {
    id,
    title: params.title,
    description: params.description,
    status: "criada",
    priority: params.priority,
    location: { lat: params.lat, lng: params.lng, address: params.address },
    team: params.team || [],
    createdBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
    deadline: params.deadline,
    attachments: [],
    communications: [],
    history: [{ action: "Missão criada", by: params.createdBy, timestamp: now }],
    relatedEvents: params.relatedEvents || [],
    tags: params.tags || [],
    notes: "",
  };

  missions.set(id, mission);
  return mission;
}

export function getMission(id: string): Mission | undefined {
  return missions.get(id);
}

export function getAllMissions(): Mission[] {
  return Array.from(missions.values())
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function queryMissions(filters: {
  status?: MissionStatus;
  priority?: MissionPriority;
  team?: string;
  since?: string;
  limit?: number;
}): Mission[] {
  let result = getAllMissions();

  if (filters.status) result = result.filter(m => m.status === filters.status);
  if (filters.priority) result = result.filter(m => m.priority === filters.priority);
  if (filters.team) result = result.filter(m => m.team.includes(filters.team!));
  if (filters.since) {
    const since = new Date(filters.since).getTime();
    result = result.filter(m => new Date(m.createdAt).getTime() >= since);
  }
  if (filters.limit) result = result.slice(0, filters.limit);

  return result;
}

// ─── ACTIONS ───────────────────────────────────────────────

export function updateMissionStatus(id: string, status: MissionStatus, by: string): boolean {
  const mission = missions.get(id);
  if (!mission) return false;

  const now = new Date().toISOString();
  mission.status = status;
  mission.updatedAt = now;
  mission.history.push({ action: `Status alterado para ${status}`, by, timestamp: now });

  if (status === "em_andamento" && !mission.startedAt) {
    mission.startedAt = now;
  }
  if (status === "concluida") {
    mission.completedAt = now;
  }

  return true;
}

export function addCommunication(id: string, params: {
  sender: string;
  message: string;
  type?: MissionCommunication["type"];
}): boolean {
  const mission = missions.get(id);
  if (!mission) return false;

  mission.communications.push({
    id: `comm-${Date.now()}`,
    sender: params.sender,
    message: params.message,
    timestamp: new Date().toISOString(),
    type: params.type || "text",
  });
  mission.updatedAt = new Date().toISOString();

  return true;
}

export function addAttachment(id: string, params: {
  name: string;
  type: string;
  url: string;
  uploadedBy: string;
}): boolean {
  const mission = missions.get(id);
  if (!mission) return false;

  mission.attachments.push({
    id: `att-${Date.now()}`,
    name: params.name,
    type: params.type,
    url: params.url,
    uploadedAt: new Date().toISOString(),
    uploadedBy: params.uploadedBy,
  });
  mission.updatedAt = new Date().toISOString();

  return true;
}

export function addNote(id: string, note: string, by: string): boolean {
  const mission = missions.get(id);
  if (!mission) return false;

  mission.notes = note;
  mission.updatedAt = new Date().toISOString();
  mission.history.push({ action: "Nota atualizada", by, timestamp: new Date().toISOString(), details: note.slice(0, 100) });

  return true;
}

export function addTeamMember(id: string, member: string, by: string): boolean {
  const mission = missions.get(id);
  if (!mission) return false;

  if (!mission.team.includes(member)) {
    mission.team.push(member);
    mission.updatedAt = new Date().toISOString();
    mission.history.push({ action: `Equipe: ${member} adicionado`, by, timestamp: new Date().toISOString() });
  }

  return true;
}

// ─── STATISTICS ────────────────────────────────────────────

export function getMissionStats(): {
  total: number;
  byStatus: Record<MissionStatus, number>;
  byPriority: Record<MissionPriority, number>;
  avgCompletionTime: number;
  activeMissions: number;
} {
  const all = getAllMissions();
  const byStatus: Record<MissionStatus, number> = { criada: 0, atribuida: 0, em_andamento: 0, concluida: 0, cancelada: 0 };
  const byPriority: Record<MissionPriority, number> = { baixa: 0, media: 0, alta: 0, urgente: 0 };

  let totalCompletionTime = 0;
  let completedCount = 0;

  for (const m of all) {
    byStatus[m.status]++;
    byPriority[m.priority]++;
    if (m.completedAt && m.startedAt) {
      totalCompletionTime += new Date(m.completedAt).getTime() - new Date(m.startedAt).getTime();
      completedCount++;
    }
  }

  return {
    total: all.length,
    byStatus,
    byPriority,
    avgCompletionTime: completedCount > 0 ? totalCompletionTime / completedCount : 0,
    activeMissions: byStatus.criada + byStatus.atribuida + byStatus.em_andamento,
  };
}

// ─── SEED DATA ─────────────────────────────────────────────

export function seedMissions(): void {
  if (missions.size > 0) return;

  createMission({
    title: "Monitoramento de terremoto no Pacífico",
    description: "Avaliar impacto de terremoto M6.2 no litoral do Chile",
    priority: "alta",
    lat: -33.45, lng: -70.67,
    address: "Santiago, Chile",
    team: ["Equipe Pacífico", "Analista Sísmico"],
    createdBy: "sistema",
    relatedEvents: [],
    tags: ["terremoto", "chile", "pacifico"],
  });

  createMission({
    title: "Análise de furacão no Atlântico",
    description: "Monitorar trajetória de furacão categoria 3",
    priority: "urgente",
    lat: 25.0, lng: -70.0,
    address: "Oceano Atlântico",
    team: ["Equipe Atlântico"],
    createdBy: "sistema",
    tags: ["furacao", "atlantico"],
  });
}
