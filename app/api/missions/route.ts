import { NextRequest, NextResponse } from "next/server";
import { createMission, getAllMissions, queryMissions, updateMissionStatus, addCommunication, getMission } from "../../../lib/missions/index.js";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "list";

    switch (action) {
      case "list": {
        const status = url.searchParams.get("status") as Parameters<typeof queryMissions>[0]["status"] | undefined;
        const priority = url.searchParams.get("priority") as Parameters<typeof queryMissions>[0]["priority"] | undefined;
        const limit = parseInt(url.searchParams.get("limit") || "50");
        const missions = queryMissions({ status, priority, limit });
        return NextResponse.json({ items: missions, count: missions.length });
      }

      case "detail": {
        const id = url.searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
        const mission = getMission(id);
        if (!mission) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });
        return NextResponse.json({ data: mission });
      }

      case "all": {
        const missions = getAllMissions();
        return NextResponse.json({ items: missions, count: missions.length });
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { action?: string; [key: string]: unknown };
    const action = body.action || "create";

    switch (action) {
      case "create": {
        const mission = createMission({
          title: body.title as string,
          description: body.description as string,
          priority: (body.priority as "baixa" | "media" | "alta" | "urgente") || "media",
          lat: (body.lat as number) || 0,
          lng: (body.lng as number) || 0,
          address: body.address as string,
          team: body.team as string[],
          createdBy: (body.createdBy as string) || "Sistema",
          deadline: body.deadline as string,
          relatedEvents: body.relatedEvents as string[],
          tags: body.tags as string[],
        });
        return NextResponse.json({ data: mission });
      }

      case "update_status": {
        const id = body.id as string;
        const status = body.status as Parameters<typeof updateMissionStatus>[1];
        const by = (body.by as string) || "Sistema";
        if (!id || !status) return NextResponse.json({ error: "id e status são obrigatórios" }, { status: 400 });
        const ok = updateMissionStatus(id, status, by);
        if (!ok) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });
        return NextResponse.json({ success: true });
      }

      case "add_communication": {
        const id = body.id as string;
        if (!id) return NextResponse.json({ error: "id é obrigatório" }, { status: 400 });
        const ok = addCommunication(id, {
          sender: (body.sender as string) || "Sistema",
          message: body.message as string,
          type: body.type as "text" | "status_update" | "alert" | "file",
        });
        if (!ok) return NextResponse.json({ error: "Missão não encontrada" }, { status: 404 });
        return NextResponse.json({ success: true });
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
