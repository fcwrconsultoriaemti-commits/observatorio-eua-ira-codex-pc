import { NextRequest, NextResponse } from "next/server";
import { getSectorProfile, getSectorEvents, getSectorKPIs, getSectorAlerts, generateSectorReport } from "../../../lib/sectors/index.js";
import { getEvents, getAlerts } from "../../../lib/core/index.js";

const VALID_SECTORS = ["energy", "finance", "health", "agriculture", "technology", "defense", "transport", "communications", "water", "mining"] as const;

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "profile";
    const sector = url.searchParams.get("sector") as Parameters<typeof getSectorProfile>[0] | undefined;

    if (sector && !VALID_SECTORS.includes(sector as any)) {
      return NextResponse.json({ success: false, error: `Invalid sector. Valid: ${VALID_SECTORS.join(", ")}` }, { status: 400 });
    }

    switch (action) {
      case "profile": {
        if (!sector) return NextResponse.json({ success: false, error: "sector is required" }, { status: 400 });
        return NextResponse.json({ success: true, data: getSectorProfile(sector) });
      }

      case "events": {
        if (!sector) return NextResponse.json({ success: false, error: "sector is required" }, { status: 400 });
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const events = getEvents({ limit: 500 });
        const sectorEvents = getSectorEvents(sector, events).slice(0, limit);
        return NextResponse.json({ success: true, data: sectorEvents, count: sectorEvents.length });
      }

      case "kpis": {
        if (!sector) return NextResponse.json({ success: false, error: "sector is required" }, { status: 400 });
        const events = getEvents({ limit: 500 });
        return NextResponse.json({ success: true, data: getSectorKPIs(sector, events) });
      }

      case "alerts": {
        if (!sector) return NextResponse.json({ success: false, error: "sector is required" }, { status: 400 });
        const alerts = getAlerts({ limit: 500 });
        return NextResponse.json({ success: true, data: getSectorAlerts(sector, alerts) });
      }

      case "report": {
        if (!sector) return NextResponse.json({ success: false, error: "sector is required" }, { status: 400 });
        const events = getEvents({ limit: 500 });
        const alerts = getAlerts({ limit: 500 });
        return NextResponse.json({ success: true, data: generateSectorReport(sector, events, alerts) });
      }

      case "list":
        return NextResponse.json({ success: true, data: VALID_SECTORS });

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { sector?: string; [key: string]: unknown };

    if (!body.sector) return NextResponse.json({ success: false, error: "sector is required" }, { status: 400 });

    const events = getEvents({ limit: 500 });
    const alerts = getAlerts({ limit: 500 });
    const report = generateSectorReport(body.sector as Parameters<typeof generateSectorReport>[0], events, alerts);
    return NextResponse.json({ success: true, data: report });
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
