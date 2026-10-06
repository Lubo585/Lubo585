# Dochádzka ZS 2026/27

Jednoduchá apka na sledovanie dochádzky na jednotlivé predmety so strážením limitu absencií (predvolene 50 %).

- `index.html` – celá apka v jednom súbore, stačí otvoriť v prehliadači. Rozvrh je prepísaný priamo v skripte (pole `SUBJECTS`).
- Každá hodina z rozvrhu beží každý týždeň; dátumy sa počítajú zo začiatku semestra v nastaveniach.
- Pri otvorení zo súboru sa dochádzka ukladá do `localStorage` prehliadača. Publikovaná verzia na claude.ai ukladá dáta do artefaktu a zdieľa ich medzi zariadeniami.
