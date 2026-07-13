-- Runway — self-service account deletion.
-- SECURITY DEFINER because a normal `authenticated`-role client has no grant
-- on auth.users — hardened the same way as handle_new_user(): empty
-- search_path, fully-qualified names, and the target is always (select
-- auth.uid()), never a caller-supplied id, so this can only ever delete the
-- caller's own account. Every user table's FK to auth.users(id) is
-- ON DELETE CASCADE, so one delete here removes profiles, merchants,
-- imports, transactions, merchant_category_rules and subscriptions too.
create or replace function public.delete_own_account()
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from auth.users where id = (select auth.uid());
end $$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;
