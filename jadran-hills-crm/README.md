# Jadran Hills – CRM developerského projektu

Interná webová aplikácia na riadenie developerského projektu: ekonomika, výkaz
výmer, cenník a predaj, harmonogram, tendre, povolenia, riziká a úlohy. Beží celá
v prehliadači; dáta má v prehliadači, alebo v spoločnej databáze s prihlásením.

Súčasťou je aj **verejný web projektu**: prezentačná stránka s odkazom Prihlásenie,
za ktorým je táto aplikácia s vlastným prihlásením (pozri časť Verejný web).

> **Dôverné dáta projektu nie sú v repozitári.** Repozitár je verejný, preto
> obsahuje len kód aplikácie a vymyslený ukážkový projekt. Skutočné údaje
> (pozemky, ceny, klienti, ponuky) sa do aplikácie nahrávajú importom súboru JSON
> a zostávajú v prehliadači používateľa. Priečinok `private/` je v `.gitignore`.

## Moduly

| Modul | Čo robí |
|---|---|
| Prehľad | Hlavné ukazovatele, DPH z predaja a príjem z prenájmu za sezónu, peňažné toky, body zvratu, míľniky, najbližšie úlohy a najväčšie riziká |
| Karta projektu | Základné údaje, pozemky s kúpnou cenou, domy a etapizácia, technické parametre so zdrojom |
| Galéria | Pohľady, pôdorysy, rezy, situácia a fotografie; titulný obrázok pre prehľad a uvítanie, prehliadanie na celej obrazovke, nahrávanie |
| Ekonomika | Výsledovka, rozpočet nákladov (plán / zazmluvnené / uhradené), mesačný cash-flow, financovanie, scenáre a citlivosť, porovnanie stratégií |
| Výkaz výmer | Položkový rozpočet stavby po oddieloch s označením pôvodu množstva (projekt / výpočet / odhad), hromadná úprava cien, export; domy možno počítať aj cieľovými sadzbami na m² |
| Jednotky a cenník | Byty s plochami, automatický cenník podľa predajnej plochy, stav predaja |
| Klienti a obchod | Záujemcovia podľa fázy obchodu, história komunikácie, splátkové kalendáre |
| Harmonogram | Fázy výstavby v časovom pláne, sezónne obmedzenie prác, etapizácia domov |
| Dodávatelia a tendre | Tendrové balíky z oddielov výkazu výmer, porovnanie ponúk s rozpočtom, adresár |
| Povolenia a dokumenty | Kontrolný zoznam krokov podľa chorvátskych predpisov, register dokumentov s odkazmi |
| Riziká, Úlohy | Register rizík s maticou, zoznam úloh s termínmi |
| Nastavenia a dáta | Export / import JSON, obnova, informácie o ukladaní, uvítanie a asistent |

Všetky čísla sa prepočítavajú z jedného modelu (`src/lib/calc.ts`): zmena ceny vo
výkaze výmer, posun fázy v harmonograme alebo rezervácia bytu sa okamžite prejaví
v rozpočte, cash-flow aj ukazovateľoch.

### Rozpočet stavby: položky alebo sadzby na m²

Stavba domov sa štandardne počíta súčtom položiek výkazu výmer. Kým nie sú ponuky
zhotoviteľov, možno ju v module Výkaz výmer (karta Rozpočet stavby) prepnúť na
**cieľové sadzby na m²** – zvlášť pre interiér bytov, pre terasy a lodžie a pre
schodisko so spoločnými priestormi (`settings.construction`):

- Plochy bytov a terás sa berú z jednotiek, plocha spoločných priestorov v jednom dome
  sa zadáva v karte.
- Výkaz výmer ostáva zachovaný. Suma podľa sadzieb sa medzi oddiely domu rozloží v pomere
  ich položkových súm, takže tendrové balíky aj priebeh nákladov v čase platia ďalej;
  pri každom oddiele je vidieť sumu položiek aj sumu v rozpočte.
- Oddiel, ktorý sadzby nezahŕňajú (napríklad bazén), sa označí „Počítať z položiek aj
  pri sadzbách". Areálové oddiely (cesta, parkovanie, prípojky, oplotenie, zeleň) sa
  počítajú z položiek vždy.
- Karta ukazuje celý rozpočet stavby na jednom mieste a porovnanie so sumou, ktorú by
  nahradené práce stáli podľa položiek výkazu.

Sadzby a ostatné nákladové údaje sú len v dátach projektu, nie v repozitári.

### DPH z predaja a príjem z prenájmu

Prehľad ukazuje veľkým dva údaje pre rozhodovanie medzi predajom hneď a predajom po
období prenájmu:

- **DPH z predaja** – daň obsiahnutá v cenníkových cenách (`salesVat` v
  `src/lib/calc.ts`). Podľa chorvátskeho zákona o DPH je dodanie stavby oslobodené, ak
  od začatia jej užívania uplynuli viac než dva roky; kupujúci vtedy platí daň z prevodu
  nehnuteľností a predávajúci opravuje odpočítanú daň. Aplikácia to len pripomína –
  postup treba potvrdiť s daňovým poradcom.
- **Príjem z prenájmu za sezónu** – buď vypočítaný z cien za noc a počtu obsadených
  nocí, alebo zadaný priamo (Ekonomika → Stratégie → Predpoklady prenájmu,
  `settings.rent.seasonIncome`). Zadaný údaj použije aj porovnanie stratégií.

## Spustenie

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm test
```

```bash
npm run lint
```

`npm run build:single` zabalí aplikáciu do jedného súboru `dist-single/index.html`,
ktorý sa dá otvoriť priamo z disku alebo poslať e-mailom. `npm run build:artifact`
pripraví stránku na zverejnenie s prihlásením (`dist-artifact/page.html`).
`npm run build:web` zostaví verejný web do `dist-web` (prezentačná stránka a CRM
pod `/crm/`); `npm run dev:web` ho spustí pri vývoji.

## Dáta projektu

- **Bez súkromných dát** (zostavenie z repozitára) aplikácia po otvorení ponúkne
  import JSON alebo ukážkový projekt.
- **So súkromnými dátami:** ak pri zostavení existuje `private/*.params.json`
  (parametre projektu – pozemky, geometria domov, byty, sadzby), aplikácia sa nimi
  po prvom otvorení naplní. Z parametrov sa vygeneruje výkaz výmer, rozpočet,
  harmonogram, kontrolný zoznam povolení, riziká a úlohy
  (`src/data/templates.ts`, `src/data/boqTemplate.ts`).
- Dáta sa ukladajú do `localStorage` prehliadača. Zálohu a prenos medzi
  zariadeniami rieši export / import v časti Nastavenia a dáta.

## Štruktúra

```
src/
  types.ts              dátový model
  lib/calc.ts           výpočtový model (tržby, náklady, cash-flow, financovanie, IRR)
  lib/calc.test.ts      testy modelu
  lib/storage.ts        ukladanie do prehliadača, kontrola načítaných dát
  lib/platform.ts       rozpoznanie hostiteľa a jeho schopností
  lib/remote.ts         spoločná databáza stránky (zápis po častiach, zmeny od iných)
  lib/remote.test.ts    testy spoločného úložiska
  lib/export.ts         export JSON a CSV
  lib/media.ts          obrázky projektu: zdroj, titulný obrázok, nahrávanie do úložiska stránky
  lib/briefing.ts       pozdrav asistenta a stav projektu vo vetách (slovensky, anglicky)
  lib/chime.ts          úvodná zvučka poskladaná v prehliadači (Web Audio)
  lib/speech.ts         hlas: služba hostiteľa, hlas zariadenia alebo titulky
  lib/prefs.ts          osobné nastavenia uvítania a asistenta
  AssistantProvider.tsx zvučka, hlas a titulky dostupné v celej aplikácii
  AppShell.tsx          kostra aplikácie: menu, horná lišta, aplikácia nad spoločnou databázou
  extensions.ts         čo aplikácii dodá prostredie (účet, správa prístupov, stránky navyše)
  web/                  web s vlastným prihlásením: Supabase, prihlasovacie obrazovky,
                        prístupové kódy, dopyty z verejnej stránky, súkromné obrázky
  site/                 prezentačná stránka: štýly, pohyb a skladanie jazykových verzií
                        (pages.ts); obsah je v šablóne a slovníkoch vo web/
  data/templates.ts     vytvorenie projektu z parametrov, šablóny nákladov, povolení, rizík
  data/boqTemplate.ts   generátor výkazu výmer z geometrie stavby
  data/demo.ts          vymyslený ukážkový projekt
  modules/              obrazovky aplikácie
  ui/                   komponenty, grafy a pomôcky pre pohyb
web/
  site.template.html    prezentačná stránka: stavba so značkami namiesto textov
  i18n/                 slovník pre každý jazyk (sk, en, hr, de, hu)
  index.html, en/, hr/, de/, hu/
                        značky jazykových verzií – obsah vzniká pri zostavení
  crm/index.html        vstup do CRM s vlastným prihlásením
  img/                  fotografie okolia s uvedením autorov (CREDITS.md)
  public/               nastavenie servera, robots.txt, ikona
supabase/
  schema.sql            schéma databázy, pravidlá prístupu a úložisko súborov
  functions/crm-join/   vytvorenie prístupu jednorazovým kódom
scripts/                kontroly a príprava zostavení
```

## Vzhľad a pohyb

Rozhranie tvorí bočný panel, sklenená horná lišta a biele karty na šedom podklade
so systémovým písmom, vo svetlej aj tmavej téme. Farby, zaoblenia a krivky pohybu
sú tokeny v `src/index.css`.

- Stránky a karty pri otvorení nabiehajú postupne, čísla sa dopočítajú, čiary
  grafov sa dokreslia a stĺpce vyrastú.
- Aktívna položka menu a segmentového prepínača má posuvný podklad, okná a menu
  majú animáciu otvorenia aj zatvorenia.
- Kto má v systéme vypnutý pohyb (`prefers-reduced-motion`), dostane stránku hneď
  v pokojnom stave.

## Uvítanie a asistent

Po otvorení sa ukáže uvítacia obrazovka s pozdravom podľa dennej doby. Vstup spustí
krátku zvučku a asistent povie stav projektu: predaj, najbližší míľnik, úlohy
s termínom, lehotu zo stavebného povolenia a výsledok modelu.

- Zvučka je pôvodný zvuk poskladaný pri prehratí (`src/lib/chime.ts`), nie nahrávka.
- Hlas je na stránke s prihlásením služba hostiteľa; kde ju zobrazenie neponúka,
  použije sa miestny hlas zariadenia, inak sa pozdrav ukáže ako titulky. Titulky
  s tlačidlom na zastavenie sú na obrazovke vždy.
- Meno na oslovenie prichádza z prihlásenia hostiteľa; dá sa prepísať v časti
  Nastavenia a dáta, kde sa volí aj meno asistenta, jazyk, tempo a vypnutie zvuku.
- Prehľad sa dá kedykoľvek prehrať znova tlačidlom v hornej lište.

## Obrázky projektu

Obrázky sú dáta projektu, nie súčasť kódu. Záznam o obrázku (názov, druh, rozmery)
je v kolekcii `media`; samotný súbor je

- na stránke s prihlásením v úložisku súborov stránky (záznam drží jeho
  identifikátor), kde ich môže pridávať a mazať ten, kto smie stránku upravovať,
- v súkromnom samostatnom zostavení pribalený z priečinka `private/media/`
  (zoznam je v `private/*.params.json` pod kľúčom `media`).

Čiarové kresby s priehľadným pozadím sa farbia farbou textu, takže fungujú vo
svetlej aj tmavej téme; výkresy na bielom podklade sa v tmavej téme invertujú.

## Tri podoby aplikácie

**Samostatná aplikácia** (`npm run build`, `npm run build:single`) ukladá dáta do
úložiska prehliadača. Hodí sa na prácu jedného človeka alebo na vlastný web; dáta
sa medzi zariadeniami prenášajú exportom a importom JSON.

**Stránka s prihlásením** (`npm run build:artifact`) je určená na zverejnenie ako
súkromná stránka na claude.ai. Prístup riadi prihlásenie a zdieľanie hostiteľa a
dáta sú v databáze stránky, spoločné pre všetkých, ktorí k nej majú prístup:

- `src/lib/platform.ts` zistí, či aplikácia beží u hostiteľa, a sprostredkuje jeho
  schopnosti. Stránka pri zverejnení deklaruje `db` (databáza), `user` s rozsahom
  `profile` (meno na oslovenie), `downloads` (ukladanie súborov), `assets`
  (obrázky) a `tts` (hlas).
- `src/lib/remote.ts` rozdelí projekt na časti – jadro a každú kolekciu zvlášť –
  a každú drží ako jeden dokument v kolekcii `crm`. Zapisujú sa len zmenené časti,
  zmeny od ostatných sa preberajú priebežne; v rámci jednej časti platí posledný
  zápis.
- Kto má stránku len na čítanie, vidí dáta, ale jeho úpravy sa neukladajú.
- Zostavenie pre zverejnenie nikdy neobsahuje súkromné parametre ani obrázky
  projektu (`scripts/build-artifact.mjs` to kontroluje); dáta sa do databázy nahrajú až po
  zverejnení alebo importom JSON priamo v stránke.

**Verejný web s vlastným prihlásením** (`npm run build:web`) je opísaný nižšie.

Samostatnú aplikáciu so súkromnými dátami nedávajte na verejnú adresu bez ochrany
prístupu: údaje zabudované do stránky by si mohol prečítať ktokoľvek.

## Verejný web

`npm run build:web` zostaví do `dist-web` web, ktorý sa nahrá na bežný webhosting
(stačí statický obsah):

- **`/` – prezentačná stránka projektu** v slovenčine a jej jazykové verzie na
  `/en/`, `/hr/`, `/de/` a `/hu/`. Statické HTML so štýlmi a pohybom v `src/site/`.
  Funguje aj bez JavaScriptu; skript pridáva striedanie záberov v úvode,
  zobrazovanie pri rolovaní, výber podlažia, galériu a formulár. Písmo aj obrázky
  sú na vlastnej doméne – stránka nenačítava obsah tretích strán a nepoužíva
  súbory cookie. Dopyt z formulára sa uloží do tabuľky `inquiries`.
- **`/crm/` – CRM s prihlásením.** Tá istá aplikácia nad databázou Supabase
  (`src/web/`), v slovenčine. Vpravo hore na prezentačnej stránke je odkaz
  Prihlásenie. Aplikácia sa spustí len cez zabezpečené pripojenie (https); cez
  http namiesto prihlásenia ponúkne zabezpečenú adresu.

### Jazykové verzie

Stránka má jednu šablónu (`web/site.template.html`) a pre každý jazyk slovník
(`web/i18n/<kód>.json`). Pri zostavení z nich vznikne samostatná stránka pre každý
jazyk (`src/site/pages.ts`, zapojené vo `vite.config.ts`), takže texty sú priamo
v HTML a vyhľadávače vidia každú verziu na vlastnej adrese.

- **Úprava textu:** zmeniť hodnotu v slovníku daného jazyka. **Nový text:** pridať
  značku `{{kľúč}}` do šablóny a kľúč do všetkých piatich slovníkov.
- Zostavenie aj testy (`src/site/pages.test.ts`) zlyhajú, ak v niektorom jazyku
  preklad chýba, je prázdny alebo má iné čísla (výmery, počty, vzdialenosti) než
  slovenský originál.
- **Prepínač jazykov** je v navigácii vedľa Prihlásenia a v menu na telefóne; sú
  to obyčajné odkazy, fungujú aj bez skriptu. Po prepnutí sa návštevník ocitne
  v tej istej časti stránky.
- Zvolený jazyk si prehliadač zapamätá: pri ďalšom príchode na úvodnú adresu sa
  otvorí rovno v ňom (`web/public/boot-site.js`). Nič sa neprepína podľa jazyka
  prehliadača – návštevníkovi s iným jazykom stránka prepnutie len ponúkne malou
  kartou v jeho reči.
- Formulár posiela s dopytom aj jazyk stránky (stĺpec `lang`); v CRM je pri
  dopyte vidieť a prenesie sa do poľa Jazyk komunikácie klienta. Hodnoty záujmu
  idú do CRM vždy v slovenčine, nech je stránka v akomkoľvek jazyku.
- S nastavenou adresou webu (`VITE_SITE_URL` v `.env.web`) dostane každá stránka
  vlastnú kanonickú adresu, odkazy `hreflang` na ostatné jazyky a úplnú adresu
  obrázka pre náhľad odkazu.

Preklady do angličtiny, chorvátčiny, nemčiny a maďarčiny treba pred propagáciou
stránky dať prečítať rodenému hovoriacemu.

### Vizualizácie a poloha domov

Časť Projekt ukazuje šesť vizualizácií domov a časť Lokalita zábery z výšky s polohou
domov voči moru. Obrázky sú podkladmi investora a **nie sú v repozitári** (repozitár
je verejný): ležia v priečinku `web/public/vizualizacie/`, ktorý Git ignoruje, a na
web idú pri zostavení.

- Keď pri zostavení v priečinku sú, stránka obe časti ukáže. Keď nie sú, časti sa
  vynechajú a `scripts/check-web.mjs` na to upozorní; ak je v priečinku len časť
  súborov, zostavenie skončí chybou.
- `npm run visuals` stiahne chýbajúce súbory z nasadeného webu (`VITE_SITE_URL`).
  Robí to aj workflow nasadenia, takže automatické zostavenie má stránku celú.
- Zoznam súborov určuje šablóna (`/vizualizacie/…` vo `web/site.template.html`):
  vizualizácie `terasy`, `strecha`, `bazen-zhora`, `tri-domy`, `priecelie` a
  `pri-bazene` (každá ako `-800.webp` a `-1600.webp`, pomer strán 16 : 9) a zábery
  `poloha-920.webp`, `pozemok-567.webp` a `pozemok-more-721.webp`.
- Vizualizácia domov zasadených do leteckého záberu (`poloha-*.webp`) je voliteľná:
  bez nej blok Poloha ukáže len skutočné zábery pozemku a zostavenie na to upozorní.
- Nová vizualizácia: uložiť ju v oboch veľkostiach do priečinka, pridať dlaždicu do
  šablóny a texty `viz.N.*` do slovníkov. Kliknutím sa na stránke otvorí väčšia verzia.
- Vzdialenosť od pláže (30 m) je údaj investora, braný od hranice pozemku. Stránka ho
  uvádza v úvode, v zozname vzdialeností, v bloku Poloha a medzi bodmi projektu
  (`hero.sub`, `dist.seaValue`, `spot.text`, `place.sea.text`, `feat.beach.title`,
  `meta.description`); pri zmene ho treba upraviť na všetkých miestach a vo všetkých
  jazykoch – testy strážia, že sa nerozíde.

### Pôdorysy a ceny

Časť Apartmány ukazuje pri každom podlaží cenu oboch typov a pod tým blok Pôdorysy a
ceny: pôdorys typu, miestnosti s výmerami a ceny podľa podlažia vrátane parkovacieho
miesta.

- **Ceny sú v `web/prices.json`** (`two` a `one` sú ceny apartmánu s dvoma a s jednou
  spálňou pre prízemie, 1. a 2. poschodie; `parking` je parkovacie miesto). Sú to
  cenníkové ceny s DPH z CRM, časť Jednotky. **Web si ich z CRM nečíta sám** – po zmene
  cien v CRM treba súbor upraviť a web znova nasadiť.
- V CRM môže mať každý typ bytu vlastnú základnú cenu za m² predajnej plochy (Jednotky →
  Nastavenie cenníka, `pricing.baseByBedrooms`); kde ju typ nemá, platí spoločná.
- Pod nadpisom bloku je zoznam toho, čo je v cene apartmánu (`plans.inc.*`).
- CRM na rozdiel upozorní: keď sa ceny voľných bytov alebo parkovania v časti Jednotky
  líšia od `web/prices.json`, nad cenníkom sa ukáže, ktoré ceny web uvádza inak
  (`src/lib/publicPrices.ts`).
- Šablóna sa na cenu odvoláva značkou `{{@price:two.0}}` a výmeru zapisuje ako
  `{{@area:29.72}}`; zostavenie ich vypíše podľa jazyka stránky (304 500 €, €304,500,
  304.500 €; 29,72 m², 29.72 m²). Čísla tak nie sú v slovníkoch a nemôžu sa medzi
  jazykmi rozísť.
- Pôdorysy (`podorys-2-spalne-*.webp`, `podorys-1-spalna-*.webp`) sú výrezy z projektovej
  dokumentácie bez rohovej pečiatky. Ležia pri vizualizáciách, mimo repozitára; bez nich
  stránka ukáže popis a ceny bez obrázka.

### Prístup do CRM

Účty nevznikajú verejnou registráciou. Prístup sa vytvára **jednorazovým kódom**:

1. Prvý vlastník použije kód vlastníka (v databáze je uložený len jeho odtlačok).
   Na prihlasovacej obrazovke zvolí „Mám prístupový kód“, zadá meno, e-mail, heslo
   a kód.
2. Vlastník potom v časti Nastavenia a dáta pozýva ďalších ľudí: zadá e-mail a
   oprávnenie, systém vydá kód viazaný na tento e-mail (platí 14 dní, raz). Kód
   pošle pozvanému sám – systém e-maily neodosiela.
3. Zabudnuté heslo sa rieši novou pozvánkou na ten istý e-mail.

Oprávnenia: **vlastník** (všetko vrátane prístupov), **môže upravovať**, **len na
čítanie**. Pravidlá vynucuje databáza (RLS v `supabase/schema.sql`), nie aplikácia:
neprihlásený ani nečlen sa k dátam nedostane ani priamou požiadavkou. Členstvo je
viazané na konkrétny účet a odobratie prístupu platí okamžite.

Kód overuje funkcia Edge `crm-join` (`supabase/functions/crm-join`), ktorá ako
jediná pracuje so servisným kľúčom; ten nie je v stránke ani v repozitári.

### Čo je kde uložené

| Čo | Kde |
|---|---|
| Dáta projektu (19 častí) | tabuľka `crm_docs`, zmeny sa medzi otvorenými oknami prenášajú priebežne |
| Obrázky projektu | súkromné úložisko `crm-media`, čítanie cez dočasné adresy pre členov |
| Dopyty z formulára | tabuľka `inquiries`; v CRM sú v časti Dopyty z webu a jedným kliknutím sa z nich stáva klient |
| Čiarová kresba domu na prezentačnej stránke | verejné úložisko `site` |
| Vizualizácie a zábery polohy | priečinok `vizualizacie/` na hostingu; v repozitári nie sú |

Adresa projektu Supabase a jeho verejný kľúč sú v `.env.web`. Kľúč je určený do
kódu stránky a nič neodomyká.

### Kontaktný e-mail a e-mail o novom dopyte

Adresa vo `VITE_CONTACT_EMAIL` (`.env.web`) sa zobrazí pri formulári, v pätičke a
v časti Ochrana osobných údajov. Bez nej stránka odkazuje len na formulár.

Každý nový dopyt sa okrem uloženia do CRM pošle aj e-mailom:

1. Po uložení dopytu zavolá databáza skript `notify.php` na hostingu (spúšťač
   `inquiries_notify` v `supabase/schema.sql`, rozšírenie `pg_net`).
2. Skript overí podpis požiadavky (HMAC-SHA256 kľúčom, ktorý pozná len databáza a
   hosting) a pošle správu funkciou `mail()`. V poli Odpovedať komu je adresa
   záujemcu, takže na upozornenie sa dá rovno odpovedať.
3. Zlyhanie upozornenia uloženie dopytu neovplyvní – dopyt je v CRM vždy.

Nastavuje sa raz, mimo repozitára:

- Na hostingu súbor `jh-notify.config.php` **o priečinok vyššie než web** (mimo
  dosahu prehliadača):

  ```php
  <?php
  return [
      'secret' => '<kľúč z databázy>',
      'to' => 'info@jadranhills.com',    // kam upozornenia chodia
      'from' => 'info@jadranhills.com',  // odosielateľ – schránka na tej istej doméne
      'site' => 'https://jadranhills.com/',
  ];
  ```

  Ak hosting skriptu čítanie mimo webu nedovolí, môže súbor ležať priamo vo webe
  pod názvom `.jh-notify.config.php`; `.htaccess` ho von neposiela.
- V databáze kľúč a adresa skriptu (`crm_setup.notify_secret`, `crm_setup.notify_url`;
  príkazy sú na konci `supabase/schema.sql`). Kým adresa nie je nastavená, nič sa
  neposiela.
- Schránka príjemcu musí na hostingu existovať.

Skript odpovedá stavom `sent`, `not_configured` (chýba súbor s nastavením), `time`
alebo `signature` (neplatná požiadavka), `mail_failed` (hosting správu neprijal).
Odpovede na posledné volania si databáza niekoľko hodín pamätá v tabuľke
`net._http_response`.

### Nasadenie

Web beží na doméne jadranhills.com. Na hosting sa nahráva celý obsah priečinka
`dist-web` do webového priečinka domény (vrátane skrytých súborov `.htaccess`);
súbory v `assets/` majú v názve odtlačok obsahu, staré verzie preto môžu ostať.
S webom sa nahrá aj skript `notify.php`; jeho nastavenie (`jh-notify.config.php`) sa
na hosting ukladá zvlášť a pri ďalších nahratiach sa neprepisuje.

Workflow `.github/workflows/deploy-jadran-hills.yml` web zostaví a nahrá cez FTP.
Spustí sa ručne alebo pri zmene v tomto priečinku na vetve `main`; bez nastavených
údajov hostingu sa preskočí. Potrebné GitHub Secrets: `JH_FTP_SERVER`,
`JH_FTP_USERNAME`, `JH_FTP_PASSWORD`, voliteľne `JH_FTP_DIR` (webový priečinok
domény). Prístupové údaje k hostingu do repozitára nepatria.

Kde sa z prostredia na hosting nedá pripojiť cez FTP, nahrá ten istý obsah
`scripts/upload-webftp.cjs` cez webového správcu súborov hostingu (odkaz s prístupom
číta zo súboru mimo repozitára).

Na hostingu a v službách okolo treba mať nastavené:

- **certifikát SSL** – bez neho sa CRM neotvorí a adresy pre vyhľadávače
  (`https://…`) nefungujú; presmerovanie z http na https rieši `.htaccess`,
- prevádzkovateľa a kontakt v časti Ochrana osobných údajov (text
  `privacy.who.text` vo všetkých slovníkoch `web/i18n/`),
- v Supabase adresu stránky (Authentication → URL Configuration: Site URL a
  Redirect URLs na `https://…/crm/`), aby fungoval odkaz na obnovu hesla e-mailom,
- zvážiť platený plán Supabase: projekt na bezplatnom pláne sa po týždni bez
  aktivity pozastaví a treba ho ručne obnoviť.

`scripts/check-web.mjs` po zostavení overí, že vo výstupe nie je nič zo súkromného
priečinka, že každá jazyková verzia je celá a vedie na ostatné a že prezentačná
stránka nepribalila kód aplikácie.

## Upozornenie

Výkaz výmer a ekonomický model sú orientačné podklady na rozhodovanie. Množstvá
označené ako odhad a jednotkové ceny treba pred tendrom nahradiť podrobným výkazom
z realizačného projektu a ponukami zhotoviteľov; daňové a právne otázky potvrdiť
u poradcov v Chorvátsku.
