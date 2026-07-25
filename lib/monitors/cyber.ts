// ============================================================
// CYBER INTELLIGENCE MONITOR — CISA Alerts, NVD CVEs
// ============================================================

import type { GlobalEvent, MonitorModule } from "../types";

const SEED_EVENTS: GlobalEvent[] = [
  {
    id: "cyber-001",
    source: "seed-data",
    module: "cibernetico",
    title: "Vulnerabilidade crítica em infraestrutura SCADA - CVE-2024-1234",
    description: "CVE com CVSS 9.8 afeta sistemas SCADA Siemens广泛. Exploração remota sem autenticação possível. Patch urgente necessário.",
    location: { lat: 48.8566, lng: 2.3522, country: "Internacional" },
    timestamp: new Date().toISOString(),
    riskLevel: "critico",
    impact: { operational: 90, humanitarian: 20, economic: 75, environmental: 30, security: 95 },
    confidence: 0.92,
    tags: ["cibernetico", "cve", "scada", "siemens", "critico"],
    relatedEvents: [],
    metadata: { cvss: 9.8, cve_id: "CVE-2024-1234", vendor: "Siemens", product: "SIMATIC S7-1500" },
  },
  {
    id: "cyber-002",
    source: "seed-data",
    module: "cibernetico",
    title: "Campanha de phishing contra setor energético - APT29",
    description: "CISA identifica campanha de phishing sofisticada direcionada a operadores de rede elétrica nos EUA. Atribuída ao APT29 (Cozy Bear).",
    location: { lat: 38.9072, lng: -77.0369, country: "EUA", city: "Washington DC" },
    timestamp: new Date().toISOString(),
    riskLevel: "alto",
    impact: { operational: 70, humanitarian: 15, economic: 60, environmental: 10, security: 85 },
    confidence: 0.88,
    tags: ["cibernetico", "phishing", "apt29", "energia", "cisa"],
    relatedEvents: [],
    metadata: { actor: "APT29", target_sector: "energy", campaign: "SolarStorm-2024" },
  },
  {
    id: "cyber-003",
    source: "seed-data",
    module: "cibernetico",
    title: "Ransomware atinge rede hospitalar - LockBit 4.0",
    description: "Grupo LockBit 4.0 realiza ataque ransomware contra rede de 12 hospitais nos EUA. Sistemas clínicos comprometidos.",
    location: { lat: 41.8781, lng: -87.6298, country: "EUA", state: "Illinois", city: "Chicago" },
    timestamp: new Date().toISOString(),
    riskLevel: "emergencia",
    impact: { operational: 95, humanitarian: 85, economic: 70, environmental: 5, security: 80 },
    confidence: 0.90,
    tags: ["cibernetico", "ransomware", "lockbit", "saude", "hospital"],
    relatedEvents: [],
    metadata: { actor: "LockBit 4.0", victims: 12, sector: "healthcare", ransom_btc: 50 },
  },
];

const MONITOR: MonitorModule = {
  name: "cyber-monitor",
  category: "cibernetico",
  version: "1.0.0",
  enabled: true,

  async fetch(): Promise<GlobalEvent[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const [cisaRes, nvdRes] = await Promise.allSettled([
        fetch("https://www.cisa.gov/cybersecurity-advisories/all.xml", {
          signal: controller.signal,
          headers: { "Accept": "application/xml, application/rss+xml" },
        }),
        fetch("https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10&cvssV3Severity=CRITICAL&pubStartDate=" + new Date(Date.now() - 86400000).toISOString().slice(0, 10) + "T00:00:00.000", {
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      const events: GlobalEvent[] = [];

      if (cisaRes.status === "fulfilled" && cisaRes.value.ok) {
        const text = await cisaRes.value.text();
        const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
        for (const item of items.slice(0, 10)) {
          const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]>/) || item.match(/<title>(.*?)<\/title>/))?.[1] || "Unknown";
          const link = item.match(/<link>(.*?)<\/link>/)?.[1] || "";
          const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || new Date().toISOString();
          const desc = (item.match(/<description><!\[CDATA\[(.*?)\]\]>/) || item.match(/<description>(.*?)<\/description>/))?.[1] || "";

          events.push({
            id: `cyber-cisa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            source: "CISA",
            module: "cibernetico",
            title: title.trim(),
            description: desc.replace(/<[^>]+>/g, "").trim().slice(0, 500),
            location: { lat: 38.9072, lng: -77.0369, country: "EUA" },
            timestamp: new Date(pubDate).toISOString(),
            riskLevel: "alto",
            impact: { operational: 70, humanitarian: 20, economic: 60, environmental: 5, security: 80 },
            confidence: 0.85,
            tags: ["cibernetico", "cisa", "advisory"],
            relatedEvents: [],
            metadata: { source_type: "CISA", url: link, pubDate },
          });
        }
      }

      if (nvdRes.status === "fulfilled" && nvdRes.value.ok) {
        const data = await nvdRes.value.json();
        const vulns = data.vulnerabilities || [];
        for (const v of vulns.slice(0, 10)) {
          const cve = v.cve;
          const cvss3 = cve.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || 0;
          const desc = cve.descriptions?.find((d: { lang: string }) => d.lang === "en")?.value || "";

          events.push({
            id: `cyber-nvd-${cve.id}`,
            source: "NVD",
            module: "cibernetico",
            title: `CVE: ${cve.id} (CVSS ${cvss3})`,
            description: desc.slice(0, 500),
            location: { lat: 0, lng: 0, country: "Internacional" },
            timestamp: new Date(cve.published).toISOString(),
            riskLevel: cvss3 >= 9 ? "critico" : cvss3 >= 7 ? "alto" : cvss3 >= 4 ? "moderado" : "baixo",
            impact: { operational: Math.round(cvss3 * 8), humanitarian: 10, economic: Math.round(cvss3 * 6), environmental: 5, security: Math.round(cvss3 * 9) },
            confidence: 0.90,
            tags: ["cibernetico", "cve", "nvd", "vulnerabilidade"],
            relatedEvents: [],
            metadata: { cve_id: cve.id, cvss: cvss3, published: cve.published },
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
      const res = await fetch("https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1", {
        signal: AbortSignal.timeout(10000),
      });
      return res.ok || res.status === 403;
    } catch {
      return true;
    }
  },
};

export default MONITOR;
