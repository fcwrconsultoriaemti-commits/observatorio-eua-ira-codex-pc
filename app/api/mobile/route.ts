import { NextRequest, NextResponse } from "next/server";
import { getMobileConfig, registerDevice, unregisterDevice, getDevicesByUser, sendPushNotification, getPushHistory, updateOfflineCache, getOfflineCacheStatus, checkVersionCompatibility, getMobileDashboard } from "../../../lib/mobile/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "config";

    switch (action) {
      case "config":
        return NextResponse.json({ success: true, data: getMobileConfig() });

      case "devices": {
        const userId = url.searchParams.get("userId");
        if (!userId) return NextResponse.json({ success: false, error: "userId é obrigatório" }, { status: 400 });
        return NextResponse.json({ success: true, data: getDevicesByUser(userId) });
      }

      case "push_history": {
        const limit = parseInt(url.searchParams.get("limit") || "50");
        return NextResponse.json({ success: true, data: getPushHistory(limit) });
      }

      case "offline_cache": {
        const userId = url.searchParams.get("userId") || "default";
        return NextResponse.json({ success: true, data: getOfflineCacheStatus(userId) });
      }

      case "version": {
        const version = url.searchParams.get("version");
        if (!version) return NextResponse.json({ success: false, error: "versão é obrigatória" }, { status: 400 });
        return NextResponse.json({ success: true, data: checkVersionCompatibility(version) });
      }

      case "dashboard": {
        const userId = url.searchParams.get("userId") || "default";
        return NextResponse.json({ success: true, data: getMobileDashboard(userId) });
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
    const action = body.action || "register";

    switch (action) {
      case "register": {
        const device = registerDevice(body as Parameters<typeof registerDevice>[0]);
        return NextResponse.json({ success: true, data: device });
      }

      case "unregister": {
        const deviceId = body.deviceId as string;
        if (!deviceId) return NextResponse.json({ success: false, error: "deviceId é obrigatório" }, { status: 400 });
        const result = unregisterDevice(deviceId);
        if (!result) return NextResponse.json({ success: false, error: "Dispositivo não encontrado" }, { status: 404 });
        return NextResponse.json({ success: true, data: { unregistered: true } });
      }

      case "push": {
        const notif = sendPushNotification(body as Parameters<typeof sendPushNotification>[0]);
        return NextResponse.json({ success: true, data: notif });
      }

      case "update_cache": {
        const entry = updateOfflineCache(body as Parameters<typeof updateOfflineCache>[0]);
        return NextResponse.json({ success: true, data: entry });
      }

      default:
        return NextResponse.json({ success: false, error: "Ação desconhecida" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
