import { describe, expect, it } from "vitest";
import { normalizeMerchant } from "@/lib/merchants/normalize";
import { matchAlias } from "./aliases";
import { EVAL_DATASET } from "./eval-dataset";

/**
 * Eval harness for the alias-matching layer of categorization — the
 * deterministic first pass before the embedding fallback (see
 * supabase/functions/categorize/index.ts). Runs the full raw-descriptor →
 * normalizeMerchant → matchAlias pipeline exactly as production does, offline
 * and in CI, on a dataset well beyond the original 8-merchant manual check
 * from Phase 4 (see README's "why categorization is a hybrid" section).
 *
 * What this does NOT cover: the embedding fallback (gte-small +
 * nearest_category_match). That needs a live Supabase project — this
 * sandbox's network is blocked to it, and Deno's `Supabase.ai.Session` only
 * exists inside a deployed Edge Function. supabase/tests/nearest_category_match_test.sql
 * covers the SQL-side distance-ranking logic in isolation. To check the full
 * hybrid pipeline end-to-end (aliases + embeddings together), sign in on the
 * deployed app, import transactions with merchants NOT in MERCHANT_ALIASES,
 * run Categorize, and inspect the assigned categories by hand.
 */
describe("categorization alias eval", () => {
  it.each(EVAL_DATASET)("$raw -> $expectedSlug", ({ raw, expectedSlug, note }) => {
    const normalized = normalizeMerchant(raw);
    const actual = matchAlias(normalized);
    expect(actual, note).toBe(expectedSlug);
  });

  it("reports overall accuracy", () => {
    const results = EVAL_DATASET.map((c) => {
      const actual = matchAlias(normalizeMerchant(c.raw));
      return { ...c, actual, correct: actual === c.expectedSlug };
    });
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;

    console.log(
      `\nAlias-matching eval: ${correct}/${total} (${((correct / total) * 100).toFixed(1)}%)\n` +
        results
          .filter((r) => !r.correct)
          .map((r) => `  MISS: "${r.raw}" -> got ${r.actual}, expected ${r.expectedSlug}`)
          .join("\n"),
    );

    expect(correct, "every case above should be exact — a miss here is a real regression, not noise").toBe(total);
  });
});
