"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { addTransaction, type AddTransactionResult } from "./actions";

interface Category {
  id: string;
  name: string;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function AddTransactionForm({ categories }: { categories: Category[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AddTransactionResult | null>(null);

  const errorMessage = (error: string) => {
    if (error === "missing-date") return t("dashboard.addTxMissingDate");
    if (error === "missing-description") return t("dashboard.addTxMissingDescription");
    if (error === "invalid-amount") return t("dashboard.addTxInvalidAmount");
    if (error === "duplicate-transaction") return t("dashboard.addTxDuplicate");
    if (error === "sign-in-required") return t("import.signInToSaveError");
    return error;
  };

  const onSubmit = (formData: FormData) => {
    setResult(null);
    startTransition(async () => {
      const res = await addTransaction(formData);
      setResult(res);
      if (res.success) {
        router.refresh();
        setOpen(false);
      }
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 w-fit items-center rounded-full border border-zinc-300 px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
      >
        {t("dashboard.addTxButton")}
      </button>
    );
  }

  return (
    <section className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("dashboard.addTxTitle")}
        </h2>
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          {t("import.cancel")}
        </button>
      </div>

      {result && !result.success && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {errorMessage(result.error)}
        </p>
      )}

      <form action={onSubmit} className="grid gap-3 sm:grid-cols-4">
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            {t("import.colDate")}
          </span>
          <input
            type="date"
            name="occurredOn"
            required
            defaultValue={todayIso()}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            {t("import.colDescription")}
          </span>
          <input
            type="text"
            name="description"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            {t("import.colAmount")}
          </span>
          <input
            type="number"
            name="amount"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
        <label className="block text-sm sm:col-span-1">
          <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
            {t("dashboard.addTxCategory")}
          </span>
          <select
            name="categoryId"
            defaultValue=""
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            <option value="">{t("dashboard.uncategorized")}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="h-fit rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-4 sm:w-fit"
        >
          {isPending ? t("dashboard.addTxSaving") : t("dashboard.addTxSave")}
        </button>
      </form>
    </section>
  );
}
