import { NextRequest, NextResponse } from "next/server";
import { listConnectors, getAvailablePlugins, getInstalledPlugins, installPlugin, uninstallPlugin, getPluginHealth, searchPlugins } from "../../../lib/marketplace/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";
    const query = url.searchParams.get("q") || undefined;
    const category = url.searchParams.get("category") || undefined;

    switch (action) {
      case "list":
        return NextResponse.json({ success: true, data: listConnectors(category || undefined) });

      case "available":
        return NextResponse.json({ success: true, data: getAvailablePlugins() });

      case "installed":
        return NextResponse.json({ success: true, data: getInstalledPlugins() });

      case "health":
        return NextResponse.json({ success: true, data: getPluginHealth() });

      case "search": {
        if (!query) return NextResponse.json({ success: false, error: "q is required for search" }, { status: 400 });
        return NextResponse.json({ success: true, data: searchPlugins(query) });
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
    const body = await req.json() as { action?: string; pluginId?: string; connectorId?: string; config?: Record<string, unknown>; [key: string]: unknown };
    const action = body.action || "install";

    switch (action) {
      case "install": {
        if (!body.pluginId) return NextResponse.json({ success: false, error: "pluginId is required" }, { status: 400 });
        const connector = installPlugin(body.pluginId, body.config || {});
        return NextResponse.json({ success: true, data: connector });
      }

      case "uninstall": {
        if (!body.connectorId) return NextResponse.json({ success: false, error: "connectorId is required" }, { status: 400 });
        const result = uninstallPlugin(body.connectorId);
        if (!result) return NextResponse.json({ success: false, error: "Connector not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: { uninstalled: true } });
      }

      default:
        return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
