import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";

/**
 * Full-history CSV export — deliberately not windowed like the dashboard's
 * own transaction query (see page.tsx's SUBSCRIPTION_WINDOW_MONTHS comment).
 * Data portability means all of it, not just the recent slice the UI needs.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data: rows, error } = await supabase
    .from("transactions")
    .select("occurred_on, raw_description, amount, currency, merchants(normalized_name), categories(name)")
    .order("occurred_on", { ascending: true });
  if (error) return new Response(error.message, { status: 500 });

  const csv = Papa.unparse({
    fields: ["date", "merchant", "description", "category", "amount", "currency"],
    data: (rows ?? []).map((r) => {
      const merchant = Array.isArray(r.merchants) ? r.merchants[0] : r.merchants;
      const category = Array.isArray(r.categories) ? r.categories[0] : r.categories;
      return [r.occurred_on, merchant?.normalized_name ?? "", r.raw_description, category?.name ?? "", r.amount, r.currency];
    }),
  });

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="runway-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
