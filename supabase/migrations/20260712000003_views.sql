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
