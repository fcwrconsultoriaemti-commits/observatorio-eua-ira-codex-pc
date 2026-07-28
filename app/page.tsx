"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useI18n } from "../lib/i18n/index.js";
import LanguageSelector from "./LanguageSelector.js";

type View = "visao_geral" | "mapa" | "eventos" | "alertas" | "timeline" | "ia" | "previsoes" | "missoes" | "fontes" | "relatorios" | "analises" | "configuracoes";

interface IntelligenceSummary {
  totalEvents: number;
  activeAlerts: number;
  criticalAlerts: number;
  eventsByCategory: Record<string, number>;
  eventsByRisk: Record<string, number>;
  recentCorrelations: { eventId: string; linkedEvents: string[]; chain: string[]; cascadeRisk: string; description: string }[];
  lastUpdated: string;
  trends: { category: string; direction: string; changePercent: number; period: string }[];
  anomalies: { id: string; description: string; severity: string; detectedAt: string }[];
  impact: { operational: number; humanitarian: number; economic: number; environmental: number; security: number };
}

interface NewsItem {
  title: string; url: string; source: string; publishedAt: string; fetchedAt: string;
  status: "Confirmado" | "Em verificação" | "Não confirmado"; description: string;
}

interface AlertItem {
  id: string; eventId: string; origin: string; source: string; riskLevel: string;
  title: string; description: string; location: { lat: number; lng: number; country?: string };
  timestamp: string; confidence: number; status: string;
}

interface GlobalEvent {
  id: string; source: string; module: string; title: string; description: string;
  location: { lat: number; lng: number; country?: string; city?: string };
  timestamp: string; riskLevel: string; confidence: number;
  impact: { operational: number; humanitarian: number; economic: number; environmental: number; security: number };
}

const CATEGORY_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  terremoto: { label: "Terremotos", icon: "🔴", color: "#F44336", bg: "rgba(244,67,54,0.12)" },
  vulcao: { label: "Vulcões", icon: "🟠", color: "#FB8C00", bg: "rgba(251,140,0,0.12)" },
  furacao: { label: "Furacões", icon: "🔵", color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
  tornado: { label: "Tornados", icon: "🟣", color: "#8E24AA", bg: "rgba(142,36,170,0.12)" },
  clima_severo: { label: "Tempo Severo", icon: "🟣", color: "#8E24AA", bg: "rgba(142,36,170,0.12)" },
  incendio: { label: "Incêndios", icon: "🟠", color: "#FB8C00", bg: "rgba(251,140,0,0.12)" },
  enchente: { label: "Enchentes", icon: "🔵", color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
  seca: { label: "Secas", icon: "🟡", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  espacial: { label: "Espacial", icon: "🟣", color: "#8E24AA", bg: "rgba(142,36,170,0.12)" },
  neo: { label: "Objetos Próx. Terra", icon: "🔵", color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
  satelite: { label: "Satélites", icon: "🔵", color: "#00BCD4", bg: "rgba(0,188,212,0.12)" },
  saude: { label: "Saúde", icon: "🔴", color: "#F44336", bg: "rgba(244,67,54,0.12)" },
  cibernetico: { label: "Cibernético", icon: "🔵", color: "#00BCD4", bg: "rgba(0,188,212,0.12)" },
  energia: { label: "Energia", icon: "🟡", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  maritimo: { label: "Marítimo", icon: "🔵", color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
  aereo: { label: "Aéreo", icon: "🔵", color: "#1E88E5", bg: "rgba(30,136,229,0.12)" },
  economico: { label: "Econômico", icon: "🟡", color: "#FFC107", bg: "rgba(255,193,7,0.12)" },
  infraestrutura: { label: "Infraestrutura", icon: "🟠", color: "#FB8C00", bg: "rgba(251,140,0,0.12)" },
  conflito: { label: "Conflitos", icon: "🔴", color: "#F44336", bg: "rgba(244,67,54,0.12)" },
};

const RISK_COLORS: Record<string, string> = {
  informativo: "var(--blue)", baixo: "var(--green)", moderado: "var(--yellow)",
  alto: "var(--orange)", critico: "var(--red)", emergencia: "var(--red-critical)", extremo: "var(--red-critical)",
};

const NAV_ITEMS = [
  { id: "visao_geral" as View, icon: "📊", label: "Visão Geral" },
  { id: "mapa" as View, icon: "🗺️", label: "Mapa Global" },
  { id: "eventos" as View, icon: "⚡", label: "Eventos" },
  { id: "alertas" as View, icon: "🔔", label: "Alertas" },
  { id: "timeline" as View, icon: "📅", label: "Timeline" },
  { id: "ia" as View, icon: "🤖", label: "Inteligência IA" },
  { id: "previsoes" as View, icon: "🔮", label: "Previsões" },
  { id: "missoes" as View, icon: "🎯", label: "Missões", badge: 3 },
  { id: "fontes" as View, icon: "📰", label: "Fontes" },
  { id: "relatorios" as View, icon: "📋", label: "Relatórios" },
  { id: "analises" as View, icon: "📈", label: "Análises" },
  { id: "configuracoes" as View, icon: "⚙️", label: "Configurações" },
];

export default function Home() {
  const { t, formatDate, formatTime } = useI18n();
  const [view, setView] = useState<View>("visao_geral");
  const [now, setNow] = useState(new Date());
  const [playing, setPlaying] = useState(false);
  const [mapFilter, setMapFilter] = useState("TODOS");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Real data
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [events, setEvents] = useState<GlobalEvent[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    try {
      const [sumRes, evRes, alRes, newsRes] = await Promise.allSettled([
        fetch("/api/intelligence?action=summary").then(r => r.json()),
        fetch("/api/intelligence?action=events&limit=50").then(r => r.json()),
        fetch("/api/intelligence?action=alerts&limit=20").then(r => r.json()),
        fetch("/api/news").then(r => r.json()),
      ]);

      if (sumRes.status === "fulfilled" && sumRes.value) setSummary(sumRes.value);
      if (evRes.status === "fulfilled" && evRes.value?.items) setEvents(evRes.value.items);
      if (alRes.status === "fulfilled" && alRes.value?.items) setAlerts(alRes.value.items);
      if (newsRes.status === "fulfilled" && newsRes.value?.items) setNews(newsRes.value.items);
    } catch { /* keep existing data */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 60000); return () => clearInterval(t); }, [fetchAll]);

  // AI Copilot
  const askAI = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setAiLoading(true); setAiAnswer("");
    try {
      const r = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, lang: "pt-BR" }),
      });
      const j = await r.json() as { data?: { answer?: string } };
      setAiAnswer(j.data?.answer || "Não foi possível processar.");
    } catch { setAiAnswer("Erro ao conectar."); }
    finally { setAiLoading(false); }
  }, []);

  // Derived data
  const categories = useMemo(() => {
    if (!summary?.eventsByCategory) return [];
    return Object.entries(summary.eventsByCategory)
      .filter(([, count]) => count > 0)
      .map(([key, count]) => ({
        key, count,
        ...(CATEGORY_META[key] || { label: key, icon: "⚪", color: "#B8C7D9", bg: "rgba(255,255,255,0.06)" }),
      }))
      .sort((a, b) => b.count - a.count);
  }, [summary]);

  const riskScore = useMemo(() => {
    if (!summary?.eventsByRisk) return 50;
    const r = summary.eventsByRisk;
    const total = (r.informativo || 0) + (r.baixo || 0) + (r.moderado || 0) + (r.alto || 0) + (r.critico || 0) + (r.emergencia || 0) + (r.extremo || 0);
    if (total === 0) return 50;
    const weighted = ((r.baixo || 0) * 20 + (r.moderado || 0) * 40 + (r.alto || 0) * 65 + (r.critico || 0) * 85 + (r.emergencia || 0) * 95 + (r.extremo || 0) * 100) / total;
    return Math.round(weighted);
  }, [summary]);

  const riskLabel = riskScore >= 80 ? "EXTREMO" : riskScore >= 65 ? "CRÍTICO" : riskScore >= 45 ? "ALTO" : riskScore >= 25 ? "MODERADO" : "BAIXO";
  const riskColor = riskScore >= 80 ? "var(--red-critical)" : riskScore >= 65 ? "var(--red)" : riskScore >= 45 ? "var(--orange)" : riskScore >= 25 ? "var(--yellow)" : "var(--green)";

  const filteredEvents = useMemo(() => {
    if (mapFilter === "TODOS") return events;
    const filterMap: Record<string, string[]> = {
      TERREMOTOS: ["terremoto", "vulcao"], CLIMA: ["furacao", "tornado", "clima_severo"],
      CONFLITOS: ["conflito"], "INCÊNDIOS": ["incendio"], OUTROS: ["cibernetico", "energia", "maritimo", "aereo", "economico", "infraestrutura", "saude", "neo", "satelite", "espacial"],
    };
    return events.filter(e => filterMap[mapFilter]?.includes(e.module));
  }, [events, mapFilter]);

  const timelineData = useMemo(() => {
    const nowMs = Date.now();
    const bins = new Array(24).fill(0);
    events.forEach(e => {
      const diff = nowMs - new Date(e.timestamp).getTime();
      const hoursAgo = diff / 3600000;
      if (hoursAgo >= 0 && hoursAgo < 24) {
        const bin = 23 - Math.floor(hoursAgo);
        if (bin >= 0 && bin < 24) bins[bin]++;
      }
    });
    const max = Math.max(...bins, 1);
    return bins.map(b => Math.round((b / max) * 100));
  }, [events]);

  const tickerItems = useMemo(() => {
    if (news.length > 0) return news;
    return [
      { title: "Sistema inicializando...", source: "Sistema", publishedAt: new Date().toISOString(), fetchedAt: "", status: "Em verificação" as const, url: "", description: "" },
    ];
  }, [news]);

  const totalActive = summary?.totalEvents || events.length;
  const totalCritical = summary?.criticalAlerts || alerts.filter(a => a.riskLevel === "critico" || a.riskLevel === "emergencia").length;
  const countriesAffected = useMemo(() => {
    const countries = new Set(events.map(e => e.location?.country).filter(Boolean));
    return countries.size || 0;
  }, [events]);

  const kpis = useMemo(() => [
    { label: "EVENTOS HOJE", value: String(totalActive), color: "blue", trend: summary?.trends?.[0]?.direction === "crescente" ? `+${summary.trends[0].changePercent}%` : undefined, up: true },
    { label: "EVENTOS ATIVOS", value: String(events.length), color: "cyan" },
    { label: "ALERTAS CRÍTICOS", value: String(totalCritical), color: "red", trend: totalCritical > 5 ? "+100%" : undefined, up: true },
    { label: "PAÍSES AFETADOS", value: String(countriesAffected), color: "green" },
    { label: "IMPACTO HUMANITÁRIO", value: `${summary?.impact?.humanitarian || 0}`, color: "purple" },
    { label: "IMPACTO ECONÔMICO", value: `${summary?.impact?.economic || 0}`, color: "orange" },
    { label: "MISSÕES ATIVAS", value: "3", color: "yellow" },
    { label: "ÍNDICE RISCO GLOBAL", value: String(riskScore), color: riskScore >= 65 ? "red" : riskScore >= 45 ? "orange" : "green" },
  ], [totalActive, events.length, totalCritical, countriesAffected, summary, riskScore]);

  // --- VIEWS ---
  const renderView = () => {
    switch (view) {
      case "eventos":
        return (
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header"><span className="panel-title">EVENTOS ({events.length})</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "auto", flex: 1 }}>
              {events.map(ev => (
                <div key={ev.id} style={{ display: "flex", gap: 8, padding: "8px 10px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", cursor: "pointer" }}>
                  <div style={{ width: 6, borderRadius: 3, background: RISK_COLORS[ev.riskLevel] || "var(--text-muted)", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{ev.title}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>{ev.location?.country || ev.location?.city || "—"}</div>
                    <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{formatTime(ev.timestamp)} · {ev.source}</div>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: RISK_COLORS[ev.riskLevel] || "var(--text-muted)", color: "#fff", alignSelf: "flex-start" }}>{ev.riskLevel.toUpperCase()}</span>
                </div>
              ))}
              {events.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{loading ? "Carregando eventos..." : "Nenhum evento registrado"}</div>}
            </div>
          </div>
        );
      case "alertas":
        return (
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header"><span className="panel-title">ALERTAS ({alerts.length})</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto", flex: 1 }}>
              {alerts.map(al => (
                <div key={al.id} className="alert-card">
                  <div className={`alert-icon ${al.riskLevel === "critico" || al.riskLevel === "emergencia" ? "red" : al.riskLevel === "alto" ? "orange" : "yellow"}`}>⚠</div>
                  <div style={{ flex: 1 }}>
                    <div className="alert-title">{al.title}</div>
                    <div className="alert-meta">{al.description?.slice(0, 100)}</div>
                    <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                      <span className={`alert-badge ${al.riskLevel === "critico" || al.riskLevel === "emergencia" ? "critico" : al.riskLevel === "alto" ? "alto" : "moderado"}`}>{al.riskLevel.toUpperCase()}</span>
                      <span className="alert-time">{formatTime(al.timestamp)}</span>
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>{al.origin}</span>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{loading ? "Carregando alertas..." : "Nenhum alerta ativo"}</div>}
            </div>
          </div>
        );
      case "ia":
        return (
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header"><span className="panel-title">ASSISTENTE DE INTELIGÊNCIA IA</span><div className="ai-status"><div className="ai-status-dot" /><span className="ai-status-text">Online</span></div></div>
            <div className="ai-input" style={{ marginBottom: 12 }}>
              <input type="text" placeholder="Pergunte sobre eventos, riscos, tendências..." value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askAI(aiQuestion)} />
              <button onClick={() => askAI(aiQuestion)} disabled={aiLoading}>{aiLoading ? "⏳" : "➤"}</button>
            </div>
            {aiAnswer && <div style={{ padding: 12, background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)", borderRadius: "var(--radius-sm)", fontSize: 11, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiAnswer}</div>}
            <div className="panel-title" style={{ marginBottom: 8 }}>PERGUNTAS SUGERIDAS</div>
            <div className="ai-suggestions">
              {["Quais eventos afetam o Brasil?", "Risco para o setor de energia?", "Eventos críticos nas próximas 24h", "Resumo da situação atual", "Qual é o risco global?", "Correlações entre eventos"].map((s, i) => (
                <button key={i} className="ai-suggestion" onClick={() => { setAiQuestion(s); askAI(s); }}>{s}</button>
              ))}
            </div>
          </div>
        );
      case "fontes":
        return (
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header"><span className="panel-title">FONTES MONITORADAS</span><span className="panel-badge">{news.length} ativas</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto", flex: 1 }}>
              {(() => {
                const sources = new Map<string, { count: number; lastSeen: string }>();
                news.forEach(n => { const e = sources.get(n.source); if (e) { e.count++; } else { sources.set(n.source, { count: 1, lastSeen: n.publishedAt }); }});
                return Array.from(sources.entries()).sort((a, b) => b[1].count - a[1].count).map(([name, data]) => (
                  <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                    <div><div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div><div style={{ fontSize: 9, color: "var(--text-muted)" }}>Último: {formatTime(data.lastSeen)}</div></div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--cyan)" }}>{data.count}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        );
      case "timeline":
        return (
          <div className="panel timeline-panel" style={{ flex: 1 }}>
            <div className="timeline-header"><span className="panel-title">TIMELINE (ÚLTIMAS 24H) — {events.length} eventos</span>
              <div className="timeline-controls"><button className={playing ? "playing" : ""} onClick={() => setPlaying(!playing)}>{playing ? "⏸" : "▶"}</button></div>
            </div>
            <div className="timeline-graph" style={{ minHeight: 200 }}>
              {timelineData.map((h, i) => (
                <div key={i} className="timeline-bar" style={{ left: `${(i / 23) * 100}%`, height: `${Math.max(h, 3)}%`, background: `var(--${i % 3 === 0 ? "red" : i % 3 === 1 ? "orange" : "blue"})`, opacity: 0.7 }} />
              ))}
            </div>
            <div className="timeline-axis"><span>-24h</span><span>-18h</span><span>-12h</span><span>-6h</span><span>AGORA</span></div>
          </div>
        );
      case "relatorios":
        return (
          <div className="panel" style={{ flex: 1 }}>
            <div className="panel-header"><span className="panel-title">RELATÓRIOS</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, overflow: "auto", flex: 1 }}>
              {summary?.trends?.map((tr, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{tr.category.replace(/_/g, " ")}</span>
                    <span style={{ fontSize: 10, color: tr.direction === "crescente" ? "var(--red)" : tr.direction === "decrescente" ? "var(--green)" : "var(--text-muted)" }}>
                      {tr.direction === "crescente" ? "↑" : tr.direction === "decrescente" ? "↓" : "→"} {tr.changePercent}%
                    </span>
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>{tr.period}</div>
                </div>
              ))}
              {summary?.anomalies?.map((an, i) => (
                <div key={i} style={{ padding: "10px 14px", background: "rgba(244,67,54,0.06)", border: "1px solid rgba(244,67,54,0.15)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--red)" }}>Anomalia Detectada</div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>{an.description}</div>
                </div>
              ))}
              {(!summary?.trends?.length && !summary?.anomalies?.length) && <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>{loading ? "Carregando..." : "Sem dados de relatório"}</div>}
            </div>
          </div>
        );
      default:
        return null; // visao_geral / mapa use the standard layout
    }
  };

  const isMainView = view === "visao_geral" || view === "mapa";

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🌍</div>
          <div><h1>OBSERVATÓRIO GLOBAL</h1><small>INTELIGÊNCIA · PREVENÇÃO · PROTEÇÃO</small></div>
        </div>
        <div className="header-kpis">
          <div className="header-kpi"><div className="kpi-icon blue">⚡</div><div><div className="kpi-label">EVENTOS ATIVOS</div><div className="kpi-value blue">{totalActive}</div></div></div>
          <div className="header-kpi"><div className="kpi-icon red">🔴</div><div><div className="kpi-label">ALERTAS CRÍTICOS</div><div className="kpi-value red">{totalCritical}</div></div></div>
          <div className="header-kpi"><div className="kpi-icon yellow">⚠</div><div><div className="kpi-label">RISCO GLOBAL</div><div className="kpi-value yellow">{riskLabel}</div></div></div>
          <div className="header-kpi"><div className="kpi-icon green">📡</div><div><div className="kpi-label">FONTES</div><div className="kpi-value green">{news.length || "—"}</div></div></div>
        </div>
        <div className="header-right">
          <LanguageSelector />
          <div className="header-clock"><div className="time">{formatTime(now)}</div><div className="date">{formatDate(now, { day: "2-digit", month: "2-digit", year: "numeric" })} BRT</div></div>
          <div className="header-actions">
            <button title="Notificações">🔔<span className="badge">{totalCritical}</span></button>
            <button title="Configurações">⚙️</button>
          </div>
          <div className="header-profile"><div className="avatar">WR</div><div className="profile-info"><div className="profile-name">Operador WR</div><div className="profile-role">Administrador</div></div></div>
        </div>
      </header>

      <div className="body">
        <nav className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}>
          <button className="sidebar-toggle" onClick={() => setSidebarExpanded(!sidebarExpanded)}>{sidebarExpanded ? "◀" : "☰"}</button>
          <div className="sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button key={item.id} className={`sidebar-item ${view === item.id ? "active" : ""}`} onClick={() => setView(item.id)} title={item.label}>
                <span className="icon">{item.icon}</span><span className="label">{item.label}</span>
                {item.badge !== undefined && <span className="badge-count">{item.badge}</span>}
              </button>
            ))}
          </div>
        </nav>

        <main className="main">
          <div className="main-content">
            {isMainView ? (
              <>
                <div className="kpi-row">
                  {kpis.map(kpi => (
                    <div key={kpi.label} className={`kpi-card ${kpi.color}`}>
                      <div className="kpi-label">{kpi.label}</div>
                      <div className={`kpi-value ${kpi.color}`}>{kpi.value}</div>
                      {kpi.trend && <div className={`kpi-trend ${kpi.up ? "up" : "down"}`}>{kpi.up ? "↑" : "↓"} {kpi.trend}</div>}
                    </div>
                  ))}
                </div>
                <div className="map-section">
                  <div className="map-panel-left">
                    <div className="panel" style={{ flex: 1 }}>
                      <div className="panel-header"><span className="panel-title">CATEGORIAS</span><span className="panel-badge">{categories.reduce((s, c) => s + c.count, 0)}</span></div>
                      <div className="category-list">
                        {categories.map(cat => (
                          <div key={cat.key} className="category-item">
                            <div className="cat-icon" style={{ background: cat.bg }}>{cat.icon}</div>
                            <span className="cat-name">{cat.label}</span>
                            <span className="cat-count" style={{ color: cat.color }}>{cat.count}</span>
                          </div>
                        ))}
                        {categories.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 10 }}>{loading ? "Carregando..." : "Sem dados"}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="map-container">
                    <div className="map-toolbar">
                      <div className="map-filters">
                        {["TODOS", "TERREMOTOS", "CLIMA", "CONFLITOS", "INCÊNDIOS", "OUTROS"].map(f => (
                          <button key={f} className={`map-filter-btn ${mapFilter === f ? "active" : ""}`} onClick={() => setMapFilter(f)}>{f}</button>
                        ))}
                      </div>
                      <div className="map-controls"><button title="Filtros">⚙</button><button title="Tela cheia">⛶</button></div>
                    </div>
                    <div className="map-world">
                      <div className="map-grid" /><div className="map-land" />
                      <span className="map-country-label" style={{ left: "15%", top: "20%" }}>EUA</span>
                      <span className="map-country-label" style={{ left: "48%", top: "18%" }}>RÚSSIA</span>
                      <span className="map-country-label" style={{ left: "25%", top: "55%" }}>BRASIL</span>
                      <span className="map-country-label" style={{ left: "68%", top: "28%" }}>CHINA</span>
                      <span className="map-country-label" style={{ left: "60%", top: "38%" }}>ÍNDIA</span>
                      <span className="map-country-label" style={{ left: "48%", top: "32%" }}>ORIENTE MÉDIO</span>
                      <span className="map-country-label" style={{ left: "38%", top: "22%" }}>EUROPA</span>
                      <span className="map-country-label" style={{ left: "42%", top: "58%" }}>ÁFRICA</span>
                      <span className="map-country-label" style={{ left: "78%", top: "65%" }}>OCEANIA</span>
                      {filteredEvents.map(ev => {
                        const x = ((ev.location?.lng || 0 + 180) / 360) * 100;
                        const y = ((90 - (ev.location?.lat || 0)) / 180) * 100;
                        const c = RISK_COLORS[ev.riskLevel] || "var(--text-muted)";
                        return <div key={ev.id} className="map-pin" style={{ left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(5, Math.min(95, y))}%`, background: c, color: c }} title={`${ev.title} — ${ev.location?.country || ""}`} />;
                      })}
                      {filteredEvents.length === 0 && events.length === 0 && (
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", color: "var(--text-muted)", fontSize: 12, zIndex: 10 }}>{loading ? "Carregando mapa..." : "Nenhum evento no mapa"}</div>
                      )}
                      <div className="map-legend">
                        <span><i style={{ background: "var(--green)" }} /> Baixo</span>
                        <span><i style={{ background: "var(--yellow)" }} /> Moderado</span>
                        <span><i style={{ background: "var(--orange)" }} /> Alto</span>
                        <span><i style={{ background: "var(--red)" }} /> Crítico</span>
                        <span><i style={{ background: "var(--red-critical)" }} /> Emergência</span>
                      </div>
                    </div>
                  </div>

                  <div className="map-panel-right">
                    <div className="panel" style={{ flex: 1 }}>
                      <div className="panel-header"><span className="panel-title">ALERTAS CRÍTICOS</span><button style={{ fontSize: 9, color: "var(--cyan)", fontWeight: 600 }} onClick={() => setView("alertas")}>Ver todos</button></div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, overflow: "auto" }}>
                        {alerts.filter(a => a.riskLevel === "critico" || a.riskLevel === "emergencia").slice(0, 5).map(al => (
                          <div key={al.id} className="alert-card">
                            <div className="alert-icon red">⚠</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="alert-title">{al.title}</div>
                              <div className="alert-meta">{al.location?.country || al.origin}</div>
                              <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                                <span className="alert-badge critico">{al.riskLevel.toUpperCase()}</span>
                                <span className="alert-time">{formatTime(al.timestamp)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {alerts.filter(a => a.riskLevel === "critico" || a.riskLevel === "emergencia").length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 10 }}>{loading ? "..." : "Sem alertas críticos"}</div>}
                      </div>
                    </div>
                    <div className="panel">
                      <div className="panel-header"><span className="panel-title">RISCO GLOBAL (24H)</span></div>
                      <div className="risk-gauge"><div className="risk-gauge-arc" /><div className="risk-gauge-value"><div className="value" style={{ color: riskColor }}>{riskScore}</div><div className="label">/100</div></div></div>
                      <div style={{ textAlign: "center", marginTop: 8 }}><span style={{ fontSize: 10, fontWeight: 600, color: riskColor }}>{riskLabel}</span></div>
                    </div>
                  </div>
                </div>

                <div className="bottom-section">
                  <div className="panel">
                    <div className="panel-header"><span className="panel-title">EVENTOS RECENTES</span><span className="panel-badge">{formatTime(summary?.lastUpdated || new Date())}</span></div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
                      {events.slice(0, 5).map(ev => (
                        <div key={ev.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                          <div style={{ width: 6, borderRadius: 3, background: RISK_COLORS[ev.riskLevel] || "var(--text-muted)", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, fontWeight: 600 }}>{ev.title}</div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{ev.location?.country || "—"}</div>
                            <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{formatTime(ev.timestamp)} · {ev.source}</div>
                          </div>
                          <span style={{ fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: RISK_COLORS[ev.riskLevel] || "var(--text-muted)", color: "#fff", alignSelf: "flex-start" }}>{ev.riskLevel.toUpperCase()}</span>
                        </div>
                      ))}
                      {events.length === 0 && <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)", fontSize: 10 }}>{loading ? "Carregando..." : "Sem eventos"}</div>}
                    </div>
                  </div>

                  <div className="panel timeline-panel">
                    <div className="timeline-header"><span className="panel-title">TIMELINE (ÚLTIMAS 24H)</span>
                      <div className="timeline-controls"><button className={playing ? "playing" : ""} onClick={() => setPlaying(!playing)}>{playing ? "⏸" : "▶"}</button><span style={{ fontSize: 9, color: "var(--text-muted)" }}>1x</span></div>
                    </div>
                    <div className="timeline-graph">
                      {timelineData.map((h, i) => (
                        <div key={i} className="timeline-bar" style={{ left: `${(i / 23) * 100}%`, height: `${Math.max(h, 3)}%`, background: `var(--${i % 3 === 0 ? "red" : i % 3 === 1 ? "orange" : "blue"})`, opacity: 0.7 }} />
                      ))}
                    </div>
                    <div className="timeline-axis"><span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span></div>
                  </div>

                  <div className="panel correlation-panel">
                    <div className="panel-header"><span className="panel-title">CADEIAS DE CORRELAÇÃO</span></div>
                    <div className="correlation-chain">
                      {(summary?.recentCorrelations?.length ? summary.recentCorrelations[0].chain : []).length > 0
                        ? summary!.recentCorrelations[0].chain.map((step, i) => (
                          <div key={i} className="correlation-step">
                            <div className={`correlation-dot ${i === 0 ? "red" : i < 3 ? "orange" : "green"}`}>{i === 0 ? "🔴" : i < 3 ? "🟠" : "🟢"}</div>
                            <div className="correlation-text"><div>{step}</div></div>
                          </div>
                        ))
                        : CORRELATION_FALLBACK.map((step, i) => (
                          <div key={i} className="correlation-step">
                            <div className={`correlation-dot ${step.color}`}>{step.icon}</div>
                            <div className="correlation-text"><div>{step.label}</div><small>{step.sub}</small></div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, minHeight: 0 }}>
                    <div className="panel missions-panel" style={{ flex: "0 0 auto" }}>
                      <div className="panel-header"><span className="panel-title">MISSÕES ATIVAS</span><button style={{ fontSize: 9, color: "var(--cyan)", fontWeight: 600 }} onClick={() => setView("missoes")}>Ver todas</button></div>
                      {["Avaliação de Impacto - Eventos Recentes", "Monitoramento de Alertas Críticos", "Análise de Correlações"].map((name, i) => (
                        <div key={i} className="mission-item"><div className="mission-status active" /><div className="mission-info"><div className="mission-name">{name}</div><div className="mission-meta">Equipe {["Alpha", "Bravo", "Charlie"][i]}</div></div><span className="mission-badge andamento">Em andamento</span></div>
                      ))}
                    </div>
                    <div className="panel ai-panel" style={{ flex: 1, minHeight: 0 }}>
                      <div className="panel-header"><span className="panel-title">ASSISTENTE IA</span><div className="ai-status"><div className="ai-status-dot" /><span className="ai-status-text">Online</span></div></div>
                      <div className="ai-input">
                        <input type="text" placeholder="Pergunte sobre eventos ou riscos..." value={aiQuestion} onChange={e => setAiQuestion(e.target.value)} onKeyDown={e => e.key === "Enter" && askAI(aiQuestion)} />
                        <button onClick={() => askAI(aiQuestion)} disabled={aiLoading}>{aiLoading ? "⏳" : "➤"}</button>
                      </div>
                      {aiAnswer && <div style={{ padding: "6px 8px", background: "rgba(30,136,229,0.08)", border: "1px solid rgba(30,136,229,0.2)", borderRadius: "var(--radius-sm)", fontSize: 10, color: "var(--text-secondary)", marginBottom: 6, maxHeight: 60, overflow: "auto", lineHeight: 1.4 }}>{aiAnswer}</div>}
                      <div className="ai-suggestions">
                        {["Quais eventos afetam o Brasil?", "Risco para o setor de energia?", "Eventos críticos nas próximas 24h"].map((s, i) => (
                          <button key={i} className="ai-suggestion" onClick={() => { setAiQuestion(s); askAI(s); }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : renderView()}
          </div>

          <div className="ticker-bar">
            <span className="ticker-label">SISTEMA</span>
            <div className="ticker-track">
              <div className="ticker-content">
                {tickerItems.concat(tickerItems).map((n, i) => (
                  <span key={i} className="ticker-item"><time>{formatTime(n.publishedAt)}</time>{n.title}</span>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      <footer className="footer">
        <div className="footer-left"><div className="status-dot" />Global Intelligence Platform v3.0</div>
        <div className="footer-center">Dados em tempo real · Fontes confiáveis · Inteligência para decisões melhores</div>
        <div className="footer-right">Todos os sistemas operando normalmente</div>
      </footer>
    </div>
  );
}

const CORRELATION_FALLBACK = [
  { icon: "🔴", color: "red", label: "Evento Principal", sub: "Detecção inicial" },
  { icon: "🟠", color: "orange", label: "Consequência Direta", sub: "Impacto primário" },
  { icon: "🟡", color: "yellow", label: "Efeito Cascata", sub: "Impacto secundário" },
  { icon: "🔵", color: "blue", label: "Impacto Sistêmico", sub: "Alcance regional" },
  { icon: "🟢", color: "green", label: "Resposta Operacional", sub: "Ações de mitigação" },
];
