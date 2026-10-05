# Firemná aplikácia – SX Workforce s.r.o.

Webová a mobilná aplikácia pre personálnu agentúru, ktorá poskytuje (prenajíma) pracovníkov stavebným firmám v Nemecku. Beží na vlastnom serveri, používatelia sa prihlasujú cez internet (web, PWA na telefóne alebo aplikácia z App Store / Google Play). Rozhranie je v slovenčine, doklady pre klientov v nemčine alebo slovenčine, výplatné pásky aj v ukrajinčine.

## Moduly

| Modul | Čo robí |
|---|---|
| **Prehľad** | KPI za mesiac, faktúry po splatnosti, nespárované platby, zádržné, moje úlohy, compliance upozornenia |
| **Úlohy** | kto komu čo zadal, stav, priorita, termín, komentáre a história |
| **Zákazky** | stavby klientov: voľná / rozpracovaná / ukončená, termíny, potrebný počet pracovníkov, SOKA-BAU, krajina |
| **Plánovanie** | kalendár nasadení kto-kde-kedy (nasadenie, doma, dovolenka, PN), obsadenosť zákaziek, voľní pracovníci; z plánu sa predvyplnia hodinové lístky |
| **Hodinové lístky** | týždenný lístok podľa zákazky, pracovníci ako riadky, hodiny alebo časy od–do s prestávkami (MiLoG § 17), nočné hodiny, kontrola ArbZG (10 h/deň), nemecký **Stundenzettel** na tlač, **podpis vedúceho stavby na obrazovke**, fotky papierových lístkov |
| **Pracovníci** | osobné a mzdové údaje, IBAN, nemčina, veľkosti OOPP; **doklady s expiráciou** (A1, pas, povolenie na pobyt, vízum Vander Elst, lekárska, SCC…), **hlásenia vyslania** (Meldeportal), zálohy/zrážky/bonusy, história lístkov, ubytovanie, AÜG počítadlo |
| **Compliance DE** | platnosť povolenia AÜG/ADZ a Freistellungsbescheinigung, expirujúce a chýbajúce doklady, neohlásené vyslania, **AÜG limity 9 mesiacov (Equal Pay) a 18 mesiacov** u jedného klienta, **SOKA-BAU** mesačný výkaz hodín (CSV) |
| **Klienti** | IČO/HRB, USt-IdNr., Handelsregister, jazyk dokladov, **režim DPH** (prenesenie v EÚ, tuzemské, štandard), SOKA-BAU, Bauabzugsteuer, splatnosť, zádržné, skonto; **cenníky podľa profesie s príplatkami** (nadčas, sobota, nedeľa, noc); **zmluvy** (AÜG, Werkvertrag) s prílohami |
| **Ponuky** | cenové ponuky SK/DE, PDF, odoslanie e-mailom, prevod na faktúru |
| **Fakturácia** | faktúra zo schválených hodín s automatickými príplatkami podľa cenníka, ručné faktúry, **DE/SK faktúra v PDF**, odoslanie e-mailom, **XRechnung** (UBL, EN 16931) pre nemeckých odberateľov, prenesenie DPH v EÚ s povinnými textami, zádržné, skonto, **Bauabzugsteuer 15 %** (ak nie je platná Freistellungsbescheinigung), **súhrnný výkaz DPH** po štvrťrokoch, prehľad úhrad |
| **Upomienky** | automaticky denne, 3 stupne, v jazyku klienta; nemecká Mahnung s úrokom z omeškania a paušálom 40 € (§ 288 BGB), s PDF faktúry |
| **Banka a platby** | import výpisov camt.053 XML, CSV, **MT940** ručne alebo automaticky z e-mailovej schránky (IMAP), párovanie podľa VS, sumy, skonta, zádržného a názvu klienta |
| **Vyúčtovanie pracovníkov** | mesačne: hodiny × mzda + diéty (DE) + bonusy − zálohy − zrážky, výplatná páska **SK / UA / DE**, stav koncept → schválené → vyplatené (zapíše sa do nákladov) |
| **Ubytovanie** | ubytovne v DE, kapacita, kto kde býva, cena za noc, hradí firma / zrážka pracovníkovi / preúčtovanie klientovi, mesačné náklady, automatické zrážky |
| **Vozidlá** | vozidlá so STK a poistením, kniha jázd (vodič, trasa, km, náklady), náklady do účtovníctva |
| **Náklady** | kategórie, DPH, opakujúce sa mesačné náklady, priradenie k pracovníkovi alebo zákazke |
| **Zisk a prehľady** | mesačný zisk, ziskovosť podľa zákaziek a pracovníkov, pohľadávky |
| **Financie** | cash-flow výhľad na 8 týždňov, skutočná ziskovosť vrátane diét, ubytovania a dopravy, **exporty CSV pre účtovníctvo** (faktúry, úhrady, náklady, vyúčtovania, hodiny) |
| **AI asistent** | nájde faktúry, zákazky, lístky, pracovníkov, úlohy, platby a poradí, ako aplikáciu používať (Claude API) |
| **Nastavenia** | firma, Nemecko/compliance, fakturácia, upomienky SK/DE, SMTP, IMAP, AI, používatelia a pozvánky, zálohy |

## Používatelia a roly

Prihlásiť sa môže každý, kto dostane **pozvánku** (Nastavenia → Používatelia → Pozvať): odkaz platí 14 dní, osoba si sama zvolí meno a heslo. Zabudnuté heslo sa obnovuje e-mailom. Roly:

- **Administrátor** – všetko vrátane nastavení a používateľov
- **Kancelária** – všetko okrem nastavení a banky
- **Dispečer** – pracovníci, zákazky, lístky, plánovanie, compliance, ubytovanie, vozidlá, úlohy
- **Účtovníctvo** – fakturácia, ponuky, banka, náklady, vyúčtovania, prehľady, financie
- **Pracovník** – iba vlastný portál: svoje hodiny, vyúčtovania, doklady, plán, úlohy

## Spustenie

Požiadavky: **Node.js 22.5+** (vstavaný SQLite, nič sa nekompiluje).

Windows: dvojklik na `START.bat` (nainštaluje Node.js, závislosti, spustí). macOS/Linux: `./start.sh`. Ručne:
```bash
npm install
cp .env.example .env     # SESSION_SECRET, ADMIN_PASSWORD
npm start
```
<http://localhost:3000>, prihlásenie `admin` / heslo z `.env` (predvolene `admin`). Ukážkové dáta: `npm run demo`. Testy: `npm test`. Jednoduchý návod pre nových používateľov: [AKO_ZACAT.md](AKO_ZACAT.md).

**Nasadenie na internet (HTTPS, Docker, aktualizácie, zálohy):** pozri [DEPLOY.md](DEPLOY.md).
**Mobilná aplikácia pre App Store a Google Play:** pozri [mobile/README.md](mobile/README.md). Web funguje aj ako PWA (na telefóne „Pridať na plochu“).

## Aktualizácie bez straty dát

Databáza je jeden súbor `data/app.db`, prílohy sú v `data/uploads`. Každá nová verzia aplikácie má číslo schémy; pri štarte sa porovná s databázou, **najprv sa vytvorí záloha** (`data/backups/app-before-vX-….db`) a potom sa aplikujú migrácie, ktoré iba pridávajú tabuľky a stĺpce. Údaje sa nikdy nemažú ani neprepisujú. Nočná záloha beží o 2:30, ručná v Nastavenia → Zálohy, odporúčaný externý skript `scripts-backup.sh`.

## Prvé kroky

1. **Nastavenia → Firma**: IBAN, e-mail, zápis v registri, verejná adresa aplikácie.
2. **Nastavenia → Nemecko / compliance**: číslo a platnosť povolenia AÜG/ADZ, Freistellungsbescheinigung, SOKA, sadzba diét.
3. **Nastavenia → Používatelia**: pozvite kolegov s rolami.
4. **Klienti**: nemecký klient s USt-IdNr., režim „Prenesenie DPH v EÚ“, jazyk nemčina, cenník podľa profesií s príplatkami, zmluva AÜG.
5. **Pracovníci**: karta, mzda €/h, doklady A1 a pas s platnosťou, povolenia pre občanov tretích krajín, hlásenie vyslania.
6. **Zákazky a Plánovanie**: stavba s termínom a počtom pracovníkov, plán nasadení.
7. **Hodinové lístky**: týždenne, časy od–do, podpis vedúceho stavby, schválenie.
8. **Fakturácia**: faktúra z hodín, PDF, e-mail, XRechnung; **Banka**: výpisy a párovanie; **Vyúčtovanie**: výplaty pracovníkom.

## Automatický import bankových výpisov z e-mailu

Vytvorte schránku (napr. `vypisy@vasafirma.sk`), v internetbankingu nastavte zasielanie výpisov (camt.053 XML, CSV alebo MT940) a v **Nastavenia → Bankový e-mail (IMAP)** zadajte prístup. Aplikácia schránku pravidelne kontroluje, výpisy importuje (duplicity preskočí) a platby páruje:

| Situácia | Výsledok |
|---|---|
| VS = číslo faktúry a suma = suma k úhrade | **Uhradená** |
| suma = suma k úhrade − skonto v lehote | **Uhradená (skonto)** |
| VS sedí, suma nižšia | **Čiastočne uhradená** |
| faktúra uhradená, suma = zádržné | **zádržné vyplatené** |
| nejednoznačné | ostáva v *Nespárované* s návrhmi |

## AI asistent

**Nastavenia → AI asistent**: API kľúč z <https://console.anthropic.com> (alebo premenná `ANTHROPIC_API_KEY`). Asistent odpovedá po slovensky, na otázky o dátach používa vyhľadávacie nástroje nad databázou (do AI služby idú iba výsledky vyhľadávania), dáta nemení.

## Štruktúra projektu

```
server.js                 – Express server, roly, CSRF ochrana, plánovač (upomienky, IMAP, nočná záloha)
src/db.js                 – SQLite schéma, verzované migrácie, zálohy, nastavenia
src/auth.js, session-store.js – roly a prístupy, prihlásenie uložené v DB
src/services/             – invoices, pdf, xrechnung, i18n, compliance, settlements, matching, bankparser,
                            imap, mailer, reminders, reports, attachments, assistant
src/routes/               – stránky (workers, compliance, planning, timesheets, clients, quotes, invoices,
                            bank, lodging, vehicles, settlements, finance, portal, settings, assistant …)
src/views/                – šablóny EJS
public/                   – CSS, JS, PWA manifest, service worker, ikony, písma pre PDF
mobile/                   – Capacitor projekt pre iOS a Android
docker-compose.yml, Caddyfile, Dockerfile, DEPLOY.md – nasadenie s HTTPS
test/                     – automatické testy (`npm test`)
```

## Právne poznámky

Aplikácia pomáha evidovať povinnosti pri vysielaní pracovníkov do Nemecka (A1, hlásenie vyslania, AÜG limity, MiLoG záznamy pracovného času, SOKA-BAU, Bauabzugsteuer, prenesenie DPH, súhrnný výkaz), ale nenahrádza daňového poradcu ani právnika. Sadzby (DPH, diéty, úroky z omeškania) sú nastaviteľné a treba ich udržiavať aktuálne. XRechnung export je základná štruktúra EN 16931; pred ostrým použitím ho overte validátorom KoSIT alebo u odberateľa.
