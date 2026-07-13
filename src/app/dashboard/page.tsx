import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "./DashboardClient";

export const metadata = { title: "Dashboard · Runway" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders: middleware already guards this route.
  if (!user) redirect("/login");

  const [{ data: profile }, { data: spendRows }, { data: txRows }, { data: categories }] =
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
        .order("occurred_on", { ascending: true }),
      supabase.from("categories").select("id, name").order("name"),
    ]);

  const categoryByMerchant: Record<string, string | null> = {};
  for (const r of txRows ?? []) {
    if (r.merchant_id) categoryByMerchant[r.merchant_id] = r.category_id; // last write wins (rows ordered by date asc)
  }

  return (
    <DashboardClient
      email={user.email ?? ""}
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
