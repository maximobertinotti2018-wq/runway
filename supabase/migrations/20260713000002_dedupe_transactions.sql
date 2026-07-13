-- Runway — prevent duplicate transactions from re-importing overlapping CSVs.
-- Natural key: same user, same date, same raw description, same amount.
-- A small, documented tradeoff: two genuinely separate purchases on the same
-- day with an identical amount and identical raw descriptor would collide —
-- acceptable for an MVP given how much worse the prior behavior was (an
-- unbounded duplicate every re-import).

alter table public.transactions
  add constraint transactions_user_date_desc_amount_key
  unique (user_id, occurred_on, raw_description, amount);
