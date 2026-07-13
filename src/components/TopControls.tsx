"use client";

import { useTheme } from "@/lib/theme/ThemeProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path
        strokeLinecap="round"
        d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

const segmentBase = "px-2.5 py-1.5 text-xs font-medium transition-colors";
const segmentActive = "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900";
const segmentInactive =
  "bg-white text-zinc-600 hover:bg-zinc-100 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900";

/** Global theme + language switcher, fixed top-right on every page. */
export function TopControls() {
  const { theme, toggleTheme } = useTheme();
  const { locale, setLocale, t } = useLanguage();

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      <div
        role="group"
        aria-label="Language"
        className="flex overflow-hidden rounded-full border border-zinc-300 dark:border-zinc-700"
      >
        <button
          onClick={() => setLocale("es")}
          aria-pressed={locale === "es"}
          className={`${segmentBase} ${locale === "es" ? segmentActive : segmentInactive}`}
        >
          ES
        </button>
        <button
          onClick={() => setLocale("en")}
          aria-pressed={locale === "en"}
          className={`${segmentBase} ${locale === "en" ? segmentActive : segmentInactive}`}
        >
          EN
        </button>
      </div>
      <button
        onClick={toggleTheme}
        aria-label={t(theme === "dark" ? "common.switchToLight" : "common.switchToDark")}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    </div>
  );
}
