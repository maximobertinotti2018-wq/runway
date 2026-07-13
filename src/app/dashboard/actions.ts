"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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
