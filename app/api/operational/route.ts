import { NextRequest, NextResponse } from "next/server";
import { registerAllModules } from "../../../lib/monitors/index.js";
import { getOperationalData, getSystemData, getSchedulerData, getCacheData, getCircuitBreakerData, getMonitorMetricsData, triggerCollection, healthCheck, getRegisteredModules } from "../../../lib/core/index.js";

let initialized = false;

async function ensureInit() {
  if (!initialized) {
    registerAllModules();
    initialized = true;
  }
}

export async function GET(req: NextRequest) {
  await ensureInit();
  const url = new URL(req.url);
  const action = url.searchParams.get("action") || "operational";

  try {
    switch (action) {
      case "operational":
        return NextResponse.json({ success: true, data: getOperationalData() });

      case "system":
        return NextResponse.json({ success: true, data: getSystemData() });

      case "scheduler":
        return NextResponse.json({ success: true, data: getSchedulerData() });

      case "cache":
        return NextResponse.json({ success: true, data: getCacheData() });

      case "circuits":
        return NextResponse.json({ success: true, data: getCircuitBreakerData() });

      case "metrics": {
        const source = url.searchParams.get("source") || undefined;
        return NextResponse.json({ success: true, data: getMonitorMetricsData(source || undefined) });
      }

      case "health":
        return NextResponse.json({ success: true, data: await healthCheck() });

      case "modules":
        return NextResponse.json({ success: true, data: getRegisteredModules().map(m => ({ name: m.name, category: m.category, version: m.version, enabled: m.enabled })) });

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

export async function POST(req: NextRequest) {
  await ensureInit();
  try {
    const body = await req.json() as { action?: string };
    const action = body.action || "collect";

    switch (action) {
      case "collect": {
        const events = await triggerCollection();
        return NextResponse.json({ success: true, count: events.length });
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
