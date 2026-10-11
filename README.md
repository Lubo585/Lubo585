# PSPK – Bau-Fachkräfte für Deutschland

Nemecká prezentačná stránka spoločnosti **POZEMNÉ STAVBY PODNIK KOŠICE s.r.o.**
zameraná na personálny leasing a subdodávky pre stavby v Nemecku.

Jednostránkový web s plynulým scrollovaním (Lenis) a animáciami (Motion).

## Technológie

- Vite + React 19 + TypeScript
- Tailwind CSS 4
- Motion (animácie, parallax, počítadlá, reveal pri scrolle)
- Lenis (plynulý scroll)
- lucide-react (ikony)

## Spustenie

```bash
npm install
npm run dev      # vývojový server na http://localhost:5173
npm run build    # produkčný build do priečinka dist/
npm run preview  # náhľad produkčného buildu
npm run lint
```

## Čo treba doplniť pred spustením

Všetky texty sú v súbore `src/content/de.ts`. Položky označené komentárom
`DOPLNIŤ` sú zástupné a treba ich nahradiť reálnymi údajmi:

- telefónne číslo, IČO, DIČ, IČ DPH, zápis v obchodnom registri, konateľ
- čísla v sekcii štatistík (počet pracovníkov, roky skúseností, projekty)
- tri ukážkové nemecké referencie (Wohnquartier, Logistikhalle, Bürosanierung)

Kontaktný formulár aktuálne otvára e-mailového klienta (mailto na info@pspk.sk).
Ak chcete odosielanie bez e-mailového klienta, pripojte službu ako Formspree alebo
Web3Forms v súbore `src/components/Contact.tsx`.

Stránky „Impressum“ a „Datenschutz“ v pätičke sú zatiaľ len kotvy. Pre nemecký trh
je potrebné doplniť plné znenie Impressum a Datenschutzerklärung (DSGVO).

## Štruktúra

```
src/
  content/de.ts        – všetky nemecké texty a firemné údaje
  components/          – sekcie stránky (Hero, Leistungen, Gewerke, Ablauf, …)
  lib/                 – pomocné komponenty (SmoothScroll, Reveal, Magnetic, …)
public/
  fabrika-48.jpg       – fotka referencie Fabrika 48
  logo-pspk.png        – pôvodné logo
```

## Nasadenie

Výstup `npm run build` v priečinku `dist/` je statický a dá sa nahrať na
ľubovoľný hosting (Netlify, Vercel, Cloudflare Pages, klasický webhosting).
