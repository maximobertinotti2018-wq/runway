"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function Home() {
  const { t } = useLanguage();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-6 font-sans dark:bg-black">
      <main className="flex w-full max-w-2xl flex-col items-start gap-8">
        <div className="space-y-4">
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {t("landing.badge")}
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("landing.title")}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            {t("landing.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/import"
            className="flex h-12 items-center justify-center rounded-full bg-emerald-700 px-6 text-base font-medium text-white transition-colors hover:bg-emerald-800"
          >
            {t("landing.ctaImport")}
          </Link>
          <Link
            href="/login"
            className="text-base font-medium text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-300"
          >
            {t("landing.ctaSignIn")}
          </Link>
        </div>
      </main>
    </div>
  );
}
