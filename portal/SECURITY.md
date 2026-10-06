# Bezpečnostný audit (penetračný test) – NazovPortalu

Dátum: 2026-10-06 · Rozsah: Supabase schéma a RLS, RPC a triggery, Storage politiky, Realtime, Edge Function platieb, webový frontend (JS, service worker, hlavičky), Capacitor aplikácia (Android manifest, natívna vrstva).
Metóda: white-box review kódu z pohľadu (a) anonymného klienta s publishable kľúčom, (b) prihláseného používateľa, (c) zlomyseľnej inzerentky, (d) útočníka s prístupom k webhooku; následne overenie opravami a automatizovanými testami (`supabase/tests/`, 42 scenárov).

## Nálezy a opravy

| # | Závažnosť | Nález | Oprava | Test |
|---|---|---|---|---|
| 1 | Vysoká | Telefón uložený v `attributes` unikal cez verejné view a obchádzal limit | Súkromný stĺpec `contact_phone`; view odstraňuje kľúče `phone`, `tel`, `email` | 30:telefón v attributes |
| 2 | Vysoká | Limit odhalenia čísla sa dal obísť podvrhnutým `p_ip_hash` alebo bez neho | IP z hlavičiek PostgREST (`client_ip()`), hash na serveri; anonym bez IP odmietnutý; 30/hod na účet či IP + 300/hod na inzerát | 30:anonym s IP hlavičkou, 10:rate limit |
| 3 | Vysoká | Schválenú fotku bolo možné vymeniť za neskontrolovanú (zmena cesty, prepis súboru) | Zmena cesty ruší schválenie, `listing_id` nemenný; upload len do privátneho bucketu, cesta sa nedá použiť 2×, UPDATE objektov zakázaný, vlastník maže len neschválené; presun do verejného bucketu až po schválení | 30:výmena schválenej fotky, 30:fotka |
| 4 | Vysoká | Cenu a produkt objednávky určoval klient, webhook sumu nekontroloval | Tabuľka `products`; trigger prepíše sumu a stav; topovať len vlastný inzerát; webhook porovná sumu s objednávkou | 30:objednávka 0.01 €, 30:cudzí inzerát |
| 5 | Vysoká | Mazané správy sa cez Realtime (bez RLS pri DELETE) posielali všetkým s celým obsahom | `replica identity default` pre `messages` a `conversations` | 30:replica identity |
| 6 | Stredná | Inzerentka mohla zmazať inzerát aj s nahláseniami a objednávkami (zničenie dôkazov) | DELETE len staff; vlastník nastaví `removed`; FK `reports`/`orders` → `on delete restrict` | 30:vlastník nemôže zmazať |
| 7 | Stredná | Polia mimo názvu a textu (cena, atribúty, mesto, kategória) sa menili bez novej kontroly; `published_at`, `last_online_at`, `slug`, `views` boli ovplyvniteľné | Zmena verejných polí aktívneho inzerátu → `pending`; slug, online, publikácia, zobrazenia len serverovo | 30:zmena ceny, 30:slug |
| 8 | Stredná | Verejný bucket umožňoval anonymné listovanie a prístup k neschváleným fotkám | Privátny `listing-uploads`; v `listing-photos` len schválené fotky aktívnych inzerátov; API čítanie obmedzené | 30:fotka |
| 9 | Stredná | Neobmedzený spam nahlásení, orákulum existencie inzerátu | 10/hod na účet či IP, len aktívne inzeráty, opakované nahlásenie vracia to isté id | 30:limit nahlásení, 30:opakované |
| 10 | Stredná | Záplava správ a konverzácií, duplicitné kontakty | 60 správ/min, 20 nových konverzácií/hod, kontakt len pri novej konverzácii | 30:spam správ |
| 11 | Stredná | Webhook: porovnanie podpisu v premenlivom čase, refund neexistoval | Konštantné porovnanie, prechod `paid → refunded` ruší TOP/zvýraznenie, kontrola sumy, idempotencia | 30:refund |
| 12 | Stredná | Chýbala CSP; supabase-js z CDN bez pripnutia | Self-hostovaný `vendor/supabase.js`, CSP len `'self'` + Supabase, ďalšie hlavičky | ručne |
| 13 | Stredná | Zdrojáky backendu a testov by boli dostupné z webu | `Options -Indexes`, 404 pre `supabase/`, `scripts/`, `app/`, zákaz `.sql/.md/.toml/.py/.sh` | ručne |
| 14 | Nízka | `is_privileged()` používal `current_user`, ktorý je v security definer vždy vlastník | GUC `role` (SET ROLE od PostgREST) | všetky testy privilegovanosti |
| 15 | Nízka | Falošné záznamy overenia (status, moderátor) | Trigger vynuluje polia, max. 1 čakajúce na inzerát | 30:falošné overenie |
| 16 | Nízka | Fotka mohla ukazovať do priečinka iného inzerátu | CHECK `photos_own_folder` | 30:cudzí priečinok |
| 17 | Nízka | Deep link `//cudzi.host` a push `url` bez kontroly | Len relatívna cesta v rámci aplikácie | ručne |
| 18 | Nízka | Záloha Android dát vrátane relácie | `allowBackup=false`, `usesCleartextTraffic=false` | ručne |
| 19 | Nízka | Service worker cachoval chybové odpovede a JS navždy | Chyby sa necachujú, JS a manifest sieť-najprv, súkromné a dynamické cesty mimo cache | ručne |
| 20 | Nízka | Nafukovanie `views` anonymom | Neopravené (kozmetické; `views` sa nepoužíva na radenie). Riešenie: dedupe podľa IP/hod | – |
| 21 | Info | Predvolené EXECUTE pre anon na všetky funkcie; dátum narodenia povinný pri každej registrácii; neobmedzené `p_q`/`p_offset`; čítanie sekvencií | Explicitné odobratie a udelenie práv; DOB povinný až pred inzerátom; limity 80 znakov a 5000; sekvencia len `messages_id_seq` | 30:anon EXECUTE, 30:registrácia bez DOB |

## Čo zostáva mimo kódu

- Overenie veku je deklaratórne (dátum narodenia zadáva používateľ). Skutočné overenie by vyžadovalo externú službu.
- Platobná brána musí posielať podpísané payloady so sumou a menou; schéma podpisu sa prispôsobí konkrétnej bráne.
- Push notifikácie: po napojení FCM obmedziť frekvenciu na úrovni Edge Function.
- Supabase projekt: zapnúť MFA pre dashboard, Point-in-Time Recovery, a v Auth nastaviť rate limity pre magic link.
- Pred spustením odporúčam ešte externý black-box test na produkčnej inštancii (sken hlavičiek, fuzzing RPC, test Storage URL).

## Ako spustiť testy

```bash
sudo ./supabase/tests/run.sh
```
