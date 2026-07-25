import { NextRequest, NextResponse } from "next/server";
import { getDefaultConfig, getVisibleLayers, getFeaturesForLayer, getFeaturesNearby, getSatellites, getSubmarineCables, getInfrastructureFacilities, searchFeatures } from "../../../lib/digitaltwin/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "config";

    switch (action) {
      case "config":
        return NextResponse.json({ success: true, data: getDefaultConfig() });

      case "layers":
        return NextResponse.json({ success: true, data: getVisibleLayers() });

      case "features": {
        const layerId = url.searchParams.get("layerId");
        if (!layerId) return NextResponse.json({ success: false, error: "layerId is required" }, { status: 400 });
        return NextResponse.json({ success: true, data: getFeaturesForLayer(layerId) });
      }

      case "nearby": {
        const lat = parseFloat(url.searchParams.get("lat") || "0");
        const lng = parseFloat(url.searchParams.get("lng") || "0");
        const radius = parseFloat(url.searchParams.get("radius") || "500");
        return NextResponse.json({ success: true, data: getFeaturesNearby(lat, lng, radius) });
      }

      case "satellites":
        return NextResponse.json({ success: true, data: getSatellites() });

      case "cables":
        return NextResponse.json({ success: true, data: getSubmarineCables() });

      case "infrastructure":
        return NextResponse.json({ success: true, data: getInfrastructureFacilities() });

      case "search": {
        const query = url.searchParams.get("q");
        if (!query) return NextResponse.json({ success: false, error: "q is required" }, { status: 400 });
        return NextResponse.json({ success: true, data: searchFeatures(query) });
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
