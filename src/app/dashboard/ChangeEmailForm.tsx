"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { changeEmail } from "./actions";

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null);

  const errorMessage = (error: string) => {
    if (error === "invalid-email") return t("dashboard.changeEmailInvalid");
    if (error === "sign-in-required") return t("import.signInToSaveError");
    return error;
  };

  const onSubmit = (formData: FormData) => {
    setResult(null);
    const email = String(formData.get("email") ?? "").trim();
    startTransition(async () => {
      const res = await changeEmail(email);
      setResult(res.success ? { success: true } : { success: false, error: res.error });
    });
  };

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {t("dashboard.accountEmailTitle")}
      </h2>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{currentEmail}</p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
        >
          {t("dashboard.changeEmailButton")}
        </button>
      ) : result?.success ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-200">
          {t("dashboard.changeEmailSent")}
        </p>
      ) : (
        <form action={onSubmit} className="flex flex-wrap items-end gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
              {t("dashboard.changeEmailNew")}
            </span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              className="w-64 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? t("dashboard.changeEmailSaving") : t("dashboard.changeEmailSave")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setResult(null);
            }}
            className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {t("import.cancel")}
          </button>
          {result && !result.success && result.error && (
            <p role="alert" className="w-full text-sm text-red-700 dark:text-red-400">
              {errorMessage(result.error)}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
