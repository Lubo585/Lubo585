# PSPSK.de – Bau-Nachunternehmer für Deutschland

Nemecká prezentačná stránka spoločnosti **POZEMNÉ STAVBY PODNIK KOŠICE s.r.o.**
zameraná na subdodávky stavebných prác (Werkvertrag) pre stavby v Nemecku.
Doména: pspsk.de, e-mail: info@pspsk.de.

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

- telefónne číslo (IČO, DIČ, IČ DPH, register a konateľ sú doplnené z ORSR)
- čísla v sekcii štatistík (počet pracovníkov, roky skúseností, projekty)
- názvy, miesta a rozsah troch menších referencií

Kontaktný formulár odosiela správy cez službu FormSubmit (formsubmit.co) na adresu
info@pspsk.de. Po prvom odoslaní príde na túto adresu aktivačný e-mail, ktorý treba
raz potvrdiť. Ak odoslanie zlyhá, formulár ponúkne priamy mailto odkaz.

Impressum a Datenschutzerklärung sú v súbore `src/content/legal.ts` a otvárajú sa
z pätičky ako modálne okno (kotvy #impressum a #datenschutz). Pred spustením ich
odporúčame nechať skontrolovať nemeckým právnikom.

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
