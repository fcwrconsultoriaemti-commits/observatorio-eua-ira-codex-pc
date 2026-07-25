// ============================================================
// SSE STREAMING — Real-time Event Streaming
// ============================================================

import type { GlobalEvent, GlobalAlert } from "../types";

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  lastEventId: number;
  filters?: { category?: string; riskLevel?: string };
};

const clients: Map<string, SSEClient> = new Map();
let eventCounter = 0;
const eventQueue: { id: number; type: string; data: unknown; timestamp: string }[] = [];

// ─── CLIENT MANAGEMENT ─────────────────────────────────────

export function addClient(
  controller: ReadableStreamDefaultController,
  filters?: { category?: string; riskLevel?: string }
): string {
  const id = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  clients.set(id, { id, controller, lastEventId: eventCounter, filters });
  return id;
}

export function removeClient(id: string): void {
  clients.delete(id);
}

export function getClientCount(): number {
  return clients.size;
}

// ─── EVENT BROADCASTING ────────────────────────────────────

export function broadcastEvent(event: GlobalEvent): void {
  const sseEvent = {
    id: ++eventCounter,
    type: "event",
    data: {
      id: event.id,
      title: event.title,
      category: event.module,
      riskLevel: event.riskLevel,
      location: event.location,
      timestamp: event.timestamp,
      impact: event.impact,
      confidence: event.confidence,
    },
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(sseEvent);
  if (eventQueue.length > 1000) eventQueue.shift();

  broadcast(sseEvent);
}

export function broadcastAlert(alert: GlobalAlert): void {
  const sseEvent = {
    id: ++eventCounter,
    type: "alert",
    data: {
      id: alert.id,
      title: alert.title,
      riskLevel: alert.riskLevel,
      origin: alert.origin,
      location: alert.location,
      timestamp: alert.timestamp,
      status: alert.status,
    },
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(sseEvent);
  broadcast(sseEvent);
}

export function broadcastIncident(incident: { id: string; title: string; category: string; riskLevel: string; status: string }): void {
  const sseEvent = {
    id: ++eventCounter,
    type: "incident",
    data: incident,
    timestamp: new Date().toISOString(),
  };

  eventQueue.push(sseEvent);
  broadcast(sseEvent);
}

export function broadcastStats(stats: Record<string, unknown>): void {
  const sseEvent = {
    id: ++eventCounter,
    type: "stats",
    data: stats,
    timestamp: new Date().toISOString(),
  };

  broadcast(sseEvent);
}

function broadcast(event: { id: number; type: string; data: unknown; timestamp: string }): void {
  const deadClients: string[] = [];

  for (const [id, client] of clients) {
    // Apply filters
    if (client.filters) {
      if (client.filters.category && event.type === "event") {
        const data = event.data as Record<string, unknown>;
        if (data.category !== client.filters.category) continue;
      }
      if (client.filters.riskLevel && event.type === "event") {
        const data = event.data as Record<string, unknown>;
        if (data.riskLevel !== client.filters.riskLevel) continue;
      }
    }

    try {
      const sseMessage = `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`;
      client.controller.enqueue(new TextEncoder().encode(sseMessage));
      client.lastEventId = event.id;
    } catch {
      deadClients.push(id);
    }
  }

  for (const id of deadClients) {
    clients.delete(id);
  }
}

// ─── SSE RESPONSE BUILDER ──────────────────────────────────

export function createSSEResponse(filters?: { category?: string; riskLevel?: string }): Response {
  const stream = new ReadableStream({
    start(controller) {
      const clientId = addClient(controller, filters);

      // Send initial connection message
      const welcome = `id: 0\nevent: connected\ndata: ${JSON.stringify({ clientId, message: "Conectado ao stream em tempo real" })}\n\n`;
      controller.enqueue(new TextEncoder().encode(welcome));

      // Send recent events from queue
      const recentEvents = eventQueue.slice(-10);
      for (const evt of recentEvents) {
        const msg = `id: ${evt.id}\nevent: ${evt.type}\ndata: ${JSON.stringify(evt.data)}\n\n`;
        controller.enqueue(new TextEncoder().encode(msg));
      }

      // Heartbeat every 30s
      const heartbeat = setInterval(() => {
        try {
          const ping = `id: ${eventCounter}\nevent: heartbeat\ndata: ${JSON.stringify({ time: new Date().toISOString(), clients: getClientCount() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(ping));
        } catch {
          clearInterval(heartbeat);
          removeClient(clientId);
        }
      }, 30000);
    },
    cancel() {
      // Client disconnected
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ─── STATS ─────────────────────────────────────────────────

export function getSSEStats(): {
  activeClients: number;
  totalEventsBroadcast: number;
  queueSize: number;
} {
  return {
    activeClients: clients.size,
    totalEventsBroadcast: eventCounter,
    queueSize: eventQueue.length,
  };
}
