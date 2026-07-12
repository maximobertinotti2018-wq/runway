-- Runway — RLS cross-tenant isolation test (the #1 risk).
-- Runs as role `authenticated`, switching identities via the JWT-claims GUC,
-- exactly like Supabase does at runtime. Any failure RAISEs and aborts.

\set A '11111111-1111-1111-1111-111111111111'
\set B '22222222-2222-2222-2222-222222222222'

-- Two users. The trg_on_auth_user_created trigger auto-creates their profiles.
insert into auth.users (id, email) values
  (:'A', 'a@test.com'),
  (:'B', 'b@test.com')
on conflict do nothing;

-- Everything below runs as an ordinary authenticated user (RLS enforced).
set role authenticated;

-- ---- Act as user A: insert some data ----
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
insert into public.imports (user_id, filename)                    values (auth.uid(), 'a.csv');
insert into public.merchants (user_id, raw_name, normalized_name) values (auth.uid(), 'NETFLIX', 'netflix');
insert into public.transactions (user_id, occurred_on, raw_description, amount)
  values (auth.uid(), current_date, 'NETFLIX', 15.99);

-- ---- Switch to user B: must see NONE of A's rows ----
select set_config('request.jwt.claims', json_build_object('sub', :'B')::text, false);
do $$
declare n int;
begin
  select count(*) into n from public.transactions;
  if n <> 0 then raise exception 'RLS FAIL: user B sees % of A''s transactions', n; end if;
  select count(*) into n from public.merchants;
  if n <> 0 then raise exception 'RLS FAIL: user B sees % of A''s merchants', n; end if;
  select count(*) into n from public.imports;
  if n <> 0 then raise exception 'RLS FAIL: user B sees % of A''s imports', n; end if;
  raise notice 'PASS: cross-tenant SELECT isolation holds (B sees 0 of A)';
end $$;

-- B inserts its own data.
insert into public.merchants (user_id, raw_name, normalized_name) values (auth.uid(), 'SPOTIFY', 'spotify');
insert into public.transactions (user_id, occurred_on, raw_description, amount)
  values (auth.uid(), current_date, 'SPOTIFY', 9.99);

-- ---- Back to A: sees exactly its own 1 transaction ----
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);
do $$
declare n int;
begin
  select count(*) into n from public.transactions;
  if n <> 1 then raise exception 'RLS FAIL: user A sees % transactions (expected own 1)', n; end if;
  raise notice 'PASS: user A sees exactly its own 1 transaction';
end $$;

-- ---- WITH CHECK: A cannot write a row owned by B ----
do $$
begin
  begin
    insert into public.transactions (user_id, occurred_on, raw_description, amount)
      values ('22222222-2222-2222-2222-222222222222'::uuid, current_date, 'HACK', 1);
    raise exception 'RLS FAIL: WITH CHECK did not block a cross-user insert';
  exception when insufficient_privilege then
    raise notice 'PASS: WITH CHECK blocked cross-user insert';
  end;
end $$;

-- ---- security_invoker view respects the caller's RLS ----
do $$
declare n int;
begin
  select count(*) into n from public.monthly_spend_by_category;
  if n <> 1 then raise exception 'RLS FAIL: view leaks rows (A sees % groups, expected 1)', n; end if;
  raise notice 'PASS: monthly_spend_by_category view honors RLS (security_invoker)';
end $$;

reset role;
select 'ALL RLS TESTS PASSED' as result;
