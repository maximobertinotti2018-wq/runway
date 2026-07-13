"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { requestPasswordReset, type RequestResetResult } from "./actions";

export function ForgotPasswordForm() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RequestResetResult | null>(null);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      setResult(await requestPasswordReset(formData));
    });
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <Link
          href="/login"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {t("common.backToHome")}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("forgotPassword.title")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">{t("forgotPassword.description")}</p>
      </div>

      {result?.sent ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {t("forgotPassword.sentMessage")}
        </p>
      ) : (
        <form action={onSubmit} className="space-y-4">
          {result && !result.sent && (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {result.error === "missing-email" ? t("forgotPassword.missingEmailError") : result.error}
            </p>
          )}
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
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("forgotPassword.submitting") : t("forgotPassword.submit")}
          </button>
        </form>
      )}
    </main>
  );
}
