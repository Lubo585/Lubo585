# Firemná aplikácia – SX Workforce s.r.o.

Webová aplikácia pre personálnu agentúru v stavebníctve (SX Workforce s.r.o., IČO 55087019), ktorá prenajíma (zahraničných) pracovníkov stavebným firmám. Pokrýva:

- **Hodinové lístky** – týždenný lístok pre každú stavbu, riadky = pracovníci, hodiny Po–Ne, schvaľovanie, tlač, predvyplnenie pracovníkov z minulého týždňa.
- **Pracovníci** – národnosť, profesia, nákladová sadzba (mzda + odvody) a voliteľná fakturačná sadzba.
- **Klienti a stavby** – odberatelia s IČO/DIČ, splatnosťou, zádržným, skontom a prenesením daňovej povinnosti; stavby so sadzbou €/hod.
- **Fakturácia** – vystavenie faktúry jedným klikom zo schválených hodinových lístkov (zoskupené podľa pracovníka a stavby), ručné faktúry, iné poplatky a zrážky, DPH 23 % / prenesenie daňovej povinnosti, tlač do PDF cez prehliadač.
- **Skonto a zádržné** – automatický výpočet, sledovanie splatnosti zádržného, automatické uznanie skonta pri úhrade v lehote.
- **Sledovanie splatnosti a upomienky** – prehľad faktúr po splatnosti, automatické upomienky (1., 2., 3. stupeň) e-mailom každý deň o 8:00, ručné odoslanie s náhľadom.
- **Banka** – e-mailová schránka, do ktorej banka posiela výpisy (camt.053 XML alebo CSV); aplikácia ich pravidelne sťahuje cez IMAP, importuje a **automaticky páruje úhrady s vystavenými faktúrami** (podľa variabilného symbolu, sumy, sumy so skontom, zádržného a názvu klienta). Ručné nahratie výpisu, ručné párovanie, ignorovanie, vytvorenie nákladu z odchádzajúcej platby.
- **Náklady na chod firmy** – kategórie (ubytovanie, doprava, mzdy, poistenie…), DPH, opakujúce sa mesačné náklady, priradenie k pracovníkovi alebo stavbe.
- **Zisk a prehľady** – mesačný zisk (tržby − náklady − mzdy z hodín), ziskovosť podľa stavieb a pracovníkov, pohľadávky podľa klientov.

## Spustenie

Požiadavky: **Node.js 22.5 alebo novší** (používa vstavaný SQLite, netreba nič kompilovať).

```bash
npm install
cp .env.example .env        # upravte SESSION_SECRET
npm start
```

Aplikácia beží na <http://localhost:3000>. Prvé prihlásenie: **admin / admin** (heslo si hneď zmeňte v Nastavenia → Účet). Iné počiatočné heslo nastavíte premennou `ADMIN_PASSWORD` pri prvom spustení.

Databáza je jeden súbor `data/app.db` – zálohujte ho.

### Docker

```bash
docker build -t agentura-app .
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data -e SESSION_SECRET=nahodny-retazec --name agentura agentura-app
```

## Prvé kroky

1. **Nastavenia → Firma**: názov, sídlo, IČO, DIČ a IČ DPH sú predvyplnené podľa verejných registrov; doplňte **IBAN**, e-mail, telefón a zápis v obchodnom registri (tlačia sa na faktúru a používajú v upomienkach).
2. **Nastavenia → Fakturácia**: formát číslovania, DPH, splatnosť.
3. **Pracovníci**: pridajte pracovníkov s nákladovou sadzbou.
4. **Klienti a stavby**: pridajte klienta (splatnosť, zádržné %, skonto %, e-mail) a jeho stavby so sadzbou €/hod.
5. **Hodinové lístky**: vyberte stavbu a týždeň, pridajte pracovníkov, zapíšte hodiny, **Uložiť a schváliť**.
6. **Faktúry → Fakturovať odpracované hodiny**: vyberte klienta a obdobie, faktúra sa vystaví so zádržným a skontom podľa klienta.
7. **Banka**: nahrajte výpis alebo nastavte automatický import z e-mailu (nižšie).

## Automatický import bankových výpisov z e-mailu

1. Vytvorte samostatnú e-mailovú schránku, napr. `vypisy@vasafirma.sk` (funguje aj Gmail).
2. V internetbankingu nastavte **automatické zasielanie výpisov** na túto adresu vo formáte **XML camt.053** (Tatra banka, SLSP, VÚB, ČSOB, UniCredit, Fio… ho podporujú) alebo CSV.
3. **Nastavenia → Bankový e-mail (IMAP)**: server (napr. `imap.gmail.com`, port 993, SSL), prihlasovacie údaje, voliteľne filter odosielateľa (`@tatrabanka.sk`) a interval kontroly. Pri Gmail použite *heslo aplikácie* a zapnite IMAP.
4. Otestujte pripojenie a zapnite *Automaticky sťahovať výpisy*.

Aplikácia každých N minút stiahne neprečítané e-maily, prílohy `.xml`/`.csv` importuje (duplicity preskočí), označí e-mail ako prečítaný a prijaté platby spáruje:

| Situácia | Výsledok |
|---|---|
| VS = číslo faktúry a suma = suma k úhrade | faktúra **Uhradená** |
| VS sedí, suma = suma k úhrade − skonto, úhrada v lehote skonta | **Uhradená (skonto)** |
| VS sedí, suma nižšia | **Čiastočne uhradená** |
| VS sedí, faktúra uhradená, suma = zádržné | **zádržné vyplatené** |
| bez VS, ale suma a názov klienta sedia jednoznačne | spárované automaticky |
| nejednoznačné | ostáva v *Nespárované* s návrhmi na ručné spárovanie |

## Automatické upomienky

**Nastavenia → Odosielanie e-mailov (SMTP)** – nastavte SMTP server (Gmail: `smtp.gmail.com`, 587, heslo aplikácie) a otestujte.
**Nastavenia → Upomienky** – dni po splatnosti pre jednotlivé stupne (predvolene `3,14,30`), predmet a text so zástupnými premennými, zapnite automatické odosielanie. Každý stupeň sa pre faktúru odošle iba raz; história je pri faktúre. Klient musí mať vyplnený e-mail.

## Výpočet zisku

Zisk = fakturované tržby bez DPH − prevádzkové náklady bez DPH − mzdové náklady (odpracované hodiny × nákladová sadzba pracovníka). Ak v danom mesiaci zadáte skutočné mzdy do nákladov v kategórii *Mzdy a odvody*, mzdy z hodín sa nepočítajú, aby neboli započítané dvakrát.

## Štruktúra projektu

```
server.js               – Express server, plánovač (upomienky 8:00, IMAP každých N minút)
src/db.js               – SQLite schéma a nastavenia
src/services/invoices.js    – výpočty faktúr, číslovanie, skonto, zádržné, stavy
src/services/bankparser.js  – parser camt.053/054 XML a CSV výpisov
src/services/matching.js    – import a automatické párovanie platieb
src/services/imap.js        – sťahovanie výpisov z e-mailu
src/services/reminders.js   – upomienky
src/services/reports.js     – prehľady a zisk
src/routes/*            – webové stránky
src/views/*             – šablóny (EJS)
test/                   – automatické testy (`npm test`)
```

## Bezpečnosť a prevádzka

- Aplikáciu prevádzkujte za HTTPS (napr. reverzná proxy Caddy/nginx) a nastavte silný `SESSION_SECRET`.
- Heslá k SMTP/IMAP sú uložené v databáze – chráňte súbor `data/app.db` a robte zálohy.
- Sessions sú v pamäti; po reštarte servera sa treba znova prihlásiť.
