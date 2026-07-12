# Runway

**Expense & subscription intelligence for indie founders and freelancers.**

Import your transactions (CSV), and Runway categorizes them by meaning using
embeddings, detects zombie/duplicate subscriptions, flags stealth price hikes,
and projects your runway — how many months of cash you have left.

## Stack

- **Frontend:** Next.js (App Router) · Tailwind CSS
- **Backend/DB:** Supabase — Postgres, Row Level Security, `pgvector`, Edge Functions
- **AI:** `gte-small` (384-dim) embeddings for semantic merchant → category matching,
  cached per merchant (embedded once, reused)
- **Hosting:** Vercel

## Status

🚧 MVP in progress.

| Phase | Scope | State |
|-------|-------|-------|
| 1 | DB schema, RLS, `security_invoker` views, category taxonomy | ✅ Done — verified |
| 2 | Auth (email + Google, `@supabase/ssr`) | ✅ Done — verified in production |
| 3 | CSV import + merchant normalization + persistence | ✅ Done — verified in production |
| 4 | Semantic categorization + overrides | ✅ Done — 7/8 (87.5%) on manual accuracy check |
| 5 | Dashboard (burn rate, runway, spend by category) | ⏳ Next |
| 6 | Subscription detection + editable rules | ⏳ |

See [`PLAN.md`](./PLAN.md) for the full phased plan and acceptance criteria.

### Phase 4 note: why categorization is a hybrid, not pure embeddings

The first pass (embedding merchants and categories with `gte-small`, matching
by cosine distance) scored 5/8 on a manual accuracy check — `gte-small` has no
brand knowledge, so short bank descriptors like `digitalocean` or `wholefds
mkt` didn't reliably match their category. Enriching the category text with
keywords helped one case but introduced a regression (`"Uber"` as a Transport
keyword pulled `"uber eats"` away from Food & Dining on lexical overlap alone)
— tuning the prompt further didn't converge.

The fix: **known-merchant aliases take priority over embeddings.** A small,
ordered regex table maps common brands (Netflix, DigitalOcean, Uber Eats,
Whole Foods, …) directly to a category; embeddings are the fallback for the
long tail of merchants not in the list, not the primary mechanism. This is
the same pattern real transaction-categorization products use — deterministic
rules for the high-volume common cases, ML for what's left. Final check: 7/8
(87.5%), the one miss (`AMZN MKTP US`) being a merchant name that's genuinely
ambiguous without item-level receipt data.

## Architecture notes

- **Multi-tenant from day one.** Every user table enforces RLS with
  `(select auth.uid()) = user_id`. Aggregation is exposed through a
  `security_invoker` view — never a materialized view, which would bypass RLS.
- **Embeddings are cached per merchant**, not per transaction, to keep AI cost near zero.
- **Fixed category taxonomy** (not emergent clusters) so results are predictable.

## Local database verification (no Docker required)

Phase 1 migrations are tested against a throwaway Postgres 16 + `pgvector`
cluster, including a cross-tenant RLS isolation test:

```bash
bash scripts/db_verify.sh
```

Expected tail:

```
PASS: cross-tenant SELECT isolation holds (B sees 0 of A)
PASS: WITH CHECK blocked cross-user insert
PASS: monthly_spend_by_category view honors RLS (security_invoker)
ALL RLS TESTS PASSED
```

## Project layout

```
supabase/
  migrations/   # ordered SQL migrations (schema, RLS, views, seed)
  tests/        # RLS cross-tenant test + local auth emulation
scripts/
  db_verify.sh  # spin up local PG + pgvector, apply migrations, run tests
PLAN.md         # phased implementation plan
```
