"use client";

import { useState, useTransition } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { deleteOwnAccount } from "./actions";

export function DeleteAccountSection() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (!window.confirm(t("dashboard.deleteAccountConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteOwnAccount();
      // Only reachable on failure — success redirects away.
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
      <button
        onClick={onDelete}
        disabled={isPending}
        className="rounded-lg border border-red-400 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950/40"
      >
        {isPending ? t("dashboard.deleteAccountDeleting") : t("dashboard.deleteAccountButton")}
      </button>
    </section>
  );
}
