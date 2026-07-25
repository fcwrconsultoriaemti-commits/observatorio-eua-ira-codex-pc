// ============================================================
// MARKETPLACE DE INTEGRAÇÕES — Gerenciamento de Plugins e Conectores
// ============================================================

export interface Connector {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: "data_source" | "notification" | "visualization" | "analysis" | "export";
  type: "api" | "webhook" | "feed" | "database" | "satellite";
  status: "installed" | "available" | "deprecated";
  config: ConnectorConfig;
  health: () => Promise<boolean>;
  fetch?: () => Promise<unknown>;
}

export interface ConnectorConfig {
  endpoint?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  refreshInterval?: number;
  retryPolicy?: { maxRetries: number; backoffMs: number };
  rateLimit?: { requests: number; perSeconds: number };
}

export interface MarketplacePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: Connector["category"];
  type: Connector["type"];
  rating: number;
  installs: number;
  lastUpdated: string;
  documentation: string;
  configSchema: Record<string, unknown>;
}

// ─── ARMAZENAMENTO EM MEMÓRIA ───────────────────────────────

const connectors: Map<string, Connector> = new Map();
const installedConnectors: Map<string, Connector> = new Map();

// ─── CATÁLOGO DE PLUGINS PRÉ-CONSTRUÍDOS ────────────────────

const pluginCatalog: MarketplacePlugin[] = [
  {
    id: "PLUGIN-USGS-EQ",
    name: "Feed de Terremotos USGS",
    description: "Dados de terremotos em tempo real do Serviço Geológico dos Estados Unidos. Fornece magnitude, profundidade, localização e potencial de tsunami para eventos sísmicos globais.",
    version: "2.1.0",
    author: "USGS",
    category: "data_source",
    type: "feed",
    rating: 4.8,
    installs: 12400,
    lastUpdated: "2025-11-15T00:00:00Z",
    documentation: "https://earthquake.usgs.gov/fdsnws/event/1/",
    configSchema: {
      endpoint: { type: "string", default: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_hour.geojson" },
      refreshInterval: { type: "number", default: 60, description: "Intervalo de atualização em segundos" },
    },
  },
  {
    id: "PLUGIN-NOAA-WEATHER",
    name: "Alertas Meteorológicos NOAA",
    description: "Alertas ativos do Serviço Nacional de Meteorologia para os Estados Unidos. Inclui avisos, observações e orientações de clima severo.",
    version: "3.0.2",
    author: "NOAA",
    category: "data_source",
    type: "api",
    rating: 4.7,
    installs: 9800,
    lastUpdated: "2025-12-01T00:00:00Z",
    documentation: "https://www.weather.gov/documentation/services-web-api",
    configSchema: {
      endpoint: { type: "string", default: "https://api.weather.gov/alerts/active" },
      headers: { type: "object", default: { "User-Agent": "GlobalIntelPlatform" } },
    },
  },
  {
    id: "PLUGIN-NASA-FIRMS",
    name: "Dados de Incêndios NASA FIRMS",
    description: "Sistema de Informação de Incêndios para Gestão de Recursos. Dados de focos ativos detectados por satélite globalmente via MODIS e VIIRS.",
    version: "1.5.0",
    author: "NASA",
    category: "data_source",
    type: "satellite",
    rating: 4.9,
    installs: 15200,
    lastUpdated: "2025-10-20T00:00:00Z",
    documentation: "https://firms.modaps.eosdis.nasa.gov/api/",
    configSchema: {
      apiKey: { type: "string", required: true, description: "Chave de API NASA FIRMS" },
      endpoint: { type: "string", default: "https://firms.modaps.eosdis.nasa.gov/api/area/csv" },
      refreshInterval: { type: "number", default: 300 },
    },
  },
  {
    id: "PLUGIN-SENTINEL-HUB",
    name: "Imagens Sentinel Hub",
    description: "Acesso a imagens de satélite Copernicus Sentinel. NDVI, cores verdadeiras, cores falsas e combinações personalizadas de bandas para observação da Terra.",
    version: "2.3.1",
    author: "Sinergise",
    category: "data_source",
    type: "satellite",
    rating: 4.6,
    installs: 8400,
    lastUpdated: "2025-11-10T00:00:00Z",
    documentation: "https://docs.sentinel-hub.com/api/latest/",
    configSchema: {
      apiKey: { type: "string", required: true },
      endpoint: { type: "string", default: "https://services.sentinel-hub.com/api/v1/process" },
    },
  },
  {
    id: "PLUGIN-TELEGRAM",
    name: "Notificações Telegram",
    description: "Envie notificações de alertas e resumos de inteligência para canais e grupos do Telegram.",
    version: "1.2.0",
    author: "Community",
    category: "notification",
    type: "api",
    rating: 4.5,
    installs: 22000,
    lastUpdated: "2025-09-05T00:00:00Z",
    documentation: "https://core.telegram.org/bots/api",
    configSchema: {
      apiKey: { type: "string", required: true, description: "Token do bot" },
      endpoint: { type: "string", default: "https://api.telegram.org" },
      chatId: { type: "string", required: true, description: "ID do canal ou grupo" },
    },
  },
  {
    id: "PLUGIN-DISCORD",
    name: "Webhooks Discord",
    description: "Publique alertas e relatórios formatados em canais do Discord via integração com webhook.",
    version: "1.0.3",
    author: "Community",
    category: "notification",
    type: "webhook",
    rating: 4.4,
    installs: 18500,
    lastUpdated: "2025-10-12T00:00:00Z",
    documentation: "https://discord.com/developers/docs/resources/webhook",
    configSchema: {
      endpoint: { type: "string", required: true, description: "URL do webhook Discord" },
    },
  },
  {
    id: "PLUGIN-SLACK",
    name: "Integração Slack",
    description: "Notificações de mensagens ricas para workspaces do Slack. Suporta threads, anexos e mensagens interativas.",
    version: "2.0.1",
    author: "Community",
    category: "notification",
    type: "api",
    rating: 4.6,
    installs: 16700,
    lastUpdated: "2025-11-22T00:00:00Z",
    documentation: "https://api.slack.com/messaging/webhooks",
    configSchema: {
      endpoint: { type: "string", required: true, description: "URL do webhook Slack" },
      headers: { type: "object", default: {} },
    },
  },
  {
    id: "PLUGIN-EMAIL-SMTP",
    name: "E-mail SMTP",
    description: "Envie alertas e relatórios por e-mail via SMTP. Suporta templates HTML e envio de anexos.",
    version: "1.1.0",
    author: "Community",
    category: "notification",
    type: "api",
    rating: 4.3,
    installs: 14200,
    lastUpdated: "2025-08-18T00:00:00Z",
    documentation: "https://nodemailer.com/about/",
    configSchema: {
      endpoint: { type: "string", required: true, description: "Host SMTP" },
      apiKey: { type: "string", description: "Senha SMTP" },
      headers: { type: "object", default: { port: "587", secure: "false" } },
    },
  },
  {
    id: "PLUGIN-PDF-EXPORT",
    name: "Gerador de Relatórios PDF",
    description: "Gere relatórios de inteligência formatados em PDF com gráficos, mapas e resumos executivos.",
    version: "1.3.0",
    author: "Platform",
    category: "export",
    type: "api",
    rating: 4.7,
    installs: 20100,
    lastUpdated: "2025-12-05T00:00:00Z",
    documentation: "https://platform.io/docs/export/pdf",
    configSchema: {
      endpoint: { type: "string", default: "https://api.platform.io/export/pdf" },
    },
  },
  {
    id: "PLUGIN-CSV-EXPORT",
    name: "Exportação de Dados CSV",
    description: "Exporte dados de eventos, alertas e análises em formato CSV para análise externa.",
    version: "1.0.0",
    author: "Platform",
    category: "export",
    type: "api",
    rating: 4.2,
    installs: 11500,
    lastUpdated: "2025-07-30T00:00:00Z",
    documentation: "https://platform.io/docs/export/csv",
    configSchema: {},
  },
  {
    id: "PLUGIN-GRAFANA",
    name: "Painel Grafana",
    description: "Visualize dados da plataforma em painéis do Grafana. Fornece painéis pré-construídos para alertas, eventos e KPIs.",
    version: "2.1.0",
    author: "Community",
    category: "visualization",
    type: "api",
    rating: 4.8,
    installs: 13600,
    lastUpdated: "2025-11-28T00:00:00Z",
    documentation: "https://grafana.com/docs/grafana/latest/",
    configSchema: {
      endpoint: { type: "string", required: true, description: "URL da instância Grafana" },
      apiKey: { type: "string", required: true },
    },
  },
  {
    id: "PLUGIN-MAPBOX",
    name: "Tiles Mapbox",
    description: "Tiles de mapa de alta qualidade para visualização geoespacial. Estilos de satélite, ruas, terreno e escuro.",
    version: "1.4.2",
    author: "Mapbox",
    category: "visualization",
    type: "api",
    rating: 4.9,
    installs: 25000,
    lastUpdated: "2025-12-10T00:00:00Z",
    documentation: "https://docs.mapbox.com/api/maps/tiles/",
    configSchema: {
      apiKey: { type: "string", required: true, description: "Token de acesso Mapbox" },
      endpoint: { type: "string", default: "https://api.mapbox.com" },
    },
  },
];

// ─── FUNÇÕES DO MARKETPLACE ────────────────────────────────

export function registerConnector(connector: Connector): void {
  connectors.set(connector.id, connector);
  installedConnectors.set(connector.id, connector);
}

export function getConnector(id: string): Connector | undefined {
  return installedConnectors.get(id) ?? connectors.get(id);
}

export function listConnectors(category?: string): Connector[] {
  const allConnectors = Array.from(installedConnectors.values());
  if (category) {
    return allConnectors.filter((c) => c.category === category);
  }
  return allConnectors;
}

export function installPlugin(pluginId: string, config: ConnectorConfig): Connector {
  const plugin = pluginCatalog.find((p) => p.id === pluginId);
  if (!plugin) {
    throw new Error(`Plugin não encontrado: ${pluginId}`);
  }

  const connector: Connector = {
    id: `CONN-${pluginId}-${Date.now()}`,
    name: plugin.name,
    description: plugin.description,
    version: plugin.version,
    author: plugin.author,
    category: plugin.category,
    type: plugin.type,
    status: "installed",
    config,
    health: async () => true,
    fetch: undefined,
  };

  installedConnectors.set(connector.id, connector);
  return connector;
}

export function uninstallPlugin(connectorId: string): boolean {
  return installedConnectors.delete(connectorId);
}

export function getAvailablePlugins(): MarketplacePlugin[] {
  return [...pluginCatalog];
}

export function getInstalledPlugins(): Connector[] {
  return Array.from(installedConnectors.values());
}

export function updatePluginConfig(connectorId: string, config: Partial<ConnectorConfig>): boolean {
  const connector = installedConnectors.get(connectorId);
  if (!connector) return false;

  connector.config = { ...connector.config, ...config };
  installedConnectors.set(connectorId, connector);
  return true;
}

export function getPluginHealth(): {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  lastCheck: string;
}[] {
  return Array.from(installedConnectors.values()).map((connector) => ({
    id: connector.id,
    name: connector.name,
    status: "healthy" as const,
    lastCheck: new Date().toISOString(),
  }));
}

export function searchPlugins(query: string): MarketplacePlugin[] {
  const q = query.toLowerCase();
  return pluginCatalog.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.author.toLowerCase().includes(q)
  );
}

export function getPluginCatalog(): MarketplacePlugin[] {
  return [...pluginCatalog];
}
