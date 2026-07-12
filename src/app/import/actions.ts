"use server";

import { createClient } from "@/lib/supabase/server";
import { prepareMerchants, prepareTransactions } from "@/lib/import/prepare";
import type { RawTransaction } from "@/lib/csv/parse";

export type SaveImportResult =
  | { success: true; insertedCount: number; merchantCount: number }
  | { success: false; error: string };

/**
 * Persist a parsed CSV to the database as the *signed-in* user. Runs through
 * the cookie-based server client (not service_role), so every insert is
 * subject to RLS exactly as it would be for any other client — a stray bug
 * here fails closed, it can't silently write into another user's rows.
 */
export async function saveImport(fileName: string, rows: RawTransaction[]): Promise<SaveImportResult> {
  if (rows.length === 0) return { success: false, error: "No rows to import" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sign in to save your import" };

  const { data: importRow, error: importError } = await supabase
    .from("imports")
    .insert({ user_id: user.id, filename: fileName, row_count: rows.length, status: "processing" })
    .select("id")
    .single();
  if (importError || !importRow) {
    return { success: false, error: importError?.message ?? "Failed to create import record" };
  }

  const merchantsPayload = prepareMerchants(rows, user.id);
  const { data: merchantRows, error: merchantError } =
    merchantsPayload.length > 0
      ? await supabase
          .from("merchants")
          .upsert(merchantsPayload, { onConflict: "user_id,normalized_name" })
          .select("id, normalized_name")
      : { data: [] as { id: string; normalized_name: string }[], error: null };
  if (merchantError) {
    await supabase.from("imports").update({ status: "error" }).eq("id", importRow.id);
    return { success: false, error: merchantError.message };
  }

  const merchantIdByNormalized = Object.fromEntries(
    (merchantRows ?? []).map((m) => [m.normalized_name, m.id]),
  );
  const txPayload = prepareTransactions(rows, user.id, importRow.id, merchantIdByNormalized);

  const { error: txError } = await supabase.from("transactions").insert(txPayload);
  if (txError) {
    await supabase.from("imports").update({ status: "error" }).eq("id", importRow.id);
    return { success: false, error: txError.message };
  }

  await supabase.from("imports").update({ status: "done" }).eq("id", importRow.id);
  return { success: true, insertedCount: txPayload.length, merchantCount: merchantRows?.length ?? 0 };
}
