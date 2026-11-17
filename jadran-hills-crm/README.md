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
| Prehľad | Hlavné ukazovatele, peňažné toky, body zvratu, míľniky, najbližšie úlohy a najväčšie riziká |
| Karta projektu | Základné údaje, pozemky s kúpnou cenou, domy a etapizácia, technické parametre so zdrojom |
| Galéria | Pohľady, pôdorysy, rezy, situácia a fotografie; titulný obrázok pre prehľad a uvítanie, prehliadanie na celej obrazovke, nahrávanie |
| Ekonomika | Výsledovka, rozpočet nákladov (plán / zazmluvnené / uhradené), mesačný cash-flow, financovanie, scenáre a citlivosť, porovnanie stratégií |
| Výkaz výmer | Položkový rozpočet stavby po oddieloch s označením pôvodu množstva (projekt / výpočet / odhad), hromadná úprava cien, export |
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
  site/                 prezentačná stránka: štýly a pohyb (obsah je vo web/index.html)
  data/templates.ts     vytvorenie projektu z parametrov, šablóny nákladov, povolení, rizík
  data/boqTemplate.ts   generátor výkazu výmer z geometrie stavby
  data/demo.ts          vymyslený ukážkový projekt
  modules/              obrazovky aplikácie
  ui/                   komponenty, grafy a pomôcky pre pohyb
web/
  index.html            prezentačná stránka (texty, štruktúra)
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

`npm run build:web` zostaví do `dist-web` dve stránky, ktoré sa nahrajú na bežný
webhosting (stačí statický obsah):

- **`/` – prezentačná stránka projektu.** Statické HTML (`web/index.html`) so štýlmi
  a pohybom v `src/site/`. Funguje aj bez JavaScriptu; skript pridáva striedanie
  záberov v úvode, zobrazovanie pri rolovaní, výber podlažia, galériu a formulár.
  Písmo aj obrázky sú na vlastnej doméne – stránka nenačítava obsah tretích strán
  a nepoužíva súbory cookie. Dopyt z formulára sa uloží do tabuľky `inquiries`.
- **`/crm/` – CRM s prihlásením.** Tá istá aplikácia nad databázou Supabase
  (`src/web/`). Vpravo hore na prezentačnej stránke je odkaz Prihlásenie.

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

Adresa projektu Supabase a jeho verejný kľúč sú v `.env.web`. Kľúč je určený do
kódu stránky a nič neodomyká.

### Nasadenie

Workflow `.github/workflows/deploy-jadran-hills.yml` web zostaví a nahrá cez FTP.
Spustí sa ručne alebo pri zmene v tomto priečinku na vetve `main`; bez nastavených
údajov hostingu sa preskočí. Potrebné GitHub Secrets: `JH_FTP_SERVER`,
`JH_FTP_USERNAME`, `JH_FTP_PASSWORD`, voliteľne `JH_FTP_DIR`.

Pred spustením ostrej stránky:

- doplniť prevádzkovateľa a kontakt do časti Ochrana osobných údajov vo
  `web/index.html` (prvok `data-operator`),
- v Supabase nastaviť adresu stránky (Authentication → URL Configuration), aby
  fungoval odkaz na obnovu hesla e-mailom,
- zvážiť platený plán Supabase: projekt na bezplatnom pláne sa po týždni bez
  aktivity pozastaví a treba ho ručne obnoviť.

`scripts/check-web.mjs` po zostavení overí, že vo výstupe nie je nič zo súkromného
priečinka a že prezentačná stránka nepribalila kód aplikácie.
`scripts/build-preview.mjs` z výstupu pripraví náhľad prezentačnej stránky na
zverejnenie ako súkromná stránka na claude.ai.

## Upozornenie

Výkaz výmer a ekonomický model sú orientačné podklady na rozhodovanie. Množstvá
označené ako odhad a jednotkové ceny treba pred tendrom nahradiť podrobným výkazom
z realizačného projektu a ponukami zhotoviteľov; daňové a právne otázky potvrdiť
u poradcov v Chorvátsku.
