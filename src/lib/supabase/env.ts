// Public Supabase config, trimmed. Trimming defends against stray whitespace
// or newlines accidentally pasted into the env vars, which would otherwise
// corrupt the HTTP headers (apikey/Authorization) built from them and crash
// fetch with an opaque "Cannot convert argument to a ByteString" error.
export const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
