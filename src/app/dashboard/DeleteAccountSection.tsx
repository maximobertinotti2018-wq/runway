"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { deleteOwnAccount } from "./actions";

export function DeleteAccountSection() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Armed-then-confirm inline, not window.confirm() — a native confirm()
  // dialog blocks the main thread for as long as it's open, which shows up
  // as a multi-second "blocked UI updates" INP regression in real-user
  // performance monitoring even though nothing is actually slow.
  const [armed, setArmed] = useState(false);

  const onConfirmDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteOwnAccount();
      // Only reachable on failure — success redirects away.
      setArmed(false);
      setError(result.error === "sign-in-required" ? t("import.signInToSaveError") : result.error);
    });
  };

  return (
    <section className="space-y-2 rounded-xl border border-red-300 p-4 dark:border-red-800/50">
      <h2 className="text-sm font-semibold text-red-800 dark:text-red-300">
        {t("dashboard.deleteAccountTitle")}
      </h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{t("dashboard.deleteAccountDesc")}</p>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      {armed ? (
        <div className="space-y-2">
          <p role="alert" className="text-sm font-medium text-red-700 dark:text-red-400">
            {t("dashboard.deleteAccountConfirm")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onConfirmDelete}
              disabled={isPending}
              className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? t("dashboard.deleteAccountDeleting") : t("dashboard.deleteAccountConfirmButton")}
            </button>
            <button
              onClick={() => setArmed(false)}
              className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {t("import.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setArmed(true)}
          className="rounded-lg border border-red-400 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          {t("dashboard.deleteAccountButton")}
        </button>
      )}
    </section>
  );
}
