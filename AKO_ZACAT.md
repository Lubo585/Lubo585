# Ako si aplikáciu spustiť a prihlásiť sa (vzor)

Aplikácia beží ako webová stránka na počítači alebo serveri. Tu sú tri cesty od najjednoduchšej.

## A) Vyskúšať na vlastnom počítači (10 minút)

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

## B) Na internete pre celú firmu (web + mobil)

Potrebujete malý server (VPS za ~5 €/mes.) a doménu, napr. `app.sxworkforce.sk`. Postup je v [DEPLOY.md](DEPLOY.md): skopírovať aplikáciu na server, vyplniť `.env`, `docker compose up -d`. Caddy automaticky vybaví HTTPS. Potom sa všetci prihlasujú na `https://app.sxworkforce.sk` z počítača aj telefónu (na telefóne „Pridať na plochu“ = ikona ako aplikácia). Aktualizácia: `git pull && docker compose up -d --build`, dáta ostávajú, pred migráciou sa urobí záloha.

## C) Aplikácia v App Store / Google Play

Po nasadení podľa B) sa z priečinka `mobile/` zostaví natívna aplikácia pre iOS a Android (návod v [mobile/README.md](mobile/README.md)). Vyžaduje vývojárske účty Apple a Google a zostavenie na počítači s Xcode / Android Studio. Aplikácia zobrazuje váš server, takže funkcie a dáta sú rovnaké ako na webe.

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
