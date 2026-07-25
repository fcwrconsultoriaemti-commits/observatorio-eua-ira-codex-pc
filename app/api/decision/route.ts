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
        if (!recommendationId) return NextResponse.json({ success: false, error: "id is required" }, { status: 400 });
        const rec = getRecommendation(recommendationId);
        if (!rec) return NextResponse.json({ success: false, error: "Recommendation not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: rec });
      }

      case "by_category": {
        if (!category) return NextResponse.json({ success: false, error: "category is required" }, { status: 400 });
        return NextResponse.json({ success: true, data: getRecommendationsByCategory(category) });
      }

      case "by_risk": {
        if (!risk) return NextResponse.json({ success: false, error: "risk is required" }, { status: 400 });
        return NextResponse.json({ success: true, data: getRecommendationsByRisk(risk) });
      }

      case "insights": {
        const events = getEvents({ limit: parseInt(url.searchParams.get("limit") || "50") });
        return NextResponse.json({ success: true, data: getActionableInsights(events) });
      }

      case "resources": {
        const events = getEvents({ limit: 1 });
        if (events.length === 0) return NextResponse.json({ success: false, error: "No events available" }, { status: 404 });
        return NextResponse.json({ success: true, data: assessResourceNeeds(events[0]) });
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { eventId?: string; [key: string]: unknown };

    if (body.eventId) {
      const events = getEvents({ limit: 500 });
      const event = events.find((e) => e.id === body.eventId);
      if (!event) return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
      const recommendation = analyzeEvent(event);
      return NextResponse.json({ success: true, data: recommendation });
    }

    return NextResponse.json({ success: false, error: "eventId is required" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
