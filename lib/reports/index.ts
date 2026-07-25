// ============================================================
// REPORTS — Automatic PDF Report Generation
// ============================================================

import type { GlobalEvent, GlobalAlert, RiskLevel } from "../types";

export interface Report {
  id: string;
  type: "daily" | "weekly" | "monthly" | "incident" | "executive" | "custom";
  title: string;
  generatedAt: string;
  period: { from: string; to: string };
  content: ReportContent;
  format: "json" | "markdown" | "html";
}

export interface ReportContent {
  executive_summary: string;
  key_metrics: { label: string; value: string; trend?: string }[];
  events_section: { total: number; byCategory: Record<string, number>; byRisk: Record<string, number>; topEvents: { title: string; risk: string; impact: number }[] };
  alerts_section: { total: number; critical: number; topAlerts: { title: string; risk: string; time: string }[] };
  incidents_section: { total: number; resolved: number; avgResolutionTime: string };
  risk_assessment: { globalRisk: string; trend: string; topThreats: string[] };
  recommendations: string[];
  appendix?: string;
}

const reports: Map<string, Report> = new Map();
let reportCounter = 0;

export function generateReport(params: {
  type: Report["type"];
  events: GlobalEvent[];
  alerts: GlobalAlert[];
  period?: { from: string; to: string };
}): Report {
  const id = `RPT-${Date.now()}-${++reportCounter}`;
  const now = new Date().toISOString();
  const period = params.period || getDefaultPeriod(params.type);

  const content = buildReportContent(params.events, params.alerts, params.type);

  const report: Report = {
    id,
    type: params.type,
    title: getReportTitle(params.type, period),
    generatedAt: now,
    period,
    content,
    format: "json",
  };

  reports.set(id, report);
  return report;
}

function buildReportContent(events: GlobalEvent[], alerts: GlobalAlert[], type: Report["type"]): ReportContent {
  const eventsByCategory: Record<string, number> = {};
  const eventsByRisk: Record<string, number> = {};

  for (const e of events) {
    eventsByCategory[e.module] = (eventsByCategory[e.module] || 0) + 1;
    eventsByRisk[e.riskLevel] = (eventsByRisk[e.riskLevel] || 0) + 1;
  }

  const topEvents = events
    .sort((a, b) => (b.impact.operational + b.impact.humanitarian + b.impact.economic) - (a.impact.operational + a.impact.humanitarian + a.impact.economic))
    .slice(0, 10)
    .map(e => ({ title: e.title, risk: e.riskLevel, impact: e.impact.operational + e.impact.humanitarian + e.impact.economic }));

  const criticalAlerts = alerts.filter(a => ["critico", "emergencia", "extremo"].includes(a.riskLevel));
  const topAlerts = criticalAlerts.slice(0, 5).map(a => ({ title: a.title, risk: a.riskLevel, time: a.timestamp }));

  const riskOrder: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  const avgRisk = events.length > 0
    ? events.reduce((s, e) => s + riskOrder.indexOf(e.riskLevel), 0) / events.length
    : 0;

  return {
    executive_summary: `Período analisado: ${events.length} evento(s), ${alerts.length} alerta(s). ${criticalAlerts.length} alerta(s) crítico(s).`,
    key_metrics: [
      { label: "Total de Eventos", value: String(events.length) },
      { label: "Alertas Ativos", value: String(alerts.filter(a => a.status !== "resolvido").length) },
      { label: "Alertas Críticos", value: String(criticalAlerts.length), trend: criticalAlerts.length > 5 ? "↑" : "↓" },
      { label: "Risco Médio", value: riskOrder[Math.round(avgRisk)] },
    ],
    events_section: { total: events.length, byCategory: eventsByCategory, byRisk: eventsByRisk, topEvents },
    alerts_section: { total: alerts.length, critical: criticalAlerts.length, topAlerts },
    incidents_section: { total: events.length, resolved: 0, avgResolutionTime: "N/A" },
    risk_assessment: {
      globalRisk: riskOrder[Math.round(avgRisk)],
      trend: "estável",
      topThreats: Object.entries(eventsByCategory).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c),
    },
    recommendations: [
      "Manter monitoramento contínuo",
      "Revisar protocolos de resposta",
      "Atualizar listas de contato",
    ],
  };
}

function getDefaultPeriod(type: Report["type"]): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  let from: Date;

  switch (type) {
    case "daily": from = new Date(now.getTime() - 86400000); break;
    case "weekly": from = new Date(now.getTime() - 604800000); break;
    case "monthly": from = new Date(now.getTime() - 2592000000); break;
    default: from = new Date(now.getTime() - 86400000);
  }

  return { from: from.toISOString(), to };
}

function getReportTitle(type: Report["type"], period: { from: string; to: string }): string {
  const from = new Date(period.from).toLocaleDateString("pt-BR");
  const to = new Date(period.to).toLocaleDateString("pt-BR");

  const titles: Record<string, string> = {
    daily: `Relatório Diário — ${from}`,
    weekly: `Relatório Semanal — ${from} a ${to}`,
    monthly: `Relatório Mensal — ${from} a ${to}`,
    incident: `Relatório de Incidente — ${from}`,
    executive: `Relatório Executivo — ${from} a ${to}`,
    custom: `Relatório Personalizado — ${from} a ${to}`,
  };

  return titles[type] || `Relatório — ${from}`;
}

export function getReport(id: string): Report | undefined {
  return reports.get(id);
}

export function getAllReports(): Report[] {
  return Array.from(reports.values())
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
}

export function formatReportMarkdown(report: Report): string {
  const c = report.content;
  let md = `# ${report.title}\n\n`;
  md += `**Gerado em:** ${new Date(report.generatedAt).toLocaleString("pt-BR")}\n\n`;
  md += `## Resumo Executivo\n${c.executive_summary}\n\n`;
  md += `## Métricas Principais\n`;
  for (const m of c.key_metrics) {
    md += `- **${m.label}:** ${m.value}${m.trend ? ` (${m.trend})` : ""}\n`;
  }
  md += `\n## Eventos\n- Total: ${c.events_section.total}\n`;
  md += `### Por Categoria\n`;
  for (const [cat, count] of Object.entries(c.events_section.byCategory)) {
    md += `- ${cat}: ${count}\n`;
  }
  md += `\n## Alertas\n- Total: ${c.alerts_section.total}\n- Críticos: ${c.alerts_section.critical}\n`;
  md += `\n## Avaliação de Risco\n- Global: ${c.risk_assessment.globalRisk}\n- Tendência: ${c.risk_assessment.trend}\n`;
  md += `\n## Recomendações\n`;
  for (const r of c.recommendations) {
    md += `- ${r}\n`;
  }
  return md;
}
