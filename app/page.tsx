"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../lib/i18n/index.js";
import LanguageSelector from "./LanguageSelector.js";

type Status = "Confirmado" | "Em verificação" | "Não confirmado";
type View = "visao_geral" | "mapa" | "eventos" | "alertas" | "timeline" | "ia" | "previsoes" | "missoes" | "fontes" | "relatorios" | "analises" | "configuracoes";

const SEED_EVENTS = [
  { id: 1, type: "terremoto", title: "Terremoto - M7.6", place: "Sul do Mar de Java, Indonésia", time: "14:28", detail: "10 km · Potencial tsunami", status: "critico" as const, color: "red", icon: "🔴", lat: 20, lng: 78 },
  { id: 2, type: "furacao", title: "Furacão Erin - Categoria 2", place: "Atlântico Norte", time: "13:54", detail: "Vento: 165 km/h", status: "alto" as const, color: "orange", icon: "🟠", lat: 35, lng: -45 },
  { id: 3, type: "incendio", title: "Incêndio Florestal Extremo", place: "Columbia Britânica, Canadá", time: "14:20", detail: "8.400 ha queimados", status: "alto" as const, color: "orange", icon: "🟠", lat: 52, lng: -122 },
  { id: 4, type: "conflito", title: "Conflito - Escalação Militar", place: "Oriente Médio", time: "14:18", detail: "Ataques aéreos registrados", status: "critico" as const, color: "red", icon: "🔴", lat: 33, lng: 44 },
  { id: 5, type: "cibernetico", title: "Ataque Cibernético", place: "Infraestrutura Crítica - Europa", time: "13:45", detail: "Ransomware em rede energética", status: "critico" as const, color: "red", icon: "🔴", lat: 48, lng: 10 },
  { id: 6, type: "tempestade", title: "Tempestade Tropical", place: "Oceano Índico", time: "12:30", detail: "Rajadas de 120 km/h", status: "moderado" as const, color: "yellow", icon: "🟡", lat: -10, lng: 80 },
  { id: 7, type: "terremoto", title: "Terremoto - M5.2", place: "Chile", time: "11:15", detail: "55 km de profundidade", status: "moderado" as const, color: "yellow", icon: "🟡", lat: -33, lng: -71 },
  { id: 8, type: "incendio", title: "Incêndio Florestal", place: "Amazônia, Brasil", time: "10:42", detail: "2.100 ha afetados", status: "alto" as const, color: "orange", icon: "🟠", lat: -3, lng: -60 },
];

const CATEGORIES = [
  { name: "Terremotos", count: 28, icon: "🔴", bg: "rgba(244,67,54,0.12)", color: "#F44336" },
  { name: "Tempestades", count: 31, icon: "🟣", bg: "rgba(142,36,170,0.12)", color: "#8E24AA" },
  { name: "Furacões", count: 5, icon: "🔵", bg: "rgba(30,136,229,0.12)", color: "#1E88E5" },
  { name: "Incêndios", count: 42, icon: "🟠", bg: "rgba(251,140,0,0.12)", color: "#FB8C00" },
  { name: "Conflitos", count: 17, icon: "🔴", bg: "rgba(244,67,54,0.12)", color: "#F44336" },
  { name: "Cibernético", count: 9, icon: "🔵", bg: "rgba(0,188,212,0.12)", color: "#00BCD4" },
  { name: "Outros", count: 8, icon: "⚪", bg: "rgba(255,255,255,0.06)", color: "#B8C7D9" },
];

const CORRELATION = [
  { icon: "🔴", color: "red", label: "Terremoto (Indonésia)", sub: "M7.6 · 10 km profundidade" },
  { icon: "🟠", color: "orange", label: "Tsunami Potencial", sub: "Alerta emitido para costa" },
  { icon: "🟡", color: "yellow", label: "Interrupção de Portos", sub: "Portos regionais fechados" },
  { icon: "🔵", color: "blue", label: "Impacto Logístico", sub: "Rotas marítimas desviadas" },
  { icon: "🟢", color: "green", label: "Risco Econômico Elevado", sub: "Previsão: +3% petróleo" },
];

const MISSIONS = [
  { name: "Avaliação de Impacto - Terremoto Indonésia", team: "Alpha", status: "andamento", badge: "Em andamento" },
  { name: "Monitoramento de Furacão Erin", team: "Bravo", status: "andamento", badge: "Em andamento" },
  { name: "Análise de Incêndios - América do Norte", team: "Charlie", status: "andamento", badge: "Em andamento" },
];

const AI_SUGGESTIONS = [
  "Quais eventos afetam o Brasil?",
  "Risco para o setor de energia?",
  "Eventos críticos nas próximas 24h",
];

const SYSTEM_NEWS = [
  { text: "ONU emite alerta para risco humanitário...", time: "há 5 min" },
  { text: "Mercados globais reagem a tensões no...", time: "há 12 min" },
  { text: "Furacão Erin se intensifica no Atlântico", time: "há 18 min" },
  { text: "Incêndios florestais continuam na...", time: "há 25 min" },
];

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
  const { t, formatDate, formatTime, formatRelative } = useI18n();
  const [view, setView] = useState<View>("visao_geral");
  const [now, setNow] = useState(new Date());
  const [playing, setPlaying] = useState(false);
  const [mapFilter, setMapFilter] = useState("TODOS");
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [selectedAlert, setSelectedAlert] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const kpis = useMemo(() => [
    { label: "EVENTOS HOJE", value: "247", color: "blue", trend: "+18%", up: true },
    { label: "EVENTOS ATIVOS", value: "89", color: "cyan", trend: "+21%", up: true },
    { label: "ALERTAS CRÍTICOS", value: "12", color: "red", trend: "+100%", up: true },
    { label: "PAÍSES AFETADOS", value: "23", color: "green", trend: "+9%", up: true },
    { label: "PESSOAS AFETADAS", value: "12.7M", color: "purple", trend: "+34%", up: true },
    { label: "IMPACTO ECONÔMICO", value: "US$ 5.6B", color: "orange", trend: "+42%", up: true },
    { label: "MISSÕES ATIVAS", value: "7", color: "yellow", trend: "—" },
    { label: "ÍNDICE RISCO GLOBAL", value: "72", color: "orange" },
  ], []);

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🌍</div>
          <div>
            <h1>OBSERVATÓRIO GLOBAL</h1>
            <small>INTELIGÊNCIA · PREVENÇÃO · PROTEÇÃO</small>
          </div>
        </div>

        <div className="header-kpis">
          <div className="header-kpi">
            <div className="kpi-icon blue">⚡</div>
            <div><div className="kpi-label">EVENTOS ATIVOS</div><div className="kpi-value blue">247</div></div>
          </div>
          <div className="header-kpi">
            <div className="kpi-icon red">🔴</div>
            <div><div className="kpi-label">ALERTAS CRÍTICOS</div><div className="kpi-value red">12</div></div>
          </div>
          <div className="header-kpi">
            <div className="kpi-icon yellow">⚠</div>
            <div><div className="kpi-label">RISCO GLOBAL</div><div className="kpi-value yellow">ALTO</div></div>
          </div>
          <div className="header-kpi">
            <div className="kpi-icon green">📡</div>
            <div><div className="kpi-label">FONTES MONITORADAS</div><div className="kpi-value green">198</div></div>
          </div>
        </div>

        <div className="header-right">
          <LanguageSelector />
          <div className="header-clock">
            <div className="time">{formatTime(now)}</div>
            <div className="date">{formatDate(now, { day: "2-digit", month: "2-digit", year: "numeric" })} BRT</div>
          </div>
          <div className="header-actions">
            <button title="Notificações">🔔<span className="badge">3</span></button>
            <button title="Configurações">⚙️</button>
          </div>
          <div className="header-profile">
            <div className="avatar">WR</div>
            <div className="profile-info">
              <div className="profile-name">Operador WR</div>
              <div className="profile-role">Administrador</div>
            </div>
          </div>
        </div>
      </header>

      <div className="body">
        {/* SIDEBAR */}
        <nav className={`sidebar ${sidebarExpanded ? "expanded" : ""}`}>
          <button className="sidebar-toggle" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
            {sidebarExpanded ? "◀" : "☰"}
          </button>
          <div className="sidebar-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`sidebar-item ${view === item.id ? "active" : ""}`}
                onClick={() => setView(item.id)}
              >
                <span className="icon">{item.icon}</span>
                <span className="label">{item.label}</span>
                {item.badge !== undefined && <span className="badge-count">{item.badge}</span>}
              </button>
            ))}
          </div>
        </nav>

        {/* MAIN CONTENT */}
        <main className="main">
          <div className="main-content">
            {/* KPI ROW */}
            <div className="kpi-row">
              {kpis.map((kpi) => (
                <div key={kpi.label} className={`kpi-card ${kpi.color}`}>
                  <div className="kpi-label">{kpi.label}</div>
                  <div className={`kpi-value ${kpi.color}`}>{kpi.value}</div>
                  {kpi.trend && (
                    <div className={`kpi-trend ${kpi.up ? "up" : "down"}`}>
                      {kpi.up ? "↑" : "↓"} {kpi.trend}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* MAP SECTION */}
            <div className="map-section">
              {/* LEFT PANEL - Categories */}
              <div className="map-panel-left">
                <div className="panel" style={{ flex: 1 }}>
                  <div className="panel-header">
                    <span className="panel-title">CATEGORIAS</span>
                    <span className="panel-badge">142</span>
                  </div>
                  <div className="category-list">
                    {CATEGORIES.map((cat) => (
                      <div key={cat.name} className="category-item">
                        <div className="cat-icon" style={{ background: cat.bg }}>{cat.icon}</div>
                        <span className="cat-name">{cat.name}</span>
                        <span className="cat-count" style={{ color: cat.color }}>{cat.count}</span>
                      </div>
                    ))}
                  </div>
                  <button style={{ marginTop: 8, fontSize: 10, color: "var(--cyan)", fontWeight: 600, textAlign: "left" }}>
                    Mostrar tudo →
                  </button>
                </div>
              </div>

              {/* MAP */}
              <div className="map-container">
                <div className="map-toolbar">
                  <div className="map-filters">
                    {["TODOS", "TERREMOTOS", "CLIMA", "CONFLITOS", "INCÊNDIOS", "OUTROS"].map((f) => (
                      <button key={f} className={`map-filter-btn ${mapFilter === f ? "active" : ""}`} onClick={() => setMapFilter(f)}>
                        {f}
                      </button>
                    ))}
                  </div>
                  <div className="map-controls">
                    <button title="Filtros">⚙</button>
                    <button title="Tela cheia">⛶</button>
                  </div>
                </div>

                <div className="map-world">
                  <div className="map-grid" />
                  <div className="map-land" />

                  {/* Country labels */}
                  <span className="map-country-label" style={{ left: "15%", top: "20%" }}>EUA</span>
                  <span className="map-country-label" style={{ left: "48%", top: "25%" }}>RÚSSIA</span>
                  <span className="map-country-label" style={{ left: "25%", top: "55%" }}>BRASIL</span>
                  <span className="map-country-label" style={{ left: "62%", top: "35%" }}>CHINA</span>
                  <span className="map-country-label" style={{ left: "55%", top: "42%" }}>ÍNDIA</span>
                  <span className="map-country-label" style={{ left: "47%", top: "38%" }}>ORIENTE MÉDIO</span>
                  <span className="map-country-label" style={{ left: "30%", top: "30%" }}>EUROPA</span>
                  <span className="map-country-label" style={{ left: "55%", top: "65%" }}>ÁFRICA</span>
                  <span className="map-country-label" style={{ left: "78%", top: "70%" }}>OCEANIA</span>

                  {/* Event pins */}
                  {SEED_EVENTS.map((ev) => (
                    <div
                      key={ev.id}
                      className={`map-pin ${ev.color}`}
                      style={{ left: `${ev.lng / 1.8 + 15}%`, top: `${(90 - ev.lat) / 1.3 + 5}%` }}
                      title={`${ev.title} - ${ev.place}`}
                    >
                      {ev.icon}
                    </div>
                  ))}

                  {/* Extra scattered pins for visual density */}
                  <div className="map-pin red" style={{ left: "72%", top: "28%" }}>🔴</div>
                  <div className="map-pin orange" style={{ left: "18%", top: "38%" }}>🟠</div>
                  <div className="map-pin yellow" style={{ left: "65%", top: "58%" }}>🟡</div>
                  <div className="map-pin blue" style={{ left: "42%", top: "22%" }}>🔵</div>
                  <div className="map-pin purple" style={{ left: "78%", top: "45%" }}>🟣</div>
                  <div className="map-pin red" style={{ left: "50%", top: "50%" }}>🔴</div>
                  <div className="map-pin green" style={{ left: "35%", top: "68%" }}>🟢</div>
                  <div className="map-pin cyan" style={{ left: "82%", top: "32%" }}>🔵</div>
                  <div className="map-pin orange" style={{ left: "22%", top: "52%" }}>🟠</div>
                  <div className="map-pin red" style={{ left: "58%", top: "38%" }}>🔴</div>

                  <div className="map-legend">
                    <span><i style={{ background: "var(--green)" }} /> Baixo</span>
                    <span><i style={{ background: "var(--yellow)" }} /> Moderado</span>
                    <span><i style={{ background: "var(--orange)" }} /> Alto</span>
                    <span><i style={{ background: "var(--red)" }} /> Crítico</span>
                    <span><i style={{ background: "var(--red-critical)" }} /> Emergência</span>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL - Alerts */}
              <div className="map-panel-right">
                <div className="panel" style={{ flex: 1 }}>
                  <div className="panel-header">
                    <span className="panel-title">ALERTAS CRÍTICOS</span>
                    <button style={{ fontSize: 9, color: "var(--cyan)", fontWeight: 600 }}>Ver todos</button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {SEED_EVENTS.filter((e) => e.status === "critico").map((ev, i) => (
                      <div key={ev.id} className="alert-card" onClick={() => setSelectedAlert(i)}>
                        <div className={`alert-icon ${ev.color}`}>{ev.icon}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="alert-title">{ev.title}</div>
                          <div className="alert-meta">{ev.place}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 4, alignItems: "center" }}>
                            <span className={`alert-badge ${ev.status}`}>{ev.status.toUpperCase()}</span>
                            <span className="alert-time">{ev.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk Gauge */}
                <div className="panel">
                  <div className="panel-header">
                    <span className="panel-title">RISCO GLOBAL (24H)</span>
                  </div>
                  <div className="risk-gauge">
                    <div className="risk-gauge-arc" />
                    <div className="risk-gauge-value">
                      <div className="value">72</div>
                      <div className="label">/100</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Tendência (24h)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM SECTION */}
            <div className="bottom-section">
              {/* Recent Events */}
              <div className="panel">
                <div className="panel-header">
                  <span className="panel-title">EVENTOS RECENTES</span>
                  <span className="panel-badge">Atualizado agora</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, overflow: "auto" }}>
                  {SEED_EVENTS.slice(0, 4).map((ev) => (
                    <div key={ev.id} style={{ display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                      <div className={`alert-icon ${ev.color}`} style={{ width: 28, height: 28, borderRadius: 6, fontSize: 12 }}>{ev.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600 }}>{ev.title}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{ev.place}</div>
                        <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{ev.time} · {ev.detail}</div>
                      </div>
                      <span className={`alert-badge ${ev.status}`} style={{ alignSelf: "flex-start" }}>{ev.status.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
                <button style={{ marginTop: 6, fontSize: 10, color: "var(--cyan)", fontWeight: 600 }}>
                  Ver todos os eventos →
                </button>
              </div>

              {/* Timeline */}
              <div className="panel timeline-panel">
                <div className="timeline-header">
                  <span className="panel-title">TIMELINE (ÚLTIMAS 24H)</span>
                  <div className="timeline-controls">
                    <button className={playing ? "playing" : ""} onClick={() => setPlaying(!playing)}>
                      {playing ? "⏸" : "▶"}
                    </button>
                    <span style={{ fontSize: 9, color: "var(--text-muted)" }}>1x</span>
                  </div>
                </div>
                <div className="timeline-graph">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const h = 20 + Math.random() * 80;
                    const colors = ["var(--red)", "var(--orange)", "var(--yellow)", "var(--green)", "var(--blue)", "var(--purple)"];
                    return (
                      <div key={i} className="timeline-bar" style={{
                        left: `${(i / 23) * 100}%`,
                        height: `${h}%`,
                        background: colors[i % colors.length],
                        opacity: 0.7,
                      }} />
                    );
                  })}
                </div>
                <div className="timeline-axis">
                  <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span><span>24:00</span>
                </div>
                <div className="timeline-legend">
                  <span><i style={{ background: "var(--red)" }} /> Terremotos</span>
                  <span><i style={{ background: "var(--green)" }} /> Clima</span>
                  <span><i style={{ background: "var(--orange)" }} /> Incêndios</span>
                  <span><i style={{ background: "var(--yellow)" }} /> Conflitos</span>
                  <span><i style={{ background: "var(--text-muted)" }} /> Outros</span>
                </div>
              </div>

              {/* Correlation */}
              <div className="panel correlation-panel">
                <div className="panel-header">
                  <span className="panel-title">CADEIAS DE CORRELAÇÃO</span>
                </div>
                <div className="correlation-chain">
                  {CORRELATION.map((step, i) => (
                    <div key={i} className="correlation-step">
                      <div className={`correlation-dot ${step.color}`}>{step.icon}</div>
                      <div className="correlation-text">
                        <div>{step.label}</div>
                        <small>{step.sub}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <button style={{ marginTop: 8, fontSize: 10, color: "var(--cyan)", fontWeight: 600 }}>
                  Ver todas as correlações
                </button>
              </div>

              {/* Missions + AI */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div className="panel missions-panel" style={{ flex: 1 }}>
                  <div className="panel-header">
                    <span className="panel-title">MISSÕES ATIVAS</span>
                    <button style={{ fontSize: 9, color: "var(--cyan)", fontWeight: 600 }}>Ver todas</button>
                  </div>
                  {MISSIONS.map((m, i) => (
                    <div key={i} className="mission-item">
                      <div className={`mission-status ${m.status}`} />
                      <div className="mission-info">
                        <div className="mission-name">{m.name}</div>
                        <div className="mission-meta">{m.team} · {m.badge}</div>
                      </div>
                      <span className={`mission-badge ${m.status}`}>{m.badge}</span>
                    </div>
                  ))}
                </div>

                <div className="panel ai-panel" style={{ flex: 1 }}>
                  <div className="panel-header">
                    <span className="panel-title">ASSISTENTE IA</span>
                    <div className="ai-status">
                      <div className="ai-status-dot" />
                      <span className="ai-status-text">Online</span>
                    </div>
                  </div>
                  <div className="ai-input">
                    <input
                      type="text"
                      placeholder="Pergunte sobre eventos ou riscos..."
                      value={aiQuestion}
                      onChange={(e) => setAiQuestion(e.target.value)}
                    />
                    <button>➤</button>
                  </div>
                  <div className="ai-suggestions">
                    {AI_SUGGESTIONS.map((s, i) => (
                      <button key={i} className="ai-suggestion" onClick={() => setAiQuestion(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TICKER */}
          <div className="ticker-bar">
            <span className="ticker-label">SISTEMA</span>
            <div className="ticker-track">
              <div className="ticker-content">
                {SYSTEM_NEWS.concat(SYSTEM_NEWS).map((n, i) => (
                  <span key={i} className="ticker-item">
                    <time>{n.time}</time>
                    {n.text}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-left">
          <div className="status-dot" />
          Global Intelligence Platform v3.0
        </div>
        <div className="footer-center">
          Dados em tempo real · Fontes confiáveis · Inteligência para decisões melhores
        </div>
        <div className="footer-right">
          Todos os sistemas operando normalmente
        </div>
      </footer>
    </div>
  );
}
