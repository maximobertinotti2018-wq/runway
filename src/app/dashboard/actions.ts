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
