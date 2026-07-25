import { NextRequest, NextResponse } from "next/server";
import { getOperationCenter, getAllCenters, getDashboards, getOperators, getCommunications, sendCommunication, getCenterMetrics, getOperationalSummary, createOperationCenter } from "../../../lib/noc/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "summary";
    const centerId = url.searchParams.get("centerId") || undefined;

    switch (action) {
      case "summary":
        return NextResponse.json({ success: true, data: getOperationalSummary() });

      case "centers":
        return NextResponse.json({ success: true, data: getAllCenters() });

      case "center": {
        if (!centerId) return NextResponse.json({ success: false, error: "centerId é obrigatório" }, { status: 400 });
        const center = getOperationCenter(centerId);
        if (!center) return NextResponse.json({ success: false, error: "Centro não encontrado" }, { status: 404 });
        return NextResponse.json({ success: true, data: center });
      }

      case "dashboards": {
        if (!centerId) return NextResponse.json({ success: false, error: "centerId é obrigatório" }, { status: 400 });
        return NextResponse.json({ success: true, data: getDashboards(centerId) });
      }

      case "operators": {
        if (!centerId) return NextResponse.json({ success: false, error: "centerId é obrigatório" }, { status: 400 });
        return NextResponse.json({ success: true, data: getOperators(centerId) });
      }

      case "communications": {
        if (!centerId) return NextResponse.json({ success: false, error: "centerId é obrigatório" }, { status: 400 });
        const limit = parseInt(url.searchParams.get("limit") || "50");
        return NextResponse.json({ success: true, data: getCommunications(centerId, limit) });
      }

      case "metrics": {
        if (!centerId) return NextResponse.json({ success: false, error: "centerId é obrigatório" }, { status: 400 });
        const metrics = getCenterMetrics(centerId);
        if (!metrics) return NextResponse.json({ success: false, error: "Métricas não encontradas" }, { status: 404 });
        return NextResponse.json({ success: true, data: metrics });
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
    const body = await req.json() as { action?: string; [key: string]: unknown };
    const action = body.action || "create_center";

    switch (action) {
      case "create_center": {
        const center = createOperationCenter(body as Parameters<typeof createOperationCenter>[0]);
        return NextResponse.json({ success: true, data: center });
      }

      case "send_communication": {
        const comm = sendCommunication(body as Parameters<typeof sendCommunication>[0]);
        return NextResponse.json({ success: true, data: comm });
      }

      default:
        return NextResponse.json({ success: false, error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
