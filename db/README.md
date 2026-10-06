# Databáza Tržko

- `schema.sql` – kompletná schéma (tabuľky, triggery, funkcie, RLS politiky). Cielená na Supabase, funguje aj na čistom PostgreSQL 16.
- `seed_kategorie.sql` – strom kategórií SK/CZ s atribútmi.
- `test/00_stub_auth.sql` – náhrada Supabase schémy `auth` pre lokálne testovanie.
- `test/10_smoke.sql` – scenáre: registrácia, limity inzerátov, hľadanie, chat, objednávka, hodnotenie, odkrytie čísla.

## Lokálne spustenie

```bash
createdb trzko
psql -d trzko -v ON_ERROR_STOP=1 -f db/test/00_stub_auth.sql
psql -d trzko -v ON_ERROR_STOP=1 -f db/schema.sql
psql -d trzko -v ON_ERROR_STOP=1 -f db/seed_kategorie.sql
psql -d trzko -f db/test/10_smoke.sql
```

## Nasadenie na Supabase

V Supabase už schéma `auth` existuje, takže stub sa nespúšťa. Spusti `schema.sql` a `seed_kategorie.sql` cez SQL editor alebo `supabase db push` ako migráciu. PostGIS je na Supabase k dispozícii, blok na konci schémy ho zapne automaticky a pridá geografický index.
