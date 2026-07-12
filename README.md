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
| 2 | Auth (email + Google, `@supabase/ssr`) | ⏳ Next |
| 3 | CSV import + merchant normalization | ⏳ |
| 4 | Semantic categorization + overrides | ⏳ |
| 5 | Dashboard (burn rate, runway, spend by category) | ⏳ |
| 6 | Subscription detection + editable rules | ⏳ |

See [`PLAN.md`](./PLAN.md) for the full phased plan and acceptance criteria.

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
