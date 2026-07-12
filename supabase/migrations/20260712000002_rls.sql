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
