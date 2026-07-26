import { NextResponse } from "next/server";
import { registerAllModules, getMonitorList } from "../../../lib/monitors";
import { collectAll, getEvents, getSummary, healthCheck, getAlerts } from "../../../lib/core";
import { detectTrends, detectAnomalies, calculateImpactScore } from "../../../lib/ai";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    registerAllModules();
    initialized = true;
  }
}

function detectLang(req: Request, url: URL): string {
  const qLang = url.searchParams.get("lang");
  if (qLang) return qLang;
  const accept = req.headers.get("accept-language");
  if (accept) {
    const primary = accept.split(",")[0]?.split(";")[0]?.trim();
    if (primary) return primary;
  }
  return "pt-BR";
}

export async function GET(req: Request) {
  await ensureInit();

  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "summary";
  const lang = detectLang(req, url);

  try {
    switch (action) {
      case "collect": {
        const events = await collectAll();
        return NextResponse.json({ ok: true, count: events.length, timestamp: new Date().toISOString() });
      }

      case "events": {
        const category = url.searchParams.get("category") as any;
        const riskLevel = url.searchParams.get("riskLevel") as any;
        const since = url.searchParams.get("since") || undefined;
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const events = getEvents({ category, riskLevel, since, limit });
        return NextResponse.json({ items: events, count: events.length });
      }

      case "summary": {
        const summary = getSummary();
        const trends = detectTrends(getEvents());
        const anomalies = detectAnomalies(getEvents());
        const impact = calculateImpactScore(getEvents());
        return NextResponse.json({ ...summary, trends, anomalies, impact });
      }

      case "alerts": {
        const riskLevel = url.searchParams.get("riskLevel") as any;
        const category = url.searchParams.get("category") as any;
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const alerts = getAlerts({ riskLevel, category, limit });
        return NextResponse.json({ items: alerts, count: alerts.length });
      }

      case "modules": {
        const modules = getMonitorList();
        return NextResponse.json({ modules, count: modules.length });
      }

      case "health": {
        const health = await healthCheck();
        return NextResponse.json({ health });
      }

      case "trends": {
        const trends = detectTrends(getEvents());
        return NextResponse.json({ trends });
      }

      case "anomalies": {
        const anomalies = detectAnomalies(getEvents());
        return NextResponse.json({ anomalies });
      }

      default:
        return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro interno" },
      { status: 500 }
    );
  }
}
