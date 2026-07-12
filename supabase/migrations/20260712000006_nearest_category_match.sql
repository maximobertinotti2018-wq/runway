-- Runway — Phase 4 (iteration): nearest category WITH its distance, so the
-- caller can apply a confidence threshold instead of always picking a
-- category even when the best match is genuinely weak (e.g. an ambiguous
-- "AMZN MKTP US" purchase that could be almost anything).

create or replace function public.nearest_category_match(query_embedding vector(384))
returns table(category_id uuid, distance float8)
language sql
stable
security invoker
set search_path = 'public'
as $$
  select id, (embedding <=> query_embedding)::float8
  from public.categories
  where embedding is not null
  order by embedding <=> query_embedding
  limit 1
$$;

revoke all on function public.nearest_category_match(vector) from public;
grant execute on function public.nearest_category_match(vector) to authenticated, service_role;
