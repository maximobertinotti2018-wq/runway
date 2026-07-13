"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { deleteImport } from "./actions";

export interface RecentImportRow {
  id: string;
  filename: string;
  rowCount: number;
  status: string;
  createdAt: string;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

export function RecentImports({ imports }: { imports: RecentImportRow[] }) {
  const { t } = useLanguage();
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onDelete = (id: string) => {
    if (!window.confirm(t("import.deleteConfirm"))) return;
    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteImport(id);
      setDeletingId(null);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <section className="space-y-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        {t("import.recentImportsTitle")}
      </h2>
      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}
      <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {imports.map((imp) => (
          <li key={imp.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <div>
              <p className="font-medium text-zinc-800 dark:text-zinc-200">{imp.filename}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("import.recentImportsMeta", {
                  count: imp.rowCount,
                  date: dateFmt.format(new Date(imp.createdAt)),
                })}
              </p>
            </div>
            <button
              onClick={() => onDelete(imp.id)}
              disabled={isPending && deletingId === imp.id}
              className="shrink-0 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {isPending && deletingId === imp.id ? t("import.deleting") : t("import.delete")}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
