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
