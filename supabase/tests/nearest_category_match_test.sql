-- Runway — nearest_category_match distance test (Phase 4 iteration).
-- Confirms the returned distance is small for a matching direction and
-- large (near max) for an orthogonal one, so a confidence threshold in the
-- Edge Function has real signal to act on.

insert into public.categories (slug, name, embedding) values
  ('t_food2', 'Test Food 2',
   ((array_fill(1::float8, array[192]) || array_fill(0::float8, array[192])))::vector(384))
on conflict (slug) do update set embedding = excluded.embedding;

insert into public.categories (slug, name, embedding) values
  ('t_tech2', 'Test Tech 2',
   ((array_fill(0::float8, array[192]) || array_fill(1::float8, array[192])))::vector(384))
on conflict (slug) do update set embedding = excluded.embedding;

do $$
declare
  want_food uuid;
  matched_id uuid;
  matched_distance float8;
  identical_vec vector(384);
  orthogonal_vec vector(384);
begin
  select id into want_food from public.categories where slug = 't_food2';

  -- Identical direction to "food" -> distance near 0.
  identical_vec := ((array_fill(1::float8, array[192]) || array_fill(0::float8, array[192])))::vector(384);
  select category_id, distance into matched_id, matched_distance
    from public.nearest_category_match(identical_vec);
  if matched_id <> want_food then
    raise exception 'wrong match for an identical vector: got %, want %', matched_id, want_food;
  end if;
  if matched_distance > 0.01 then
    raise exception 'expected near-zero distance for an identical vector, got %', matched_distance;
  end if;

  -- Perfectly orthogonal to BOTH test categories -> distance near 1.0 (cosine
  -- distance of orthogonal vectors), proving the signal exists to threshold on.
  orthogonal_vec := ((array_fill(1::float8, array[96]) || array_fill(-1::float8, array[96]) || array_fill(0::float8, array[192])))::vector(384);
  select distance into matched_distance from public.nearest_category_match(orthogonal_vec);
  if matched_distance < 0.9 then
    raise exception 'expected a large distance (~1.0) for an unrelated vector, got %', matched_distance;
  end if;

  raise notice 'PASS: nearest_category_match distance discriminates matches from mismatches';
end $$;

select 'NEAREST_CATEGORY_MATCH TEST PASSED' as result;
