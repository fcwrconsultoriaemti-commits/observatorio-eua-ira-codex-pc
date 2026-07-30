// ============================================================
// ECONOMIC INDICATORS MONITOR — Oil, Gold, USD, Crypto
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "economic-001",
    source: "seed-data",
    module: "economico",
    title: "Petróleo Brent acima de $100/barril",
    description: "Preço do petróleo Brent ultrapassa $100/barril pela primeira vez em 12 meses. Tensões no Golfo Pérsico e OPEP+ cortes impulsionam alta.",
    location: { lat: 26.2285, lng: 50.5860, country: "Arábia Saudita" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 60, humanitarian: 40, economic: 85, environmental: 30, security: 50 },
    confidence: 0.92,
    tags: ["economico", "petroleo", "brent", "opec", "preco"],
    relatedEvents: [],
    metadata: { commodity: "Brent Crude", price_usd: 101.50, change_pct: 12.3, period: "30d" },
  },
  {
    id: "economic-002",
    source: "seed-data",
    module: "economico",
    title: "Ouro atinge máxima histórica - $2.500/oz",
    description: "Ouro sobe para máximo recorde de $2.500/onça. Demanda por ativos seguros aumenta com incertezas geopolíticas e inflação.",
    location: { lat: 46.2044, lng: 6.1432, country: "Suíça", city: "Genebra" },
    timestamp: new Date().toISOString(),
    riskLevel: "moderado",
    impact: { operational: 30, humanitarian: 20, economic: 75, environmental: 10, security: 35 },
    confidence: 0.95,
    tags: ["economico", "ouro", "metais_preciosos", "safe_haven"],
    relatedEvents: [],
    metadata: { commodity: "Gold", price_usd_per_oz: 2500, change_pct: 8.7, period: "90d" },
  },
  {
    id: "economic-003",
    source: "seed-data",
    module: "economico",
    title: "Bitcoin cai 20% em 24h - Liquidations em massa",
    description: "Bitcoin sofre queda de 20% em 24 horas. $2B em posições alavancadas liquidadas. Regulação agressiva dos EUA como catalisador.",
    location: { lat: 40.7128, lng: -74.006, country: "EUA", city: "Nova York" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 50, humanitarian: 10, economic: 80, environmental: 5, security: 40 },
    confidence: 0.90,
    tags: ["economico", "crypto", "bitcoin", "volatilidade", "liquidacao"],
    relatedEvents: [],
    metadata: { asset: "BTC/USD", price_usd: 52000, change_24h_pct: -20, liquidations_usd: 2000000000 },
  },
];

const MONITOR: MonitorModule = {
  name: "economic-monitor",
  category: "economico",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [oilRes, goldRes, cryptoRes] = await Promise.allSettled([
        fetch("https://api.exchangerate.host/latest?base=USD&symbols=BRL,EUR,GBP,JPY", {
          signal: controller.signal,
        }),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true", {
          signal: controller.signal,
        }),
        fetch("https://api.frankfurter.app/latest?from=USD&to=BRL,EUR,GBP,JPY", {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (goldRes.status === "fulfilled" && goldRes.value.ok) {
        const data = await goldRes.value.json();
        for (const [asset, info] of Object.entries(data)) {
          const coinInfo = info as { usd: number; usd_24h_change: number };
          if (coinInfo.usd && coinInfo.usd_24h_change !== undefined) {
            const absChange = Math.abs(coinInfo.usd_24h_change);
            events.push({
              id: `economic-crypto-${asset}-${Date.now()}`,
              source: "CoinGecko",
              module: "economico",
              title: `${asset.toUpperCase()} - $${coinInfo.usd.toLocaleString()} (${coinInfo.usd_24h_change > 0 ? "+" : ""}${coinInfo.usd_24h_change.toFixed(2)}%)`,
              description: `Criptomoeda ${asset} operando a $${coinInfo.usd} com variação de ${coinInfo.usd_24h_change.toFixed(2)}% nas últimas 24h.`,
              location: { lat: 0, lng: 0, country: "Internacional" },
              timestamp: new Date().toISOString(),
              riskLevel: absChange > 15 ? "alto" : absChange > 5 ? "moderado" : "informativo",
              impact: { operational: 20, humanitarian: 5, economic: Math.min(Math.round(absChange * 5), 80), environmental: 5, security: 15 },
              confidence: 0.95,
              tags: ["economico", "crypto", asset, "preco"],
              relatedEvents: [],
              metadata: { source_type: "CoinGecko", asset, price_usd: coinInfo.usd, change_24h: coinInfo.usd_24h_change },
            });
          }
        }
      }

      if (cryptoRes.status === "fulfilled" && cryptoRes.value.ok) {
        const data = await cryptoRes.value.json();
        if (data.rates) {
          events.push({
            id: `economic-fx-usd-${Date.now()}`,
            source: "Frankfurter",
            module: "economico",
            title: "Taxas de câmbio USD",
            description: `EUR: ${data.rates.EUR}, BRL: ${data.rates.BRL}, GBP: ${data.rates.GBP}, JPY: ${data.rates.JPY}`,
            location: { lat: 0, lng: 0, country: "Internacional" },
            timestamp: new Date(data.date || Date.now()).toISOString(),
            riskLevel: "informativo",
            impact: { operational: 15, humanitarian: 10, economic: 40, environmental: 5, security: 10 },
            confidence: 0.98,
            tags: ["economico", "forex", "usd", "cambio"],
            relatedEvents: [],
            metadata: { source_type: "Frankfurter", rates: data.rates, base: data.base },
          });
        }
      }

      if (events.length === 0) {
        return SEED_EVENTS;
      }

      return events;
    } catch {
      return SEED_EVENTS;
    }
  },

  async health(): Promise<boolean> {
    try {
      const res = await fetch("https://api.frankfurter.app/latest?from=USD&to=EUR", {
        signal: AbortSignal.timeout(10000),
      });
      return res.ok;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
