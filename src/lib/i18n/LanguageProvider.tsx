"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import type { Locale } from "./dictionary";
import { lookup, interpolate } from "./format";

const STORAGE_KEY = "runway-locale";

// See ThemeProvider for why this is a useSyncExternalStore-backed module
// store rather than useState + a mount effect: it's the React-native way to
// sync with a client-only value (localStorage) across the hydration
// boundary without tripping Next.js's stricter effect diagnostics.
type Listener = () => void;
let listeners: Listener[] = [];
let cachedLocale: Locale | null = null;

function getSnapshot(): Locale {
  if (cachedLocale === null) {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    cachedLocale = stored === "en" || stored === "es" ? stored : "es";
  }
  return cachedLocale;
}

function getServerSnapshot(): Locale {
  return "es";
}

function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function writeLocale(next: Locale) {
  cachedLocale = next;
  window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setLocale = useCallback((next: Locale) => writeLocale(next), []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>) => interpolate(lookup(locale, path), vars),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
