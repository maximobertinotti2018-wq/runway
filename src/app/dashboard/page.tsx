import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard · Runway" };

// The raw-transaction query below feeds subscription detection, which needs
// individual rows (not the pre-aggregated monthly_spend_by_category view) to
// find cadence patterns — but fetching a user's *entire* lifetime history on
// every dashboard load doesn't scale. 24 months comfortably covers yearly
// cadence detection (needs 2 occurrences to confirm a pattern) while keeping
// the query bounded; the row limit is a backstop against pathological
// density within that window.
const SUBSCRIPTION_WINDOW_MONTHS = 24;
const TRANSACTION_ROW_LIMIT = 2000;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already guards this route.
  if (!user) redirect("/login");

  const windowStart = new Date();
  windowStart.setMonth(windowStart.getMonth() - SUBSCRIPTION_WINDOW_MONTHS);
  const windowStartIso = windowStart.toISOString().slice(0, 10);

  const [{ data: profile }, { data: spendRows }, { data: txRows }, { data: categories }, { count: transactionCount }] =
    await Promise.all([
      supabase.from("profiles").select("cash_available, currency").eq("id", user.id).single(),
      supabase
        .from("monthly_spend_by_category")
        .select("month, category_name, total")
        .order("month", { ascending: true }),
      supabase
        .from("transactions")
        .select("merchant_id, occurred_on, amount, category_id, merchants(normalized_name)")
        .not("merchant_id", "is", null)
        .gte("occurred_on", windowStartIso)
        .order("occurred_on", { ascending: true })
        .limit(TRANSACTION_ROW_LIMIT),
      supabase.from("categories").select("id, name").order("name"),
      // Unfiltered count (unlike txRows above) so a CSV with only
      // empty-normalization rows still counts as "the user has imported
      // something" for the empty-state banner.
      supabase.from("transactions").select("id", { count: "exact", head: true }),
    ]);

  const categoryByMerchant: Record<string, string | null> = {};
  for (const r of txRows ?? []) {
    if (r.merchant_id) categoryByMerchant[r.merchant_id] = r.category_id; // last write wins (rows ordered by date asc)
  }

  return (
    <DashboardClient
      email={user.email ?? ""}
      hasTransactions={(transactionCount ?? 0) > 0}
      cashAvailable={profile ? Number(profile.cash_available) : 0}
      currency={profile?.currency ?? "USD"}
      spendRows={(spendRows ?? []).map((r) => ({
        month: r.month,
        categoryName: r.category_name,
        total: Number(r.total),
      }))}
      transactions={(txRows ?? [])
        .filter((r) => r.merchant_id)
        .map((r) => {
          const merchant = Array.isArray(r.merchants) ? r.merchants[0] : r.merchants;
          return {
            merchantId: r.merchant_id as string,
            merchantName: merchant?.normalized_name ?? "",
            occurredOn: r.occurred_on,
            amount: Number(r.amount),
          };
        })}
      categories={categories ?? []}
      categoryByMerchant={categoryByMerchant}
    />
  );
}
