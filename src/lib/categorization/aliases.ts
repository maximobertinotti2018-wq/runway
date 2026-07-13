/**
 * Mirror of the known-merchant alias table in
 * supabase/functions/categorize/index.ts — kept in sync by hand (same
 * constraint as that file's own note about seed-categories/index.ts: Deno
 * Edge Functions can't import from this Next.js app's src/ tree, so the
 * runtime source of truth has to stay self-contained there). This copy
 * exists purely so the alias-matching logic — the part of the categorization
 * pipeline that doesn't need a live embedding model — can be covered by a
 * fast, deterministic, offline eval. See eval.test.ts.
 */

export const MERCHANT_ALIASES: Array<{ test: RegExp; slug: string }> = [
  { test: /uber\s*eats/, slug: "food_dining" },
  { test: /doordash/, slug: "food_dining" },
  { test: /grubhub/, slug: "food_dining" },
  { test: /starbucks/, slug: "food_dining" },
  { test: /daily grind/, slug: "food_dining" },
  { test: /\bcoffee\b/, slug: "food_dining" },
  { test: /\bcafe\b/, slug: "food_dining" },
  { test: /roasters?/, slug: "food_dining" },

  { test: /wholefds|whole foods/, slug: "groceries" },
  { test: /trader joe/, slug: "groceries" },
  { test: /\bkroger\b/, slug: "groceries" },
  { test: /\bsafeway\b/, slug: "groceries" },
  { test: /\bcostco\b/, slug: "groceries" },

  { test: /digitalocean/, slug: "dev_tools_hosting" },
  { test: /amazon web services|\baws\b/, slug: "dev_tools_hosting" },
  { test: /\bvercel\b/, slug: "dev_tools_hosting" },
  { test: /\bnetlify\b/, slug: "dev_tools_hosting" },
  { test: /\bheroku\b/, slug: "dev_tools_hosting" },
  { test: /\bgithub\b/, slug: "dev_tools_hosting" },

  { test: /\bopenai\b|chatgpt/, slug: "ai_tools" },
  { test: /\banthropic\b|\bclaude\b/, slug: "ai_tools" },

  { test: /\bnetflix\b/, slug: "entertainment" },
  { test: /\bspotify\b/, slug: "entertainment" },
  { test: /\bhulu\b/, slug: "entertainment" },
  { test: /disney/, slug: "entertainment" },

  // Bare "uber" (rideshare) only reachable if "uber eats" didn't match above.
  { test: /\buber\b/, slug: "transport" },
  { test: /\blyft\b/, slug: "transport" },

  { test: /airbnb/, slug: "travel" },

  { test: /apple store|best buy/, slug: "hardware" },
];

export function matchAlias(normalizedName: string): string | null {
  for (const { test, slug } of MERCHANT_ALIASES) {
    if (test.test(normalizedName)) return slug;
  }
  return null;
}
