// ============================================================
// NOTIFICATION ENGINE — Multi-Channel Alert Delivery
// ============================================================

import type { GlobalAlert, NotificationPayload } from "../types";

export type NotificationChannel = "webhook" | "email" | "telegram" | "discord" | "slack" | "teams" | "sms" | "push" | "whatsapp" | "api";

interface NotificationConfig {
  channel: NotificationChannel;
  enabled: boolean;
  endpoint?: string;
  token?: string;
  extra?: Record<string, unknown>;
}

const configs: Map<NotificationChannel, NotificationConfig> = new Map();
const deliveryLog: { channel: string; alertId: string; timestamp: string; success: boolean; error?: string }[] = [];

// ─── CONFIG ────────────────────────────────────────────────

export function configureChannel(config: NotificationConfig): void {
  configs.set(config.channel, config);
}

export function getChannelConfig(channel: NotificationChannel): NotificationConfig | undefined {
  return configs.get(channel);
}

export function getActiveChannels(): NotificationChannel[] {
  return Array.from(configs.values()).filter(c => c.enabled).map(c => c.channel);
}

// ─── DELIVERY ──────────────────────────────────────────────

export async function sendAlert(alert: GlobalAlert, channels?: NotificationChannel[]): Promise<void> {
  const targets = channels || getActiveChannels();

  for (const channel of targets) {
    const config = configs.get(channel);
    if (!config?.enabled) continue;

    try {
      const payload = buildPayload(alert, channel);
      await deliver(channel, config, payload);
      deliveryLog.push({
        channel,
        alertId: alert.id,
        timestamp: new Date().toISOString(),
        success: true,
      });
    } catch (err) {
      deliveryLog.push({
        channel,
        alertId: alert.id,
        timestamp: new Date().toISOString(),
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function buildPayload(alert: GlobalAlert, channel: NotificationChannel): NotificationPayload {
  const riskEmoji: Record<string, string> = {
    informativo: "ℹ️", baixo: "🟢", moderado: "🟡", alto: "🟠", critico: "🔴", emergencia: "🚨", extremo: "‼️",
  };

  const emoji = riskEmoji[alert.riskLevel] || "⚠️";
  const message = `${emoji} [${alert.riskLevel.toUpperCase()}] ${alert.title}\n📍 ${alert.location.lat.toFixed(2)}°, ${alert.location.lng.toFixed(2)}°${alert.location.country ? ` (${alert.location.country})` : ""}\n\n${alert.description}\n\n📊 Impacto: Op=${alert.impact.operational} | Hum=${alert.impact.humanitarian} | Eco=${alert.impact.economic}\n🎯 Confiabilidade: ${(alert.confidence * 100).toFixed(0)}%\n⏰ ${new Date(alert.timestamp).toLocaleString("pt-BR")}`;

  return { alert, channels: [channel], message, timestamp: new Date().toISOString() };
}

async function deliver(channel: NotificationChannel, config: NotificationConfig, payload: NotificationPayload): Promise<void> {
  switch (channel) {
    case "webhook":
      if (config.endpoint) {
        await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000),
        });
      }
      break;

    case "telegram":
      if (config.endpoint && config.token) {
        const url = `https://api.telegram.org/bot${config.token}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: config.endpoint, text: payload.message, parse_mode: "HTML" }),
          signal: AbortSignal.timeout(10000),
        });
      }
      break;

    case "discord":
      if (config.endpoint) {
        await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: payload.message }),
          signal: AbortSignal.timeout(10000),
        });
      }
      break;

    case "slack":
      if (config.endpoint) {
        await fetch(config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: payload.message }),
          signal: AbortSignal.timeout(10000),
        });
      }
      break;

    case "email":
    case "sms":
    case "push":
    case "whatsapp":
    case "teams":
    case "api":
      // Placeholder para integrações futuras
      break;
  }
}

// ─── DELIVERY LOG ──────────────────────────────────────────

export function getDeliveryLog(limit: number = 50): typeof deliveryLog {
  return deliveryLog.slice(-limit);
}

export function getDeliveryStats(): { total: number; success: number; failed: number; byChannel: Record<string, { success: number; failed: number }> } {
  const byChannel: Record<string, { success: number; failed: number }> = {};
  let success = 0;
  let failed = 0;

  for (const entry of deliveryLog) {
    if (!byChannel[entry.channel]) byChannel[entry.channel] = { success: 0, failed: 0 };
    if (entry.success) {
      success++;
      byChannel[entry.channel].success++;
    } else {
      failed++;
      byChannel[entry.channel].failed++;
    }
  }

  return { total: deliveryLog.length, success, failed, byChannel };
}
