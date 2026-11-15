# Jadran Hills – CRM developerského projektu

Interná webová aplikácia na riadenie developerského projektu: ekonomika, výkaz
výmer, cenník a predaj, harmonogram, tendre, povolenia, riziká a úlohy. Beží celá
v prehliadači, bez servera.

> **Dôverné dáta projektu nie sú v repozitári.** Repozitár je verejný, preto
> obsahuje len kód aplikácie a vymyslený ukážkový projekt. Skutočné údaje
> (pozemky, ceny, klienti, ponuky) sa do aplikácie nahrávajú importom súboru JSON
> a zostávajú v prehliadači používateľa. Priečinok `private/` je v `.gitignore`.

## Moduly

| Modul | Čo robí |
|---|---|
| Prehľad | Hlavné ukazovatele, peňažné toky, body zvratu, míľniky, najbližšie úlohy a najväčšie riziká |
| Karta projektu | Základné údaje, pozemky s kúpnou cenou, domy a etapizácia, technické parametre so zdrojom |
| Ekonomika | Výsledovka, rozpočet nákladov (plán / zazmluvnené / uhradené), mesačný cash-flow, financovanie, scenáre a citlivosť, porovnanie stratégií |
| Výkaz výmer | Položkový rozpočet stavby po oddieloch s označením pôvodu množstva (projekt / výpočet / odhad), hromadná úprava cien, export |
| Jednotky a cenník | Byty s plochami, automatický cenník podľa predajnej plochy, stav predaja |
| Klienti a obchod | Záujemcovia podľa fázy obchodu, história komunikácie, splátkové kalendáre |
| Harmonogram | Fázy výstavby v časovom pláne, sezónne obmedzenie prác, etapizácia domov |
| Dodávatelia a tendre | Tendrové balíky z oddielov výkazu výmer, porovnanie ponúk s rozpočtom, adresár |
| Povolenia a dokumenty | Kontrolný zoznam krokov podľa chorvátskych predpisov, register dokumentov s odkazmi |
| Riziká, Úlohy | Register rizík s maticou, zoznam úloh s termínmi |
| Nastavenia a dáta | Export / import JSON, obnova, informácie o ukladaní |

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
  data/templates.ts     vytvorenie projektu z parametrov, šablóny nákladov, povolení, rizík
  data/boqTemplate.ts   generátor výkazu výmer z geometrie stavby
  data/demo.ts          vymyslený ukážkový projekt
  modules/              obrazovky aplikácie
  ui/                   komponenty a grafy
```

## Dve podoby aplikácie

**Samostatná aplikácia** (`npm run build`, `npm run build:single`) ukladá dáta do
úložiska prehliadača. Hodí sa na prácu jedného človeka alebo na vlastný web; dáta
sa medzi zariadeniami prenášajú exportom a importom JSON.

**Stránka s prihlásením** (`npm run build:artifact`) je určená na zverejnenie ako
súkromná stránka na claude.ai. Prístup riadi prihlásenie a zdieľanie hostiteľa a
dáta sú v databáze stránky, spoločné pre všetkých, ktorí k nej majú prístup:

- `src/lib/platform.ts` zistí, či aplikácia beží u hostiteľa, a sprostredkuje jeho
  schopnosti (databáza, ukladanie súborov).
- `src/lib/remote.ts` rozdelí projekt na časti – jadro a každú kolekciu zvlášť –
  a každú drží ako jeden dokument v kolekcii `crm`. Zapisujú sa len zmenené časti,
  zmeny od ostatných sa preberajú priebežne; v rámci jednej časti platí posledný
  zápis.
- Kto má stránku len na čítanie, vidí dáta, ale jeho úpravy sa neukladajú.
- Zostavenie pre zverejnenie nikdy neobsahuje súkromné parametre projektu
  (`scripts/build-artifact.mjs` to kontroluje); dáta sa do databázy nahrajú až po
  zverejnení alebo importom JSON priamo v stránke.

Samostatnú aplikáciu so súkromnými dátami nedávajte na verejnú adresu bez ochrany
prístupu: údaje zabudované do stránky by si mohol prečítať ktokoľvek.

## Upozornenie

Výkaz výmer a ekonomický model sú orientačné podklady na rozhodovanie. Množstvá
označené ako odhad a jednotkové ceny treba pred tendrom nahradiť podrobným výkazom
z realizačného projektu a ponukami zhotoviteľov; daňové a právne otázky potvrdiť
u poradcov v Chorvátsku.
