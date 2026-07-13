import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Email links (signup confirmation, password recovery) land here. Handles
 * both token formats Supabase can issue: a PKCE `code` (this project's
 * actual default — confirmed via Auth logs showing `/auth/v1/verify?token=
 * pkce_...` for password recovery, the same mechanism /auth/callback already
 * used for Google sign-in) and the older `token_hash` + `type` OTP style.
 * Only handling token_hash/type here was the bug: a PKCE redirect never
 * carries those params, so verification silently fell through to the
 * generic "Could not confirm email" error on every email-link click.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=Could not confirm email`);
}
