# Dochádzka ZS 2026/27

Jednoduchá apka na sledovanie dochádzky na jednotlivé predmety so strážením limitu absencií (predvolene 50 %).

- `index.html` – celá apka v jednom súbore, stačí otvoriť v prehliadači. Rozvrh je prepísaný priamo v skripte (pole `SUBJECTS`).
- Čísla v zátvorkách z rozvrhu sú týždne semestra; dátumy sa počítajú zo začiatku semestra v nastaveniach.
- Pri otvorení zo súboru sa dochádzka ukladá do `localStorage` prehliadača. Publikovaná verzia na claude.ai ukladá dáta do artefaktu a zdieľa ich medzi zariadeniami.
