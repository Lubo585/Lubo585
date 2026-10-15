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

Web sa automaticky nasadzuje na GitHub Pages cez `.github/workflows/deploy.yml`
pri každom pushi na vetvu `main` alebo `claude/friendly-pascal-jghtrm`.
Dočasná adresa: https://lubo585.github.io/Lubo585/

### Pripojenie domény pspsk.de

1. Zaregistrujte doménu pspsk.de u registrátora (IONOS, Strato, INWX, Websupport).
2. V DNS nastavte:
   - `A` záznamy pre `pspsk.de` na 185.199.108.153, 185.199.109.153,
     185.199.110.153 a 185.199.111.153
   - `CNAME` záznam pre `www` na `lubo585.github.io`
3. V repozitári na GitHube: Settings → Pages → Custom domain → zadajte
   `www.pspsk.de`, uložte a po overení zapnite „Enforce HTTPS“.
4. Do priečinka `public/` pridajte súbor `CNAME` s obsahom `www.pspsk.de`
   a pushnite (inak sa doména po ďalšom nasadení stratí).

### E-mail info@pspsk.de

Zriaďte poštovú schránku u registrátora alebo cez Google Workspace / Zoho Mail
a pridajte do DNS príslušné `MX`, `SPF` a `DKIM` záznamy. Po prvom odoslaní
kontaktného formulára príde na info@pspsk.de aktivačný e-mail od FormSubmit,
ktorý treba potvrdiť.
