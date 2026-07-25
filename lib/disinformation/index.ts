// ============================================================
// DISINFORMATION DETECTION — Source Verification & Rumor Analysis
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory } from "../types";

export interface DisinformationCheck {
  eventId: string;
  verdict: "confiavel" | "provavelmente_confiavel" | "inconclusivo" | "provavelmente_falso" | "falso";
  confidence: number;
  reasons: string[];
  sourceConsistency: number;
  crossReferences: { source: string; matches: boolean; reliability: number }[];
  flags: string[];
}

interface SourceReliability {
  [key: string]: number;
}

const KNOWN_SOURCES: SourceReliability = {
  "USGS": 0.95,
  "NOAA": 0.95,
  "NASA": 0.92,
  "EMA": 0.88,
  "WHO": 0.90,
  "REUTERS": 0.85,
  "AP": 0.85,
  "BBC": 0.80,
  "CNN": 0.75,
  "twitter": 0.30,
  "telegram": 0.25,
  "reddit": 0.35,
  "4chan": 0.10,
  "unknown": 0.20,
};

function getSourceReliability(source: string): number {
  const normalized = source.toUpperCase().trim();
  for (const [key, value] of Object.entries(KNOWN_SOURCES)) {
    if (normalized.includes(key.toUpperCase())) return value;
  }
  return KNOWN_SOURCES["unknown"];
}

function riskScore(level: RiskLevel): number {
  const scores: Record<RiskLevel, number> = {
    informativo: 0, baixo: 10, moderado: 25, alto: 50, critico: 75, emergencia: 90, extremo: 100,
  };
  return scores[level];
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function checkEvent(event: GlobalEvent, allEvents: GlobalEvent[]): DisinformationCheck {
  const flags: string[] = [];
  const reasons: string[] = [];
  let confidence = event.confidence;

  const sourceReliability = getSourceReliability(event.source);
  confidence = (confidence + sourceReliability) / 2;

  if (sourceReliability < 0.3) {
    flags.push("fonte_nao_confiavel");
    reasons.push(`Fonte "${event.source}" tem confiabilidade baixa (${(sourceReliability * 100).toFixed(0)}%)`);
  }

  if (riskScore(event.riskLevel) >= 75 && sourceReliability < 0.5) {
    flags.push("alto_risco_fonte_fraca");
    reasons.push(`Evento de alto risco reportado por fonte de baixa confiabilidade`);
  }

  const similar = allEvents.filter(e =>
    e.id !== event.id &&
    e.module === event.module &&
    haversineDistance(event.location.lat, event.location.lng, e.location.lat, e.location.lng) < 500
  );

  const { consistency, conflicts } = compareSources(event, similar);

  if (similar.length > 0 && consistency < 0.3) {
    flags.push("inconsistencia_entre_fontes");
    reasons.push(`${conflicts.length} conflito(s) encontrado(s) entre fontes similares`);
  }

  if (similar.length === 0 && riskScore(event.riskLevel) >= 50) {
    flags.push("evento_isolado");
    reasons.push("Evento de risco moderado/alto sem confirmação de outras fontes");
  }

  const crossReferences = similar.map(e => ({
    source: e.source,
    matches: e.riskLevel === event.riskLevel,
    reliability: getSourceReliability(e.source),
  }));

  const confirmedCount = crossReferences.filter(c => c.matches).length;
  const totalRefs = crossReferences.length;
  const sourceConsistency = totalRefs > 0 ? confirmedCount / totalRefs : 0;

  if (event.confidence < 0.3) {
    flags.push("baixa_confianca");
    reasons.push(`Confiança original do evento é baixa (${(event.confidence * 100).toFixed(0)}%)`);
  }

  if (event.timestamp) {
    const eventTime = new Date(event.timestamp).getTime();
    const now = Date.now();
    const hoursOld = (now - eventTime) / 3600000;
    if (hoursOld > 24 && riskScore(event.riskLevel) >= 50) {
      flags.push("evento_desatualizado");
      reasons.push(`Evento de risco moderado/alto com mais de 24 horas sem atualização`);
    }
  }

  if (confidence >= 0.8 && flags.length === 0) {
    reasons.push("Evento consistente com fontes confiáveis e corroborado por dados externos");
  } else if (confidence >= 0.6 && flags.length <= 1) {
    reasons.push("Evento com corroborção parcial, mas com pontos de atenção");
  } else if (confidence >= 0.4) {
    reasons.push("Evento com evidência mista, requer verificação adicional");
  } else {
    reasons.push("Evento com pouca ou nenhuma evidência de apoio");
  }

  let verdict: DisinformationCheck["verdict"];
  if (confidence >= 0.85 && flags.length === 0) verdict = "confiavel";
  else if (confidence >= 0.7) verdict = "provavelmente_confiavel";
  else if (confidence >= 0.5) verdict = "inconclusivo";
  else if (confidence >= 0.3) verdict = "provavelmente_falso";
  else verdict = "falso";

  return {
    eventId: event.id,
    verdict,
    confidence: Math.max(0, Math.min(1, confidence)),
    reasons,
    sourceConsistency,
    crossReferences,
    flags,
  };
}

export function compareSources(
  event: GlobalEvent,
  similar: GlobalEvent[]
): { consistency: number; conflicts: string[] } {
  if (similar.length === 0) {
    return { consistency: 1, conflicts: [] };
  }

  const conflicts: string[] = [];
  let matchCount = 0;

  for (const other of similar) {
    if (other.riskLevel !== event.riskLevel) {
      conflicts.push(
        `Discrepância de nível de risco: "${event.source}" diz ${event.riskLevel}, "${other.source}" diz ${other.riskLevel}`
      );
    } else {
      matchCount++;
    }

    if (Math.abs(event.impact.operational - other.impact.operational) > 30) {
      conflicts.push(
        `Discrepância significativa no impacto operacional entre "${event.source}" e "${other.source}"`
      );
    }

    if (Math.abs(event.impact.economic - other.impact.economic) > 30) {
      conflicts.push(
        `Discrepância significativa no impacto econômico entre "${event.source}" e "${other.source}"`
      );
    }

    const timeDiff = Math.abs(
      new Date(event.timestamp).getTime() - new Date(other.timestamp).getTime()
    ) / 3600000;

    if (timeDiff > 12) {
      conflicts.push(
        `Grande diferença temporal (${timeDiff.toFixed(1)}h) entre reportes sobre o mesmo evento`
      );
    }
  }

  const consistency = similar.length > 0 ? matchCount / similar.length : 1;

  return { consistency, conflicts };
}

export function detectRumor(
  event: GlobalEvent,
  allEvents: GlobalEvent[]
): { isRumor: boolean; reason: string } {
  const sourceReliability = getSourceReliability(event.source);

  if (sourceReliability < 0.3 && riskScore(event.riskLevel) >= 50) {
    return {
      isRumor: true,
      reason: `Evento de alto risco reportado apenas por fontes não verificadas (confiabilidade: ${(sourceReliability * 100).toFixed(0)}%)`,
    };
  }

  const corroborating = allEvents.filter(e =>
    e.id !== event.id &&
    e.module === event.module &&
    Math.abs(new Date(e.timestamp).getTime() - new Date(event.timestamp).getTime()) < 3600000 &&
    haversineDistance(event.location.lat, event.location.lng, e.location.lat, e.location.lng) < 200
  );

  if (corroborating.length === 0 && riskScore(event.riskLevel) >= 75) {
    return {
      isRumor: true,
      reason: `Evento de risco "${event.riskLevel}" sem confirmação de nenhuma outra fonte na mesma região e período`,
    };
  }

  const officialSources = corroborating.filter(e => getSourceReliability(e.source) >= 0.8);
  if (officialSources.length === 0 && corroborating.length > 0) {
    return {
      isRumor: true,
      reason: "Evento não confirmado por nenhuma fonte oficial ou institucional",
    };
  }

  return { isRumor: false, reason: "Evento possui corroborção suficiente" };
}

export function flagUnconfirmed(
  event: GlobalEvent,
  confirmedEvents: GlobalEvent[]
): { needsConfirmation: boolean; missingSources: string[] } {
  const missingSources: string[] = [];
  const isConfirmed = confirmedEvents.some(e =>
    e.id === event.id ||
    (e.module === event.module &&
     haversineDistance(event.location.lat, event.location.lng, e.location.lat, e.location.lng) < 100 &&
     Math.abs(new Date(e.timestamp).getTime() - new Date(event.timestamp).getTime()) < 7200000)
  );

  if (!isConfirmed) {
    missingSources.push("Nenhuma confirmação de fonte primária institucional encontrada");

    if (!event.location.country) {
      missingSources.push("Dados de localização incompletos (país não especificado)");
    }

    if (event.confidence < 0.5) {
      missingSources.push("Nível de confiança original abaixo de 50%");
    }

    if (riskScore(event.riskLevel) >= 50) {
      const highRiskSources = confirmedEvents.filter(e =>
        getSourceReliability(e.source) >= 0.8 &&
        e.module === event.module
      );
      if (highRiskSources.length === 0) {
        missingSources.push("Nenhuma fonte de alta confiabilidade reportou este evento");
      }
    }
  }

  return {
    needsConfirmation: !isConfirmed,
    missingSources,
  };
}
