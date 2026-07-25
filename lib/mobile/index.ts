export interface MobileDevice {
  id: string;
  userId: string;
  platform: "ios" | "android";
  pushToken: string;
  appVersion: string;
  osVersion: string;
  lastSeen: string;
  status: "active" | "inactive" | "unregistered";
}

export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  priority: "low" | "normal" | "high";
  sound: boolean;
  badge: number;
  timestamp: string;
  sentTo: string[];
  status: "pending" | "sent" | "delivered" | "failed";
}

export interface OfflineCache {
  userId: string;
  lastSync: string;
  cachedEvents: string[];
  cachedAlerts: string[];
  cachedMissions: string[];
  mapTiles: string[];
  sizeBytes: number;
}

export interface MobileConfig {
  version: string;
  minSupportedVersion: string;
  features: { name: string; enabled: boolean; platforms: ("ios" | "android")[] }[];
  maintenanceMode: boolean;
  forceUpdate: boolean;
}

const devices: MobileDevice[] = [
  {
    id: "device-001",
    userId: "user-1001",
    platform: "ios",
    pushToken: "apns-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx",
    appVersion: "2.4.1",
    osVersion: "17.5.1",
    lastSeen: "2026-07-25T14:30:00Z",
    status: "active",
  },
  {
    id: "device-002",
    userId: "user-1002",
    platform: "android",
    pushToken: "fcm-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
    appVersion: "2.4.0",
    osVersion: "14",
    lastSeen: "2026-07-25T12:15:00Z",
    status: "active",
  },
  {
    id: "device-003",
    userId: "user-1003",
    platform: "ios",
    pushToken: "apns-yyyyyyyy-yyyy-4yyy-yyyy-yyyyyyyyyyyy",
    appVersion: "2.3.5",
    osVersion: "16.7.2",
    lastSeen: "2026-07-20T08:00:00Z",
    status: "inactive",
  },
];

const pushHistory: PushNotification[] = [
  {
    id: "notif-001",
    title: "Alerta de Incêndio: Califórnia",
    body: "Novo incêndio detectado no norte da Califórnia. Ordens de evacuação podem ser emitidas. Monitore as autoridades locais.",
    data: { event_type: "wildfire", severity: "high", lat: 39.9, lng: -121.5, layer: "wildfires" },
    priority: "high",
    sound: true,
    badge: 3,
    timestamp: "2026-07-25T14:00:00Z",
    sentTo: ["user-1001", "user-1002"],
    status: "delivered",
  },
  {
    id: "notif-002",
    title: "Atualização de Infraestrutura",
    body: "O volume de trânsito no Canal de Suez retornou ao normal. Interrupção na cadeia de suprimentos resolvida.",
    data: { event_type: "infrastructure", severity: "low", lat: 30.5, lng: 32.35, layer: "infrastructure" },
    priority: "normal",
    sound: false,
    badge: 0,
    timestamp: "2026-07-25T10:30:00Z",
    sentTo: ["user-1001", "user-1002", "user-1003"],
    status: "delivered",
  },
];

const offlineCaches: Map<string, OfflineCache> = new Map([
  [
    "user-1001",
    {
      userId: "user-1001",
      lastSync: "2026-07-25T14:25:00Z",
      cachedEvents: ["evt-001", "evt-002", "evt-003"],
      cachedAlerts: ["alert-010", "alert-011"],
      cachedMissions: ["mission-005"],
      mapTiles: ["z2_l0_t0", "z2_l1_t0", "z3_l4_t1", "z4_l8_t3"],
      sizeBytes: 52428800,
    },
  ],
  [
    "user-1002",
    {
      userId: "user-1002",
      lastSync: "2026-07-25T12:10:00Z",
      cachedEvents: ["evt-001", "evt-002"],
      cachedAlerts: ["alert-010"],
      cachedMissions: [],
      mapTiles: ["z2_l0_t0", "z3_l4_t1"],
      sizeBytes: 26214400,
    },
  ],
]);

let mobileConfig: MobileConfig = {
  version: "2.4.1",
  minSupportedVersion: "2.2.0",
  features: [
    { name: "Notificações Push", enabled: true, platforms: ["ios", "android"] },
    { name: "Modo Offline", enabled: true, platforms: ["ios", "android"] },
    { name: "Sincronização em Segundo Plano", enabled: true, platforms: ["ios", "android"] },
    { name: "Escaneamento por Câmera", enabled: true, platforms: ["ios", "android"] },
    { name: "Sobreposição RA", enabled: false, platforms: ["ios"] },
    { name: "Autenticação Biométrica", enabled: true, platforms: ["ios", "android"] },
    { name: "Modo Escuro", enabled: true, platforms: ["ios", "android"] },
    { name: "Compartilhamento de Localização", enabled: true, platforms: ["ios", "android"] },
    { name: "Comandos de Voz", enabled: false, platforms: ["ios", "android"] },
    { name: "Suporte a Wearables", enabled: false, platforms: ["ios", "android"] },
  ],
  maintenanceMode: false,
  forceUpdate: false,
};

let notifCounter = pushHistory.length;

export function registerDevice(params: { userId: string; platform: "ios" | "android"; pushToken: string; appVersion: string; osVersion: string }): MobileDevice {
  const device: MobileDevice = {
    id: `device-${String(devices.length + 1).padStart(3, "0")}`,
    userId: params.userId,
    platform: params.platform,
    pushToken: params.pushToken,
    appVersion: params.appVersion,
    osVersion: params.osVersion,
    lastSeen: new Date().toISOString(),
    status: "active",
  };
  devices.push(device);
  return { ...device };
}

export function unregisterDevice(deviceId: string): boolean {
  const idx = devices.findIndex((d) => d.id === deviceId);
  if (idx === -1) return false;
  devices[idx].status = "unregistered";
  return true;
}

export function getDevicesByUser(userId: string): MobileDevice[] {
  return devices.filter((d) => d.userId === userId);
}

export function sendPushNotification(params: { title: string; body: string; data: Record<string, unknown>; priority?: "low" | "normal" | "high"; targetUsers?: string[] }): PushNotification {
  const activeDevices = params.targetUsers
    ? devices.filter((d) => d.status === "active" && params.targetUsers!.includes(d.userId))
    : devices.filter((d) => d.status === "active");

  const sentTo = [...new Set(activeDevices.map((d) => d.userId))];

  notifCounter++;
  const notification: PushNotification = {
    id: `notif-${String(notifCounter).padStart(3, "0")}`,
    title: params.title,
    body: params.body,
    data: params.data,
    priority: params.priority ?? "normal",
    sound: params.priority === "high",
    badge: params.priority === "high" ? 1 : 0,
    timestamp: new Date().toISOString(),
    sentTo,
    status: sentTo.length > 0 ? "sent" : "pending",
  };
  pushHistory.push(notification);
  return { ...notification };
}

export function getPushHistory(limit: number): PushNotification[] {
  return pushHistory.slice(-limit);
}

export function updateOfflineCache(userId: string, data: { events?: string[]; alerts?: string[]; missions?: string[] }): OfflineCache {
  const existing = offlineCaches.get(userId);
  const cache: OfflineCache = {
    userId,
    lastSync: new Date().toISOString(),
    cachedEvents: data.events ?? existing?.cachedEvents ?? [],
    cachedAlerts: data.alerts ?? existing?.cachedAlerts ?? [],
    cachedMissions: data.missions ?? existing?.cachedMissions ?? [],
    mapTiles: existing?.mapTiles ?? [],
    sizeBytes: existing?.sizeBytes ?? 0,
  };
  offlineCaches.set(userId, cache);
  return { ...cache };
}

export function getOfflineCacheStatus(userId: string): OfflineCache {
  const cache = offlineCaches.get(userId);
  if (cache) return { ...cache };
  return {
    userId,
    lastSync: new Date(0).toISOString(),
    cachedEvents: [],
    cachedAlerts: [],
    cachedMissions: [],
    mapTiles: [],
    sizeBytes: 0,
  };
}

export function getMobileConfig(): MobileConfig {
  return JSON.parse(JSON.stringify(mobileConfig));
}

export function checkVersionCompatibility(version: string): { compatible: boolean; forceUpdate: boolean; message: string } {
  const parse = (v: string) => v.split(".").map(Number);
  const current = parse(version);
  const min = parse(mobileConfig.minSupportedVersion);
  const latest = parse(mobileConfig.version);

  const isCompatible = current[0] > min[0] || (current[0] === min[0] && current[1] > min[1]) || (current[0] === min[0] && current[1] === min[1] && current[2] >= min[2]);

  const isLatest = current[0] === latest[0] && current[1] === latest[1] && current[2] === latest[2];

  if (!isCompatible) {
    return { compatible: false, forceUpdate: true, message: `A versão ${version} não é mais suportada. Por favor, atualize para ${mobileConfig.version} ou posterior.` };
  }
  if (mobileConfig.forceUpdate) {
    return { compatible: true, forceUpdate: true, message: `Uma atualização crítica está disponível. Por favor, atualize para a versão ${mobileConfig.version}.` };
  }
  if (!isLatest) {
    return { compatible: true, forceUpdate: false, message: `A versão ${version} é suportada. Atualize para ${mobileConfig.version} para obter novos recursos.` };
  }
  return { compatible: true, forceUpdate: false, message: "Seu aplicativo está atualizado." };
}

export function getMobileDashboard(userId: string): { activeAlerts: number; activeMissions: number; recentEvents: number; unreadNotifications: number } {
  const userDevices = devices.filter((d) => d.userId === userId);
  const unread = pushHistory.filter((n) => n.sentTo.includes(userId)).length;
  return {
    activeAlerts: 5,
    activeMissions: 2,
    recentEvents: 12,
    unreadNotifications: unread,
  };
}
