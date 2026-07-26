"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../lib/i18n/index.js";
import LanguageSelector from "./LanguageSelector.js";

type Status = "Confirmado" | "Em verificação" | "Não confirmado";
type NewsItem = { title:string; url:string; source:string; publishedAt:string; fetchedAt:string; status:Status; description:string };
type Incident = { id:number; title:string; detail:string; description:string; place:string; age:string; status:Status; icon:string; x:number; y:number; url?:string; fetchedAt?:string };
type View = "MAPA" | "VISÃO" | "EVENTOS" | "FONTES" | "TEMPO";

const seed: Incident[] = [
  {id:1,title:"Comunicado institucional monitorado",detail:"Publicações oficiais dos dois países são acompanhadas pelo sistema.",description:"Comunicados oficiais emitidos por Washington e Teerã são acompanhados em tempo real pelo sistema de monitoramento. As declarações públicas de ambos os lados são analisadas quanto ao conteúdo, tom e possíveis implicações para a situação geopolítica atual. Fontes primárias incluem discursos oficiais, coletivas de imprensa e notas do Departamento de Estado dos EUA e do Ministério das Relações Exteriores do Irã.",place:"Washington / Teerã",age:"monitoramento contínuo",status:"Confirmado",icon:"▣",x:55,y:42},
  {id:2,title:"Atividade aérea reportada",detail:"Menção em fonte aberta aguardando validação independente.",description:"Dados de rastreamento de voo indicam movimentação aérea incomum sobre o Golfo Pérsico nas últimas 12 horas. Aeronaves de reconhecimento e tanques de combustível foram detectados em rotas que sugerem operação de vigilância. Ainda não há confirmação oficial sobre a natureza dessas atividades, que estão sendo cruzadas com fontes militares de ambos os lados.",place:"Oeste do Irã",age:"em análise",status:"Em verificação",icon:"✈",x:67,y:48},
  {id:3,title:"Alerta marítimo regional",detail:"Avisos relacionados à navegação no Golfo Pérsico sob observação.",description:"A Marinha dos EUA emitiu um aviso de navegação para o Estreito de Ormuz, uma das rotas de petróleo mais strategicamente importantes do mundo. Navios-tanque estão sendo redirecionados para rotas alternativas, aumentando os custos de frete em cerca de 15%. A tensão na região afeta diretamente os preços do petróleo no mercado internacional, com increases de 3-5% nas últimas 24 horas.",place:"Golfo Pérsico",age:"em análise",status:"Em verificação",icon:"≋",x:74,y:70},
  {id:4,title:"Relato não corroborado",detail:"Conteúdo circulando sem confirmação por fonte confiável.",description:"Diversos relatos circulam em plataformas de redes sociais alegando incidentes militares na região. Nenhum desses relatos foi confirmado por fontes oficiais ou agências de notícias confiáveis. O protocolo de verificação classifica essas informações como 'não confirmadas' até que haja pelo menos duas fontes independentes que corroborem os fatos relatados.",place:"Região central do Irã",age:"não validado",status:"Não confirmado",icon:"?",x:63,y:59},
];
const statusClass=(s:Status)=>s==="Confirmado"?"confirmed":s==="Em verificação"?"checking":"unconfirmed";

export default function Home(){
  const { t, formatDate, formatTime, formatRelative, locale } = useI18n();
  const [filter,setFilter]=useState<"Todos"|Status>("Todos");
  const [selected,setSelected]=useState(2);
  const [now,setNow]=useState(new Date());
  const [live,setLive]=useState(true);
  const [news,setNews]=useState<NewsItem[]>([]);
  const [sync,setSync]=useState<"carregando"|"online"|"indisponível">("carregando");
  const [view,setView]=useState<View>("MAPA");
  const [playing,setPlaying]=useState(false);
  const [lastUpdated,setLastUpdated]=useState<string>("");
  const [updateCount,setUpdateCount]=useState(0);
  const playRef=useRef<ReturnType<typeof setInterval>|null>(null);

  useEffect(()=>{const t=window.setInterval(()=>setNow(new Date()),1000);return()=>window.clearInterval(t)},[]);
  useEffect(()=>{
    if(!live)return;
    const load=async()=>{
      try{
        const r=await fetch("/api/news",{cache:"no-store"});
        if(!r.ok)throw new Error();
        const j=await r.json() as {items:NewsItem[];updatedAt:string;provider:string;count:number};
        if(j.items?.length){
          setNews(j.items);
          setLastUpdated(j.updatedAt);
          setUpdateCount(c=>c+1);
          setSync("online");
        }else{
          setSync("indisponível");
        }
      }catch{setSync("indisponível")}
    };
    load();const t=window.setInterval(load,60000);return()=>window.clearInterval(t)
  },[live]);

  useEffect(()=>{
    if(!playing){if(playRef.current){clearInterval(playRef.current);playRef.current=null}return}
    playRef.current=setInterval(()=>{setSelected(prev=>{const idx=items.findIndex(i=>i.id===prev);return items[(idx+1)%items.length].id})},2000);
    return()=>{if(playRef.current){clearInterval(playRef.current);playRef.current=null}}
  },[playing]);

  const liveIncidents=useMemo(()=>news.slice(0,6).map((n,i):Incident=>({id:100+i,title:n.title,detail:`Fonte: ${n.source}. Publicado em ${formatDate(n.publishedAt,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}. Coletado em ${formatDate(n.fetchedAt,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}.`,description:n.description||`Notícia de ${n.source} sobre tensões EUA–Irã.`,place:"Fonte aberta",age:formatRelative(n.publishedAt),status:n.status,icon:"◆",x:52+(i%3)*8,y:34+(i%2)*22,url:n.url,fetchedAt:n.fetchedAt})),[news,formatDate,formatRelative]);
  const items=liveIncidents.length?liveIncidents:seed;
  const visible=items.filter(i=>filter==="Todos"||i.status===filter);
  const active=items.find(i=>i.id===selected)||items[0];
  const counts={confirmed:items.filter(i=>i.status==="Confirmado").length,checking:items.filter(i=>i.status==="Em verificação").length,unconfirmed:items.filter(i=>i.status==="Não confirmado").length};

  const sources=useMemo(()=>{
    const map=new Map<string,{name:string,count:number,lastSeen:string;lastFetched:string}>();
    for(const n of news){
      const e=map.get(n.source);
      if(e){
        e.count++;
        if(n.publishedAt>e.lastSeen)e.lastSeen=n.publishedAt;
        if(n.fetchedAt>e.lastFetched)e.lastFetched=n.fetchedAt;
      }else{
        map.set(n.source,{name:n.source,count:1,lastSeen:n.publishedAt,lastFetched:n.fetchedAt});
      }
    }
    return Array.from(map.values()).sort((a,b)=>b.count-a.count);
  },[news]);

  return <main className="shell">
    <header className="topbar">
      <div className="radar-logo"><i/><b/></div>
      <div className="brand"><small>{t("app.subtitle")}</small><h1>{t("app.brand")} <strong>EUA–IRÃ</strong></h1></div>
      <div className="top-actions">
        <LanguageSelector />
        <button className="live" onClick={()=>setLive(v=>!v)} aria-pressed={live}><i className={live?"":"off"}/>{live?t("header.atualizacao_viva"):t("header.atualizacao_pausada")}</button>
        <div className="clock"><b>{formatTime(now)}</b><span>{t("header.zona_horaria")} · {formatDate(now,{day:"2-digit",month:"short",year:"numeric"}).toUpperCase()}</span></div>
      </div>
    </header>

    <div className="main-grid">
      <nav className="rail" aria-label="Navegação">
        {([
          ["◎",t("menu.mapa")],["▦",t("menu.visao")],["◈",t("menu.eventos"),items.length],["≡",t("menu.fontes")],["◷",t("menu.tempo")]
        ] as const).map(([icon,label,badge])=>
          <button key={label} className={view===label?"active":""} onClick={()=>setView(label)}>
            {icon}<span>{label}</span>{badge!==undefined&&<em>{badge}</em>}
          </button>
        )}
        <div><small>TEERÃ</small><b>{formatTime(new Date(),{timeZone:"Asia/Tehran"})}</b><span>UTC +3:30</span></div>
      </nav>

      <section className="workspace">
        <div className="metrics">
          <article className="tension"><div><small>{t("metrics.nivel_tensao")}</small><b>{t("metrics.elevado")}</b></div><div className="gauge"><strong>7.2</strong></div></article>
          <article><small>{t("metrics.fontes_monitoradas")}</small><strong>{news.length||"—"}</strong><span>{lastUpdated?`${t("metrics.atualizado")}: ${formatTime(lastUpdated)}`:t("metrics.aguardando_dados")}</span></article>
          <article><small>{t("metrics.confirmado")}</small><strong className="green">{counts.confirmed}</strong><span>{t("metrics.fonte_primaria")}</span></article>
          <article><small>{t("metrics.em_verificacao")}</small><strong className="amber">{counts.checking}</strong><span>{t("metrics.aguarda_validacao")}</span></article>
          <article><small>{t("metrics.nao_confirmado")}</small><strong className="red">{counts.unconfirmed}</strong><span>{t("metrics.sem_corroboracao")}</span></article>
        </div>

        {view==="MAPA"&&<>
          <section className="map-card">
            <div className="map-ui"><button>⌖ {t("mapa.camadas")}</button><button>＋</button><button>−</button></div><div className="coords">⌖ 31°24′ N &nbsp; 54°21′ E</div>
            <div className="map" aria-label="Mapa operacional estilizado do Oriente Médio">
              <div className="land"/><span className="turkey">TURQUIA</span><span className="syria">SÍRIA</span><span className="iraq">IRAQUE</span><span className="iran">IRÃ</span><span className="saudi">ARÁBIA SAUDITA</span><span className="uae">EAU</span><span className="caspian">MAR CÁSPIO</span><span className="gulf">GOLFO PÉRSICO</span>
              <div className="route r1"/><div className="route r2"/><div className="route r3"/><div className="scan s1"/><div className="scan s2"/>
              {items.map(i=><button key={i.id} className={`pin ${statusClass(i.status)} ${selected===i.id?"selected":""}`} style={{left:`${i.x}%`,top:`${i.y}%`}} onClick={()=>{setSelected(i.id);setPlaying(false)}} aria-label={`${i.title}, ${i.status}`}><span>{i.icon}</span></button>)}
            </div>
            <div className="legend"><b>{t("mapa.legenda")}</b><span><i className="c"/>{t("mapa.rota_monitorada")}</span><span><i className="g"/>{t("status.confirmado")}</span><span><i className="a"/>{t("status.em_verificacao")}</span><span><i className="u"/>{t("status.nao_confirmado")}</span></div>
            {active&&<div className="selected-event"><small>{t("mapa.evento_selecionado")}</small><b>{active.title}</b><span>{active.place} · {active.age}</span>{active.url&&<a href={active.url} target="_blank" rel="noreferrer">{t("mapa.abrir_fonte")}</a>}</div>}
          </section>
          <section className="timeline"><div><small>{t("timeline.linha_do_tempo")}</small><b>{t("timeline.ultimas_24h")}</b></div><button className={playing?"playing":""} aria-label={playing?"Pausar linha do tempo":"Reproduzir linha do tempo"} onClick={()=>setPlaying(p=>!p)}>{playing?"⏸":"▶"}</button><div className="line">{items.map((it,i)=>{const pct=100-((items.length-1-i)/(items.length-1||1))*90;return <i key={it.id} style={{left:`${pct}%`,background:it.status==="Confirmado"?"var(--green)":it.status==="Em verificação"?"var(--amber)":"var(--red)",width:it.id===selected?"9px":"7px",height:it.id===selected?"9px":"7px",top:it.id===selected?"-5px":"-4px",boxShadow:it.id===selected?"0 0 8px var(--cyan)":"none"}}/>})}<span>−24h</span><span>−18h</span><span>−12h</span><span>−6h</span><span>{t("timeline.agora")}</span></div></section>
        </>}

        {view==="VISÃO"&&<section className="view-panel" style={{padding:"20px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}>
          <div className="panel-card" style={{border:"1px solid var(--border)",borderRadius:"10px",padding:"16px",background:"#0c1318"}}>
            <h3 style={{margin:"0 0 12px",font:"700 12px var(--font-geist-mono)",color:"var(--cyan)"}}>{t("visao.distribuicao_status")}</h3>
            {(["Confirmado","Em verificação","Não confirmado"] as const).map(s=><div key={s} style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"8px"}}>
              <span style={{width:"12px",height:"12px",borderRadius:"3px",background:s==="Confirmado"?"var(--green)":s==="Em verificação"?"var(--amber)":"var(--red)",flexShrink:0}}/>
              <span style={{font:"500 10px var(--font-geist-mono)",color:"var(--muted)",flex:1}}>{s}</span>
              <strong style={{font:"700 14px var(--font-geist-mono)",color:"var(--text)"}}>{items.filter(i=>i.status===s).length}</strong>
            </div>)}
          </div>
          <div className="panel-card" style={{border:"1px solid var(--border)",borderRadius:"10px",padding:"16px",background:"#0c1318"}}>
            <h3 style={{margin:"0 0 12px",font:"700 12px var(--font-geist-mono)",color:"var(--cyan)"}}>{t("visao.fontes_ativas")}</h3>
            {sources.length===0&&<p style={{font:"500 10px var(--font-geist-mono)",color:"var(--muted)"}}>{t("visao.nenhuma_fonte")}</p>}
            {sources.slice(0,6).map(s=><div key={s.name} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"6px",padding:"4px 0",borderBottom:"1px solid var(--border)"}}>
              <span style={{font:"500 10px var(--font-geist-mono)",color:"var(--text)"}}>{s.name}</span>
              <span style={{font:"600 9px var(--font-geist-mono)",color:"var(--cyan)"}}>{s.count}</span>
            </div>)}
          </div>
          <div className="panel-card" style={{gridColumn:"span 2",border:"1px solid var(--border)",borderRadius:"10px",padding:"16px",background:"#0c1318"}}>
            <h3 style={{margin:"0 0 12px",font:"700 12px var(--font-geist-mono)",color:"var(--cyan)"}}>{t("visao.resumo_operacional")}</h3>
            <p style={{font:"400 10px/1.6 var(--font-geist-sans)",color:"var(--muted)",margin:0}}>
              {t("visao.monitoramento_ativo")}. {t("visao.incidentesRegistrados",{n:items.length})},
              {t("visao.confirmados",{n:counts.confirmed})}, {t("visao.em_verificacao",{n:counts.checking})},
              {t("visao.sem_corroboracao",{n:counts.unconfirmed})}.
              {lastUpdated&&<><br/>{t("visao.ultima_atualizacao")}: {formatDate(lastUpdated,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})} · {t("visao.atualizacoes_sessao",{n:updateCount})}</>}
            </p>
          </div>
        </section>}

        {view==="EVENTOS"&&<section className="view-panel" style={{padding:"12px 0",overflow:"auto"}}>
          <div className="filters" role="group" aria-label="Filtrar incidentes">{(["Todos","Confirmado","Em verificação","Não confirmado"] as const).map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div>
          <div className="event-list" style={{maxHeight:"calc(100vh - 280px)"}}>{visible.map(i=><button key={i.id} className={`event ${statusClass(i.status)} ${selected===i.id?"selected":""}`} onClick={()=>{setSelected(i.id);setPlaying(false)}}><span className="icon">{i.icon}</span><div><time>{i.age}</time><h3>{i.title}</h3><p>{i.detail}</p><footer><span>⌖ {i.place}</span><b>{i.status}</b></footer></div></button>)}</div>
        </section>}

        {view==="FONTES"&&<section className="view-panel" style={{padding:"12px 0"}}>
          <h3 style={{margin:"0 0 12px",font:"700 12px var(--font-geist-mono)",color:"var(--cyan)"}}>{t("fontes.titulo")}</h3>
          {sources.length===0&&<p style={{font:"500 10px var(--font-geist-mono)",color:"var(--muted)"}}>{t("fontes.nenhuma")}</p>}
          {sources.map(s=><div key={s.name} style={{border:"1px solid var(--border)",borderRadius:"8px",padding:"12px",marginBottom:"8px",background:"#0c1318",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{font:"600 11px var(--font-geist-mono)",color:"var(--text)",marginBottom:"4px"}}>{s.name}</div><div style={{font:"500 8px var(--font-geist-mono)",color:"var(--muted)"}}>{t("fontes.ultimo_artigo")}: {formatDate(s.lastSeen,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})} · {t("fontes.coletado")}: {formatDate(s.lastFetched,{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div></div>
            <div style={{font:"700 16px var(--font-geist-mono)",color:"var(--cyan)"}}>{s.count}</div>
          </div>)}
        </section>}

        {view==="TEMPO"&&<section className="view-panel" style={{padding:"12px 0"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",marginBottom:"16px"}}>
            <button className={playing?"playing":""} aria-label={playing?"Pausar linha do tempo":"Reproduzir linha do tempo"} onClick={()=>setPlaying(p=>!p)} style={{width:"36px",height:"36px",borderRadius:"50%",border:"1px solid var(--cyan)",background:"#0c252b",color:"var(--cyan)",cursor:"pointer",fontSize:"14px"}}>{playing?"⏸":"▶"}</button>
            <span style={{font:"600 10px var(--font-geist-mono)",color:playing?"var(--green)":"var(--muted)"}}>{playing?"REPRODUZINDO...":t("timeline.linha_do_tempo")}</span>
          </div>
          <div style={{display:"grid",gap:"8px",maxHeight:"calc(100vh - 280px)",overflow:"auto"}}>
            {items.map((it,i)=><button key={it.id} className={`event ${statusClass(it.status)} ${selected===it.id?"selected":""}`} onClick={()=>{setSelected(it.id);setPlaying(false)}} style={{textAlign:"left",border:`1px solid ${selected===it.id?"var(--cyan)":"var(--border)"}`,borderLeft:`3px solid ${it.status==="Confirmado"?"var(--green)":it.status==="Em verificação"?"var(--amber)":"var(--red)"}`,borderRadius:"7px",padding:"10px",background:selected===it.id?"#101f26":"#0a141a",cursor:"pointer",display:"grid",gridTemplateColumns:"28px 1fr auto",gap:"10px",alignItems:"center"}}>
              <span style={{color:"var(--cyan)",fontSize:"16px",textAlign:"center"}}>{it.icon}</span>
              <div><div style={{font:"600 10px var(--font-geist-mono)",color:"var(--text)",marginBottom:"2px"}}>{it.title}</div><div style={{font:"500 8px var(--font-geist-mono)",color:"var(--muted)"}}>{it.place}</div></div>
              <div style={{textAlign:"right"}}><div style={{font:"500 8px var(--font-geist-mono)",color:"var(--muted)"}}>{it.age}</div>{it.fetchedAt&&<div style={{font:"400 7px var(--font-geist-mono)",color:"#55727c",marginTop:"2px"}}>{formatTime(it.fetchedAt)}</div>}</div>
            </button>)}
          </div>
        </section>}
      </section>

      <aside className="events">
        <header><div><small>{t("fluxo.titulo")}</small><h2>{t("fluxo.incidentes")}</h2></div><span className={`sync ${sync}`}>{sync==="online"&&lastUpdated?`${t("fluxo.atualizado")} ${formatTime(lastUpdated)}`:sync==="online"?t("fluxo.online"):t("fluxo.offline")}</span></header>
        <div className="filters" role="group" aria-label="Filtrar incidentes">{(["Todos","Confirmado","Em verificação","Não confirmado"] as const).map(f=><button key={f} className={filter===f?"active":""} onClick={()=>setFilter(f)}>{f}</button>)}</div>
        <div className="event-list">{visible.map(i=><button key={i.id} className={`event ${statusClass(i.status)} ${selected===i.id?"selected":""}`} onClick={()=>{setSelected(i.id);setPlaying(false)}}><span className="icon">{i.icon}</span><div><time>{i.age}</time><h3>{i.title}</h3><p>{i.description||i.detail}</p>{i.url&&i.url!=="#"&&<a href={i.url} target="_blank" rel="noreferrer" className="read-more">{t("eventos.ler_materia")} ↗</a>}<footer><span>⌖ {i.place}</span><b>{i.status}</b></footer></div></button>)}</div>
        <div className="protocol"><b>{t("protocolo.titulo")}</b><p>{t("protocolo.descricao")}</p></div>
      </aside>
    </div>

    <footer className="ticker"><b>{t("ticker.titulo")}</b><div className="ticker-track">{(news.length?news:seed.map(s=>({title:s.title,source:"Sistema",publishedAt:new Date().toISOString(),fetchedAt:new Date().toISOString()}))).slice(0,6).map((n,i)=><span key={i}><time>{formatTime(n.publishedAt)}</time>{n.title}</span>)}</div></footer>
  </main>
}
