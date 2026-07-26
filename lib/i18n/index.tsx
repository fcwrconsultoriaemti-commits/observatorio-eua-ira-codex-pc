import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

export type Locale =
  | "pt-BR"
  | "en-US"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "ja-JP"
  | "zh-CN"
  | "ru-RU"
  | "ar-SA";

export interface LocaleInfo {
  code: Locale;
  name: string;
  nameEn: string;
  flag: string;
  dir: "ltr" | "rtl";
}

export interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatTime: (
    date: Date | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (n: number, options?: Intl.NumberFormatOptions) => string;
  formatCurrency: (n: number, currency?: string) => string;
  formatRelative: (date: Date | string) => string;
  dir: "ltr" | "rtl";
}

export const AVAILABLE_LOCALES: LocaleInfo[] = [
  { code: "pt-BR", name: "Português", nameEn: "Portuguese", flag: "🇧🇷", dir: "ltr" },
  { code: "en-US", name: "English", nameEn: "English", flag: "🇺🇸", dir: "ltr" },
  { code: "es-ES", name: "Español", nameEn: "Spanish", flag: "🇪🇸", dir: "ltr" },
  { code: "fr-FR", name: "Français", nameEn: "French", flag: "🇫🇷", dir: "ltr" },
  { code: "de-DE", name: "Deutsch", nameEn: "German", flag: "🇩🇪", dir: "ltr" },
  { code: "it-IT", name: "Italiano", nameEn: "Italian", flag: "🇮🇹", dir: "ltr" },
  { code: "ja-JP", name: "日本語", nameEn: "Japanese", flag: "🇯🇵", dir: "ltr" },
  { code: "zh-CN", name: "简体中文", nameEn: "Chinese (Simplified)", flag: "🇨🇳", dir: "ltr" },
  { code: "ru-RU", name: "Русский", nameEn: "Russian", flag: "🇷🇺", dir: "ltr" },
  { code: "ar-SA", name: "العربية", nameEn: "Arabic", flag: "🇸🇦", dir: "rtl" },
];

const DEFAULT_LOCALE: Locale = "pt-BR";
const FALLBACK_LOCALE: Locale = "pt-BR";
const STORAGE_KEY = "app-locale";

const translationCache = new Map<Locale, Record<string, unknown>>();

async function loadTranslations(locale: Locale): Promise<Record<string, unknown>> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }
  try {
    const mod = await import(`../../locales/${locale}/common.json`);
    const data = mod.default ?? mod;
    translationCache.set(locale, data);
    return data;
  } catch {
    if (locale !== FALLBACK_LOCALE) {
      return loadTranslations(FALLBACK_LOCALE);
    }
    return {};
  }
}

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

function resolveKey(
  translations: Record<string, unknown>,
  fallback: Record<string, unknown>,
  key: string,
  params?: Record<string, string | number>,
): string {
  let value = getNestedValue(translations, key);
  if (value === undefined) {
    value = getNestedValue(fallback, key);
  }
  if (value === undefined) {
    return key;
  }
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return value;
}

function formatRelative(date: Date | string, now: Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const absDiff = Math.abs(diffMs);

  if (absDiff < 60_000) return "agora";

  const minutes = Math.floor(absDiff / 60_000);
  if (minutes < 60) return `há ${minutes}min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days}d`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `há ${weeks}sem`;

  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months}m`;

  const years = Math.floor(days / 365);
  return `há ${years}a`;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [translations, setTranslations] = useState<Record<string, unknown>>({});
  const [fallbackTranslations, setFallbackTranslations] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
    const initial = stored && AVAILABLE_LOCALES.some((l) => l.code === stored)
      ? stored
      : DEFAULT_LOCALE;
    setLocaleState(initial);
  }, []);

  useEffect(() => {
    loadTranslations(locale).then(setTranslations);
    if (locale !== FALLBACK_LOCALE) {
      loadTranslations(FALLBACK_LOCALE).then(setFallbackTranslations);
    } else {
      setFallbackTranslations({});
    }
  }, [locale]);

  useEffect(() => {
    const info = AVAILABLE_LOCALES.find((l) => l.code === locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = info?.dir ?? "ltr";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      resolveKey(translations, fallbackTranslations, key, params),
    [translations, fallbackTranslations],
  );

  const formatDate = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      return new Intl.DateTimeFormat(locale, options).format(d);
    },
    [locale],
  );

  const formatTime = useCallback(
    (date: Date | string, options?: Intl.DateTimeFormatOptions) => {
      const d = typeof date === "string" ? new Date(date) : date;
      const merged: Intl.DateTimeFormatOptions = { timeStyle: "short", ...options };
      return new Intl.DateTimeFormat(locale, merged).format(d);
    },
    [locale],
  );

  const formatNumber = useCallback(
    (n: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(locale, options).format(n),
    [locale],
  );

  const formatCurrency = useCallback(
    (n: number, currency?: string) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency ?? "BRL",
      }).format(n),
    [locale],
  );

  const formatRelativeCb = useCallback(
    (date: Date | string) => formatRelative(date, new Date()),
    [],
  );

  const dir = useMemo(() => {
    const info = AVAILABLE_LOCALES.find((l) => l.code === locale);
    return info?.dir ?? "ltr";
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
      formatTime,
      formatNumber,
      formatCurrency,
      formatRelative: formatRelativeCb,
      dir,
    }),
    [locale, setLocale, t, formatDate, formatTime, formatNumber, formatCurrency, formatRelativeCb, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export function getAvailableLocales(): LocaleInfo[] {
  return AVAILABLE_LOCALES;
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
  return stored && AVAILABLE_LOCALES.some((l) => l.code === stored) ? stored : DEFAULT_LOCALE;
}
