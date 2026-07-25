import { NextResponse } from "next/server";
import { registerAllModules } from "../../../../lib/monitors";
import { getEvents, getAlerts } from "../../../../lib/core";
import { askCopilot, getSuggestedQuestions } from "../../../../lib/copilot";

let initialized = false;
async function ensureInit() {
  if (!initialized) { registerAllModules(); initialized = true; }
}

export async function GET(req: Request) {
  await ensureInit();
  const url = new URL(req.url);
  const question = url.searchParams.get("q");

  if (!question) {
    return NextResponse.json({
      message: "AI Copilot - Assistente Operacional de Inteligência",
      usage: "GET /api/copilot?q=sua+pergunta",
      suggestedQuestions: getSuggestedQuestions(),
    });
  }

  const events = getEvents({ limit: 500 });
  const alerts = getAlerts({ limit: 200 });
  const response = askCopilot(question, events, alerts);

  return NextResponse.json({ data: response });
}

export async function POST(req: Request) {
  await ensureInit();

  try {
    const body = await req.json() as { question: string };
    if (!body.question) {
      return NextResponse.json({ error: "Question is required" }, { status: 400 });
    }

    const events = getEvents({ limit: 500 });
    const alerts = getAlerts({ limit: 200 });
    const response = askCopilot(body.question, events, alerts);

    return NextResponse.json({ data: response });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
