# Lead-agenti SX Workforce (fáza 1: vyhľadávanie firiem v Nemecku)

8 výskumných agentov, jeden na remeslo: Elektro, HLS, Trockenbau, Maler, Fliesen, Boden, Maurer, Schweißer.
Výsledky idú do Google tabuľky „SX Workforce – Leads Deutschland“:
https://docs.google.com/spreadsheets/d/1H9FqaSwW42-hp9f8o564x9gWowluoSAPnoKfyKN7RFM/edit

Listy:
- **Leads** – všetky nájdené firmy, stĺpec „Stav“ používa Ľubo na riadenie: Neu → Kontaktieren → Kontaktiert → Antwort erhalten → Genehmigt – Verhandlung → Vereinbart / Abgelehnt.
- **Konfigurácia** – regióny, veľkosť firmy, počet firiem na beh, hľadané pojmy a signály pre každé remeslo.
- **Mantinely** – sadzby a podmienky pre fázu 3 (vyjednávacích agentov), vyplní Ľubo.
- **Beh-Log** – záznam každého behu agenta.

Zadanie agenta je v `zadanie-vyskumny-agent.md` (zástupné hodnoty {GEWERK}, {POJMY}, {SIGNÁLY}, {POCET}, {SHEET_ID} sa doplnia z listu Konfigurácia).
Beh je naplánovaný ako Routine v Claude Code (pracovné dni 06:30 Europe/Bratislava), všetkých 8 agentov beží paralelne a súhrn sa posiela e-mailom.

Fáza 2 (prvé oslovenie) robí Ľubo ručne – v Nemecku je nevyžiadaný reklamný e-mail aj B2B podľa § 7 UWG rizikový (Abmahnung).
Fáza 3 (vyjednávanie) sa spustí až po vyplnení listu Mantinely a po označení firmy stavom „Genehmigt – Verhandlung“.
