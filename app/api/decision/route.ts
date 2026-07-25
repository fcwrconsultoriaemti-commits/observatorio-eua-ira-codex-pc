import { NextRequest, NextResponse } from "next/server";
import { analyzeEvent, getRecommendationsByCategory, getRecommendationsByRisk, getActionableInsights, assessResourceNeeds, getAllRecommendations, getRecommendation } from "../../../lib/decision/index.js";
import { getEvents } from "../../../lib/core/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const category = url.searchParams.get("category") as Parameters<typeof getRecommendationsByCategory>[0] | undefined;
    const risk = url.searchParams.get("risk") as Parameters<typeof getRecommendationsByRisk>[0] | undefined;
    const recommendationId = url.searchParams.get("id") || undefined;

    switch (action) {
      case "list":
        return NextResponse.json({ success: true, data: getAllRecommendations() });

      case "detail": {
        if (!recommendationId) return NextResponse.json({ success: false, error: "id é obrigatório" }, { status: 400 });
        const rec = getRecommendation(recommendationId);
        if (!rec) return NextResponse.json({ success: false, error: "Recomendação não encontrada" }, { status: 404 });
        return NextResponse.json({ success: true, data: rec });
      }

      case "by_category": {
        if (!category) return NextResponse.json({ success: false, error: "categoria é obrigatório" }, { status: 400 });
        return NextResponse.json({ success: true, data: getRecommendationsByCategory(category) });
      }

      case "by_risk": {
        if (!risk) return NextResponse.json({ success: false, error: "risco é obrigatório" }, { status: 400 });
        return NextResponse.json({ success: true, data: getRecommendationsByRisk(risk) });
      }

      case "insights": {
        const events = getEvents({ limit: parseInt(url.searchParams.get("limit") || "50") });
        return NextResponse.json({ success: true, data: getActionableInsights(events) });
      }

      case "resources": {
        const events = getEvents({ limit: 1 });
        if (events.length === 0) return NextResponse.json({ success: false, error: "Nenhum evento disponível" }, { status: 404 });
        return NextResponse.json({ success: true, data: assessResourceNeeds(events[0]) });
      }

      default:
        return NextResponse.json({ success: false, error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { eventId?: string; [key: string]: unknown };

    if (body.eventId) {
      const events = getEvents({ limit: 500 });
      const event = events.find((e) => e.id === body.eventId);
      if (!event) return NextResponse.json({ success: false, error: "Evento não encontrado" }, { status: 404 });
      const recommendation = analyzeEvent(event);
      return NextResponse.json({ success: true, data: recommendation });
    }

    return NextResponse.json({ success: false, error: "eventId é obrigatório" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
