-- LOCAL-ONLY: emulates the slice of Supabase's `auth` surface that the
-- migrations depend on, so they can be applied and tested against a plain
-- Postgres cluster (no Docker). This file is NOT shipped to production —
-- in a real Supabase project auth.users / auth.uid() / the roles already exist.

create extension if not exists pgcrypto;

create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- Supabase reads the JWT claims from a GUC; auth.uid() returns the `sub`.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::jsonb ->> 'sub', '')::uuid
$$;

do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;

-- In a real Supabase project these grants already exist; replicate them so
-- RLS policies referencing auth.uid() are callable by the authenticated role.
grant usage on schema auth to anon, authenticated, service_role;
grant execute on function auth.uid() to anon, authenticated, service_role;
