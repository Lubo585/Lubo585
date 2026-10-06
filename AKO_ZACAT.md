# Ako si aplikáciu spustiť a prihlásiť sa (vzor)

Aplikácia beží ako webová stránka na počítači alebo serveri. Tu sú tri cesty od najjednoduchšej.

## A) Vyskúšať na vlastnom počítači (10 minút)

### Úplne bez inštalácie: prenosná verzia pre Windows

Rozbaľte `SXWorkforce-portable-windows.zip` (dostali ste ho v chate; dá sa zostaviť aj príkazom `./scripts/build-portable.sh`) do ľubovoľného priečinka a dvakrát kliknite na **SPUSTIT.bat**. Nič sa neinštaluje a nepotrebujete práva správcu: spúšťač si pri prvom štarte stiahne jediný súbor `node.exe` z nodejs.org do priečinka `node`, spýta sa na ukážkové dáta, spustí aplikáciu a otvorí prehliadač. Ak Windows zobrazí „Systém Windows chránil váš počítač“, kliknite „Ďalšie informácie“ → „Spustiť aj tak“. Podrobnosti sú v súbore PRECITAJ-MA.txt v balíku.

### Najrýchlejšia cesta: jeden príkaz

**Windows** – stlačte Win + X → „Terminál“ (alebo PowerShell) a vložte:
```
irm https://raw.githubusercontent.com/Lubo585/Lubo585/claude/determined-mccarthy-7jfplr/install.ps1 | iex
```
**macOS / Linux** – v Termináli:
```
curl -fsSL https://raw.githubusercontent.com/Lubo585/Lubo585/claude/determined-mccarthy-7jfplr/install.sh | bash
```
Príkaz stiahne aplikáciu do priečinka `SXWorkforce` vo vašom profile, nainštaluje Node.js (ak chýba), spýta sa na ukážkové dáta, spustí aplikáciu a otvorí prehliadač na http://localhost:3000. Prihlásenie **admin / admin**. Ak sa Node.js práve inštaloval, spustite ešte raz `START.bat` v priečinku `SXWorkforce`.

**Priamy odkaz na stiahnutie ZIP (bod 2 nižšie):** <https://github.com/Lubo585/Lubo585/archive/refs/heads/claude/determined-mccarthy-7jfplr.zip>

**Najjednoduchšie (Windows):** stiahnite a rozbaľte aplikáciu (bod 2 nižšie) a dvakrát kliknite na **START.bat**. Skript sám nainštaluje Node.js (cez winget, ak chýba), závislosti, spýta sa, či načítať ukážkové dáta, spustí aplikáciu a otvorí prehliadač. Ak Node.js práve nainštaloval, zatvorte okno a spustite START.bat ešte raz. Na macOS / Linuxe spustite v Termináli `./start.sh`.

Ručný postup:

1. Nainštalujte **Node.js 22** z <https://nodejs.org> (tlačidlo LTS, ďalej-ďalej-dokončiť).
2. Stiahnite aplikáciu: na GitHube otvorte vetvu `claude/determined-mccarthy-7jfplr` repozitára **Lubo585/Lubo585** → zelené tlačidlo **Code → Download ZIP** → rozbaľte napr. do `C:\agentura` (alebo `git clone`).
3. Otvorte príkazový riadok v tom priečinku (vo Windows: v Prieskumníkovi do adresného riadku napíšte `cmd` a Enter) a zadajte:
   ```
   npm install
   npm run demo
   npm start
   ```
   `npm run demo` naplní aplikáciu **ukážkovou firmou** (nemeckí klienti, 7 pracovníkov, lístky, faktúry, výpis, vyúčtovania), aby ste mali čo pozerať. Pri ostrom nasadení tento krok vynechajte.
4. V prehliadači otvorte **http://localhost:3000**.

**Prihlasovacie údaje vzoru**

| Používateľ | Heslo | Rola |
|---|---|---|
| `admin` | `admin` | Administrátor (všetko) |
| `kancelaria` | `demo1234` | Kancelária |
| `dispecer` | `demo1234` | Dispečer |
| `uctovnik` | `demo1234` | Účtovníctvo |

Pracovníka pozvete cez Nastavenia → Používatelia → Pozvať (rola Pracovník, prepojiť s kartou), odkaz mu pošlete a on si nastaví heslo; potom uvidí iba svoj portál.

Heslo `admin` si hneď zmeňte v Nastavenia → Používatelia → Zmena môjho hesla. Ak chcete začať odznova s prázdnou databázou, zastavte aplikáciu (Ctrl+C) a zmažte súbor `data/app.db`.

## A0) Najjednoduchšie: spustiť v prehliadači cez GitHub Codespaces (nič sa neinštaluje)

Beží na serveroch GitHubu, zadarmo do 60 hodín mesačne, stačí váš účet GitHub.

1. Otvorte tento odkaz: **<https://codespaces.new/Lubo585/Lubo585?ref=claude/determined-mccarthy-7jfplr&quickstart=1>**
2. Kliknite na zelené **Create codespace** (prípadne „Resume“). Prvé vytvorenie trvá 2–3 minúty: automaticky sa nainštaluje Node.js, závislosti, načíta sa ukážková firma a aplikácia sa spustí.
3. Otvorí sa nová karta s aplikáciou (ak prehliadač blokuje vyskakovacie okná, povoľte ich). Ak sa neotvorila, v spodnej časti okna Codespaces kliknite na záložku **PORTS / PORTY** a pri porte 3000 na ikonu glóbusu „Open in Browser“.
4. Prihlásenie **admin / admin** (ďalší: kancelaria, dispecer, uctovnik / demo1234).

Ak by aplikácia nebežala, v termináli Codespaces (menu ☰ → Terminal → New Terminal) spustite `./scripts/codespaces-start.sh`. Codespace sa po 30 minútach nečinnosti uspí, pri ďalšom otvorení sa aplikácia spustí znova; dáta v ňom ostávajú, kým codespace nezmažete.

## B0) Vyskúšať na internete bez vlastného servera (Render, zadarmo, 5 minút)

Ak nechcete nič spúšťať na počítači, dá sa aplikácia nasadiť na bezplatné hostovanie Render.com jedným kliknutím. Dostanete adresu typu `https://sxworkforce.onrender.com`, ktorá sa otvorí v akomkoľvek prehliadači aj na mobile.

1. Otvorte <https://render.com> a zaregistrujte sa (najjednoduchšie tlačidlom „Sign in with GitHub“, účet GitHub už máte).
2. Kliknite na tento odkaz: **<https://render.com/deploy?repo=https://github.com/Lubo585/Lubo585/tree/claude/determined-mccarthy-7jfplr>**
3. Render ukáže službu `sxworkforce` z priloženého `render.yaml`. Potvrďte **Apply / Deploy**. Zostavenie trvá 2–4 minúty.
4. Po dokončení otvorte adresu služby (zobrazí sa hore v Render). Prihlásenie **admin / admin**; aplikácia je naplnená ukážkovou firmou.

Obmedzenia bezplatného plánu: po 15 minútach nečinnosti služba zaspí a prvé otvorenie trvá asi 30 sekúnd; disk je dočasný, takže po reštarte alebo novom nasadení sa dáta vrátia na ukážku. Pre ostrú prevádzku zvoľte v Render platený plán s diskom (nastavte disk na `/opt/render/project/src/data`) a v `render.yaml` vypnite `DEMO_SEED`, alebo použite vlastný server podľa časti B).

## B) Na internete pre celú firmu (web + mobil)

Potrebujete malý server (VPS za ~5 €/mes.) a doménu, napr. `app.sxworkforce.sk`. Postup je v [DEPLOY.md](DEPLOY.md): skopírovať aplikáciu na server, vyplniť `.env`, `docker compose up -d`. Caddy automaticky vybaví HTTPS. Potom sa všetci prihlasujú na `https://app.sxworkforce.sk` z počítača aj telefónu (na telefóne „Pridať na plochu“ = ikona ako aplikácia). Aktualizácia: `git pull && docker compose up -d --build`, dáta ostávajú, pred migráciou sa urobí záloha.

## C) Aplikácia v App Store / Google Play

Po nasadení podľa B) sa z priečinka `mobile/` zostaví natívna aplikácia pre iOS a Android (návod v [mobile/README.md](mobile/README.md)). Vyžaduje vývojárske účty Apple a Google a zostavenie na počítači s Xcode / Android Studio. Aplikácia zobrazuje váš server, takže funkcie a dáta sú rovnaké ako na webe.

## Prechod na ostrú prevádzku

Keď ste s ukážkou spokojný: Nastavenia → Zálohy a verzia → **Vymazať všetky dáta** (vytvorí sa záloha), potom Nastavenia → **Import dát** pre existujúcich klientov a pracovníkov z CSV. Úplný kontrolný zoznam je v súbore **OSTRA_PREVADZKA.md**.

## Čo si vo vzore pozrieť

- **Prehľad**: zisk za mesiac, faktúry po splatnosti, nespárované platby, compliance upozornenia.
- **Compliance DE**: expirujúce A1, chýbajúce doklady, neohlásené vyslanie, AÜG počítadlo, SOKA-BAU hodiny.
- **Pracovníci → Kovalenko Ivan**: doklady, vyslania, zálohy, vyúčtovanie, ubytovanie.
- **Hodinové lístky**: otvorte lístok, prepnite „Časy od–do“, pozrite **Stundenzettel (DE)** a podpis.
- **Fakturácia**: faktúra pre Müller GmbH s príplatkami, Bauabzugsteuer, tlačidlá PDF / XRechnung, nemecká tlač; **Súhrnný výkaz DPH**.
- **Banka a platby**: automaticky spárované úhrady (so skontom, čiastočná), jedna nespárovaná na ručné spárovanie.
- **Vyúčtovanie**: minulý mesiac, výplatná páska SK / UA / DE.
- **Financie**: cash-flow výhľad, ziskovosť s diétami a ubytovaním, exporty CSV.
- **AI asistent**: po zadaní API kľúča v Nastaveniach sa spýtajte napr. „Komu končí A1?“ alebo „Ktoré faktúry sú po splatnosti?“.
