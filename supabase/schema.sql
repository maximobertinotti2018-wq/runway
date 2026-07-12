-- Runway — combined Phase 1 schema for the Supabase SQL Editor.
-- Generated from supabase/migrations/*. Run once on a fresh project.
-- (For ongoing changes we use versioned migrations, not this file.)

-- ============================================================
-- supabase/migrations/20260712000001_init.sql
-- ============================================================
-- Runway — Phase 1: extensions, core schema, indexes
-- Embeddings are 384-dim (gte-small via Supabase Edge Function).

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- On new auth user, create a matching profile row.
-- SECURITY DEFINER (runs as owner) so it can write profiles during signup,
-- but hardened: empty search_path + fully-qualified names, and EXECUTE
-- revoked from PUBLIC so it is not a callable public endpoint (the trigger
-- still fires regardless of EXECUTE grants).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
revoke execute on function public.handle_new_user() from public;

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users) — holds the manually-entered cash balance
-- used by the runway metric.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  cash_available numeric(14,2) not null default 0,
  currency       text not null default 'USD',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- categories — FIXED taxonomy. `embedding` backfilled by an Edge Function
-- (gte-small) after seeding; used as the target for merchant matching.
-- ---------------------------------------------------------------------------
create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  name       text not null,
  is_system  boolean not null default true,
  embedding  vector(384),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- merchants — per-user; the EMBEDDING CACHE. One row per normalized merchant,
-- embedded exactly once, reused across all its transactions.
-- ---------------------------------------------------------------------------
create table public.merchants (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  raw_name        text not null,
  normalized_name text not null,
  embedding       vector(384),
  created_at      timestamptz not null default now(),
  unique (user_id, normalized_name)
);
create index idx_merchants_user on public.merchants(user_id);
create index idx_merchants_embedding
  on public.merchants using hnsw (embedding vector_cosine_ops);
create index idx_categories_embedding
  on public.categories using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- imports — one row per CSV upload.
-- ---------------------------------------------------------------------------
create table public.imports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  filename   text not null,
  row_count  integer not null default 0,
  status     text not null default 'pending'
             check (status in ('pending','processing','done','error')),
  created_at timestamptz not null default now()
);
create index idx_imports_user on public.imports(user_id);

-- ---------------------------------------------------------------------------
-- merchant_category_rules — user overrides ("this merchant -> this category").
-- ---------------------------------------------------------------------------
create table public.merchant_category_rules (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  created_at  timestamptz not null default now(),
  unique (user_id, merchant_id)
);
create index idx_rules_user on public.merchant_category_rules(user_id);

-- ---------------------------------------------------------------------------
-- transactions
-- ---------------------------------------------------------------------------
create table public.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  import_id       uuid references public.imports(id) on delete set null,
  merchant_id     uuid references public.merchants(id) on delete set null,
  category_id     uuid references public.categories(id),
  occurred_on     date not null,
  raw_description text not null,
  amount          numeric(14,2) not null,
  currency        text not null default 'USD',
  created_at      timestamptz not null default now()
);
create index idx_tx_user_date on public.transactions(user_id, occurred_on);
create index idx_tx_user_category on public.transactions(user_id, category_id);

-- ---------------------------------------------------------------------------
-- subscriptions — output of recurring detection.
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  cadence     text not null default 'monthly'
              check (cadence in ('weekly','monthly','yearly')),
  avg_amount  numeric(14,2) not null,
  last_seen   date not null,
  status      text not null default 'active'
              check (status in ('active','zombie','cancelled')),
  detected_at timestamptz not null default now(),
  unique (user_id, merchant_id)
);
create index idx_subs_user on public.subscriptions(user_id);

-- ============================================================
-- supabase/migrations/20260712000002_rls.sql
-- ============================================================
-- Runway — Phase 1: Row Level Security
-- Every user-data table is owner-scoped via (select auth.uid()) = user_id.
-- categories is system reference data: readable by all authenticated users,
-- writable by none (seeded via migration / service_role only).

-- profiles ------------------------------------------------------------------
alter table public.profiles enable row level security;
create policy profiles_select on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- categories ----------------------------------------------------------------
alter table public.categories enable row level security;
create policy categories_select on public.categories
  for select to authenticated using (true);

-- merchants -----------------------------------------------------------------
alter table public.merchants enable row level security;
create policy merchants_all on public.merchants
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- merchant_category_rules ---------------------------------------------------
alter table public.merchant_category_rules enable row level security;
create policy rules_all on public.merchant_category_rules
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- imports -------------------------------------------------------------------
alter table public.imports enable row level security;
create policy imports_all on public.imports
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- transactions --------------------------------------------------------------
alter table public.transactions enable row level security;
create policy transactions_all on public.transactions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- subscriptions -------------------------------------------------------------
alter table public.subscriptions enable row level security;
create policy subscriptions_all on public.subscriptions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Coarse grants (RLS is the fine-grained layer on top of these) -------------
grant usage on schema public to anon, authenticated;
grant select on public.categories to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.merchants,
  public.merchant_category_rules,
  public.imports,
  public.transactions,
  public.subscriptions
  to authenticated;

-- ============================================================
-- supabase/migrations/20260712000003_views.sql
-- ============================================================
-- Runway — Phase 1: aggregation views
-- IMPORTANT: security_invoker = true so the querying user's RLS on
-- transactions applies. Materialized views are deliberately AVOIDED here —
-- they run as the owner and would BYPASS RLS, leaking cross-tenant data.

create view public.monthly_spend_by_category
with (security_invoker = true) as
select
  t.user_id,
  date_trunc('month', t.occurred_on)::date as month,
  t.category_id,
  c.name as category_name,
  sum(t.amount)  as total,
  count(*)       as tx_count
from public.transactions t
left join public.categories c on c.id = t.category_id
group by t.user_id, date_trunc('month', t.occurred_on), t.category_id, c.name;

grant select on public.monthly_spend_by_category to authenticated;

-- ============================================================
-- supabase/migrations/20260712000004_seed_categories.sql
-- ============================================================
-- Runway — Phase 1: seed the FIXED category taxonomy.
-- Idempotent. Embeddings are backfilled later by the gte-small Edge Function.

insert into public.categories (slug, name) values
  ('food_dining',          'Food & Dining'),
  ('groceries',            'Groceries'),
  ('saas_software',        'SaaS & Software'),
  ('dev_tools_hosting',    'Dev Tools & Hosting'),
  ('ai_tools',             'AI Tools'),
  ('transport',            'Transport'),
  ('travel',               'Travel'),
  ('utilities',            'Utilities'),
  ('rent_office',          'Rent & Office'),
  ('marketing_ads',        'Marketing & Ads'),
  ('payroll_contractors',  'Payroll & Contractors'),
  ('fees_banking',         'Fees & Banking'),
  ('taxes',                'Taxes'),
  ('health',               'Health'),
  ('entertainment',        'Entertainment'),
  ('education',            'Education'),
  ('hardware',             'Hardware'),
  ('professional_services','Professional Services'),
  ('uncategorized',        'Uncategorized')
on conflict (slug) do nothing;

