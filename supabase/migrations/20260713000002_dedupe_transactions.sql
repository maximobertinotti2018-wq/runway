-- Runway — prevent duplicate transactions from re-importing overlapping CSVs.
-- Natural key: same user, same date, same raw description, same amount.
-- A small, documented tradeoff: two genuinely separate purchases on the same
-- day with an identical amount and identical raw descriptor would collide —
-- acceptable for an MVP given how much worse the prior behavior was (an
-- unbounded duplicate every re-import).

-- Clean up duplicates that already exist (this is exactly the bug being
-- fixed here — production already has some from re-imports before this
-- constraint existed). Keeps the earliest row per natural key.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, occurred_on, raw_description, amount
           order by created_at
         ) as rn
  from public.transactions
)
delete from public.transactions
where id in (select id from ranked where rn > 1);

alter table public.transactions
  add constraint transactions_user_date_desc_amount_key
  unique (user_id, occurred_on, raw_description, amount);
