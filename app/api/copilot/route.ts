import { NextResponse } from "next/server";
import { registerAllModules } from "../../../lib/monitors";
import { getEvents, getAlerts } from "../../../lib/core";
import { askCopilot, getSuggestedQuestions } from "../../../lib/copilot";

let initialized = false;
async function ensureInit() {
  if (!initialized) { registerAllModules(); initialized = true; }
}

function detectLang(req: Request, url: URL): string {
  const qLang = url.searchParams.get("lang");
  if (qLang) return qLang;
  const accept = req.headers.get("accept-language");
  if (accept) {
    const primary = accept.split(",")[0]?.split(";")[0]?.trim();
    if (primary) return primary;
  }
  return "pt-BR";
}

const LANG_INSTRUCTIONS: Record<string, string> = {
  "pt-BR": "Responda SEMPRE em Português do Brasil.",
  "en-US": "ALWAYS respond in English (US).",
  "es-ES": "Responda SIEMPRE en Español.",
  "fr-FR": "Répondez TOUJOURS en Français.",
  "de-DE": "Antworten Sie IMMER auf Deutsch.",
  "it-IT": "Risponda SEMPRE in Italiano.",
  "ja-JP": "必ず日本語で回答してください。",
  "zh-CN": "请始终用简体中文回答。",
  "ru-RU": "Всегда отвечайте на русском языке.",
  "ar-SA": "أجب دائمًا بالعربية.",
};

export async function GET(req: Request) {
  await ensureInit();
  const url = new URL(req.url);
  const question = url.searchParams.get("q");
  const lang = detectLang(req, url);

  if (!question) {
    return NextResponse.json({
      message: "AI Copilot - Assistente Operacional de Inteligência",
      usage: "GET /api/copilot?q=sua+pergunta&lang=pt-BR",
      supportedLanguages: Object.keys(LANG_INSTRUCTIONS),
      suggestedQuestions: getSuggestedQuestions(),
    });
  }

  const events = getEvents({ limit: 500 });
  const alerts = getAlerts({ limit: 200 });
  const langInstruction = LANG_INSTRUCTIONS[lang] || LANG_INSTRUCTIONS["pt-BR"];
  const response = askCopilot(`${langInstruction}\n\nPergunta: ${question}`, events, alerts);

  return NextResponse.json({ data: response, lang });
}

export async function POST(req: Request) {
  await ensureInit();

  try {
    const url = new URL(req.url);
    const lang = detectLang(req, url);
    const body = await req.json() as { question: string; lang?: string };
    if (!body.question) {
      return NextResponse.json({ error: "Pergunta é obrigatória" }, { status: 400 });
    }

    const events = getEvents({ limit: 500 });
    const alerts = getAlerts({ limit: 200 });
    const responseLang = body.lang || lang;
    const langInstruction = LANG_INSTRUCTIONS[responseLang] || LANG_INSTRUCTIONS["pt-BR"];
    const response = askCopilot(`${langInstruction}\n\nPergunta: ${body.question}`, events, alerts);

    return NextResponse.json({ data: response, lang: responseLang });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erro interno" }, { status: 500 });
  }
}
