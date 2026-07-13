"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { setMerchantCategory } from "./actions";
import type { DetectedSubscription, Cadence } from "@/lib/subscriptions/detect";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const HIKE_COLOR = "#fab219"; // validated "warning" status hex — never color-alone, paired with a label

interface Category {
  id: string;
  name: string;
}

export function SubscriptionsSection({
  subscriptions,
  categories,
  categoryByMerchant,
}: {
  subscriptions: DetectedSubscription[];
  categories: Category[];
  categoryByMerchant: Record<string, string | null>;
}) {
  const { t } = useLanguage();
  const cadenceLabel: Record<Cadence, string> = {
    weekly: t("dashboard.cadenceWeekly"),
    monthly: t("dashboard.cadenceMonthly"),
    yearly: t("dashboard.cadenceYearly"),
  };

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("dashboard.subscriptionsTitle")}
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.subscriptionsDesc")}</p>
      </div>

      {subscriptions.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("dashboard.subscriptionsEmpty")}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {subscriptions.map((sub) => (
            <SubscriptionRow
              key={sub.merchantId}
              sub={sub}
              cadenceLabel={cadenceLabel[sub.cadence]}
              categories={categories}
              initialCategoryId={categoryByMerchant[sub.merchantId] ?? ""}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function SubscriptionRow({
  sub,
  cadenceLabel,
  categories,
  initialCategoryId,
}: {
  sub: DetectedSubscription;
  cadenceLabel: string;
  categories: Category[];
  initialCategoryId: string;
}) {
  const { t } = useLanguage();
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const onChange = async (next: string) => {
    setCategoryId(next);
    setStatus("saving");
    const result = await setMerchantCategory(sub.merchantId, next);
    setStatus(result.success ? "saved" : "error");
  };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <p className="font-medium text-zinc-900 dark:text-zinc-50">{sub.merchantName}</p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {cadenceLabel} · {t("dashboard.lastCharged", { date: sub.lastSeen })}
        </p>
        {sub.priceHike && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: HIKE_COLOR }} aria-hidden />
            {t("dashboard.priceHikeBadge")}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="tabular-nums text-sm font-medium text-zinc-900 dark:text-zinc-50">
          {money.format(sub.lastAmount)}
        </span>
        <select
          value={categoryId}
          onChange={(e) => onChange(e.target.value)}
          aria-label={t("dashboard.categorySelectLabel", { merchant: sub.merchantName })}
          className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        >
          <option value="" disabled>
            —
          </option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {status === "saving" && (
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{t("dashboard.categorySaving")}</span>
        )}
        {status === "saved" && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {t("dashboard.categorySaved")}
          </span>
        )}
        {status === "error" && (
          <span className="text-xs text-red-600 dark:text-red-400">{t("dashboard.categoryError")}</span>
        )}
      </div>
    </li>
  );
}
