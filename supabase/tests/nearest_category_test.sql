-- Runway — nearest_category correctness test (Phase 4).
-- Uses synthetic, genuinely orthogonal embeddings (no real model needed) to
-- prove the function picks the closest category by direction. A zero vector
-- has no direction (cosine similarity is undefined against it), so the two
-- test categories point in two different, non-degenerate directions instead.

insert into public.categories (slug, name, embedding) values
  ('t_food', 'Test Food',
   ((array_fill(1::float8, array[192]) || array_fill(0::float8, array[192])))::vector(384))
on conflict (slug) do update set embedding = excluded.embedding;

insert into public.categories (slug, name, embedding) values
  ('t_tech', 'Test Tech',
   ((array_fill(0::float8, array[192]) || array_fill(1::float8, array[192])))::vector(384))
on conflict (slug) do update set embedding = excluded.embedding;

do $$
declare
  want_food uuid;
  want_tech uuid;
  got uuid;
  food_like vector(384);
  tech_like vector(384);
begin
  select id into want_food from public.categories where slug = 't_food';
  select id into want_tech from public.categories where slug = 't_tech';

  -- Mostly weighted toward the first half -> same direction as "food".
  food_like := ((array_fill(0.9::float8, array[192]) || array_fill(0.1::float8, array[192])))::vector(384);
  select public.nearest_category(food_like) into got;
  if got <> want_food then
    raise exception 'nearest_category picked wrong match for a food-like vector: got %, want %', got, want_food;
  end if;

  -- Mostly weighted toward the second half -> same direction as "tech".
  tech_like := ((array_fill(0.1::float8, array[192]) || array_fill(0.9::float8, array[192])))::vector(384);
  select public.nearest_category(tech_like) into got;
  if got <> want_tech then
    raise exception 'nearest_category picked wrong match for a tech-like vector: got %, want %', got, want_tech;
  end if;

  raise notice 'PASS: nearest_category returns the closest embedding by cosine distance';
end $$;

select 'NEAREST_CATEGORY TEST PASSED' as result;
