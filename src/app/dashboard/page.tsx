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

  const [{ data: profile }, { data: spendRows }] = await Promise.all([
    supabase.from("profiles").select("cash_available, currency").eq("id", user.id).single(),
    supabase
      .from("monthly_spend_by_category")
      .select("month, category_name, total")
      .order("month", { ascending: true }),
  ]);

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
    />
  );
}
