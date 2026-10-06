#!/usr/bin/env bash
# Lokálny test migrácií a obchodných pravidiel na čistom PostgreSQL 16+ (bez Supabase).
# Použitie: sudo ./supabase/tests/run.sh    (vyžaduje bežiaci lokálny PostgreSQL a používateľa postgres)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
D=$(mktemp -d /tmp/nptest.XXXX); cp "$ROOT"/migrations/0001_*.sql "$ROOT"/migrations/0002_*.sql "$ROOT"/migrations/0003_*.sql "$ROOT"/migrations/0005_*.sql "$ROOT"/tests/*.sql "$D"/; chown -R postgres "$D"
su postgres -c "psql -q -c 'drop database if exists np_test' -c 'create database np_test'"
su postgres -c "cd $D && psql -v ON_ERROR_STOP=1 -q -d np_test -f 00_mock_supabase.sql -f 0001_schema.sql -f 0002_seed.sql -f 0003_storage.sql -f 0005_messages_devices.sql"
echo "Migrácie OK. Obchodné pravidlá (riadky ERROR pri krokoch označených 'očakávaná chyba' sú správne):"
su postgres -c "cd $D && psql -v ON_ERROR_STOP=0 -q -d np_test -f 10_business_rules.sql -f 20_messages.sql -f 30_security.sql" 2>&1 | grep -v '^CONTEXT\|^DETAIL\|^PL/pgSQL\|^LINE\|^ *\^\|values (new.id\|(new.raw_user'
rm -rf "$D"
