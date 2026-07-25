// ============================================================
// INTEGRATION MARKETPLACE — Plugin & Connector Management
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

// ─── IN-MEMORY STORES ─────────────────────────────────────

const connectors: Map<string, Connector> = new Map();
const installedConnectors: Map<string, Connector> = new Map();

// ─── PRE-BUILT PLUGIN CATALOG ──────────────────────────────

const pluginCatalog: MarketplacePlugin[] = [
  {
    id: "PLUGIN-USGS-EQ",
    name: "USGS Earthquake Feed",
    description: "Real-time earthquake data from the United States Geological Survey. Provides magnitude, depth, location, and tsunami potential for global seismic events.",
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
      refreshInterval: { type: "number", default: 60, description: "Refresh interval in seconds" },
    },
  },
  {
    id: "PLUGIN-NOAA-WEATHER",
    name: "NOAA Weather Alerts",
    description: "National Weather Service active alerts for the United States. Includes severe weather warnings, watches, and advisories.",
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
    name: "NASA FIRMS Fire Data",
    description: "Fire Information for Resource Management System. Satellite-detected active fire/hotspot data globally from MODIS and VIIRS.",
    version: "1.5.0",
    author: "NASA",
    category: "data_source",
    type: "satellite",
    rating: 4.9,
    installs: 15200,
    lastUpdated: "2025-10-20T00:00:00Z",
    documentation: "https://firms.modaps.eosdis.nasa.gov/api/",
    configSchema: {
      apiKey: { type: "string", required: true, description: "NASA FIRMS API key" },
      endpoint: { type: "string", default: "https://firms.modaps.eosdis.nasa.gov/api/area/csv" },
      refreshInterval: { type: "number", default: 300 },
    },
  },
  {
    id: "PLUGIN-SENTINEL-HUB",
    name: "Sentinel Hub Imagery",
    description: "Copernicus Sentinel satellite imagery access. NDVI, true color, false color, and custom band combinations for earth observation.",
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
    name: "Telegram Notifications",
    description: "Send alert notifications and intelligence summaries to Telegram channels and groups.",
    version: "1.2.0",
    author: "Community",
    category: "notification",
    type: "api",
    rating: 4.5,
    installs: 22000,
    lastUpdated: "2025-09-05T00:00:00Z",
    documentation: "https://core.telegram.org/bots/api",
    configSchema: {
      apiKey: { type: "string", required: true, description: "Bot token" },
      endpoint: { type: "string", default: "https://api.telegram.org" },
      chatId: { type: "string", required: true, description: "Channel or group ID" },
    },
  },
  {
    id: "PLUGIN-DISCORD",
    name: "Discord Webhooks",
    description: "Post formatted alerts and reports to Discord channels via webhook integration.",
    version: "1.0.3",
    author: "Community",
    category: "notification",
    type: "webhook",
    rating: 4.4,
    installs: 18500,
    lastUpdated: "2025-10-12T00:00:00Z",
    documentation: "https://discord.com/developers/docs/resources/webhook",
    configSchema: {
      endpoint: { type: "string", required: true, description: "Discord webhook URL" },
    },
  },
  {
    id: "PLUGIN-SLACK",
    name: "Slack Integration",
    description: "Rich message notifications to Slack workspaces. Supports threads, attachments, and interactive messages.",
    version: "2.0.1",
    author: "Community",
    category: "notification",
    type: "api",
    rating: 4.6,
    installs: 16700,
    lastUpdated: "2025-11-22T00:00:00Z",
    documentation: "https://api.slack.com/messaging/webhooks",
    configSchema: {
      endpoint: { type: "string", required: true, description: "Slack webhook URL" },
      headers: { type: "object", default: {} },
    },
  },
  {
    id: "PLUGIN-EMAIL-SMTP",
    name: "Email SMTP",
    description: "Send email alerts and reports via SMTP. Supports HTML templates and attachment delivery.",
    version: "1.1.0",
    author: "Community",
    category: "notification",
    type: "api",
    rating: 4.3,
    installs: 14200,
    lastUpdated: "2025-08-18T00:00:00Z",
    documentation: "https://nodemailer.com/about/",
    configSchema: {
      endpoint: { type: "string", required: true, description: "SMTP host" },
      apiKey: { type: "string", description: "SMTP password" },
      headers: { type: "object", default: { port: "587", secure: "false" } },
    },
  },
  {
    id: "PLUGIN-PDF-EXPORT",
    name: "PDF Report Generator",
    description: "Generate formatted PDF intelligence reports with charts, maps, and executive summaries.",
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
    name: "CSV Data Export",
    description: "Export event data, alerts, and analytics to CSV format for external analysis.",
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
    name: "Grafana Dashboard",
    description: "Visualize platform data in Grafana dashboards. Provides pre-built panels for alerts, events, and KPIs.",
    version: "2.1.0",
    author: "Community",
    category: "visualization",
    type: "api",
    rating: 4.8,
    installs: 13600,
    lastUpdated: "2025-11-28T00:00:00Z",
    documentation: "https://grafana.com/docs/grafana/latest/",
    configSchema: {
      endpoint: { type: "string", required: true, description: "Grafana instance URL" },
      apiKey: { type: "string", required: true },
    },
  },
  {
    id: "PLUGIN-MAPBOX",
    name: "Mapbox Tiles",
    description: "High-quality map tiles for geospatial visualization. Satellite, streets, terrain, and dark styles.",
    version: "1.4.2",
    author: "Mapbox",
    category: "visualization",
    type: "api",
    rating: 4.9,
    installs: 25000,
    lastUpdated: "2025-12-10T00:00:00Z",
    documentation: "https://docs.mapbox.com/api/maps/tiles/",
    configSchema: {
      apiKey: { type: "string", required: true, description: "Mapbox access token" },
      endpoint: { type: "string", default: "https://api.mapbox.com" },
    },
  },
];

// ─── MARKETPLACE FUNCTIONS ─────────────────────────────────

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
    throw new Error(`Plugin not found: ${pluginId}`);
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
