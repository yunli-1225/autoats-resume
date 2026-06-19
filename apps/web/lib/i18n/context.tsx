import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import zh from "./zh.json";
import en from "./en.json";

type Locale = "zh" | "en";
type Translations = Record<string, string>;

const translations: Record<Locale, Translations> = { zh, en };

interface I18nContextValue {
  locale: Locale;
  setLocale: (loc: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: "zh",
  setLocale: () => {},
  t: (key: string) => key,
});

const STORAGE_KEY = "autoats-locale";

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  // Read persisted locale on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "zh" || stored === "en") {
        setLocaleState(stored);
      }
    } catch { /* ignore */ }
  }, []);

  // Update html lang attribute when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((loc: Locale) => {
    setLocaleState(loc);
    try {
      localStorage.setItem(STORAGE_KEY, loc);
    } catch { /* ignore */ }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const map = translations[locale];
      let val = map?.[key];
      if (val === undefined) {
        // Fallback to English, then to key itself
        val = translations.en?.[key] ?? key;
      }
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          val = val.replace(`{${k}}`, String(v));
        }
      }
      return val;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
