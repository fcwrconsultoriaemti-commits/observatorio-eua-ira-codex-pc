import type { GlobalEvent } from "../types";

export interface SourceProfile {
  id: string;
  name: string;
  type: "official" | "news" | "social" | "research" | "government" | "ngo";
  reliability: number;      // 0-100 base reliability
  accuracy: number;         // 0-100 historical accuracy
  bias: "low" | "medium" | "high";
  updateFrequency: string;
  language: string[];
  country: string;
  website?: string;
  apiKey?: string;
  lastChecked: string;
  metadata: Record<string, unknown>;
}

// In-memory store for sources
const sources: Map<string, SourceProfile> = new Map();

// Pre-registered sources with reliability scores
const preRegisteredSources: SourceProfile[] = [
  {
    id: "usgs",
    name: "United States Geological Survey",
    type: "official",
    reliability: 100,
    accuracy: 98,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en"],
    country: "US",
    website: "https://www.usgs.gov",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "noaa",
    name: "National Oceanic and Atmospheric Administration",
    type: "official",
    reliability: 100,
    accuracy: 97,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en"],
    country: "US",
    website: "https://www.noaa.gov",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "nasa",
    name: "National Aeronautics and Space Administration",
    type: "official",
    reliability: 100,
    accuracy: 96,
    bias: "low",
    updateFrequency: "daily",
    language: ["en"],
    country: "US",
    website: "https://www.nasa.gov",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "who",
    name: "World Health Organization",
    type: "official",
    reliability: 98,
    accuracy: 95,
    bias: "low",
    updateFrequency: "daily",
    language: ["en", "fr", "es", "ar", "zh", "ru"],
    country: "International",
    website: "https://www.who.int",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "reuters",
    name: "Reuters",
    type: "news",
    reliability: 97,
    accuracy: 94,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en", "ar", "de", "es", "fr", "ja", "pt", "zh"],
    country: "International",
    website: "https://www.reuters.com",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "ap",
    name: "Associated Press",
    type: "news",
    reliability: 96,
    accuracy: 93,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en", "es", "fr", "de", "ar", "zh"],
    country: "International",
    website: "https://apnews.com",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "bbc",
    name: "British Broadcasting Corporation",
    type: "news",
    reliability: 95,
    accuracy: 92,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en", "ar", "zh", "es", "fa", "fr", "ha", "hi", "id", "ms", "pt", "ru", "sr", "sw", "tr", "uk", "ur", "vi"],
    country: "International",
    website: "https://www.bbc.com",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "aljazeera",
    name: "Al Jazeera",
    type: "news",
    reliability: 92,
    accuracy: 90,
    bias: "medium",
    updateFrequency: "real-time",
    language: ["ar", "en", "es"],
    country: "International",
    website: "https://www.aljazeera.com",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "gdelt",
    name: "Global Database of Events, Language, and Tone",
    type: "research",
    reliability: 85,
    accuracy: 82,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en"],
    country: "International",
    website: "https://www.gdeltproject.org",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "eventregistry",
    name: "Event Registry",
    type: "research",
    reliability: 80,
    accuracy: 78,
    bias: "low",
    updateFrequency: "real-time",
    language: ["en"],
    country: "International",
    website: "https://eventregistry.org",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "socialmedia",
    name: "Social Media Aggregated",
    type: "social",
    reliability: 40,
    accuracy: 35,
    bias: "high",
    updateFrequency: "real-time",
    language: ["en", "es", "pt", "ar", "zh", "hi", "fr", "de", "ja", "ko"],
    country: "International",
    lastChecked: new Date().toISOString(),
    metadata: {}
  },
  {
    id: "unknown",
    name: "Unknown Source",
    type: "social",
    reliability: 20,
    accuracy: 15,
    bias: "high",
    updateFrequency: "unknown",
    language: ["en"],
    country: "International",
    lastChecked: new Date().toISOString(),
    metadata: {}
  }
];

// Initialize pre-registered sources
function initializeSources(): void {
  for (const source of preRegisteredSources) {
    sources.set(source.id, source);
  }
}

// Initialize on module load
initializeSources();

// 1. registerSource(profile: SourceProfile): void
export function registerSource(profile: SourceProfile): void {
  sources.set(profile.id, profile);
}

// 2. getSource(id: string): SourceProfile | undefined
export function getSource(id: string): SourceProfile | undefined {
  return sources.get(id);
}

// 3. getAllSources(): SourceProfile[]
export function getAllSources(): SourceProfile[] {
  return Array.from(sources.values());
}

// 4. calculateReliability(sourceId: string, event: GlobalEvent): number
export function calculateReliability(sourceId: string, event: GlobalEvent): number {
  const source = sources.get(sourceId);
  if (!source) return 20; // Default for unknown sources
  
  // Start with base reliability
  let reliability = source.reliability;
  
  // Multiply by accuracy factor (0-1)
  reliability *= (source.accuracy / 100);
  
  // Adjust for bias
  const biasMultiplier = source.bias === "low" ? 1.0 : 
                         source.bias === "medium" ? 0.9 : 0.7;
  reliability *= biasMultiplier;
  
  // Factor in recency of last check
  const lastChecked = new Date(source.lastChecked);
  const now = new Date();
  const hoursSinceCheck = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
  
  // Reduce reliability based on time since last check
  // For real-time sources, reduce faster; for daily sources, reduce slower
  let recencyFactor = 1.0;
  if (source.updateFrequency === "real-time") {
    // Real-time sources lose 5% reliability per hour since last check
    recencyFactor = Math.max(0.5, 1 - (hoursSinceCheck * 0.05));
  } else if (source.updateFrequency === "daily") {
    // Daily sources lose 10% reliability per day since last check
    recencyFactor = Math.max(0.6, 1 - (hoursSinceCheck / 24 * 0.1));
  } else {
    // Other frequencies: lose 5% per day
    recencyFactor = Math.max(0.7, 1 - (hoursSinceCheck / 24 * 0.05));
  }
  
  reliability *= recencyFactor;
  
  // Ensure reliability is within 0-100
  return Math.max(0, Math.min(100, reliability));
}

// 5. updateAccuracy(sourceId: string, correct: boolean): void
export function updateAccuracy(sourceId: string, correct: boolean): void {
  const source = sources.get(sourceId);
  if (!source) return;
  
  // Simple moving average: update accuracy based on new data point
  // We'll treat correct as 100 and incorrect as 0
  const newValue = correct ? 100 : 0;
  const weight = 0.1; // How much new data affects the average
  
  source.accuracy = source.accuracy * (1 - weight) + newValue * weight;
  
  // Update last checked time
  source.lastChecked = new Date().toISOString();
}

// 6. getReliabilityReport(): report
export function getReliabilityReport(): {
  totalSources: number;
  byType: Record<string, number>;
  averageReliability: number;
  averageAccuracy: number;
  mostReliable: SourceProfile[];
  leastReliable: SourceProfile[];
  lastUpdated: string;
} {
  const allSources = Array.from(sources.values());
  
  const byType: Record<string, number> = {};
  let totalReliability = 0;
  let totalAccuracy = 0;
  
  for (const source of allSources) {
    byType[source.type] = (byType[source.type] || 0) + 1;
    totalReliability += source.reliability;
    totalAccuracy += source.accuracy;
  }
  
  const sortedByReliability = [...allSources].sort((a, b) => b.reliability - a.reliability);
  
  return {
    totalSources: allSources.length,
    byType,
    averageReliability: allSources.length === 0 ? 0 : totalReliability / allSources.length,
    averageAccuracy: allSources.length === 0 ? 0 : totalAccuracy / allSources.length,
    mostReliable: sortedByReliability.slice(0, 5),
    leastReliable: sortedByReliability.slice(-5).reverse(),
    lastUpdated: new Date().toISOString()
  };
}

// Additional helper function to get source by name (fuzzy search)
export function getSourceByName(name: string): SourceProfile | undefined {
  const lowerName = name.toLowerCase();
  return Array.from(sources.values()).find(source => 
    source.name.toLowerCase().includes(lowerName) || 
    source.id.toLowerCase().includes(lowerName)
  );
}

// Helper function to get sources by type
export function getSourcesByType(type: SourceProfile["type"]): SourceProfile[] {
  return Array.from(sources.values()).filter(source => source.type === type);
}

// Helper function to get sources by country
export function getSourcesByCountry(country: string): SourceProfile[] {
  return Array.from(sources.values()).filter(source => 
    source.country.toLowerCase() === country.toLowerCase()
  );
}