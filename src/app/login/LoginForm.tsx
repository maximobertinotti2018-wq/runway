"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { login, signup, signInWithGoogle } from "./actions";

export function LoginForm() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {t("common.backToHome")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("login.title")}
        </h1>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {message === "check-email" ? t("login.checkEmailMessage") : message}
        </p>
      )}

      <form className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            {t("login.email")}
          </span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {t("login.password")}
            </span>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
            >
              {t("login.forgotPassword")}
            </Link>
          </div>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <div className="flex gap-3">
          <button
            formAction={login}
            className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {t("login.logIn")}
          </button>
          <button
            formAction={signup}
            className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {t("login.signUp")}
          </button>
        </div>
      </form>

      <div className="flex items-center gap-3 text-xs text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        {t("login.or")}
        <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
      </div>

      <form action={signInWithGoogle}>
        <button className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
          {t("login.continueWithGoogle")}
        </button>
      </form>
    </main>
  );
}
