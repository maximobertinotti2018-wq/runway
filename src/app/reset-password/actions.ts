"use server";

import { createClient } from "@/lib/supabase/server";

export type UpdatePasswordResult = { success: true } | { success: false; error: string };

export async function updatePassword(formData: FormData): Promise<UpdatePasswordResult> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) return { success: false, error: "password-too-short" };
  if (password !== confirmPassword) return { success: false, error: "password-mismatch" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "sign-in-required" };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { success: false, error: error.message };
  return { success: true };
}
