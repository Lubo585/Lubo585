# Backend (Supabase) – NazovPortalu

Postgres schéma s RLS, RPC funkcie, úložisko a webhook platieb. Všetko je v migráciách, nasadenie je opakovateľné.

## Čo backend rieši

| Oblasť | Riešenie |
|---|---|
| Vek 18+ | `profiles.date_of_birth` s CHECK constraintom, profil vzniká automaticky po registrácii (trigger na `auth.users`) |
| Telefón nikdy verejne | verejné view `public_listings` telefón neobsahuje; vydáva ho len RPC `reveal_phone` (loguje kontakt, limit 30/hod na účet alebo IP) |
| Overené profily | tabuľka `verifications` (selfie video s kódom), schválenie moderátorom nastaví `verified_until` na 90 dní; pg_cron exspiruje |
| Moderácia | používateľ môže inzerát dať len do `draft`/`pending`/`paused`; `active` nastavuje len staff cez `moderate_listing`; úprava textu aktívneho inzerátu ho vráti na kontrolu |
| Recenzie | insert prejde len po zalogovanom kontakte (`contacts`), vlastný inzerát sa hodnotiť nedá, zverejnenie až po schválení |
| Nahlásenia | RPC `submit_report` (aj anonymne); neplnoletosť a nátlak dostanú prioritu 1 |
| Topovanie | `orders` → webhook platobnej brány (Edge Function) označí `paid` → trigger predĺži `top_until` / `highlight_until`; kupujúci si zaplatenie sám označiť nemôže |
| Fotky | bucket `listing-photos` (verejný), nahrávať smie len vlastník do priečinka svojho inzerátu; vlastník si fotku nemôže sám schváliť |
| Overovacie videá | bucket `verification-media` (privátny), číta len staff |
| Online stav | RPC `heartbeat` každých 5 min z klienta inzerentky → `is_online` vo view |
| Vyhľadávanie | RPC `search_listings` (mesto vrátane mestských častí, kategória, fulltext bez diakritiky, len overené, online, s recenziami), radenie TOP → overené → najnovšie |
| Audit | `audit_log` pre moderáciu, nahlásenia a platby |
| Správy | `conversations`/`messages` s realtime publikáciou; písať smú len účastníci, blokovanie, počítadlá neprečítaných; prvá správa sa počíta ako kontakt |
| Mobil | `device_tokens` pre push, `app_config` (údržba, oznam, minimálna verzia appky) |

## Nasadenie do nového Supabase projektu

1. Vytvorte projekt na supabase.com (región **eu-central-1**, Frankfurt – GDPR). Jestvujúci projekt „befresh“ je iná aplikácia, nepoužívajte ho.
2. Nainštalujte CLI a prihláste sa:
   ```bash
   npm i -g supabase
   supabase login
   cd portal && supabase link --project-ref <ref>
   ```
3. Nasaďte migrácie (poradie 0001 → 0005). Pred 0004 zapnite rozšírenie **pg_cron** v Database → Extensions.
   ```bash
   supabase db push
   ```
   Alternatíva bez CLI: obsah každého súboru vložte do SQL editora v dashboarde v poradí.
4. Auth → Providers → Email: zapnite **Magic link**. Auth → URL Configuration: Site URL = vaša doména.
5. Edge funkcia pre platby:
   ```bash
   supabase secrets set PAYMENT_WEBHOOK_SECRET=<náhodný reťazec>
   supabase functions deploy payment-webhook --no-verify-jwt
   ```
   URL webhooku zadajte u platobnej brány; podpis prispôsobte jej schéme v `functions/payment-webhook/index.ts`.
6. Frontend: do `js/config.js` doplňte `supabaseUrl` a `supabaseKey` (Project Settings → API → *publishable key*). Od tej chvíle stránka načítava skutočné inzeráty; bez konfigurácie zobrazuje demo.
7. Prvý moderátor: v SQL editore
   ```sql
   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'vas@email.sk');
   ```

## Lokálny test bez Supabase

```bash
sudo ./supabase/tests/run.sh
```
Spustí migrácie na čistom PostgreSQL s mockom `auth`/`storage` a prejde 15 + 8 scenárov (vrátane správ) (neplnoletá registrácia, samo-aktivácia, samo-povýšenie, RLS pre anon, vyhľadávanie bez diakritiky, odhalenie čísla, recenzia bez kontaktu, priorita nahlásenia, platba a TOP, rate limit).

## Čo zostáva

- Admin rozhranie pre moderátorov (fronta `pending` inzerátov, overení a nahlásení). Dá sa začať aj v Supabase Studio (Table Editor) a RPC `moderate_listing`.
- Server-side rendering stránok miest a inzerátov pre SEO (Next.js/Astro alebo generovanie statických HTML z databázy cronom). Klientské vykresľovanie cez JS Google indexuje, ale pomalšie.
- E-mailové notifikácie (schválenie, zamietnutie, nahlásenie) cez Edge Function + Resend/Postmark.
- Vodoznak a rozmazanie tváre pri nahratí fotky (Edge Function s `sharp`/`@imgly/background-removal` alebo externá služba).
