"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Root-level catch-all — routes with their own error.tsx (dashboard, import)
 * use that instead; this covers everything else (login, forgot/reset
 * password, auth callbacks). Still rendered inside the root layout, so
 * ThemeProvider/LanguageProvider are available here.
 */
export default function RootError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useLanguage();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-4 px-6 py-16">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{t("common.errorTitle")}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{t("common.errorDescription")}</p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          {t("common.errorRetry")}
        </button>
        <Link
          href="/"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          {t("common.errorBackHome")}
        </Link>
      </div>
    </main>
  );
}
