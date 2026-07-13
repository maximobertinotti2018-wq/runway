"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/merchants/normalize";

export type UpdateCashResult = { success: true } | { success: false; error: string };

export async function updateCashAvailable(cashAvailable: number): Promise<UpdateCashResult> {
  if (!Number.isFinite(cashAvailable) || cashAvailable < 0) {
    return { success: false, error: "invalid-amount" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };

  // RLS scopes this to the caller's own row regardless; user.id kept
  // explicit in the filter for clarity, not as the security boundary.
  const { error } = await supabase
    .from("profiles")
    .update({ cash_available: cashAvailable })
    .eq("id", user.id);
  if (error) return { success: false, error: error.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export type SetMerchantCategoryResult = { success: true } | { success: false; error: string };

/**
 * User-driven category override. Writes a merchant_category_rule (which the
 * categorize Edge Function's rule check will always prefer going forward)
 * and immediately applies it to every existing transaction for that
 * merchant — a deterministic rewrite, no embedding call needed, so it's
 * instant rather than waiting on the next categorize run.
 */
export async function setMerchantCategory(
  merchantId: string,
  categoryId: string,
): Promise<SetMerchantCategoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };

  const { error: ruleError } = await supabase
    .from("merchant_category_rules")
    .upsert(
      { user_id: user.id, merchant_id: merchantId, category_id: categoryId },
      { onConflict: "user_id,merchant_id" },
    );
  if (ruleError) return { success: false, error: ruleError.message };

  const { error: txError } = await supabase
    .from("transactions")
    .update({ category_id: categoryId })
    .eq("merchant_id", merchantId);
  if (txError) return { success: false, error: txError.message };

  revalidatePath("/dashboard");
  return { success: true };
}

export type AddTransactionResult = { success: true } | { success: false; error: string };

/**
 * A single hand-entered transaction — for spend that never comes through a
 * bank CSV (cash, a transfer, anything off-card). Amount is entered as a
 * positive magnitude in the UI (this app has no income-tracking concept yet)
 * and stored negative, matching how every CSV-imported expense is signed.
 */
export async function addTransaction(formData: FormData): Promise<AddTransactionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };

  const occurredOn = String(formData.get("occurredOn") ?? "");
  const description = String(formData.get("description") ?? "").trim();
  const amount = Number.parseFloat(String(formData.get("amount") ?? ""));
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;

  if (!occurredOn) return { success: false, error: "missing-date" };
  if (!description) return { success: false, error: "missing-description" };
  if (!Number.isFinite(amount) || amount <= 0) return { success: false, error: "invalid-amount" };

  const normalized = normalizeMerchant(description);
  let merchantId: string | null = null;
  if (normalized) {
    const { data: merchantRow, error: merchantError } = await supabase
      .from("merchants")
      .upsert(
        { user_id: user.id, raw_name: description, normalized_name: normalized },
        { onConflict: "user_id,normalized_name" },
      )
      .select("id")
      .single();
    if (merchantError) return { success: false, error: merchantError.message };
    merchantId = merchantRow.id;
  }

  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    merchant_id: merchantId,
    category_id: categoryId,
    occurred_on: occurredOn,
    raw_description: description,
    amount: -Math.abs(amount),
  });
  if (txError) {
    // unique_violation on (user_id, occurred_on, raw_description, amount) —
    // same natural key the CSV dedupe constraint uses.
    if (txError.code === "23505") return { success: false, error: "duplicate-transaction" };
    return { success: false, error: txError.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export type DeleteAccountResult = { success: false; error: string };

/**
 * Calls the SECURITY DEFINER public.delete_own_account() RPC (see the
 * 20260713000004 migration) — it deletes auth.users for (select auth.uid()),
 * cascading to every table this user owns. Only ever returns on failure;
 * success redirects away since the account (and its session) no longer exist.
 */
export async function deleteOwnAccount(): Promise<DeleteAccountResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { success: false, error: error.message };

  await supabase.auth.signOut();
  redirect("/");
}

export type ChangeEmailResult = { success: true } | { success: false; error: string };

/**
 * supabase.auth.updateUser({email}) doesn't change the email immediately —
 * it sends a confirmation link (to the new address, or both old and new,
 * depending on the project's "secure email change" setting) and the change
 * only applies once that's clicked. Reuses the existing /auth/confirm route
 * (already generic over EmailOtpType, no changes needed there) rather than
 * building a second confirmation code path.
 */
export async function changeEmail(newEmail: string): Promise<ChangeEmailResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };
  if (!newEmail || newEmail === user.email) return { success: false, error: "invalid-email" };

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
