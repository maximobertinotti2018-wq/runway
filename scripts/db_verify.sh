#!/usr/bin/env bash
# Verify Runway migrations against a throwaway Postgres 16 + pgvector cluster
# (no Docker). Applies the migrations, then runs the RLS cross-tenant test.
set -euo pipefail

PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
RUN="${PGTEST_DIR:-/tmp/runway-pgtest}"
DATA="$RUN/data"; SOCK="$RUN/sock"; PORT="${PGPORT:-54329}"

echo ">> Postgres: $("$PGBIN/postgres" --version)"

# postgres refuses to run as root; use the 'postgres' system user.
id postgres >/dev/null 2>&1 || useradd -r -m -d /var/lib/postgresql -s /bin/bash postgres
rm -rf "$RUN"; mkdir -p "$DATA" "$SOCK"; chown -R postgres:postgres "$RUN"
as_pg() { runuser -u postgres -- "$@"; }

echo ">> initdb"
as_pg "$PGBIN/initdb" -D "$DATA" -A trust -U postgres >/dev/null

echo ">> start"
as_pg "$PGBIN/pg_ctl" -D "$DATA" \
  -o "-p $PORT -k $SOCK -c listen_addresses=''" -w start >/dev/null
trap 'as_pg "$PGBIN/pg_ctl" -D "$DATA" -w stop >/dev/null 2>&1 || true' EXIT

PSQL=(psql -v ON_ERROR_STOP=1 -h "$SOCK" -p "$PORT" -U postgres)
"${PSQL[@]}" -d postgres -q -c "create database runway_test;"
DB=("${PSQL[@]}" -d runway_test)

echo ">> bootstrap (local auth emulation)"
"${DB[@]}" -q -f "$REPO/supabase/tests/_local_bootstrap.sql"

echo ">> apply migrations"
for f in "$REPO"/supabase/migrations/*.sql; do
  echo "   - $(basename "$f")"
  "${DB[@]}" -q -f "$f"
done

echo ">> pgvector smoke (384-dim cosine distance)"
"${DB[@]}" -q -c \
  "select round((  (array_fill(0.1::float8, array[384]))::vector(384)
              <=>  (array_fill(0.9::float8, array[384]))::vector(384)  )::numeric, 6)
     as cosine_distance;"

echo ">> RLS cross-tenant test"
"${DB[@]}" -f "$REPO/supabase/tests/rls_cross_tenant_test.sql"

echo ">> DONE"
