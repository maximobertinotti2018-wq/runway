"use server";

import { createClient } from "@/lib/supabase/server";
import { prepareMerchants, prepareTransactions } from "@/lib/import/prepare";
import type { RawTransaction } from "@/lib/csv/parse";

export type SaveImportResult =
  | { success: true; insertedCount: number; merchantCount: number; duplicateCount: number }
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
  // Stable key (not an English sentence) — the UI translates it; other
  // error strings below are raw Postgres/Supabase messages, left untranslated
  // since they're technical diagnostics, not user-facing copy.
  if (!user) return { success: false, error: "sign-in-required" };

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

  // ignoreDuplicates -> ON CONFLICT DO NOTHING against the unique(user_id,
  // occurred_on, raw_description, amount) constraint: re-importing an
  // overlapping date range silently skips rows already saved, instead of
  // duplicating every transaction on every re-import.
  const { data: insertedRows, error: txError } = await supabase
    .from("transactions")
    .upsert(txPayload, {
      onConflict: "user_id,occurred_on,raw_description,amount",
      ignoreDuplicates: true,
    })
    .select("id");
  if (txError) {
    await supabase.from("imports").update({ status: "error" }).eq("id", importRow.id);
    return { success: false, error: txError.message };
  }

  const insertedCount = insertedRows?.length ?? 0;
  await supabase.from("imports").update({ status: "done" }).eq("id", importRow.id);
  return {
    success: true,
    insertedCount,
    merchantCount: merchantRows?.length ?? 0,
    duplicateCount: txPayload.length - insertedCount,
  };
}

export type DeleteImportResult = { success: true } | { success: false; error: string };

/**
 * Deletes an import and its transactions. transactions.import_id is
 * ON DELETE SET NULL (a safety default for other paths), so deleting the
 * import row alone would silently orphan its transactions instead of
 * removing them — explicit delete first, same RLS-scoped client as everywhere
 * else, so this can never touch another user's rows.
 */
export async function deleteImport(importId: string): Promise<DeleteImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };

  const { error: txError } = await supabase.from("transactions").delete().eq("import_id", importId);
  if (txError) return { success: false, error: txError.message };

  const { error: importError } = await supabase.from("imports").delete().eq("id", importId);
  if (importError) return { success: false, error: importError.message };

  return { success: true };
}
