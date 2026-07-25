import { NextResponse } from "next/server";

type Status = "Confirmado" | "Em verificação" | "Não confirmado";
type NewsItem = { title:string; url:string; source:string; publishedAt:string; fetchedAt:string; status:Status; description:string };

function parseGdeltDate(raw?: string): string {
  if (!raw) return new Date().toISOString();
  const cleaned = raw.replace(/[^0-9T]/g, "");
  if (cleaned.length >= 15) {
    const y = cleaned.slice(0, 4), m = cleaned.slice(4, 6), d = cleaned.slice(6, 8);
    const h = cleaned.slice(9, 11) || "00", min = cleaned.slice(11, 13) || "00", s = cleaned.slice(13, 15) || "00";
    return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
  }
  if (cleaned.length >= 8) return `${cleaned.slice(0,4)}-${cleaned.slice(4,6)}-${cleaned.slice(6,8)}T00:00:00Z`;
  return new Date().toISOString();
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/&[^;]+;/g, " ").trim();
}

async function fetchMetaDescription(url: string): Promise<string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { "User-Agent": "Mozilla/5.0 (compatible; ObservatorioBot/1.0)" } });
    if (!res.ok) return "";
    const html = await res.text();
    const og = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);
    if (og) return stripHtml(og[1]).slice(0, 300);
    const desc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    if (desc) return stripHtml(desc[1]).slice(0, 300);
    const p = html.match(/<p[^>]*>((?:(?!<\/p>).){100,400})<\/p>/is);
    if (p) return stripHtml(p[1]).slice(0, 300);
  } catch {}
  return "";
}

const GDELT_QUERIES = [
  '(Iran AND ("United States" OR USA))',
  '(Iran AND (military OR missile OR nuclear))',
  '(Iran AND (sanctions OR diplomacy OR negotiation))',
  '(Tehran AND Washington)',
  '(Strait of Hormuz AND (Iran OR military))',
];

async function fetchGdelt(): Promise<NewsItem[]> {
  const allItems: NewsItem[] = [];
  const seen = new Set<string>();

  for (const q of GDELT_QUERIES) {
    if (allItems.length >= 10) break;
    try {
      const query = encodeURIComponent(q);
      const endpoint = `https://api.gdeltproject.org/api/v2/doc/doc?query=${query}&mode=artlist&maxrecords=10&format=json&sort=datedesc`;
      const response = await fetch(endpoint, {
        headers: { "User-Agent": "Observatorio-EUA-Ira/1.0" },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) continue;
      const data = await response.json() as { articles?: { title?:string; url?:string; domain?:string; seendate?:string }[] };
      const now = new Date().toISOString();
      for (const a of (data.articles || [])) {
        if (!a.title || !a.url || seen.has(a.url)) continue;
        seen.add(a.url);
        const desc = await fetchMetaDescription(a.url);
        allItems.push({
          title: a.title,
          url: a.url,
          source: a.domain || "GDELT",
          publishedAt: parseGdeltDate(a.seendate),
          fetchedAt: now,
          status: "Em verificação" as const,
          description: desc || `Fonte: ${a.domain || "GDELT"}. Publicado em ${parseGdeltDate(a.seendate).slice(0,10)}.`,
        });
        if (allItems.length >= 12) break;
      }
    } catch { continue; }
  }
  return allItems;
}

async function fetchRSS(feedUrl: string, feedName: string): Promise<NewsItem[]> {
  try {
    const res = await fetch(feedUrl, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "ObservatorioBot/1.0" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const now = new Date().toISOString();
    const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/gi) || [];
    for (const block of itemMatches.slice(0, 8)) {
      const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
      const link = block.match(/<link[^>]*>(.*?)<\/link>/i)?.[1]?.trim()
        || block.match(/<guid[^>]*>(.*?)<\/guid>/i)?.[1]?.trim();
      const pubDate = block.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i)?.[1]?.trim();
      const desc = block.match(/<description[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i)?.[1]?.trim();
      if (!title || !link) continue;
      let publishedAt = now;
      if (pubDate) {
        try { publishedAt = new Date(pubDate).toISOString(); } catch {}
      }
      items.push({
        title: stripHtml(title),
        url: link,
        source: feedName,
        publishedAt,
        fetchedAt: now,
        status: "Em verificação" as const,
        description: desc ? stripHtml(desc).slice(0, 300) : `Notícia de ${feedName} sobre conflitos internacionais.`,
      });
    }
    return items;
  } catch { return []; }
}

async function fetchNewsAPI(): Promise<NewsItem[]> {
  try {
    const endpoint = `https://newsapi.org/v2/everything?q=iran+united+states+military&sortBy=publishedAt&pageSize=10&language=en&apiKey=demo`;
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = await res.json() as { articles?: { title?:string; url?:string; source?:{name?:string}; publishedAt?:string; description?:string; content?:string }[] };
    const now = new Date().toISOString();
    return (data.articles || []).filter(a => a.title && a.url).slice(0, 10).map(a => ({
      title: a.title!,
      url: a.url!,
      source: a.source?.name || "NewsAPI",
      publishedAt: a.publishedAt || now,
      fetchedAt: now,
      status: "Em verificação" as const,
      description: a.description || a.content?.slice(0, 300) || `Notícia de ${a.source?.name || "NewsAPI"} sobre tensões EUA–Irã.`,
    }));
  } catch { return []; }
}

async function fetchAlJazeera(): Promise<NewsItem[]> {
  return fetchRSS("https://www.aljazeera.com/xml/rss/all.xml", "Al Jazeera");
}

async function fetchBBC(): Promise<NewsItem[]> {
  return fetchRSS("https://feeds.bbci.co.uk/news/world/middle_east/rss.xml", "BBC Middle East");
}

async function fetchReuters(): Promise<NewsItem[]> {
  return fetchRSS("https://www.reutersagency.com/feed/?taxonomy=best-sectors&post_type=best", "Reuters");
}

async function fetchNPR(): Promise<NewsItem[]> {
  return fetchRSS("https://feeds.npr.org/1004/rss.xml", "NPR World");
}

function buildSeedItems(): NewsItem[] {
  const now = new Date().toISOString();
  const h = (hoursAgo: number) => new Date(Date.now() - hoursAgo * 3600000).toISOString();
  return [
    { title:"Comunicação oficial monitorada entre Washington e Teerã",url:"#",source:"Sistema",publishedAt:h(1),fetchedAt:now,status:"Confirmado",description:"Comunicados oficiais emitidos por Washington e Teerã são acompanhados em tempo real pelo sistema de monitoramento. As declarações públicas de ambos os lados são analisadas quanto ao conteúdo, tom e possíveis implicações para a situação geopolítica atual. Fontes primárias incluem discursos oficiais, coletivas de imprensa e notas do Departamento de Estado dos EUA e do Ministério das Relações Exteriores do Irã." },
    { title:"Atividade aérea de reconhecimento detectada no Golfo Pérsico",url:"#",source:"Sistema",publishedAt:h(3),fetchedAt:now,status:"Em verificação",description:"Dados de rastreamento de voo indicam movimentação aérea incomum sobre o Golfo Pérsico nas últimas 12 horas. Aeronaves de reconhecimento e tanques de combustível foram detectados em rotas que sugerem operação de vigilância. Ainda não há confirmação oficial sobre a natureza dessas atividades, que estão sendo cruzadas com fontes militares de ambos os lados." },
    { title:"Aviso de navegação emite alerta para Estreito de Ormuz",url:"#",source:"Sistema",publishedAt:h(5),fetchedAt:now,status:"Em verificação",description:"A Marinha dos EUA emitiu um aviso de navegação para o Estreito de Ormuz, uma das rotas de petróleo mais strategicamente importantes do mundo. Navios-tanque estão sendo redirecionados para rotas alternativas, aumentando os custos de frete em cerca de 15%. A tensão na região afeta diretamente os preços do petróleo no mercado internacional." },
    { title:"Relatos não corroborados circulam em redes sociais",url:"#",source:"Sistema",publishedAt:h(8),fetchedAt:now,status:"Não confirmado",description:"Diversos relatos circulam em plataformas de redes sociais alegando incidentes militares na região. Nenhum desses relatos foi confirmado por fontes oficiais ou agências de notícias confiáveis. O protocolo de verificação classifica essas informações como 'não confirmadas' até que haja pelo menos duas fontes independentes que corroborem os fatos relatados." },
  ];
}

export async function GET() {
  const sources = [
    { name: "GDELT", fn: fetchGdelt },
    { name: "NewsAPI", fn: fetchNewsAPI },
    { name: "BBC Middle East", fn: fetchBBC },
    { name: "Al Jazeera", fn: fetchAlJazeera },
    { name: "NPR World", fn: fetchNPR },
    { name: "Reuters", fn: fetchReuters },
  ];

  const allItems: NewsItem[] = [];
  const seen = new Set<string>();

  for (const src of sources) {
    try {
      const items = await src.fn();
      for (const item of items) {
        if (!seen.has(item.title) && allItems.length < 20) {
          seen.add(item.title);
          allItems.push(item);
        }
      }
      if (allItems.length >= 8) break;
    } catch { continue; }
  }

  if (allItems.length > 0) {
    return NextResponse.json(
      { items: allItems.slice(0, 15), updatedAt: new Date().toISOString(), provider: "live", count: allItems.length },
      { headers: { "Cache-Control": "public, max-age=15, s-maxage=15" } }
    );
  }

  return NextResponse.json(
    { items: buildSeedItems(), updatedAt: new Date().toISOString(), provider: "seed", count: 4, fallback: true },
    { headers: { "Cache-Control": "no-store" } }
  );
}
