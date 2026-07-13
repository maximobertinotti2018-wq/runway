"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type RequestResetResult = { sent: true } | { sent: false; error: string };

/**
 * Always reports success even if the email isn't registered — Supabase's
 * resetPasswordForEmail already behaves this way, but we mirror it here too
 * so a network/config error doesn't leak which emails exist via a differing
 * message.
 */
export async function requestPasswordReset(formData: FormData): Promise<RequestResetResult> {
  const email = String(formData.get("email") ?? "");
  if (!email) return { sent: false, error: "missing-email" };

  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  if (error) return { sent: false, error: error.message };
  return { sent: true };
}
