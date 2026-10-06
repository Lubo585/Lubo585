# NazovPortalu – vzorová stránka inzertného portálu (18+)

Statická, mobil-first šablóna inzertného portálu pre dospelých s dôrazom na **vyhľadateľnosť (SEO)**,
**dôveru (overené profily, hodnotenia)** a **súkromie**. Názov značky je zástupný: `NazovPortalu` / `nazovportalu.sk`.

## Premenovanie (keď vyberiete doménu)

```bash
./scripts/premenuj.sh "Zvodnice" "zvodnice.sk"
```

Skript nahradí názov aj doménu vo všetkých HTML, JSON-LD, sitemap, robots, manifeste a .htaccess.

## Štruktúra

| Súbor | Účel |
|---|---|
| `index.html` | Domovská stránka: brána 18+, vyhľadávanie + filtre, kategórie, inzeráty, výhody, FAQ, SEO text, mestá |
| `mesto.html` | Šablóna lokálnej landing page (Bratislava). Vytvorte pre každé mesto a mestskú časť |
| `inzerat.html` | Detail inzerátu: galéria, cenník, overené hodnotenia, skryté číslo, nahlásenie |
| `pridat-inzerat.html` | Formulár pridania inzerátu s overením veku a súhlasmi |
| `cennik.html`, `bezpecnost.html`, `kontakt.html` | Podporné stránky |
| `podmienky.html`, `ochrana-sukromia.html`, `cookies.html` | Právne vzory (doplniť údaje prevádzkovateľa, nechať skontrolovať) |
| `404.html` | Chybová stránka |
| `css/style.css`, `js/app.js` | Štýly (farby v `:root`) a logika (brána 18+, filtre, menu, skryté číslo) |
| `js/config.js`, `js/supabase.js` | Konfigurácia a napojenie na Supabase (výpis, detail, odhalenie čísla, nahlásenie, pridanie inzerátu, heartbeat) |
| `supabase/` | Migrácie, úložisko, cron, Edge Function pre platby, lokálne testy |
| `spravy.html`, `js/native.js`, `sw.js`, `.well-known/` | Správy v reálnom čase, natívna vrstva pre appku, PWA service worker, deep linky |
| `aplikacia.html`, `js/download.js`, `downloads/` | Stránka na stiahnutie (detekcia Android/iPhone), manifest verzie, miesto pre APK |
| `vendor/supabase.js` | Self-hostovaná knižnica supabase-js (bez CDN, prísna CSP) |
| `app/` | Capacitor projekt pre iOS a Android (ikony, splash, Android/iOS natívne projekty) |
| `robots.txt`, `sitemap.xml`, `manifest.webmanifest`, `.htaccess` | SEO a server |
| `scripts/gen_pages.py` | Po úprave hlavičky/pätičky v `index.html` pregeneruje podstránky |

## Čo je urobené pre SEO

- Unikátny `<title>` a `meta description` s kľúčovými slovami na každej stránke, jeden `<h1>`.
- `canonical`, `hreflang`, Open Graph, Twitter card, `theme-color`, web manifest (PWA).
- Štruktúrované dáta JSON-LD: `WebSite` + `SearchAction` (sitelinks searchbox), `Organization`, `FAQPage`, `BreadcrumbList`, `Service` + `AggregateRating` na detaile.
- Interné prelinkovanie: kategórie, 20 miest, mestské časti, podobné inzeráty, omrvinky.
- Lokálne landing pages (`/bratislava/`, `/bratislava/ruzinov/`) – hlavný zdroj organickej návštevnosti v tomto segmente.
- Čitateľné URL (`/inzerat/nikol-26-bratislava-12345`), `sitemap.xml`, `robots.txt`.
- Rýchlosť: žiadne externé knižnice ani fonty, jeden CSS, jeden JS s `defer`, kompresia a cache v `.htaccess`.
- Prístupnosť: skip link, aria popisy, kontrast, ovládanie klávesnicou, 44px dotykové ciele.
- Označenie obsahu pre dospelých: `meta rating=adult` + RTA label (vyžadujú ho rodičovské filtre, niektoré appstory a reklamné siete).

## Mobilná aplikácia (iOS + Android)

V priečinku `app/` je Capacitor projekt, ktorý balí tento web do natívnej aplikácie s rovnakým Supabase backendom (zdieľané dáta, realtime správy, push, deep linky). Aplikácia sa sťahuje priamo z webu (`aplikacia.html`, `downloads/version.json`, podpísaný APK cez `app/scripts/release.sh` alebo CI). Postup v `app/README.md`, podmienky obchodov a riziká v `app/STORE.md`. Web je zároveň inštalovateľná PWA (`manifest.webmanifest`, `sw.js`).

## Backend

Hotový v priečinku `supabase/` (Postgres schéma s RLS, RPC, úložisko, webhook platieb, testy). Nasadenie a popis je v `supabase/README.md`. Frontend sa pripája cez `js/config.js`; bez konfigurácie zobrazuje demo obsah.

## Čo treba doplniť pred spustením

1. **Supabase projekt**: vytvoriť a nasadiť migrácie podľa `supabase/README.md`, doplniť kľúče do `js/config.js`.
2. **Obrázky**: `img/og-cover.jpg` (1200×630), `img/logo.png`, `img/icon-192.png`, `img/icon-512.png`. Fotky inzerátov servírujte vo WebP s vodoznakom.
3. **Platobná brána** pre high-risk segment (CCBill, Segpay, Verotel, Paxum).
4. **Právne texty**: doplniť prevádzkovateľa, zodpovednú osobu podľa DSA, prejsť advokátom.
5. **Analytika bez cookies** (Plausible / Matomo), Google Search Console + Bing Webmaster, odoslať sitemap.
6. Generovať stránky pre každé mesto a kategóriu (kombinácie `mesto × kategória` sú najcennejšie kľúčové slová).

## Bezpečnosť

Výsledky penetračného testu a zoznam opráv: `SECURITY.md`. Databázové testy (42 scenárov): `sudo ./supabase/tests/run.sh`. Pri nasadení nahrávajte na web len statické súbory (bez `supabase/`, `scripts/`, `app/`); `.htaccess` ich pre istotu blokuje.

## Lokálny náhľad

```bash
cd portal && python3 -m http.server 8080
# http://localhost:8080
```
