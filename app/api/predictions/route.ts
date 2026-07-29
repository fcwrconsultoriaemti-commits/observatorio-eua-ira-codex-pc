import { NextRequest, NextResponse } from "next/server";
import { generatePredictions, getModels, getPredictionsByCategory } from "../../../lib/prediction/index.js";
import { getEvents } from "../../../lib/core/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "all";
    const category = url.searchParams.get("category") as Parameters<typeof getPredictionsByCategory>[0] | undefined;

    switch (action) {
      case "all": {
        const events = getEvents({ limit: 200 });
        const predictions = generatePredictions(events);
        return NextResponse.json({ items: predictions, count: predictions.length });
      }

      case "by_category": {
        if (!category) return NextResponse.json({ success: false, error: "categoria é obrigatório" }, { status: 400 });
        const events = getEvents({ limit: 200 });
        const predictions = getPredictionsByCategory(category, events);
        return NextResponse.json({ items: predictions, count: predictions.length });
      }

      case "models":
        return NextResponse.json({ items: getModels(), count: getModels().length });

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
