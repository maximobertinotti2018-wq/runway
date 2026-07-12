// Runway — one-time system backfill: embed the fixed category taxonomy.
//
// Split out of `categorize` because embedding all 19 categories in one
// invocation (plus a user's merchants, plus matching) blew Supabase Edge
// Functions' per-invocation CPU-time budget on the free tier ("CPU Time
// exceeded" in the function logs) once the descriptions got longer and more
// keyword-dense. This function only ever touches `categories` — shared,
// user-less reference data — via the service_role key, and processes a
// small batch per call so it always finishes comfortably inside the budget.
// Meant to be invoked a few times from the Supabase dashboard's "Test"
// button (by the developer, not end users) until `remaining` reaches 0.
//
// No end-user auth is required: there is nothing user-owned to protect here,
// and re-running it is harmless (it only ever (re)writes the same fixed,
// hardcoded descriptions below.
//
// Self-contained on purpose (no cross-function import) — this project is
// deployed via the Supabase dashboard's browser editor, one function at a
// time, which doesn't reliably resolve relative imports into a sibling
// function's directory. Kept in sync by hand with categorize/index.ts.

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// @ts-expect-error -- Supabase.ai is injected by the Edge Function runtime, not a module.
const model = new Supabase.ai.Session("gte-small");

async function embed(text: string): Promise<number[]> {
  const output = await model.run(text, { mean_pool: true, normalize: true });
  return Array.from(output as Iterable<number>);
}

const CATEGORY_EMBED_TEXT: Record<string, string> = {
  food_dining:
    "Food and dining: restaurants, cafes, coffee shops, coffee roasters, bakeries, diners, bars, fast food, takeout, food delivery, Uber Eats, DoorDash, Starbucks",
  groceries:
    "Groceries and supermarkets: grocery store, supermarket, market, Whole Foods, Trader Joe's, Kroger, Safeway, Costco, fresh produce, household food shopping",
  saas_software:
    "SaaS and software subscriptions: software licenses, cloud apps, productivity tools, Notion, Slack, Zoom, Microsoft 365, Adobe, subscription software",
  dev_tools_hosting:
    "Developer tools and hosting: cloud servers, web hosting, DigitalOcean, AWS, Amazon Web Services, Google Cloud, Vercel, Netlify, Heroku, domain registration, GitHub, developer infrastructure",
  ai_tools:
    "AI tools: artificial intelligence subscriptions, OpenAI, ChatGPT, Anthropic, Claude, Midjourney, AI APIs, machine learning platforms",
  transport: "Transportation: rideshare, Uber, Lyft, taxi, public transit, subway, bus, parking, tolls, gas station, fuel",
  travel: "Travel: flights, airlines, hotels, Airbnb, car rental, vacation booking, train tickets",
  utilities: "Utilities: electricity, water, gas bill, internet service provider, phone bill, cable, home utilities",
  rent_office: "Rent and office: monthly rent, office lease, coworking space, WeWork, mortgage payment",
  marketing_ads:
    "Marketing and advertising: Google Ads, Facebook Ads, Meta Ads, social media advertising, marketing campaigns, sponsorships",
  payroll_contractors:
    "Payroll and contractors: employee salaries, freelancer payments, contractor invoices, payroll service",
  fees_banking: "Fees and banking: bank fees, wire transfer fees, ATM fees, overdraft charges, credit card fees",
  taxes: "Taxes: income tax payment, sales tax, tax filing service, IRS payment",
  health: "Health: pharmacy, doctor visit, health insurance, gym membership, medical bills, dental",
  entertainment:
    "Entertainment: streaming services, Netflix, Spotify, Disney Plus, Hulu, movies, gaming, concerts, music subscriptions",
  education: "Education: online courses, Udemy, Coursera, books, tuition, training",
  hardware: "Hardware and electronics: computers, laptops, monitors, phones, electronics purchase, Apple Store, Best Buy",
  professional_services: "Professional services: legal fees, accounting, consulting, lawyer, accountant",
  uncategorized: "Uncategorized miscellaneous expense",
};

const BATCH_LIMIT = 5;

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
    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: bareCategories, error: catErr } = await adminClient
      .from("categories")
      .select("id, slug, name")
      .is("embedding", null)
      .limit(BATCH_LIMIT);
    if (catErr) return json({ error: catErr.message }, 500);

    for (const cat of bareCategories ?? []) {
      const embedding = await embed(CATEGORY_EMBED_TEXT[cat.slug] ?? cat.name);
      const { error } = await adminClient.from("categories").update({ embedding }).eq("id", cat.id);
      if (error) return json({ error: error.message }, 500);
    }

    const { count: remaining, error: countErr } = await adminClient
      .from("categories")
      .select("id", { count: "exact", head: true })
      .is("embedding", null);
    if (countErr) return json({ error: countErr.message }, 500);

    return json({ embedded: bareCategories?.length ?? 0, remaining: remaining ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
