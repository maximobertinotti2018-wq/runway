"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { updatePassword, type UpdatePasswordResult } from "./actions";

export function ResetPasswordForm() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<UpdatePasswordResult | null>(null);

  const onSubmit = (formData: FormData) => {
    startTransition(async () => {
      setResult(await updatePassword(formData));
    });
  };

  const errorMessage = (error: string) => {
    if (error === "password-too-short") return t("resetPassword.tooShortError");
    if (error === "password-mismatch") return t("resetPassword.mismatchError");
    if (error === "sign-in-required") return t("resetPassword.signInRequiredError");
    return error;
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("resetPassword.title")}
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">{t("resetPassword.description")}</p>
      </div>

      {result?.success ? (
        <div className="space-y-3">
          <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            {t("resetPassword.successMessage")}
          </p>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {t("import.goToDashboard")}
          </Link>
        </div>
      ) : (
        <form action={onSubmit} className="space-y-4">
          {result && !result.success && (
            <p
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-200"
            >
              {errorMessage(result.error)}
            </p>
          )}
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              {t("resetPassword.newPassword")}
            </span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              {t("resetPassword.confirmPassword")}
            </span>
            <input
              type="password"
              name="confirmPassword"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("resetPassword.submitting") : t("resetPassword.submit")}
          </button>
        </form>
      )}
    </main>
  );
}
