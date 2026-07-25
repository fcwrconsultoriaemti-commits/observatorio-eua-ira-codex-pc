export type LayerType = "satellites" | "earthquakes" | "volcanoes" | "wildfires" | "weather" | "ships" | "aircraft" | "infrastructure" | "energy" | "telecom" | "submarine_cables" | "military" | "population" | "weather_radar";

export interface GlobeLayer {
  id: string;
  type: LayerType;
  name: string;
  description: string;
  visible: boolean;
  opacity: number;
  color: string;
  icon: string;
  dataSource: string;
  refreshInterval: number;
  minZoom: number;
  maxZoom: number;
  legend: { color: string; label: string }[];
}

export interface GlobeFeature {
  id: string;
  layerId: string;
  type: LayerType;
  name: string;
  description: string;
  coordinates: { lat: number; lng: number; alt?: number };
  properties: Record<string, unknown>;
  timestamp: string;
  severity?: "low" | "medium" | "high" | "critical";
  status?: string;
}

export interface GlobeConfig {
  center: { lat: number; lng: number };
  zoom: number;
  pitch: number;
  bearing: number;
  basemap: "satellite" | "terrain" | "dark" | "light";
  layers: GlobeLayer[];
  animations: boolean;
  timeRange?: { from: string; to: string };
}

export interface Satellite {
  id: string;
  name: string;
  orbit: string;
  type: "earth_observation" | "communication" | "weather" | "navigation";
  position: { lat: number; lng: number; alt: number };
  groundTrack: { lat: number; lng: number }[];
  imagery: { timestamp: string; url: string; resolution: string }[];
  status: "active" | "degraded" | "offline";
}

export interface SubmarineCable {
  id: string;
  name: string;
  path: { lat: number; lng: number }[];
  capacity: string;
  status: "active" | "damaged" | "maintenance";
  landingPoints: { name: string; lat: number; lng: number }[];
  owner: string;
}

const layers: GlobeLayer[] = [
  {
    id: "satellites",
    type: "satellites",
    name: "Satellites",
    description: "Active satellite constellations and tracking",
    visible: true,
    opacity: 0.8,
    color: "#00ff88",
    icon: "satellite",
    dataSource: "satellites-api",
    refreshInterval: 300,
    minZoom: 0,
    maxZoom: 20,
    legend: [
      { color: "#00ff88", label: "Earth Observation" },
      { color: "#00aaff", label: "Communication" },
      { color: "#ffaa00", label: "Weather" },
      { color: "#ff00ff", label: "Navigation" },
    ],
  },
  {
    id: "earthquakes",
    type: "earthquakes",
    name: "Earthquakes",
    description: "Real-time seismic activity worldwide",
    visible: true,
    opacity: 0.9,
    color: "#ff4444",
    icon: "earthquake",
    dataSource: "usgs-earthquakes",
    refreshInterval: 60,
    minZoom: 0,
    maxZoom: 20,
    legend: [
      { color: "#ffff00", label: "Magnitude 2-3" },
      { color: "#ffaa00", label: "Magnitude 4-5" },
      { color: "#ff4400", label: "Magnitude 6-7" },
      { color: "#ff0000", label: "Magnitude 8+" },
    ],
  },
  {
    id: "volcanoes",
    type: "volcanoes",
    name: "Volcanoes",
    description: "Active volcanic monitoring and alerts",
    visible: true,
    opacity: 0.8,
    color: "#ff6600",
    icon: "volcano",
    dataSource: "smithsonian-gvp",
    refreshInterval: 3600,
    minZoom: 2,
    maxZoom: 20,
    legend: [
      { color: "#00ff00", label: "Normal" },
      { color: "#ffff00", label: "Advisory" },
      { color: "#ffaa00", label: "Watch" },
      { color: "#ff0000", label: "Warning" },
    ],
  },
  {
    id: "wildfires",
    type: "wildfires",
    name: "Wildfires",
    description: "Active wildfire detection and monitoring",
    visible: true,
    opacity: 0.85,
    color: "#ff3300",
    icon: "fire",
    dataSource: "nasa-firms",
    refreshInterval: 300,
    minZoom: 3,
    maxZoom: 20,
    legend: [
      { color: "#ffff00", label: "Low Intensity" },
      { color: "#ff8800", label: "Moderate" },
      { color: "#ff0000", label: "High Intensity" },
      { color: "#aa0000", label: "Extreme" },
    ],
  },
  {
    id: "weather",
    type: "weather",
    name: "Weather",
    description: "Global weather patterns and forecasts",
    visible: true,
    opacity: 0.6,
    color: "#4488ff",
    icon: "cloud",
    dataSource: "openweathermap",
    refreshInterval: 600,
    minZoom: 0,
    maxZoom: 20,
    legend: [
      { color: "#aaddff", label: "Clear" },
      { color: "#88aaff", label: "Cloudy" },
      { color: "#4466ff", label: "Rain" },
      { color: "#2244ff", label: "Storm" },
    ],
  },
  {
    id: "ships",
    type: "ships",
    name: "Ships",
    description: "Maritime vessel tracking (AIS)",
    visible: false,
    opacity: 0.7,
    color: "#00ccff",
    icon: "ship",
    dataSource: "maritime-ais",
    refreshInterval: 120,
    minZoom: 4,
    maxZoom: 20,
    legend: [
      { color: "#00ccff", label: "Cargo" },
      { color: "#00ff00", label: "Tanker" },
      { color: "#ffaa00", label: "Passenger" },
      { color: "#ff0000", label: "Military" },
    ],
  },
  {
    id: "aircraft",
    type: "aircraft",
    name: "Aircraft",
    description: "Live air traffic tracking (ADS-B)",
    visible: false,
    opacity: 0.7,
    color: "#ffcc00",
    icon: "airplane",
    dataSource: "adsb-exchange",
    refreshInterval: 30,
    minZoom: 4,
    maxZoom: 20,
    legend: [
      { color: "#ffcc00", label: "Commercial" },
      { color: "#00ff88", label: "Cargo" },
      { color: "#ff0000", label: "Military" },
      { color: "#888888", label: "General Aviation" },
    ],
  },
  {
    id: "infrastructure",
    type: "infrastructure",
    name: "Infrastructure",
    description: "Critical infrastructure facilities",
    visible: true,
    opacity: 0.8,
    color: "#8844cc",
    icon: "building",
    dataSource: "infrastructure-db",
    refreshInterval: 86400,
    minZoom: 2,
    maxZoom: 20,
    legend: [
      { color: "#ff0000", label: "Nuclear Plant" },
      { color: "#ff8800", label: "Oil Refinery" },
      { color: "#00aaff", label: "Airport" },
      { color: "#00cc88", label: "Port" },
      { color: "#ff44aa", label: "Hospital" },
      { color: "#8844cc", label: "Data Center" },
    ],
  },
  {
    id: "energy",
    type: "energy",
    name: "Energy",
    description: "Power generation and distribution networks",
    visible: false,
    opacity: 0.7,
    color: "#ffaa00",
    icon: "bolt",
    dataSource: "energy-grid",
    refreshInterval: 1800,
    minZoom: 3,
    maxZoom: 20,
    legend: [
      { color: "#ff0000", label: "Nuclear" },
      { color: "#ffaa00", label: "Gas/Oil" },
      { color: "#00cc00", label: "Renewable" },
      { color: "#00aaff", label: "Hydro" },
    ],
  },
  {
    id: "telecom",
    type: "telecom",
    name: "Telecom",
    description: "Telecommunications infrastructure",
    visible: false,
    opacity: 0.6,
    color: "#00ccaa",
    icon: "tower",
    dataSource: "telecom-db",
    refreshInterval: 86400,
    minZoom: 4,
    maxZoom: 20,
    legend: [
      { color: "#00ccaa", label: "Cell Tower" },
      { color: "#00aaff", label: "Fiber Hub" },
      { color: "#ffaa00", label: "Satellite Ground" },
    ],
  },
  {
    id: "submarine_cables",
    type: "submarine_cables",
    name: "Submarine Cables",
    description: "Undersea fiber optic cable networks",
    visible: true,
    opacity: 0.8,
    color: "#0088ff",
    icon: "cable",
    dataSource: "teleGeography",
    refreshInterval: 86400,
    minZoom: 1,
    maxZoom: 20,
    legend: [
      { color: "#00ff00", label: "Active" },
      { color: "#ffff00", label: "Maintenance" },
      { color: "#ff0000", label: "Damaged" },
    ],
  },
  {
    id: "military",
    type: "military",
    name: "Military",
    description: "Military installations and movements",
    visible: false,
    opacity: 0.5,
    color: "#cc0000",
    icon: "shield",
    dataSource: "military-intel",
    refreshInterval: 3600,
    minZoom: 3,
    maxZoom: 20,
    legend: [
      { color: "#cc0000", label: "Base" },
      { color: "#ff4444", label: "Naval Station" },
      { color: "#ff8844", label: "Air Base" },
    ],
  },
  {
    id: "population",
    type: "population",
    name: "Population Density",
    description: "Global population distribution and density",
    visible: false,
    opacity: 0.5,
    color: "#ff88ff",
    icon: "people",
    dataSource: "worldbank-population",
    refreshInterval: 86400,
    minZoom: 0,
    maxZoom: 12,
    legend: [
      { color: "#ffffcc", label: "< 10/km²" },
      { color: "#ffeda0", label: "10-100/km²" },
      { color: "#fed976", label: "100-500/km²" },
      { color: "#feb24c", label: "500-1000/km²" },
      { color: "#f03b20", label: "> 1000/km²" },
    ],
  },
  {
    id: "weather_radar",
    type: "weather_radar",
    name: "Weather Radar",
    description: "Doppler weather radar precipitation data",
    visible: false,
    opacity: 0.7,
    color: "#2266cc",
    icon: "radar",
    dataSource: "nexrad-radar",
    refreshInterval: 300,
    minZoom: 4,
    maxZoom: 20,
    legend: [
      { color: "#00ff00", label: "Light Rain" },
      { color: "#ffff00", label: "Moderate" },
      { color: "#ff8800", label: "Heavy" },
      { color: "#ff0000", label: "Extreme" },
    ],
  },
];

const satellites: Satellite[] = [
  {
    id: "sat-001",
    name: "GOES-16",
    orbit: "Geostationary",
    type: "weather",
    position: { lat: 0, lng: -75.2, alt: 35786 },
    groundTrack: [
      { lat: 0, lng: -75.2 },
      { lat: 0, lng: -75.2 },
    ],
    imagery: [
      { timestamp: "2026-07-25T12:00:00Z", url: "https://goes.gsfc.nasa.gov/goes-16/vis-04.jpg", resolution: "1km" },
    ],
    status: "active",
  },
  {
    id: "sat-002",
    name: "Sentinel-2A",
    orbit: "Sun-synchronous",
    type: "earth_observation",
    position: { lat: 10.5, lng: 45.3, alt: 786 },
    groundTrack: [
      { lat: 10.5, lng: 45.3 },
      { lat: 55.2, lng: -120.1 },
    ],
    imagery: [
      { timestamp: "2026-07-25T08:30:00Z", url: "https://scihub.copernicus.eu/sentinel-2/tiles/36TWG", resolution: "10m" },
    ],
    status: "active",
  },
  {
    id: "sat-003",
    name: "Landsat-8",
    orbit: "Sun-synchronous",
    type: "earth_observation",
    position: { lat: -25.0, lng: 130.0, alt: 705 },
    groundTrack: [
      { lat: -25.0, lng: 130.0 },
      { lat: 65.0, lng: -100.0 },
    ],
    imagery: [
      { timestamp: "2026-07-25T06:45:00Z", url: "https://earthexplorer.usgs.gov/landsat-8/scene/LC08_L1TP_012032_20260725", resolution: "30m" },
    ],
    status: "active",
  },
  {
    id: "sat-004",
    name: "International Space Station",
    orbit: "Low Earth Orbit",
    type: "earth_observation",
    position: { lat: 42.3, lng: -88.5, alt: 408 },
    groundTrack: [
      { lat: 42.3, lng: -88.5 },
      { lat: -42.3, lng: 91.5 },
    ],
    imagery: [],
    status: "active",
  },
  {
    id: "sat-005",
    name: "Starlink-4201",
    orbit: "Low Earth Orbit",
    type: "communication",
    position: { lat: 15.2, lng: -120.3, alt: 550 },
    groundTrack: [
      { lat: 15.2, lng: -120.3 },
      { lat: -15.2, lng: 59.7 },
    ],
    imagery: [],
    status: "active",
  },
  {
    id: "sat-006",
    name: "GPS IIF-12",
    orbit: "Medium Earth Orbit",
    type: "navigation",
    position: { lat: 0, lng: -30.0, alt: 20200 },
    groundTrack: [
      { lat: 0, lng: -30.0 },
    ],
    imagery: [],
    status: "active",
  },
  {
    id: "sat-007",
    name: "TerraSAR-X",
    orbit: "Sun-synchronous",
    type: "earth_observation",
    position: { lat: -10.0, lng: 20.0, alt: 514 },
    groundTrack: [
      { lat: -10.0, lng: 20.0 },
      { lat: 80.0, lng: -160.0 },
    ],
    imagery: [
      { timestamp: "2026-07-25T10:00:00Z", url: "https://sso-ims.dlr.de/sar/tsx-1/scene/00001", resolution: "1m" },
    ],
    status: "active",
  },
  {
    id: "sat-008",
    name: "NOAA-21",
    orbit: "Sun-synchronous",
    type: "weather",
    position: { lat: 20.5, lng: 100.0, alt: 824 },
    groundTrack: [
      { lat: 20.5, lng: 100.0 },
      { lat: -65.0, lng: -80.0 },
    ],
    imagery: [
      { timestamp: "2026-07-25T11:30:00Z", url: "https://www.star.nesdis.noaa.gov/GOES/sector.php?sat=G16&sector=ne", resolution: "750m" },
    ],
    status: "active",
  },
  {
    id: "sat-009",
    name: "Intelsat 33e",
    orbit: "Geostationary",
    type: "communication",
    position: { lat: 0, lng: 60.0, alt: 35786 },
    groundTrack: [
      { lat: 0, lng: 60.0 },
    ],
    imagery: [],
    status: "active",
  },
];

const submarineCables: SubmarineCable[] = [
  {
    id: "cable-001",
    name: "TAT-14",
    path: [
      { lat: 51.0, lng: -5.5 },
      { lat: 48.5, lng: -10.0 },
      { lat: 42.5, lng: -25.0 },
      { lat: 36.5, lng: -30.0 },
      { lat: 33.0, lng: -15.0 },
      { lat: 40.5, lng: -74.0 },
    ],
    capacity: "12.8 Tbps",
    status: "active",
    landingPoints: [
      { name: "Bude, UK", lat: 50.8, lng: -4.5 },
      { name: "Landing Point, US", lat: 40.5, lng: -74.0 },
    ],
    owner: "TAT-14 Consortium",
  },
  {
    id: "cable-002",
    name: "SEA-ME-WE 3",
    path: [
      { lat: 51.5, lng: -0.1 },
      { lat: 35.8, lng: -5.8 },
      { lat: 30.0, lng: 32.5 },
      { lat: 25.0, lng: 55.0 },
      { lat: 19.0, lng: 73.0 },
      { lat: 1.3, lng: 103.8 },
      { lat: -6.2, lng: 106.8 },
    ],
    capacity: "2.5 Tbps",
    status: "active",
    landingPoints: [
      { name: "Bude, UK", lat: 50.8, lng: -4.5 },
      { name: "Tuas, Singapore", lat: 1.3, lng: 103.7 },
    ],
    owner: "SEA-ME-WE 3 Consortium",
  },
  {
    id: "cable-003",
    name: "UNITY",
    path: [
      { lat: 34.0, lng: -118.5 },
      { lat: 21.3, lng: -157.8 },
      { lat: 0.5, lng: 173.0 },
      { lat: -20.0, lng: 166.0 },
      { lat: -33.9, lng: 151.2 },
    ],
    capacity: "7.68 Tbps",
    status: "active",
    landingPoints: [
      { name: "Los Angeles, US", lat: 34.0, lng: -118.5 },
      { name: "Sydney, Australia", lat: -33.9, lng: 151.2 },
    ],
    owner: "UNITY Consortium",
  },
  {
    id: "cable-004",
    name: "WACS",
    path: [
      { lat: 34.0, lng: -5.5 },
      { lat: 30.0, lng: -10.0 },
      { lat: 15.0, lng: -17.0 },
      { lat: 5.0, lng: -2.0 },
      { lat: -4.0, lng: 15.0 },
      { lat: -15.0, lng: 12.0 },
      { lat: -30.0, lng: 18.0 },
      { lat: -33.9, lng: 18.4 },
    ],
    capacity: "5.12 Tbps",
    status: "active",
    landingPoints: [
      { name: "Yzerfontein, South Africa", lat: -33.0, lng: 18.0 },
      { name: "Landing Point, Portugal", lat: 38.7, lng: -9.1 },
    ],
    owner: "WACS Consortium",
  },
  {
    id: "cable-005",
    name: "SAT-3",
    path: [
      { lat: 38.7, lng: -9.1 },
      { lat: 35.0, lng: -8.0 },
      { lat: 28.0, lng: -13.0 },
      { lat: 20.0, lng: -17.0 },
      { lat: 10.0, lng: -14.0 },
      { lat: 5.0, lng: 1.0 },
      { lat: -4.0, lng: 15.0 },
      { lat: -15.0, lng: 12.0 },
      { lat: -25.0, lng: 15.0 },
      { lat: -33.9, lng: 18.4 },
    ],
    capacity: "2.2 Tbps",
    status: "active",
    landingPoints: [
      { name: "Landing Point, South Africa", lat: -33.9, lng: 18.4 },
      { name: "Landing Point, Portugal", lat: 38.7, lng: -9.1 },
    ],
    owner: "SAT-3 Consortium",
  },
  {
    id: "cable-006",
    name: "AAG",
    path: [
      { lat: 22.3, lng: 114.2 },
      { lat: 15.0, lng: 110.0 },
      { lat: 10.0, lng: 106.5 },
      { lat: 5.0, lng: 103.0 },
      { lat: 0, lng: 109.0 },
      { lat: -5.0, lng: 115.0 },
      { lat: -8.0, lng: 115.0 },
      { lat: -34.0, lng: 151.0 },
    ],
    capacity: "2.4 Tbps",
    status: "active",
    landingPoints: [
      { name: "Tseung Kwan O, Hong Kong", lat: 22.3, lng: 114.2 },
      { name: "Sydney, Australia", lat: -34.0, lng: 151.0 },
    ],
    owner: "AAG Consortium",
  },
  {
    id: "cable-007",
    name: "Coral Sea Cable System",
    path: [
      { lat: -25.0, lng: 153.0 },
      { lat: -18.0, lng: 147.0 },
      { lat: -10.0, lng: 140.0 },
      { lat: -6.0, lng: 147.0 },
      { lat: -4.0, lng: 152.0 },
    ],
    capacity: "1.2 Tbps",
    status: "active",
    landingPoints: [
      { name: "Brisbane, Australia", lat: -27.5, lng: 153.0 },
      { name: "Port Moresby, PNG", lat: -9.5, lng: 147.2 },
    ],
    owner: "Coral Sea Cable Consortium",
  },
  {
    id: "cable-008",
    name: "EIG",
    path: [
      { lat: 51.0, lng: -5.0 },
      { lat: 38.7, lng: -9.0 },
      { lat: 36.0, lng: -5.0 },
      { lat: 30.0, lng: 32.0 },
      { lat: 25.0, lng: 55.0 },
      { lat: 19.0, lng: 73.0 },
      { lat: 1.3, lng: 103.8 },
    ],
    capacity: "4.8 Tbps",
    status: "active",
    landingPoints: [
      { name: "Bude, UK", lat: 50.8, lng: -4.5 },
      { name: "Tuas, Singapore", lat: 1.3, lng: 103.7 },
    ],
    owner: "EIG Consortium",
  },
  {
    id: "cable-009",
    name: "Pacific Crossing-1",
    path: [
      { lat: 37.8, lng: -122.4 },
      { lat: 30.0, lng: -140.0 },
      { lat: 20.0, lng: -155.0 },
      { lat: 10.0, lng: 160.0 },
      { lat: 0, lng: 150.0 },
      { lat: -30.0, lng: 145.0 },
    ],
    capacity: "3.2 Tbps",
    status: "active",
    landingPoints: [
      { name: "San Francisco, US", lat: 37.8, lng: -122.4 },
      { name: "Sydney, Australia", lat: -33.9, lng: 151.2 },
    ],
    owner: "Pacific Crossing Ltd",
  },
  {
    id: "cable-010",
    name: "SACS",
    path: [
      { lat: -12.0, lng: 13.0 },
      { lat: -5.0, lng: -12.0 },
      { lat: 0, lng: -30.0 },
      { lat: 5.0, lng: -50.0 },
      { lat: -8.0, lng: -35.0 },
    ],
    capacity: "40 Tbps",
    status: "active",
    landingPoints: [
      { name: "Luanda, Angola", lat: -8.8, lng: 13.2 },
      { name: "Fortaleza, Brazil", lat: -3.7, lng: -38.5 },
    ],
    owner: " Angola Cables",
  },
  {
    id: "cable-011",
    name: "Dunant",
    path: [
      { lat: 40.5, lng: -74.0 },
      { lat: 38.0, lng: -30.0 },
      { lat: 30.0, lng: -10.0 },
      { lat: 10.0, lng: 10.0 },
      { lat: -5.0, lng: 20.0 },
      { lat: -20.0, lng: 25.0 },
      { lat: -30.0, lng: 30.0 },
    ],
    capacity: "250 Tbps",
    status: "active",
    landingPoints: [
      { name: "New York, US", lat: 40.5, lng: -74.0 },
      { name: "Cape Town, South Africa", lat: -33.9, lng: 18.4 },
    ],
    owner: "Google",
  },
  {
    id: "cable-012",
    name: "Grace Hopper",
    path: [
      { lat: 40.5, lng: -74.0 },
      { lat: 43.0, lng: -20.0 },
      { lat: 50.8, lng: -4.5 },
      { lat: 48.5, lng: -2.0 },
      { lat: 38.7, lng: -9.0 },
    ],
    capacity: "240 Tbps",
    status: "active",
    landingPoints: [
      { name: "New York, US", lat: 40.5, lng: -74.0 },
      { name: "Bude, UK", lat: 50.8, lng: -4.5 },
    ],
    owner: "Google",
  },
  {
    id: "cable-013",
    name: "JUPITER",
    path: [
      { lat: 37.8, lng: -122.4 },
      { lat: 30.0, lng: -140.0 },
      { lat: 21.0, lng: -157.0 },
      { lat: 10.0, lng: 160.0 },
      { lat: -6.0, lng: 145.0 },
      { lat: -33.9, lng: 151.2 },
    ],
    capacity: "200 Tbps",
    status: "active",
    landingPoints: [
      { name: "Los Angeles, US", lat: 34.0, lng: -118.5 },
      { name: "Tokyo, Japan", lat: 35.7, lng: 139.7 },
    ],
    owner: "JUPITER Consortium",
  },
  {
    id: "cable-014",
    name: "PEACE",
    path: [
      { lat: 35.8, lng: -5.8 },
      { lat: 30.0, lng: 10.0 },
      { lat: 20.0, lng: 40.0 },
      { lat: 25.0, lng: 55.0 },
      { lat: 24.0, lng: 68.0 },
      { lat: 19.0, lng: 73.0 },
      { lat: 1.3, lng: 103.8 },
    ],
    capacity: "60 Tbps",
    status: "active",
    landingPoints: [
      { name: "Marseille, France", lat: 43.3, lng: 5.4 },
      { name: "Singapore", lat: 1.3, lng: 103.8 },
    ],
    owner: "PEACE Networks Ltd",
  },
  {
    id: "cable-015",
    name: "Ellalink",
    path: [
      { lat: -23.5, lng: -46.6 },
      { lat: -10.0, lng: -30.0 },
      { lat: 0, lng: -15.0 },
      { lat: 30.0, lng: -10.0 },
      { lat: 38.7, lng: -9.0 },
      { lat: 43.3, lng: 5.4 },
    ],
    capacity: "72 Tbps",
    status: "active",
    landingPoints: [
      { name: "Fortaleza, Brazil", lat: -3.7, lng: -38.5 },
      { name: "Landing Point, France", lat: 43.3, lng: 5.4 },
    ],
    owner: "Ellalink Consortium",
  },
  {
    id: "cable-016",
    name: "2Africa",
    path: [
      { lat: 51.0, lng: -5.0 },
      { lat: 36.0, lng: -5.0 },
      { lat: 20.0, lng: -17.0 },
      { lat: 5.0, lng: 5.0 },
      { lat: -5.0, lng: 12.0 },
      { lat: -15.0, lng: 40.0 },
      { lat: -25.0, lng: 45.0 },
      { lat: -30.0, lng: 30.0 },
      { lat: -34.0, lng: 18.5 },
      { lat: 1.3, lng: 103.8 },
    ],
    capacity: "180 Tbps",
    status: "active",
    landingPoints: [
      { name: "Bude, UK", lat: 50.8, lng: -4.5 },
      { name: "Cape Town, South Africa", lat: -33.9, lng: 18.4 },
    ],
    owner: "Meta (Facebook)",
  },
];

const infrastructureFeatures: GlobeFeature[] = [
  // Nuclear Power Plants
  { id: "infra-001", layerId: "infrastructure", type: "infrastructure", name: "Bruce Nuclear Generating Station", description: "Largest nuclear power plant in Canada", coordinates: { lat: 44.3372, lng: -81.5986 }, properties: { type: "nuclear", capacity: "6430 MW", operator: "Ontario Power Generation" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-002", layerId: "infrastructure", type: "infrastructure", name: "Kashiwazaki-Kariwa", description: "Largest nuclear power station in the world", coordinates: { lat: 37.4283, lng: 138.5969 }, properties: { type: "nuclear", capacity: "8212 MW", operator: "TEPCO" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-003", layerId: "infrastructure", type: "infrastructure", name: "Gravelines Nuclear Power Station", description: "Largest nuclear power plant in Western Europe", coordinates: { lat: 51.0144, lng: 2.1094 }, properties: { type: "nuclear", capacity: "5460 MW", operator: "EDF" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-004", layerId: "infrastructure", type: "infrastructure", name: "Zaporizhzhia Nuclear Power Plant", description: "Largest nuclear power plant in Europe", coordinates: { lat: 47.5081, lng: 35.1844 }, properties: { type: "nuclear", capacity: "6000 MW", operator: "Energoatom" }, timestamp: "2026-07-25T00:00:00Z", status: "under_repair" },
  { id: "infra-005", layerId: "infrastructure", type: "infrastructure", name: "Hanbit Nuclear Power Plant", description: "Major South Korean nuclear facility", coordinates: { lat: 35.4133, lng: 126.4000 }, properties: { type: "nuclear", capacity: "5875 MW", operator: "KHNP" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-006", layerId: "infrastructure", type: "infrastructure", name: "Tianwan Nuclear Power Plant", description: "Major Chinese nuclear facility", coordinates: { lat: 34.6833, lng: 119.4500 }, properties: { type: "nuclear", capacity: "5000 MW", operator: "CNNC" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Oil Refineries
  { id: "infra-007", layerId: "infrastructure", type: "infrastructure", name: "Jamnagar Refinery", description: "Largest oil refinery in the world", coordinates: { lat: 22.4700, lng: 70.0600 }, properties: { type: "refinery", capacity: "1.24 million barrels/day", operator: "Reliance Industries" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-008", layerId: "infrastructure", type: "infrastructure", name: "Ras Tanura Refinery", description: "Largest crude oil refinery in the world", coordinates: { lat: 26.6500, lng: 50.0700 }, properties: { type: "refinery", capacity: "550,000 barrels/day", operator: "Saudi Aramco" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-009", layerId: "infrastructure", type: "infrastructure", name: "Port Arthur Refinery", description: "Largest refinery in the United States", coordinates: { lat: 29.8500, lng: -93.9200 }, properties: { type: "refinery", capacity: "626,000 barrels/day", operator: "Motiva Enterprises" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-010", layerId: "infrastructure", type: "infrastructure", name: "Ulsan Refinery", description: "Major South Korean refinery", coordinates: { lat: 35.5300, lng: 129.3100 }, properties: { type: "refinery", capacity: "840,000 barrels/day", operator: "SK Innovation" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-011", layerId: "infrastructure", type: "infrastructure", name: "Jurong Island Refinery", description: "Singapore's major petroleum hub", coordinates: { lat: 1.2700, lng: 103.6800 }, properties: { type: "refinery", capacity: "600,000 barrels/day", operator: "ExxonMobil" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Major Airports
  { id: "infra-012", layerId: "infrastructure", type: "infrastructure", name: "Hartsfield-Jackson Atlanta", description: "Busiest airport in the world", coordinates: { lat: 33.6407, lng: -84.4277 }, properties: { type: "airport", passengers_per_year: "110 million", runways: 5 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-013", layerId: "infrastructure", type: "infrastructure", name: "Dubai International Airport", description: "Busiest international airport", coordinates: { lat: 25.2532, lng: 55.3657 }, properties: { type: "airport", passengers_per_year: "89 million", runways: 2 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-014", layerId: "infrastructure", type: "infrastructure", name: "Heathrow Airport", description: "London's primary international airport", coordinates: { lat: 51.4700, lng: -0.4543 }, properties: { type: "airport", passengers_per_year: "80 million", runways: 2 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-015", layerId: "infrastructure", type: "infrastructure", name: "Beijing Capital International", description: "Busiest airport in China", coordinates: { lat: 40.0799, lng: 116.6031 }, properties: { type: "airport", passengers_per_year: "100 million", runways: 3 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-016", layerId: "infrastructure", type: "infrastructure", name: "Los Angeles International", description: "Gateway to the Pacific", coordinates: { lat: 33.9425, lng: -118.4081 }, properties: { type: "airport", passengers_per_year: "88 million", runways: 4 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-017", layerId: "infrastructure", type: "infrastructure", name: "Tokyo Haneda Airport", description: "One of the busiest airports in Asia", coordinates: { lat: 35.5494, lng: 139.7798 }, properties: { type: "airport", passengers_per_year: "85 million", runways: 4 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-018", layerId: "infrastructure", type: "infrastructure", name: "O'Hare International", description: "Major Chicago hub", coordinates: { lat: 41.9742, lng: -87.9073 }, properties: { type: "airport", passengers_per_year: "80 million", runways: 8 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-019", layerId: "infrastructure", type: "infrastructure", name: "Singapore Changi Airport", description: "Award-winning airport", coordinates: { lat: 1.3644, lng: 103.9915 }, properties: { type: "airport", passengers_per_year: "68 million", runways: 2 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Container Ports
  { id: "infra-020", layerId: "infrastructure", type: "infrastructure", name: "Port of Shanghai", description: "Busiest container port in the world", coordinates: { lat: 31.2304, lng: 121.4737 }, properties: { type: "port", teu_per_year: "47 million", depth: "16m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-021", layerId: "infrastructure", type: "infrastructure", name: "Port of Singapore", description: "Second busiest container port", coordinates: { lat: 1.2644, lng: 103.8198 }, properties: { type: "port", teu_per_year: "37 million", depth: "16m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-022", layerId: "infrastructure", type: "infrastructure", name: "Port of Ningbo-Zhoushan", description: "Third busiest port by cargo tonnage", coordinates: { lat: 29.8683, lng: 121.5440 }, properties: { type: "port", teu_per_year: "33 million", depth: "18m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-023", layerId: "infrastructure", type: "infrastructure", name: "Port of Rotterdam", description: "Largest port in Europe", coordinates: { lat: 51.9225, lng: 4.4792 }, properties: { type: "port", teu_per_year: "14.5 million", depth: "20m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-024", layerId: "infrastructure", type: "infrastructure", name: "Port of Los Angeles", description: "Busiest port in the Western Hemisphere", coordinates: { lat: 33.7405, lng: -118.2608 }, properties: { type: "port", teu_per_year: "9.6 million", depth: "16m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-025", layerId: "infrastructure", type: "infrastructure", name: "Port of Busan", description: "Largest port in South Korea", coordinates: { lat: 35.1796, lng: 129.0756 }, properties: { type: "port", teu_per_year: "22 million", depth: "17m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-026", layerId: "infrastructure", type: "infrastructure", name: "Port of Antwerp-Bruges", description: "Largest port in Belgium", coordinates: { lat: 51.2600, lng: 4.4000 }, properties: { type: "port", teu_per_year: "13 million", depth: "18m" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Hospitals
  { id: "infra-027", layerId: "infrastructure", type: "infrastructure", name: "Johns Hopkins Hospital", description: "World-renowned research hospital", coordinates: { lat: 39.2964, lng: -76.5928 }, properties: { type: "hospital", beds: 1162, specialty: "teaching" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-028", layerId: "infrastructure", type: "infrastructure", name: "Mayo Clinic", description: "Top-ranked hospital in the US", coordinates: { lat: 44.0234, lng: -92.4630 }, properties: { type: "hospital", beds: 2059, specialty: "multi-specialty" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-029", layerId: "infrastructure", type: "infrastructure", name: "Massachusetts General Hospital", description: "Oldest hospital in Massachusetts", coordinates: { lat: 42.3631, lng: -71.0686 }, properties: { type: "hospital", beds: 1011, specialty: "teaching" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-030", layerId: "infrastructure", type: "infrastructure", name: "Charité - Universitätsmedizin Berlin", description: "Largest university hospital in Europe", coordinates: { lat: 52.5244, lng: 13.3885 }, properties: { type: "hospital", beds: 3000, specialty: "teaching" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-031", layerId: "infrastructure", type: "infrastructure", name: "Tokyo Medical University Hospital", description: "Premier Japanese medical center", coordinates: { lat: 35.6895, lng: 139.6917 }, properties: { type: "hospital", beds: 1000, specialty: "multi-specialty" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-032", layerId: "infrastructure", type: "infrastructure", name: "Apollo Hospital Chennai", description: "Largest private hospital in India", coordinates: { lat: 13.0358, lng: 80.2449 }, properties: { type: "hospital", beds: 600, specialty: "multi-specialty" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Data Centers
  { id: "infra-033", layerId: "infrastructure", type: "infrastructure", name: "The Dalles Data Center", description: "Google's largest data center complex", coordinates: { lat: 45.5945, lng: -121.1787 }, properties: { type: "data_center", operator: "Google", capacity: "500MW" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-034", layerId: "infrastructure", type: "infrastructure", name: "Ashburn Data Center Corridor", description: "Largest concentration of data centers in the world", coordinates: { lat: 39.0438, lng: -77.4874 }, properties: { type: "data_center", operator: "Multiple", capacity: "1GW+" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-035", layerId: "infrastructure", type: "infrastructure", name: "Prineville Data Center", description: "Facebook/Meta's largest facility", coordinates: { lat: 44.2993, lng: -120.8337 }, properties: { type: "data_center", operator: "Meta", capacity: "300MW" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-036", layerId: "infrastructure", type: "infrastructure", name: "Lulea Data Center", description: "Facebook's European hub in Sweden", coordinates: { lat: 65.5848, lng: 22.1547 }, properties: { type: "data_center", operator: "Meta", capacity: "120MW" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-037", layerId: "infrastructure", type: "infrastructure", name: "Quincy Data Center", description: "Microsoft's largest campus", coordinates: { lat: 47.2343, lng: -119.8526 }, properties: { type: "data_center", operator: "Microsoft", capacity: "400MW" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-038", layerId: "infrastructure", type: "infrastructure", name: "Singapore Data Center Hub", description: "Asia-Pacific cloud hub", coordinates: { lat: 1.3521, lng: 103.8198 }, properties: { type: "data_center", operator: "Multiple", capacity: "200MW" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Power Plants (Non-Nuclear)
  { id: "infra-039", layerId: "infrastructure", type: "infrastructure", name: "Three Gorges Dam", description: "World's largest power station by installed capacity", coordinates: { lat: 30.8231, lng: 111.0033 }, properties: { type: "hydro", capacity: "22,500 MW", operator: "China Three Gorges Corp" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-040", layerId: "infrastructure", type: "infrastructure", name: "Itaipu Dam", description: "Second largest hydroelectric plant", coordinates: { lat: -25.4086, lng: -54.5889 }, properties: { type: "hydro", capacity: "14,000 MW", operator: "Itaipu Binacional" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-041", layerId: "infrastructure", type: "infrastructure", name: "Bhadla Solar Park", description: "Largest solar park in the world", coordinates: { lat: 27.5360, lng: 71.9140 }, properties: { type: "solar", capacity: "2,245 MW", operator: "RRECL" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-042", layerId: "infrastructure", type: "infrastructure", name: "Gansu Wind Farm", description: "Largest wind farm in the world", coordinates: { lat: 40.3000, lng: 95.8000 }, properties: { type: "wind", capacity: "20,000 MW", operator: "China Guodian" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },

  // Additional Infrastructure
  { id: "infra-043", layerId: "infrastructure", type: "infrastructure", name: "Suez Canal", description: "Key maritime chokepoint", coordinates: { lat: 30.5000, lng: 32.3500 }, properties: { type: "canal", capacity: "12% of global trade", length: "193 km" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-044", layerId: "infrastructure", type: "infrastructure", name: "Panama Canal", description: "Key maritime chokepoint", coordinates: { lat: 9.1000, lng: -79.6000 }, properties: { type: "canal", capacity: "6% of global trade", length: "82 km" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-045", layerId: "infrastructure", type: "infrastructure", name: "Strait of Malacca", description: "Most important shipping lane", coordinates: { lat: 2.5000, lng: 101.5000 }, properties: { type: "chokepoint", capacity: "25% of global trade" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-046", layerId: "infrastructure", type: "infrastructure", name: "Gibraltar Strait", description: "Mediterranean gateway", coordinates: { lat: 36.0000, lng: -5.5000 }, properties: { type: "chokepoint", capacity: "20% of global trade" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-047", layerId: "infrastructure", type: "infrastructure", name: "Hormuz Strait", description: "Critical oil transit", coordinates: { lat: 26.5000, lng: 56.2500 }, properties: { type: "chokepoint", capacity: "20% of global oil" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-048", layerId: "infrastructure", type: "infrastructure", name: "Bab el-Mandeb", description: "Red Sea entrance", coordinates: { lat: 12.6000, lng: 43.3000 }, properties: { type: "chokepoint", capacity: "9% of global trade" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-049", layerId: "infrastructure", type: "infrastructure", name: "CERN Large Hadron Collider", description: "World's largest particle accelerator", coordinates: { lat: 46.2330, lng: 6.0557 }, properties: { type: "research", operator: "CERN", circumference: "27 km" }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-050", layerId: "infrastructure", type: "infrastructure", name: "Baikonur Cosmodrome", description: "First and largest space launch facility", coordinates: { lat: 45.9650, lng: 63.3050 }, properties: { type: "spaceport", operator: "Roscosmos", launch_pads: 9 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
  { id: "infra-051", layerId: "infrastructure", type: "infrastructure", name: "Kennedy Space Center", description: "NASA's primary launch center", coordinates: { lat: 28.5721, lng: -80.6480 }, properties: { type: "spaceport", operator: "NASA", launch_pads: 2 }, timestamp: "2026-07-25T00:00:00Z", status: "operational" },
];

let config: GlobeConfig = {
  center: { lat: 20, lng: 0 },
  zoom: 2.5,
  pitch: 0,
  bearing: 0,
  basemap: "dark",
  layers: [...layers],
  animations: true,
};

export function getDefaultConfig(): GlobeConfig {
  return JSON.parse(JSON.stringify(config));
}

export function getLayer(id: string): GlobeLayer | undefined {
  return config.layers.find((l) => l.id === id);
}

export function toggleLayer(id: string): GlobeLayer {
  const layer = config.layers.find((l) => l.id === id);
  if (!layer) throw new Error(`Layer ${id} not found`);
  layer.visible = !layer.visible;
  return { ...layer };
}

export function setLayerOpacity(id: string, opacity: number): GlobeLayer {
  const layer = config.layers.find((l) => l.id === id);
  if (!layer) throw new Error(`Layer ${id} not found`);
  layer.opacity = Math.max(0, Math.min(1, opacity));
  return { ...layer };
}

export function getVisibleLayers(): GlobeLayer[] {
  return config.layers.filter((l) => l.visible);
}

export function getFeaturesForLayer(layerId: string): GlobeFeature[] {
  if (layerId === "infrastructure" || layerId === "energy") {
    return infrastructureFeatures.filter((f) => f.layerId === layerId);
  }
  return [];
}

export function getFeaturesNearby(lat: number, lng: number, radiusKm: number): GlobeFeature[] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  };
  return infrastructureFeatures.filter((f) => haversine(lat, lng, f.coordinates.lat, f.coordinates.lng) <= radiusKm);
}

export function getSatellites(): Satellite[] {
  return JSON.parse(JSON.stringify(satellites));
}

export function getSubmarineCables(): SubmarineCable[] {
  return JSON.parse(JSON.stringify(submarineCables));
}

export function getInfrastructureFacilities(): GlobeFeature[] {
  return JSON.parse(JSON.stringify(infrastructureFeatures));
}

export function searchFeatures(query: string): GlobeFeature[] {
  const q = query.toLowerCase();
  return infrastructureFeatures.filter(
    (f) => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)
  );
}

export function getTimelineData(layerId: string, from: string, to: string): GlobeFeature[] {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  return infrastructureFeatures.filter((f) => {
    const t = new Date(f.timestamp);
    return t >= fromDate && t <= toDate && f.layerId === layerId;
  });
}

export function getCascadeEvents(eventId: string): GlobeFeature[] {
  const event = infrastructureFeatures.find((e) => e.id === eventId);
  if (!event) return [];
  return infrastructureFeatures.filter(
    (f) => f.id !== eventId && Math.abs(f.coordinates.lat - event.coordinates.lat) < 10 && Math.abs(f.coordinates.lng - event.coordinates.lng) < 10
  );
}
