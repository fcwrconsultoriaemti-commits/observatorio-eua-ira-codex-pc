import { NextResponse } from "next/server";
import { registerAllModules } from "../../../../lib/monitors";
import { collectAll, getEvents, getSummary, getAlerts, healthCheck } from "../../../../lib/core";
import { detectTrends, detectAnomalies, calculateImpactScore } from "../../../../lib/ai";
import { assessAllEvents, getGlobalRiskIndex } from "../../../../lib/impact";
import { investigate, getSuggestedQuestions } from "../../../../lib/investigator";
import { generatePredictions, getModels } from "../../../../lib/prediction";
import { buildTimeline } from "../../../../lib/timeline";
import { findCorrelationChains, buildConsequenceTree } from "../../../../lib/correlation/advanced";

let initialized = false;
async function ensureInit() {
  if (!initialized) { registerAllModules(); initialized = true; }
}

export async function GET(req: Request) {
  await ensureInit();
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/v2/", "");

  try {
    switch (path) {
      case "events": return handleEvents(url);
      case "alerts": return handleAlerts(url);
      case "map": return handleMap(url);
      case "risk": return handleRisk(url);
      case "earthquakes": return handleCategory("terremoto", url);
      case "weather": return handleWeather(url);
      case "intelligence": return handleIntelligence(url);
      case "predictions": return handlePredictions(url);
      case "investigate": return handleInvestigate(url);
      case "timeline": return handleTimeline(url);
      case "correlations": return handleCorrelations(url);
      case "summary": return handleSummary();
      case "health": return handleHealth();
      case "modules": return handleModules();
      default: return NextResponse.json({ error: "Not found", availableEndpoints: getEndpoints() }, { status: 404 });
    }
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  await ensureInit();
  const url = new URL(req.url);
  const path = url.pathname.replace("/api/v2/", "");

  try {
    if (path === "investigate") {
      const body = await req.json() as { question: string };
      const events = getEvents({ limit: 200 });
      const alerts = getAlerts({ limit: 100 });
      const result = investigate(body.question, events, alerts);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

// ─── HANDLERS ──────────────────────────────────────────────

function handleEvents(url: URL) {
  const category = url.searchParams.get("category") as any;
  const riskLevel = url.searchParams.get("riskLevel") as any;
  const since = url.searchParams.get("since") || undefined;
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const events = getEvents({ category, riskLevel, since, limit });
  const assessments = assessAllEvents(events);
  return NextResponse.json({
    data: events.map((e, i) => ({ ...e, impactScore: assessments[i]?.globalScore || 0 })),
    meta: { count: events.length, limit, category, riskLevel },
  });
}

function handleAlerts(url: URL) {
  const riskLevel = url.searchParams.get("riskLevel") as any;
  const category = url.searchParams.get("category") as any;
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const alerts = getAlerts({ riskLevel, category, limit });
  return NextResponse.json({ data: alerts, meta: { count: alerts.length } });
}

function handleMap(url: URL) {
  const events = getEvents({ limit: 500 });
  const assessments = assessAllEvents(events);
  return NextResponse.json({
    data: events.map((e, i) => ({
      id: e.id,
      lat: e.location.lat,
      lng: e.location.lng,
      category: e.module,
      riskLevel: e.riskLevel,
      title: e.title,
      impactScore: assessments[i]?.globalScore || 0,
    })),
    meta: { count: events.length },
  });
}

function handleRisk(url: URL) {
  const events = getEvents({ limit: 200 });
  const assessments = assessAllEvents(events);
  const riskIndex = getGlobalRiskIndex(assessments);
  return NextResponse.json({ data: riskIndex, meta: { eventCount: events.length } });
}

function handleCategory(category: string, url: URL) {
  const riskLevel = url.searchParams.get("riskLevel") as any;
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const events = getEvents({ category: category as any, riskLevel, limit });
  const assessments = assessAllEvents(events);
  return NextResponse.json({
    data: events.map((e, i) => ({ ...e, impactScore: assessments[i]?.globalScore || 0 })),
    meta: { count: events.length, category },
  });
}

function handleWeather(url: URL) {
  const categories = ["furacao", "tornado", "clima_severo", "enchente"];
  const events = getEvents({ limit: 100 }).filter(e => categories.includes(e.module));
  return NextResponse.json({ data: events, meta: { count: events.length } });
}

function handleIntelligence(url: URL) {
  const events = getEvents({ limit: 200 });
  const alerts = getAlerts({ limit: 100 });
  const assessments = assessAllEvents(events);
  const riskIndex = getGlobalRiskIndex(assessments);
  const trends = detectTrends(events);
  const anomalies = detectAnomalies(events);
  const impact = calculateImpactScore(events);

  return NextResponse.json({
    data: {
      globalRisk: riskIndex,
      eventCount: events.length,
      activeAlerts: alerts.filter(a => a.status !== "resolvido").length,
      criticalAlerts: alerts.filter(a => ["critico", "emergencia", "extremo"].includes(a.riskLevel)).length,
      trends,
      anomalies,
      impact,
      topEvents: assessments.slice(0, 10).map(a => ({
        ...events.find(e => e.id === a.eventId),
        impactScore: a.globalScore,
      })),
    },
  });
}

function handlePredictions(url: URL) {
  const events = getEvents({ limit: 200 });
  const predictions = generatePredictions(events);
  const models = getModels();
  return NextResponse.json({ data: predictions, meta: { count: predictions.length, models } });
}

function handleInvestigate(url: URL) {
  const question = url.searchParams.get("q") || "Resumo da situação atual";
  const events = getEvents({ limit: 200 });
  const alerts = getAlerts({ limit: 100 });
  const result = investigate(question, events, alerts);
  return NextResponse.json({ data: result, meta: { suggestedQuestions: getSuggestedQuestions() } });
}

function handleTimeline(url: URL) {
  const events = getEvents({ limit: 100 });
  const timeline = buildTimeline(events);
  return NextResponse.json({ data: timeline });
}

function handleCorrelations(url: URL) {
  const events = getEvents({ limit: 200 });
  const chains = findCorrelationChains(events);
  const trees = events.length > 0
    ? [buildConsequenceTree(events[0], events)]
    : [];
  return NextResponse.json({ data: { chains, trees }, meta: { chainCount: chains.length } });
}

function handleSummary() {
  const summary = getSummary();
  const events = getEvents({ limit: 200 });
  const assessments = assessAllEvents(events);
  const riskIndex = getGlobalRiskIndex(assessments);
  return NextResponse.json({ data: { ...summary, globalRisk: riskIndex } });
}

function handleHealth() {
  return healthCheck().then(h => NextResponse.json({ data: h }));
}

function handleModules() {
  return NextResponse.json({ data: [
    "earthquake", "volcano", "hurricane", "tornado", "severe-weather",
    "wildfire", "flood", "drought", "space-weather", "neo",
    "satellite", "health", "cyber", "energy", "maritime",
    "air", "economic", "infrastructure", "conflict"
  ]});
}

function getEndpoints() {
  return [
    "GET /api/v2/events", "GET /api/v2/alerts", "GET /api/v2/map",
    "GET /api/v2/risk", "GET /api/v2/earthquakes", "GET /api/v2/weather",
    "GET /api/v2/intelligence", "GET /api/v2/predictions",
    "GET /api/v2/investigate?q=...", "POST /api/v2/investigate",
    "GET /api/v2/timeline", "GET /api/v2/correlations",
    "GET /api/v2/summary", "GET /api/v2/health", "GET /api/v2/modules",
  ];
}
