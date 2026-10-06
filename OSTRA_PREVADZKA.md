# Spustenie ostrej prevádzky – kontrolný zoznam

Postupujte zhora nadol. Odhad času: 1 deň technickej prípravy, 1–2 dni na naplnenie dát, potom prvý mesiac paralelne so starým spôsobom.

## 1. Server a prístup (technik alebo poskytovateľ, pol dňa)
- [ ] VPS s Ubuntu 22.04+ (2 vCPU, 2 GB RAM, 40 GB), Docker nainštalovaný.
- [ ] Doména alebo subdoména (napr. `app.sxworkforce.sk`) nasmerovaná na IP servera.
- [ ] Nasadenie podľa DEPLOY.md: `.env` s **DOMAIN**, **SESSION_SECRET** (`openssl rand -hex 32`), **ADMIN_PASSWORD** (silné heslo), `docker compose up -d`.
- [ ] Kontrola `https://app…/health` vracia `"ok":true`. Prihlásenie funguje cez HTTPS.
- [ ] Firewall: povolené len porty 22, 80, 443. Automatické bezpečnostné aktualizácie OS.
- [ ] Externá záloha: `scripts-backup.sh` v crone denne + kópia priečinka `data/` na cloudové úložisko (alebo záloha disku u poskytovateľa). Vyskúšajte obnovu zo zálohy aspoň raz.

## 2. Vyčistenie ukážky a používatelia (admin, 1 hodina)
- [ ] Nastavenia → Zálohy a verzia → **Vymazať všetky dáta** (ukážková firma zmizne, vytvorí sa záloha).
- [ ] Nastavenia → Používatelia: zmeniť heslo admin, pridať kolegov cez pozvánky s rolami (Kancelária, Dispečer, Účtovníctvo). Pracovníkom poslať pozvánky s rolou Pracovník prepojenou na kartu (až po importe pracovníkov).
- [ ] Nastavenia → Firma: názov, IČO, DIČ, IČ DPH, **IBAN a BIC**, e-mail, telefón, zápis v registri, verejná adresa aplikácie.
- [ ] Nastavenia → Fakturácia: formát číslovania tak, aby nadväzoval na doterajšiu číselnú radu (napr. predpona a začiatok od správneho čísla: prvá faktúra sa dá zadať ručne s požadovaným číslom, ďalšie pokračujú).
- [ ] Nastavenia → Nemecko / compliance: číslo a platnosť povolenia AÜG/ADZ, Freistellungsbescheinigung, číslo SOKA, diéty, štandardný pracovný deň, dni pred expiráciou.

## 3. Naplnenie dát (kancelária, 1–2 dni)
- [ ] Klienti: Nastavenia → Import dát (CSV) alebo ručne. Pre každého klienta: režim DPH, jazyk, cenník podľa profesií s príplatkami, zmluva AÜG/Werkvertrag s prílohou, e-mail pre faktúry.
- [ ] Zákazky: aktuálne stavby so stavom, termínom, počtom pracovníkov, SOKA.
- [ ] Pracovníci: import CSV, potom pre každého doklady s platnosťou (A1, pas, povolenia, lekárska, SCC), hlásenia vyslania, mzda €/h, IBAN.
- [ ] Otvorené faktúry zo starého systému: zadať ako ručné faktúry so správnym číslom, dátumom a splatnosťou, aby ich aplikácia sledovala a párovala s platbami. Zádržné doplniť ako percento a termín.
- [ ] Plánovanie: aktuálne nasadenia pracovníkov na mesiac dopredu.

## 4. Automatika (účtovníctvo + technik, 2 hodiny)
- [ ] SMTP (Nastavenia → Odosielanie e-mailov): odoslať testovací e-mail. Odporúčame firemnú schránku, napr. `fakturacia@…`.
- [ ] Bankový e-mail (IMAP): samostatná schránka `vypisy@…`, v internetbankingu nastaviť denné zasielanie výpisov vo formáte camt.053 XML (alebo CSV/MT940). Otestovať pripojenie, nechať jeden deň bežať a skontrolovať párovanie.
- [ ] Upomienky: skontrolovať texty SK/DE, dni (3, 14, 30), kópiu na firemný e-mail; zapnúť automatické odosielanie až po prvom mesiaci, keď sú všetky staré faktúry zadané.
- [ ] AI asistent: API kľúč (voliteľné).

## 5. Kontrola s účtovníčkou a daňovým poradcom (pred prvou ostrou faktúrou)
- [ ] Vzorová faktúra pre nemeckého klienta v PDF: texty o prenesení DPH, obidve IČ DPH, Leistungszeitraum, zádržné, skonto, Bauabzugsteuer (ak sa uplatňuje).
- [ ] Súhrnný výkaz DPH: export za štvrťrok sedí s evidenciou účtovníčky.
- [ ] XRechnung: ak klient vyžaduje e-faktúru, poslať skúšobnú a overiť u neho (alebo validátorom KoSIT).
- [ ] Sadzby: DPH, diéty pre DE, úrok z omeškania aktualizované podľa platných predpisov.
- [ ] Vyúčtovanie pracovníkov: skontrolovať, či spôsob výpočtu (hodiny × mzda + diéty − zálohy) zodpovedá pracovným zmluvám a mzdovému softvéru účtovníčky.

## 6. Prvý mesiac prevádzky
- [ ] Hodinové lístky týždenne, s časmi od–do a podpisom vedúceho stavby (MiLoG).
- [ ] Na konci mesiaca: schválenie lístkov → faktúry → odoslanie e-mailom → vyúčtovanie pracovníkov.
- [ ] Denne pozrieť Prehľad: nespárované platby, po splatnosti, compliance upozornenia.
- [ ] Po mesiaci porovnať s doterajšou evidenciou a poslať zoznam úprav.

## 7. Mobil a obchody (voliteľné)
- [ ] Na telefónoch pridať web na plochu (PWA).
- [ ] Aplikácia v App Store / Google Play podľa mobile/README.md, ak je potrebná.

## Bezpečnostné minimum
- Silné heslá, každý používateľ vlastný účet, pracovníci len rola Pracovník.
- Zálohy mimo servera a vyskúšaná obnova.
- Prístup na server len cez SSH kľúč.
- Pri odchode zamestnanca účet deaktivovať (Nastavenia → Používatelia).
