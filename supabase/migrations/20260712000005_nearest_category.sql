-- Runway — Phase 4: nearest-category lookup by cosine distance.
-- security_invoker (the default for functions) + categories' own RLS
-- (readable by every authenticated user) means this never needs elevated
-- privileges to run.
--
-- search_path is pinned to 'public' rather than emptied: pgvector's <=>
-- operator lives in public, and an empty search_path can't resolve it even
-- when every table reference is schema-qualified. 'public' is a fixed,
-- trusted value here (not attacker-influenceable), so this still defeats
-- search_path-hijacking while keeping the operator resolvable.

create or replace function public.nearest_category(query_embedding vector(384))
returns uuid
language sql
stable
security invoker
set search_path = 'public'
as $$
  select id
  from public.categories
  where embedding is not null
  order by embedding <=> query_embedding
  limit 1
$$;

revoke all on function public.nearest_category(vector) from public;
grant execute on function public.nearest_category(vector) to authenticated, service_role;
