// Runway — Phase 4: embed a user's merchants and assign categories.
//
// Category embeddings are seeded separately by seed-categories (a one-time
// system backfill) — splitting it out keeps this function's per-invocation
// CPU cost small (bounded by one user's merchant count) instead of also
// paying for all 19 categories' embeddings on top, which is what triggered
// "CPU Time exceeded" here.
//
// Security model: two Supabase clients, deliberately scoped differently.
//   - `userClient` carries the caller's own JWT. Every read/write through it
//     is subject to that user's RLS — a bug here fails closed, it can never
//     touch another user's rows.
//   - Nothing here uses service_role: this function never needs to write
//     anything outside the calling user's own rows.
//
// Self-contained on purpose (no cross-function import) — this project is
// deployed via the Supabase dashboard's browser editor, one function at a
// time, which doesn't reliably resolve relative imports into a sibling
// function's directory. Kept in sync by hand with seed-categories/index.ts.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// @ts-expect-error -- Supabase.ai is injected by the Edge Function runtime, not a module.
const model = new Supabase.ai.Session("gte-small");

async function embed(text: string): Promise<number[]> {
  const output = await model.run(text, { mean_pool: true, normalize: true });
  return Array.from(output as Iterable<number>);
}

// A match with cosine distance above this is too weak to trust — better to
// leave a transaction unassigned than confidently mislabel an ambiguous
// merchant (e.g. a generic "AMZN MKTP US" purchase). Starting point, not a
// scientifically tuned value; revisit once there's a larger labeled eval set.
const MAX_CONFIDENT_DISTANCE = 0.9;

// The browser sends a CORS preflight (OPTIONS) before the real POST when
// calling a cross-origin Edge Function. Without these headers the browser
// blocks the request before it ever reaches our logic — surfacing to
// supabase-js as an opaque "Failed to send a request to the Edge Function",
// not as any error this function's code could catch or report.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();
    if (userErr || !user) return json({ error: "Not authenticated" }, 401);

    // 1. Embed this user's not-yet-embedded merchants (the per-merchant cache —
    //    each merchant is embedded once here, reused by every transaction).
    const { data: bareMerchants, error: merchErr } = await userClient
      .from("merchants")
      .select("id, normalized_name")
      .is("embedding", null);
    if (merchErr) return json({ error: `merchants: ${merchErr.message}` }, 500);

    for (const m of bareMerchants ?? []) {
      const embedding = await embed(m.normalized_name);
      await userClient.from("merchants").update({ embedding }).eq("id", m.id);
    }

    // 2. Resolve a category per merchant: an explicit user rule always wins;
    //    otherwise use the nearest category by embedding distance. Rules are
    //    applied to ALL of that merchant's transactions (a rule should stick
    //    even over a prior embedding guess). Embedding matches are applied
    //    only where category_id is still null, so they never clobber a rule.
    const { data: rules, error: rulesErr } = await userClient
      .from("merchant_category_rules")
      .select("merchant_id, category_id");
    if (rulesErr) return json({ error: `rules: ${rulesErr.message}` }, 500);
    const ruleByMerchant = new Map((rules ?? []).map((r) => [r.merchant_id, r.category_id]));

    const { data: allMerchants, error: allMerchErr } = await userClient
      .from("merchants")
      .select("id, embedding");
    if (allMerchErr) return json({ error: `merchants: ${allMerchErr.message}` }, 500);

    let categorizedCount = 0;
    for (const m of allMerchants ?? []) {
      const ruleCategory = ruleByMerchant.get(m.id);
      if (ruleCategory) {
        const { count, error } = await userClient
          .from("transactions")
          .update({ category_id: ruleCategory }, { count: "exact" })
          .eq("merchant_id", m.id);
        if (error) return json({ error: `apply rule: ${error.message}` }, 500);
        categorizedCount += count ?? 0;
        continue;
      }
      if (!m.embedding) continue;

      const { data: matches, error: matchErr } = await userClient.rpc(
        "nearest_category_match",
        { query_embedding: m.embedding },
      );
      if (matchErr) return json({ error: `nearest_category_match: ${matchErr.message}` }, 500);
      const match = matches?.[0];
      if (!match || match.distance > MAX_CONFIDENT_DISTANCE) continue;

      const { count, error } = await userClient
        .from("transactions")
        .update({ category_id: match.category_id }, { count: "exact" })
        .eq("merchant_id", m.id)
        .is("category_id", null);
      if (error) return json({ error: `apply match: ${error.message}` }, 500);
      categorizedCount += count ?? 0;
    }

    return json({
      embeddedMerchants: bareMerchants?.length ?? 0,
      categorizedTransactions: categorizedCount,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
