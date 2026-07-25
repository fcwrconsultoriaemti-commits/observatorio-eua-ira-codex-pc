// ============================================================
// GEOSPATIAL INTELLIGENCE — Impact Zones, Facilities & Evacuation
// ============================================================

import type { GlobalEvent, RiskLevel, RiskCategory } from "../types";

export interface GeoZone {
  id: string;
  name: string;
  type: "impact_radius" | "evacuation" | "risk_buffer" | "exclusion" | "monitoring";
  center: { lat: number; lng: number };
  radius: number;
  population: number;
  facilities: GeoFacility[];
  riskLevel: RiskLevel;
}

export interface GeoFacility {
  type: "hospital" | "airport" | "port" | "highway" | "refinery" | "power_plant" | "military_base" | "telecom_hub";
  name: string;
  lat: number;
  lng: number;
  distance: number;
  capacity?: number;
  status: "operational" | "affected" | "closed" | "unknown";
}

const WORLD_FACILITIES: Omit<GeoFacility, "distance">[] = [
  // Hospitals
  { type: "hospital", name: "Johns Hopkins Hospital", lat: 39.2964, lng: -76.5928, capacity: 1100, status: "operational" },
  { type: "hospital", name: "Mayo Clinic", lat: 44.0234, lng: -92.4630, capacity: 1265, status: "operational" },
  { type: "hospital", name: "Charité Hospital Berlin", lat: 52.5189, lng: 13.4014, capacity: 3000, status: "operational" },
  { type: "hospital", name: "Tokyo University Hospital", lat: 35.7089, lng: 139.7643, capacity: 1200, status: "operational" },
  { type: "hospital", name: "Apollo Hospitals Chennai", lat: 13.0067, lng: 80.2567, capacity: 500, status: "operational" },
  { type: "hospital", name: "Hospital das Clínicas São Paulo", lat: -23.5558, lng: -46.6622, capacity: 2500, status: "operational" },
  { type: "hospital", name: "Karolinska University Hospital", lat: 59.3498, lng: 18.0237, capacity: 1700, status: "operational" },
  { type: "hospital", name: "Cedars-Sinai Medical Center", lat: 34.0759, lng: -118.3808, capacity: 886, status: "operational" },

  // Airports
  { type: "airport", name: "Hartsfield-Jackson Atlanta", lat: 33.6407, lng: -84.4277, capacity: 110000000, status: "operational" },
  { type: "airport", name: "Beijing Capital International", lat: 40.0799, lng: 116.6031, capacity: 100000000, status: "operational" },
  { type: "airport", name: "Dubai International", lat: 25.2532, lng: 55.3657, capacity: 90000000, status: "operational" },
  { type: "airport", name: "Tokyo Haneda", lat: 35.5494, lng: 139.7798, capacity: 87000000, status: "operational" },
  { type: "airport", name: "London Heathrow", lat: 51.4700, lng: -0.4543, capacity: 80000000, status: "operational" },
  { type: "airport", name: "Los Angeles International", lat: 33.9416, lng: -118.4085, capacity: 88000000, status: "operational" },
  { type: "airport", name: "Paris Charles de Gaulle", lat: 49.0097, lng: 2.5479, capacity: 76000000, status: "operational" },
  { type: "airport", name: "Shanghai Pudong International", lat: 31.1443, lng: 121.8083, capacity: 76000000, status: "operational" },
  { type: "airport", name: "São Paulo-Guarulhos International", lat: -23.4356, lng: -46.4731, capacity: 42000000, status: "operational" },
  { type: "airport", name: "Singapore Changi", lat: 1.3644, lng: 103.9915, capacity: 68000000, status: "operational" },

  // Ports
  { type: "port", name: "Port of Shanghai", lat: 31.2304, lng: 121.4737, capacity: 47000000, status: "operational" },
  { type: "port", name: "Port of Singapore", lat: 1.2644, lng: 103.8200, capacity: 37200000, status: "operational" },
  { type: "port", name: "Port of Ningbo-Zhoushan", lat: 29.8683, lng: 121.5440, capacity: 31000000, status: "operational" },
  { type: "port", name: "Port of Shenzhen", lat: 22.5431, lng: 114.0579, capacity: 28000000, status: "operational" },
  { type: "port", name: "Port of Guangzhou", lat: 23.1291, lng: 113.2644, capacity: 25000000, status: "operational" },
  { type: "port", name: "Port of Busan", lat: 35.1796, lng: 129.0756, capacity: 22000000, status: "operational" },
  { type: "port", name: "Port of Rotterdam", lat: 51.9225, lng: 4.4792, capacity: 14800000, status: "operational" },
  { type: "port", name: "Port of Antwerp", lat: 51.2194, lng: 4.4025, capacity: 12000000, status: "operational" },
  { type: "port", name: "Port of Los Angeles", lat: 33.7405, lng: -118.2608, capacity: 9600000, status: "operational" },
  { type: "port", name: "Port of Santos", lat: -23.9608, lng: -46.3339, capacity: 4200000, status: "operational" },

  // Power Plants
  { type: "power_plant", name: "Three Gorges Dam", lat: 30.8231, lng: 111.0023, capacity: 22500, status: "operational" },
  { type: "power_plant", name: "Itaipu Dam", lat: -25.4086, lng: -54.5884, capacity: 14000, status: "operational" },
  { type: "power_plant", name: "Guri Dam Venezuela", lat: 7.8943, lng: -62.9997, capacity: 10235, status: "operational" },
  { type: "power_plant", name: "Tucuruí Dam Brazil", lat: -3.8261, lng: -49.6343, capacity: 8370, status: "operational" },
  { type: "power_plant", name: "Grand Coulee Dam", lat: 47.9531, lng: -118.9828, capacity: 6809, status: "operational" },
  { type: "power_plant", name: "Sayano-Shushenskaya Russia", lat: 52.8268, lng: 91.3803, capacity: 6400, status: "operational" },
  { type: "power_plant", name: "Kashiwazaki-Kariwa Nuclear", lat: 37.4300, lng: 138.5700, capacity: 8212, status: "operational" },
  { type: "power_plant", name: "Gravelines Nuclear France", lat: 51.0150, lng: 2.1083, capacity: 5460, status: "operational" },

  // Refineries
  { type: "refinery", name: "Ras Laffan Qatar", lat: 25.9300, lng: 51.5500, capacity: 1400000, status: "operational" },
  { type: "refinery", name: "Jamnagar India", lat: 22.4700, lng: 70.0600, capacity: 1240000, status: "operational" },
  { type: "refinery", name: "Ulsan South Korea", lat: 35.5384, lng: 129.3114, capacity: 940000, status: "operational" },
  { type: "refinery", name: "Jurong Island Singapore", lat: 1.2700, lng: 103.6800, capacity: 600000, status: "operational" },
  { type: "refinery", name: "Port Arthur Texas", lat: 29.8341, lng: -93.9210, capacity: 600000, status: "operational" },
  { type: "refinery", name: "Rotterdam Europoort", lat: 51.8939, lng: 4.0200, capacity: 530000, status: "operational" },

  // Military Bases
  { type: "military_base", name: "Pentagon", lat: 38.8719, lng: -77.0563, status: "operational" },
  { type: "military_base", name: "Ramstein Air Base", lat: 49.4369, lng: 7.6003, status: "operational" },
  { type: "military_base", name: "Yokota Air Base Japan", lat: 35.7487, lng: 139.3481, status: "operational" },
  { type: "military_base", name: "Diego Garcia Base", lat: -7.3195, lng: 72.4229, status: "operational" },
  { type: "military_base", name: "Al Udeid Air Base Qatar", lat: 25.1176, lng: 51.3150, status: "operational" },

  // Telecom Hubs
  { type: "telecom_hub", name: "Marseille Internet Exchange", lat: 43.2965, lng: 5.3698, status: "operational" },
  { type: "telecom_hub", name: "AMS-IX Amsterdam", lat: 52.3676, lng: 4.9041, status: "operational" },
  { type: "telecom_hub", name: "DE-CIX Frankfurt", lat: 50.1109, lng: 8.6821, status: "operational" },
  { type: "telecom_hub", name: "Equinix Tokyo", lat: 35.6762, lng: 139.6503, status: "operational" },
  { type: "telecom_hub", name: "Equinix Singapore", lat: 1.3521, lng: 103.8198, status: "operational" },

  // Highways
  { type: "highway", name: "Pan-American Highway", lat: 15.0000, lng: -75.0000, capacity: 48000, status: "operational" },
  { type: "highway", name: "Trans-Siberian Highway", lat: 55.0000, lng: 82.0000, capacity: 30000, status: "operational" },
  { type: "highway", name: "European E40 Highway", lat: 50.4501, lng: 30.5234, capacity: 40000, status: "operational" },
];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimatePopulationAtPoint(lat: number, lng: number): number {
  const highDensityZones = [
    { lat: 40.7128, lng: -74.0060, pop: 27000 },
    { lat: 51.5074, lng: -0.1278, pop: 22000 },
    { lat: 35.6762, lng: 139.6503, pop: 30000 },
    { lat: 34.0522, lng: -118.2437, pop: 18000 },
    { lat: -23.5505, lng: -46.6333, pop: 21000 },
    { lat: 28.6139, lng: 77.2090, pop: 25000 },
    { lat: 39.9042, lng: 116.4074, pop: 28000 },
    { lat: 31.2304, lng: 121.4737, pop: 29000 },
    { lat: 55.7558, lng: 37.6173, pop: 19000 },
    { lat: 19.4326, lng: -99.1332, pop: 20000 },
    { lat: 1.3521, lng: 103.8198, pop: 20000 },
    { lat: -33.8688, lng: 151.2093, pop: 17000 },
    { lat: 52.5200, lng: 13.4050, pop: 16000 },
    { lat: 48.8566, lng: 2.3522, pop: 18000 },
    { lat: 34.0522, lng: -118.2437, pop: 18000 },
    { lat: 37.7749, lng: -122.4194, pop: 15000 },
    { lat: 41.8781, lng: -87.6298, pop: 16000 },
    { lat: 25.7617, lng: -80.1918, pop: 14000 },
    { lat: 29.7604, lng: -95.3698, pop: 13000 },
    { lat: 33.4484, lng: -112.0740, pop: 12000 },
  ];

  let totalPopulation = 0;
  for (const zone of highDensityZones) {
    const dist = haversineDistance(lat, lng, zone.lat, zone.lng);
    if (dist < 50) {
      const factor = 1 - (dist / 50);
      totalPopulation += Math.round(zone.pop * factor);
    }
  }

  const baseDensity = 150;
  const radiusKm = 10;
  const area = Math.PI * radiusKm * radiusKm;
  const generalPopulation = Math.round(baseDensity * area);

  return Math.max(totalPopulation, generalPopulation);
}

function getZoneRadius(level: RiskLevel): number {
  const radii: Record<RiskLevel, number> = {
    informativo: 10,
    baixo: 25,
    moderado: 50,
    alto: 100,
    critico: 200,
    emergencia: 350,
    extremo: 500,
  };
  return radii[level];
}

function getEvacuationRadius(level: RiskLevel): number {
  const radii: Record<RiskLevel, number> = {
    informativo: 0,
    baixo: 0,
    moderado: 5,
    alto: 15,
    critico: 30,
    emergencia: 50,
    extremo: 100,
  };
  return radii[level];
}

function generateZoneId(): string {
  return `zone_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function calculateImpactZone(
  lat: number,
  lng: number,
  radiusKm: number,
  category: RiskCategory
): GeoZone {
  const facilities = findNearbyFacilities(lat, lng, radiusKm);
  const population = estimatePopulation(lat, lng, radiusKm);

  const categoryRiskMap: Record<RiskCategory, RiskLevel> = {
    terremoto: "alto",
    vulcao: "critico",
    furacao: "alto",
    tornado: "alto",
    clima_severo: "moderado",
    incendio: "moderado",
    enchente: "alto",
    seca: "baixo",
    espacial: "moderado",
    neo: "informativo",
    satelite: "informativo",
    saude: "moderado",
    cibernetico: "alto",
    energia: "alto",
    maritimo: "moderado",
    aereo: "alto",
    economico: "moderado",
    infraestrutura: "alto",
    conflito: "critico",
  };

  return {
    id: generateZoneId(),
    name: `Zona de Impacto - ${category}`,
    type: "impact_radius",
    center: { lat, lng },
    radius: radiusKm,
    population,
    facilities,
    riskLevel: categoryRiskMap[category],
  };
}

export function findNearbyFacilities(
  lat: number,
  lng: number,
  radiusKm: number
): GeoFacility[] {
  const results: GeoFacility[] = [];

  for (const facility of WORLD_FACILITIES) {
    const distance = haversineDistance(lat, lng, facility.lat, facility.lng);
    if (distance <= radiusKm) {
      results.push({ ...facility, distance });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return results;
}

export function estimatePopulation(lat: number, lng: number, radiusKm: number): number {
  let totalPopulation = 0;
  const steps = Math.ceil(radiusKm / 5);

  for (let i = -steps; i <= steps; i++) {
    for (let j = -steps; j <= steps; j++) {
      const sampleLat = lat + (i * 5 / 111);
      const sampleLng = lng + (j * 5 / (111 * Math.cos(lat * Math.PI / 180)));
      const dist = haversineDistance(lat, lng, sampleLat, sampleLng);
      if (dist <= radiusKm) {
        totalPopulation += estimatePopulationAtPoint(sampleLat, sampleLng);
      }
    }
  }

  return Math.round(totalPopulation * 0.1);
}

export function generateEvacuationZone(
  center: { lat: number; lng: number },
  riskLevel: RiskLevel
): GeoZone {
  const radius = getEvacuationRadius(riskLevel);
  if (radius === 0) {
    return {
      id: generateZoneId(),
      name: "Zona de Evacuação (não necessária)",
      type: "evacuation",
      center,
      radius: 0,
      population: 0,
      facilities: [],
      riskLevel,
    };
  }

  const facilities = findNearbyFacilities(center.lat, center.lng, radius);
  const population = estimatePopulation(center.lat, center.lng, radius);

  return {
    id: generateZoneId(),
    name: `Zona de Evacuação - Nível ${riskLevel}`,
    type: "evacuation",
    center,
    radius,
    population,
    facilities,
    riskLevel,
  };
}

export function assessInfrastructureRisk(zone: GeoZone): {
  riskLevel: RiskLevel;
  affectedFacilities: number;
  description: string;
} {
  const riskLevels: RiskLevel[] = ["informativo", "baixo", "moderado", "alto", "critico", "emergencia", "extremo"];
  const zoneRiskIndex = riskLevels.indexOf(zone.riskLevel);

  let affectedFacilities = 0;
  const criticalFacilities = zone.facilities.filter(f =>
    ["hospital", "power_plant", "refinery", "military_base", "telecom_hub"].includes(f.type)
  );

  affectedFacilities = criticalFacilities.length;

  const criticalCount = criticalFacilities.length;
  let riskLevel = zone.riskLevel;

  if (criticalCount >= 5) {
    const critIdx = Math.min(riskLevels.indexOf(riskLevel) + 2, 6);
    riskLevel = riskLevels[critIdx];
  } else if (criticalCount >= 3) {
    const critIdx = Math.min(riskLevels.indexOf(riskLevel) + 1, 6);
    riskLevel = riskLevels[critIdx];
  }

  const facilityTypes = [...new Set(criticalFacilities.map(f => f.type))];
  const description = affectedFacilities > 0
    ? `${affectedFacilities} instalação(ões) crítica(s) afetada(s): ${facilityTypes.join(", ")}. População potencialmente impactada: ${zone.population.toLocaleString()}`
    : `Nenhuma instalação crítica identificada na zona. População na área: ${zone.population.toLocaleString()}`;

  return { riskLevel, affectedFacilities, description };
}
