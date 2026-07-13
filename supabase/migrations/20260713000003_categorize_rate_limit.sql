-- Runway — rate limit the categorize Edge Function per user.
-- Re-embedding bare merchants is cheap per call but unbounded if a user (or a
-- client bug) calls the function in a tight loop; the Edge Function reads
-- this column to reject calls made too soon after the previous one.
alter table public.profiles
  add column last_categorize_at timestamptz;
