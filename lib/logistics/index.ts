// ============================================================
// LOGISTICS INTELLIGENCE — Ports, Routes & Supply Chain Analysis
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory } from "../types";

export interface LogisticsEvent {
  id: string;
  type: "port_closure" | "airport_closure" | "border_closure" | "route_disruption" | "supply_shortage" | "shipping_delay";
  location: { lat: number; lng: number; name: string };
  affectedRoutes: LogisticsRoute[];
  severity: RiskLevel;
  estimatedDuration: string;
  economicImpact: number;
  timestamp: string;
  sources: string[];
}

export interface LogisticsRoute {
  id: string;
  name: string;
  type: "sea" | "air" | "land" | "rail";
  origin: string;
  destination: string;
  status: "operational" | "disrupted" | "closed";
  delay?: string;
  alternative?: string;
}

interface PortInfo {
  name: string;
  lat: number;
  lng: number;
  country: string;
  capacity: number;
  region: string;
}

interface AirportInfo {
  name: string;
  lat: number;
  lng: number;
  country: string;
  iata: string;
  region: string;
}

const MAJOR_PORTS: PortInfo[] = [
  { name: "Shanghai", lat: 31.2304, lng: 121.4737, country: "China", capacity: 47000000, region: "asia" },
  { name: "Singapore", lat: 1.2644, lng: 103.8200, country: "Singapore", capacity: 37200000, region: "asia" },
  { name: "Ningbo-Zhoushan", lat: 29.8683, lng: 121.5440, country: "China", capacity: 31000000, region: "asia" },
  { name: "Shenzhen", lat: 22.5431, lng: 114.0579, country: "China", capacity: 28000000, region: "asia" },
  { name: "Guangzhou", lat: 23.1291, lng: 113.2644, country: "China", capacity: 25000000, region: "asia" },
  { name: "Busan", lat: 35.1796, lng: 129.0756, country: "South Korea", capacity: 22000000, region: "asia" },
  { name: "Hong Kong", lat: 22.3193, lng: 114.1694, country: "Hong Kong", capacity: 20000000, region: "asia" },
  { name: "Qingdao", lat: 36.0671, lng: 120.3826, country: "China", capacity: 18000000, region: "asia" },
  { name: "Tianjin", lat: 39.3434, lng: 117.3616, country: "China", capacity: 17000000, region: "asia" },
  { name: "Rotterdam", lat: 51.9225, lng: 4.4792, country: "Netherlands", capacity: 14800000, region: "europe" },
  { name: "Antwerp", lat: 51.2194, lng: 4.4025, country: "Belgium", capacity: 12000000, region: "europe" },
  { name: "Port Klang", lat: 3.0007, lng: 101.3927, country: "Malaysia", capacity: 11000000, region: "asia" },
  { name: "Xiamen", lat: 24.4798, lng: 118.0894, country: "China", capacity: 10500000, region: "asia" },
  { name: "Kaohsiung", lat: 22.6273, lng: 120.3014, country: "Taiwan", capacity: 10200000, region: "asia" },
  { name: "Los Angeles", lat: 33.7405, lng: -118.2608, country: "USA", capacity: 9600000, region: "north_america" },
  { name: "Long Beach", lat: 33.7701, lng: -118.1937, country: "USA", capacity: 8100000, region: "north_america" },
  { name: "Tanjung Pelepas", lat: 1.3627, lng: 103.5486, country: "Malaysia", capacity: 8000000, region: "asia" },
  { name: "Laem Chabang", lat: 13.0470, lng: 100.8800, country: "Thailand", capacity: 7500000, region: "asia" },
  { name: "Colombo", lat: 6.9271, lng: 79.8612, country: "Sri Lanka", capacity: 7000000, region: "asia" },
  { name: "Algeciras", lat: 36.1333, lng: -5.4500, country: "Spain", capacity: 5500000, region: "europe" },
  { name: "Santos", lat: -23.9608, lng: -46.3339, country: "Brazil", capacity: 4200000, region: "south_america" },
  { name: "Jawaharlal Nehru", lat: 18.9500, lng: 72.9500, country: "India", capacity: 5500000, region: "asia" },
  { name: "Felixstowe", lat: 51.9617, lng: 1.3511, country: "UK", capacity: 3800000, region: "europe" },
  { name: "Le Havre", lat: 49.4944, lng: 0.1079, country: "France", capacity: 2800000, region: "europe" },
  { name: "New York/New Jersey", lat: 40.6664, lng: -74.1488, country: "USA", capacity: 9000000, region: "north_america" },
  { name: "Savannah", lat: 32.0809, lng: -81.0912, country: "USA", capacity: 5500000, region: "north_america" },
  { name: "Charleston", lat: 32.7765, lng: -79.9311, country: "USA", capacity: 2500000, region: "north_america" },
  { name: "Dubai (Jebel Ali)", lat: 24.9857, lng: 55.0272, country: "UAE", capacity: 14000000, region: "middle_east" },
  { name: "Jeddah", lat: 21.4858, lng: 39.1925, country: "Saudi Arabia", capacity: 6000000, region: "middle_east" },
  { name: "Durban", lat: -29.8587, lng: 31.0218, country: "South Africa", capacity: 2500000, region: "africa" },
];

const MAJOR_AIRPORTS: AirportInfo[] = [
  { name: "Hartsfield-Jackson Atlanta", lat: 33.6407, lng: -84.4277, country: "USA", iata: "ATL", region: "north_america" },
  { name: "Beijing Capital", lat: 40.0799, lng: 116.6031, country: "China", iata: "PEK", region: "asia" },
  { name: "Dubai International", lat: 25.2532, lng: 55.3657, country: "UAE", iata: "DXB", region: "middle_east" },
  { name: "Tokyo Haneda", lat: 35.5494, lng: 139.7798, country: "Japan", iata: "HND", region: "asia" },
  { name: "London Heathrow", lat: 51.4700, lng: -0.4543, country: "UK", iata: "LHR", region: "europe" },
  { name: "Los Angeles International", lat: 33.9416, lng: -118.4085, country: "USA", iata: "LAX", region: "north_america" },
  { name: "Paris Charles de Gaulle", lat: 49.0097, lng: 2.5479, country: "France", iata: "CDG", region: "europe" },
  { name: "Shanghai Pudong", lat: 31.1443, lng: 121.8083, country: "China", iata: "PVG", region: "asia" },
  { name: "São Paulo-Guarulhos", lat: -23.4356, lng: -46.4731, country: "Brazil", iata: "GRU", region: "south_america" },
  { name: "Singapore Changi", lat: 1.3644, lng: 103.9915, country: "Singapore", iata: "SIN", region: "asia" },
  { name: "Amsterdam Schiphol", lat: 52.3105, lng: 4.7683, country: "Netherlands", iata: "AMS", region: "europe" },
  { name: "Hong Kong International", lat: 22.3080, lng: 113.9185, country: "Hong Kong", iata: "HKG", region: "asia" },
  { name: "Frankfurt", lat: 50.0379, lng: 8.5622, country: "Germany", iata: "FRA", region: "europe" },
  { name: "Seoul Incheon", lat: 37.4602, lng: 126.4407, country: "South Korea", iata: "ICN", region: "asia" },
  { name: "Dallas/Fort Worth", lat: 32.8998, lng: -97.0403, country: "USA", iata: "DFW", region: "north_america" },
  { name: "Istanbul", lat: 41.2753, lng: 28.7519, country: "Turkey", iata: "IST", region: "europe" },
  { name: "Delhi Indira Gandhi", lat: 28.5562, lng: 77.1000, country: "India", iata: "DEL", region: "asia" },
  { name: "Madrid Barajas", lat: 40.4983, lng: -3.5676, country: "Spain", iata: "MAD", region: "europe" },
  { name: "Bangkok Suvarnabhumi", lat: 13.6900, lng: 100.7501, country: "Thailand", iata: "BKK", region: "asia" },
  { name: "Istanbul Sabiha Gökçen", lat: 40.8986, lng: 29.3092, country: "Turkey", iata: "SAW", region: "europe" },
];

const MAJOR_SHIPPING_ROUTES: LogisticsRoute[] = [
  { id: "route_01", name: "Asia-Europe (Suez)", type: "sea", origin: "Shanghai", destination: "Rotterdam", status: "operational" },
  { id: "route_02", name: "Transpacific Eastbound", type: "sea", origin: "Shanghai", destination: "Los Angeles", status: "operational" },
  { id: "route_03", name: "Transatlantic", type: "sea", origin: "Rotterdam", destination: "New York", status: "operational" },
  { id: "route_04", name: "Asia-Middle East", type: "sea", origin: "Singapore", destination: "Dubai", status: "operational" },
  { id: "route_05", name: "South America-East Asia", type: "sea", origin: "Santos", destination: "Shanghai", status: "operational" },
  { id: "route_06", name: "Europe-Africa", type: "sea", origin: "Rotterdam", destination: "Durban", status: "operational" },
  { id: "route_07", name: "Asia-North America East Coast", type: "sea", origin: "Shanghai", destination: "New York", status: "operational" },
  { id: "route_08", name: "Panama Canal Route", type: "sea", origin: "Busan", destination: "New York", status: "operational" },
  { id: "route_09", name: "Europe-Asia (Northern)", type: "sea", origin: "Rotterdam", destination: "Busan", status: "operational" },
  { id: "route_10", name: "Intra-Asia", type: "sea", origin: "Singapore", destination: "Shanghai", status: "operational" },
  { id: "route_11", name: "Transpacific Premium", type: "air", origin: "Hong Kong", destination: "Los Angeles", status: "operational" },
  { id: "route_12", name: "Europe-Asia Express", type: "air", origin: "Frankfurt", destination: "Shanghai", status: "operational" },
  { id: "route_13", name: "Middle East-Asia", type: "air", origin: "Dubai", destination: "Singapore", status: "operational" },
  { id: "route_14", name: "Transatlantic Air", type: "air", origin: "London", destination: "New York", status: "operational" },
  { id: "route_15", name: "Pan-American Land", type: "land", origin: "Los Angeles", destination: "Mexico City", status: "operational" },
  { id: "route_16", name: "European Rail", type: "rail", origin: "Rotterdam", destination: "Istanbul", status: "operational" },
  { id: "route_17", name: "Trans-Siberian Rail", type: "rail", origin: "Vladivostok", destination: "Moscow", status: "operational" },
  { id: "route_18", name: "Silk Road Rail", type: "rail", origin: "Shanghai", destination: "Rotterdam", status: "operational" },
  { id: "route_19", name: "South America Land", type: "land", origin: "Santos", destination: "Buenos Aires", status: "operational" },
  { id: "route_20", name: "Africa-Europe", type: "sea", origin: "Durban", destination: "Antwerp", status: "operational" },
];

const activeDisruptions: LogisticsEvent[] = [];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function generateLogisticsId(): string {
  return `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getAffectedRoutes(lat: number, lng: number, radiusKm: number): LogisticsRoute[] {
  return MAJOR_SHIPPING_ROUTES.filter(route => {
    const originPort = MAJOR_PORTS.find(p => p.name === route.origin);
    const destPort = MAJOR_PORTS.find(p => p.name === route.destination);
    const originAirport = MAJOR_AIRPORTS.find(a => a.iata === route.origin || a.name === route.origin);

    if (originPort) {
      const dist = haversineDistance(lat, lng, originPort.lat, originPort.lng);
      if (dist <= radiusKm) return true;
    }
    if (destPort) {
      const dist = haversineDistance(lat, lng, destPort.lat, destPort.lng);
      if (dist <= radiusKm) return true;
    }
    if (originAirport) {
      const dist = haversineDistance(lat, lng, originAirport.lat, originAirport.lng);
      if (dist <= radiusKm) return true;
    }
    return false;
  });
}

function estimateEconomicImpact(affectedRoutes: LogisticsRoute[]): number {
  const baseCostPerRoute: Record<string, number> = {
    sea: 500000000,
    air: 200000000,
    land: 100000000,
    rail: 150000000,
  };

  return affectedRoutes.reduce((total, route) => {
    return total + (baseCostPerRoute[route.type] || 100000000);
  }, 0);
}

function estimateDuration(severity: RiskLevel, affectedRoutes: LogisticsRoute[]): string {
  const durations: Record<RiskLevel, string> = {
    informativo: "1-2 dias",
    baixo: "2-5 dias",
    moderado: "1-2 semanas",
    alto: "2-4 semanas",
    critico: "1-2 meses",
    emergencia: "2-6 meses",
    extremo: "6+ meses",
  };
  return durations[severity];
}

function determineSeverity(events: GlobalEvent[]): RiskLevel {
  const riskLevels: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  let maxIndex = 0;

  for (const event of events) {
    const idx = riskLevels.indexOf(event.riskLevel);
    if (idx > maxIndex) maxIndex = idx;
  }

  return riskLevels[maxIndex];
}

function findNearestPort(lat: number, lng: number): PortInfo | undefined {
  let nearest: PortInfo | undefined;
  let minDist = Infinity;

  for (const port of MAJOR_PORTS) {
    const dist = haversineDistance(lat, lng, port.lat, port.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = port;
    }
  }
  return nearest;
}

function findNearestAirport(lat: number, lng: number): AirportInfo | undefined {
  let nearest: AirportInfo | undefined;
  let minDist = Infinity;

  for (const airport of MAJOR_AIRPORTS) {
    const dist = haversineDistance(lat, lng, airport.lat, airport.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = airport;
    }
  }
  return nearest;
}

export function assessPortClosure(portName: string, events: GlobalEvent[]): LogisticsEvent {
  const port = MAJOR_PORTS.find(p => p.name.toLowerCase() === portName.toLowerCase());
  const lat = port?.lat || 0;
  const lng = port?.lng || 0;

  const nearbyEvents = events.filter(e =>
    haversineDistance(lat, lng, e.location.lat, e.location.lng) < 300
  );

  const severity = nearbyEvents.length > 0 ? determineSeverity(nearbyEvents) : "moderado";
  const affectedRoutes = getAffectedRoutes(lat, lng, 500);

  const disruptedRoutes: LogisticsRoute[] = affectedRoutes.map(route => ({
    ...route,
    status: "disrupted" as const,
    delay: estimateDuration(severity, affectedRoutes),
    alternative: findAlternativeRouteName(route),
  }));

  const logisticsEvent: LogisticsEvent = {
    id: generateLogisticsId(),
    type: "port_closure",
    location: { lat, lng, name: portName },
    affectedRoutes: disruptedRoutes,
    severity,
    estimatedDuration: estimateDuration(severity, affectedRoutes),
    economicImpact: estimateEconomicImpact(disruptedRoutes),
    timestamp: new Date().toISOString(),
    sources: [...new Set(nearbyEvents.map(e => e.source))],
  };

  activeDisruptions.push(logisticsEvent);
  return logisticsEvent;
}

export function assessRouteDisruption(
  route: LogisticsRoute,
  events: GlobalEvent[]
): LogisticsEvent {
  const originPort = MAJOR_PORTS.find(p => p.name === route.origin);
  const originAirport = MAJOR_AIRPORTS.find(a => a.iata === route.origin || a.name === route.origin);

  const lat = originPort?.lat || originAirport?.lat || 0;
  const lng = originPort?.lng || originAirport?.lng || 0;

  const nearbyEvents = events.filter(e =>
    haversineDistance(lat, lng, e.location.lat, e.location.lng) < 500
  );

  const severity = nearbyEvents.length > 0 ? determineSeverity(nearbyEvents) : "moderado";

  const disruptedRoute: LogisticsRoute = {
    ...route,
    status: "disrupted",
    delay: estimateDuration(severity, [route]),
    alternative: findAlternativeRouteName(route),
  };

  const logisticsEvent: LogisticsEvent = {
    id: generateLogisticsId(),
    type: "route_disruption",
    location: { lat, lng, name: route.name },
    affectedRoutes: [disruptedRoute],
    severity,
    estimatedDuration: estimateDuration(severity, [route]),
    economicImpact: estimateEconomicImpact([route]),
    timestamp: new Date().toISOString(),
    sources: [...new Set(nearbyEvents.map(e => e.source))],
  };

  activeDisruptions.push(logisticsEvent);
  return logisticsEvent;
}

export function calculateSupplyChainImpact(events: GlobalEvent[]): {
  affectedRoutes: number;
  totalDelay: string;
  economicImpact: number;
} {
  const affectedRoutes = new Set<string>();
  let totalEconomicImpact = 0;

  for (const event of events) {
    const lat = event.location.lat;
    const lng = event.location.lng;

    const routes = getAffectedRoutes(lat, lng, 300);
    for (const route of routes) {
      affectedRoutes.add(route.id);
      totalEconomicImpact += estimateEconomicImpact([route]);
    }
  }

  const routeCount = affectedRoutes.size;
  let totalDelay = "1-2 dias";
  if (routeCount > 5) totalDelay = "2-4 semanas";
  else if (routeCount > 3) totalDelay = "1-2 semanas";
  else if (routeCount > 1) totalDelay = "3-7 dias";

  return {
    affectedRoutes: routeCount,
    totalDelay,
    economicImpact: totalEconomicImpact,
  };
}

export function findAlternativeRoutes(disruptedRoute: LogisticsRoute): LogisticsRoute[] {
  const alternatives: LogisticsRoute[] = [];

  for (const route of MAJOR_SHIPPING_ROUTES) {
    if (route.id === disruptedRoute.id) continue;
    if (route.type === disruptedRoute.type) {
      if (
        route.origin === disruptedRoute.origin ||
        route.destination === disruptedRoute.destination ||
        route.origin === disruptedRoute.destination ||
        route.destination === disruptedRoute.origin
      ) {
        alternatives.push({
          ...route,
          status: "operational",
        });
      }
    }
  }

  if (alternatives.length === 0) {
    for (const route of MAJOR_SHIPPING_ROUTES) {
      if (route.id === disruptedRoute.id) continue;
      if (route.type === disruptedRoute.type) {
        const originPort = MAJOR_PORTS.find(p => p.name === route.origin);
        const disruptedOrigin = MAJOR_PORTS.find(p => p.name === disruptedRoute.origin);
        if (originPort && disruptedOrigin) {
          const dist = haversineDistance(originPort.lat, originPort.lng, disruptedOrigin.lat, disruptedOrigin.lng);
          if (dist < 500) {
            alternatives.push({ ...route, status: "operational" });
          }
        }
      }
    }
  }

  return alternatives.slice(0, 5);
}

export function getActiveDisruptions(): LogisticsEvent[] {
  return [...activeDisruptions];
}

export function getLogisticsSummary(): {
  activeDisruptions: number;
  affectedPorts: number;
  affectedRoutes: number;
  totalEconomicImpact: number;
} {
  const affectedPorts = new Set<string>();
  const affectedRoutes = new Set<string>();
  let totalEconomicImpact = 0;

  for (const disruption of activeDisruptions) {
    affectedPorts.add(disruption.location.name);
    for (const route of disruption.affectedRoutes) {
      affectedRoutes.add(route.id);
    }
    totalEconomicImpact += disruption.economicImpact;
  }

  return {
    activeDisruptions: activeDisruptions.length,
    affectedPorts: affectedPorts.size,
    affectedRoutes: affectedRoutes.size,
    totalEconomicImpact,
  };
}

function findAlternativeRouteName(route: LogisticsRoute): string | undefined {
  const alternatives = findAlternativeRoutes(route);
  return alternatives.length > 0 ? alternatives[0].name : undefined;
}
