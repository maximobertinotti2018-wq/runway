"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { signout } from "../login/actions";
import { updateCashAvailable } from "./actions";
import { CategorizeButton } from "./CategorizeButton";
import { SubscriptionsSection } from "./SubscriptionsSection";
import { AddTransactionForm } from "./AddTransactionForm";
import { DeleteAccountSection } from "./DeleteAccountSection";
import { aggregateSpend, type MonthlyRow } from "@/lib/dashboard/aggregate";
import { foldTopCategories } from "@/lib/dashboard/spend";
import { computeRunway, type RunwayStatus } from "@/lib/dashboard/runway";
import { detectSubscriptions, type TransactionForDetection } from "@/lib/subscriptions/detect";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

// Validated in the dataviz skill: passes contrast on both light (#fcfcfb)
// and dark (#1a1a19) chart surfaces. Spend-by-category is a magnitude
// comparison (one series, bar length carries the value) — a single hue is
// correct here, not a categorical rainbow, which would spend the identity
// channel re-encoding what the bar length already shows.
const BAR_HUE = "#008300";

const STATUS_HEX: Record<RunwayStatus, string> = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};

interface Category {
  id: string;
  name: string;
}

interface Props {
  email: string;
  hasTransactions: boolean;
  cashAvailable: number;
  currency: string;
  spendRows: MonthlyRow[];
  transactions: TransactionForDetection[];
  categories: Category[];
  categoryByMerchant: Record<string, string | null>;
}

export function DashboardClient({
  email,
  hasTransactions,
  cashAvailable,
  spendRows,
  transactions,
  categories,
  categoryByMerchant,
}: Props) {
  const { t } = useLanguage();

  const summary = useMemo(
    () => aggregateSpend(spendRows, t("dashboard.uncategorized")),
    [spendRows, t],
  );
  const chartRows = useMemo(
    () => foldTopCategories(summary.byCategory, 7, t("dashboard.other")),
    [summary.byCategory, t],
  );
  const maxTotal = chartRows[0]?.total ?? 0;
  const subscriptions = useMemo(() => detectSubscriptions(transactions), [transactions]);

  const [cash, setCash] = useState(cashAvailable);
  const runway = useMemo(() => computeRunway(cash, summary.burnRate), [cash, summary.burnRate]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("dashboard.title")}
        </h1>
        <form action={signout}>
          <button className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900">
            {t("common.signOut")}
          </button>
        </form>
      </header>

      <p className="text-zinc-600 dark:text-zinc-400">{t("dashboard.signedInAs", { email })}</p>

      {!hasTransactions && (
        <section className="flex flex-col items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-5 dark:border-emerald-800/50 dark:bg-emerald-950/40">
          <div>
            <h2 className="text-base font-semibold text-emerald-900 dark:text-emerald-100">
              {t("dashboard.emptyStateTitle")}
            </h2>
            <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
              {t("dashboard.emptyStateDesc")}
            </p>
          </div>
          <Link
            href="/import"
            className="inline-flex h-10 items-center rounded-full bg-emerald-700 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
          >
            {t("dashboard.importTransactions")}
          </Link>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <StatTile
          label={t("dashboard.burnRate")}
          value={`${money.format(summary.burnRate)}${t("dashboard.perMonth")}`}
        />
        <StatTile
          label={t("dashboard.runway")}
          value={
            runway.months === null
              ? t("dashboard.runwayIndefinite")
              : t("dashboard.runwayMonths", { months: Math.round(runway.months * 10) / 10 })
          }
        >
          <StatusBadge status={runway.status} t={t} />
        </StatTile>
        <StatTile
          label={t("dashboard.topCategory")}
          value={summary.topCategory ? summary.topCategory.name : "—"}
        />
      </section>

      <CashInput initialValue={cashAvailable} onSaved={setCash} />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("dashboard.spendByCategoryTitle")}
        </h2>
        {chartRows.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("dashboard.spendByCategoryEmpty")}
          </p>
        ) : (
          <div className="space-y-2.5">
            {chartRows.map((row) => {
              const pct = maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
              return (
                <div key={row.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-700 dark:text-zinc-300">{row.name}</span>
                    <span className="tabular-nums text-zinc-500 dark:text-zinc-400">
                      {money.format(row.total)}
                    </span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-zinc-100 dark:bg-zinc-900">
                    <div
                      className="h-3 rounded-r-full"
                      style={{ width: `${pct}%`, backgroundColor: BAR_HUE }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <SubscriptionsSection
        subscriptions={subscriptions}
        categories={categories}
        categoryByMerchant={categoryByMerchant}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/import"
          className="inline-flex h-11 w-fit items-center rounded-full bg-emerald-700 px-5 text-sm font-medium text-white transition-colors hover:bg-emerald-800"
        >
          {t("dashboard.importTransactions")}
        </Link>
      </div>

      <AddTransactionForm categories={categories} />

      <section className="space-y-2 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("dashboard.aiCategorizationTitle")}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {t("dashboard.aiCategorizationDesc")}
        </p>
        <CategorizeButton />
      </section>

      <DeleteAccountSection />
    </main>
  );
}

function StatTile({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">{value}</p>
      {children}
    </div>
  );
}

// Status is never color-alone: a colored dot carries the signal, the label
// text stays in normal ink — matching the dataviz skill's status-color rule.
function StatusBadge({ status, t }: { status: RunwayStatus; t: (k: string) => string }) {
  const labelKey = status === "good" ? "dashboard.statusGood" : status === "warning" ? "dashboard.statusWarning" : "dashboard.statusCritical";
  return (
    <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
      <span
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: STATUS_HEX[status] }}
        aria-hidden
      />
      {t(labelKey)}
    </p>
  );
}

function CashInput({
  initialValue,
  onSaved,
}: {
  initialValue: number;
  onSaved: (value: number) => void;
}) {
  const { t } = useLanguage();
  const [value, setValue] = useState(String(initialValue));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async () => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const result = await updateCashAvailable(parsed);
    if (result.success) {
      onSaved(parsed);
      setStatus("saved");
    } else {
      setStatus("error");
    }
  };

  return (
    <section className="space-y-1">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-zinc-700 dark:text-zinc-300">
          {t("dashboard.cashAvailableLabel")}
        </span>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setStatus("idle");
            }}
            className="w-40 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
          <button
            onClick={save}
            disabled={status === "saving"}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            {status === "saving" ? t("dashboard.cashSaving") : t("dashboard.cashSave")}
          </button>
        </div>
      </label>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {status === "saved" ? t("dashboard.cashSaved") : t("dashboard.cashAvailableHint")}
      </p>
    </section>
  );
}
