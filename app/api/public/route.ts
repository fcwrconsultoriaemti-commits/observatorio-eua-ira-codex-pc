import { NextResponse } from "next/server";
import { registerAllModules } from "../../../lib/monitors";
import { collectAll, getEvents, getAlerts, getSummary } from "../../../lib/core";
import { assessAllEvents, getGlobalRiskIndex } from "../../../lib/impact";
import { getClientCount, getSSEStats } from "../../../lib/sse";

let initialized = false;
async function ensureInit() {
  if (!initialized) { registerAllModules(); initialized = true; }
}

export async function GET(req: Request) {
  await ensureInit();
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/public/", "");

  try {
    switch (path) {
      case "events": {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "50"), 100);
        const events = getEvents({ limit });
        return NextResponse.json({
          data: events.map(e => ({
            id: e.id,
            title: e.title,
            category: e.module,
            riskLevel: e.riskLevel,
            location: e.location,
            timestamp: e.timestamp,
            confidence: e.confidence,
          })),
          meta: { count: events.length, limit, api: "public" },
        });
      }
      case "alerts": {
        const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 50);
        const alerts = getAlerts({ limit });
        return NextResponse.json({
          data: alerts.map(a => ({
            id: a.id,
            title: a.title,
            riskLevel: a.riskLevel,
            origin: a.origin,
            location: a.location,
            timestamp: a.timestamp,
            status: a.status,
          })),
          meta: { count: alerts.length, limit, api: "public" },
        });
      }
      case "earthquakes": {
        const events = getEvents({ category: "terremoto", limit: 50 });
        return NextResponse.json({
          data: events.map(e => ({
            id: e.id,
            title: e.title,
            magnitude: (e.metadata as Record<string, unknown>).magnitude,
            location: e.location,
            depth: e.location.depth,
            timestamp: e.timestamp,
            riskLevel: e.riskLevel,
          })),
          meta: { count: events.length, api: "public" },
        });
      }
      case "weather": {
        const categories = ["furacao", "tornado", "clima_severo", "enchente"];
        const events = getEvents({ limit: 50 }).filter(e => categories.includes(e.module));
        return NextResponse.json({
          data: events.map(e => ({
            id: e.id,
            title: e.title,
            category: e.module,
            location: e.location,
            timestamp: e.timestamp,
            riskLevel: e.riskLevel,
          })),
          meta: { count: events.length, api: "public" },
        });
      }
      case "summary": {
        const summary = getSummary();
        const events = getEvents({ limit: 200 });
        const assessments = assessAllEvents(events);
        const riskIndex = getGlobalRiskIndex(assessments);
        return NextResponse.json({
          data: {
            totalEvents: summary.totalEvents,
            activeAlerts: summary.activeAlerts,
            criticalAlerts: summary.criticalAlerts,
            globalRisk: riskIndex,
            lastUpdated: summary.lastUpdated,
          },
          meta: { api: "public" },
        });
      }
      case "health": {
        return NextResponse.json({
          data: {
            status: "healthy",
            uptime: process.uptime(),
            sseClients: getClientCount(),
            sseStats: getSSEStats(),
            timestamp: new Date().toISOString(),
          },
          meta: { api: "public" },
        });
      }
      case "stream": {
        const { createSSEResponse } = await import("../../../lib/sse");
        const category = url.searchParams.get("category") || undefined;
        const riskLevel = url.searchParams.get("riskLevel") || undefined;
        return createSSEResponse({ category, riskLevel });
      }
      default:
        return NextResponse.json({
          error: "Endpoint não encontrado",
          availableEndpoints: [
            "GET /api/public/events",
            "GET /api/public/alerts",
            "GET /api/public/earthquakes",
            "GET /api/public/weather",
            "GET /api/public/summary",
            "GET /api/public/health",
            "GET /api/public/stream",
          ],
        }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
