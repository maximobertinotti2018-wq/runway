-- Runway — duplicate-transaction constraint test (dedup on re-import).

\set A '33333333-3333-3333-3333-333333333333'

insert into auth.users (id, email) values (:'A', 'dedup@test.com') on conflict do nothing;

set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', :'A')::text, false);

insert into public.imports (user_id, filename) values (auth.uid(), 'dedup.csv');
insert into public.merchants (user_id, raw_name, normalized_name) values (auth.uid(), 'NETFLIX', 'netflix');

insert into public.transactions (user_id, occurred_on, raw_description, amount)
  values (auth.uid(), '2024-01-06', 'NETFLIX.COM', -15.99);

do $$
begin
  begin
    insert into public.transactions (user_id, occurred_on, raw_description, amount)
      values (auth.uid(), '2024-01-06', 'NETFLIX.COM', -15.99);
    raise exception 'DEDUPE FAIL: exact-duplicate transaction was allowed to insert';
  exception when unique_violation then
    raise notice 'PASS: unique constraint rejects an exact-duplicate transaction';
  end;
end $$;

-- upsert with ON CONFLICT DO NOTHING (what the app uses) silently skips
-- the duplicate rather than erroring, and reports back only the new row.
do $$
declare n int;
begin
  insert into public.transactions (user_id, occurred_on, raw_description, amount)
    values
      (auth.uid(), '2024-01-06', 'NETFLIX.COM', -15.99), -- duplicate, skipped
      (auth.uid(), '2024-02-06', 'NETFLIX.COM', -15.99)  -- new, inserted
  on conflict (user_id, occurred_on, raw_description, amount) do nothing;

  select count(*) into n from public.transactions;
  if n <> 2 then raise exception 'DEDUPE FAIL: expected 2 total rows after upsert, got %', n; end if;
  raise notice 'PASS: ON CONFLICT DO NOTHING skips the duplicate, keeps the new row';
end $$;

reset role;
select 'DEDUPE TEST PASSED' as result;
