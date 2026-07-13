-- Runway — delete_own_account() test: removes the caller's own auth.users
-- row, cascades to every owned table, and never touches another user.

\set A '44444444-4444-4444-4444-444444444444'
\set B '55555555-5555-5555-5555-555555555555'

insert into auth.users (id, email) values (:'A', 'delete-a@test.com') on conflict do nothing;
insert into auth.users (id, email) values (:'B', 'delete-b@test.com') on conflict do nothing;
-- trg_on_auth_user_created fires on the inserts above and creates a
-- matching public.profiles row for each user.

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);

insert into public.imports (user_id, filename) values (auth.uid(), 'delete-me.csv');
insert into public.merchants (user_id, raw_name, normalized_name) values (auth.uid(), 'NETFLIX', 'netflix');
insert into public.transactions (user_id, occurred_on, raw_description, amount)
  values (auth.uid(), '2024-01-06', 'NETFLIX.COM', -15.99);

select public.delete_own_account();

reset role;

-- Hardcoded literals here (not the psql :'A'/:'B' substitution used above) —
-- psql's variable interpolation doesn't reliably reach inside a dollar-quoted
-- do $$ ... $$ body, same reason rls_cross_tenant_test.sql hardcodes its
-- cross-user UUID literal rather than substituting one in.
do $$
begin
  if exists (select 1 from auth.users where id = '44444444-4444-4444-4444-444444444444'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: auth.users row for A still exists';
  end if;
  if exists (select 1 from public.profiles where id = '44444444-4444-4444-4444-444444444444'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: profiles row for A survived (cascade broken)';
  end if;
  if exists (select 1 from public.merchants where user_id = '44444444-4444-4444-4444-444444444444'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: merchants row for A survived (cascade broken)';
  end if;
  if exists (select 1 from public.transactions where user_id = '44444444-4444-4444-4444-444444444444'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: transactions row for A survived (cascade broken)';
  end if;
  if exists (select 1 from public.imports where user_id = '44444444-4444-4444-4444-444444444444'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: imports row for A survived (cascade broken)';
  end if;
  raise notice 'PASS: delete_own_account removed A and cascaded to every owned table';

  if not exists (select 1 from auth.users where id = '55555555-5555-5555-5555-555555555555'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: unrelated user B was deleted too';
  end if;
  if not exists (select 1 from public.profiles where id = '55555555-5555-5555-5555-555555555555'::uuid) then
    raise exception 'DELETE ACCOUNT FAIL: unrelated user B''s profile was deleted too';
  end if;
  raise notice 'PASS: unrelated user B untouched';
end $$;

select 'DELETE ACCOUNT TEST PASSED' as result;
