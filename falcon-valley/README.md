# Falcons Valley – prezentačná stránka a shop so sokolmi

Jednostránkový web v štýle Apple (veľká typografia, plynulé animácie, sticky
sekcie, parallax hôr) pre chovateľskú stanicu **Falcons Valley** pod Vysokými
Tatrami. Dvojjazyčný (SK / EN), prepínač jazyka je v hornej lište.

## Sekcie

1. **Hero** – vrstvené tatranské štíty s parallaxom (scroll + myš), hmla,
   hviezdy, sokol letiaci po krivke, animovaný nadpis.
2. **Virálne hooky** – animované počítadlá (390 km/h, 8× ostrejší zrak,
   2 655 m Gerlach, 100 % vlastný odchov) a bežiaci pás.
3. **Príbeh** – sticky ilustrácia, ktorá mení farby podľa kroku príbehu.
4. **Prečo Falcons Valley** – 3D tilt karty.
5. **Naše sokoly** – chovné páry (nepredajné), horizontálny slider.
6. **Shop – Sokoly na predaj** – filter podľa druhu, prepínač „len dostupné“,
   karty s hmotnosťou, pohlavím a číslom krúžku, detail v modálnom okne
   (galéria fotiek, video, pôvod, dátum vyliahnutia, rozpätie, CITES, mikročip,
   rodičia, cena) a tlačidlo „Mám záujem“, ktoré predvyplní kontaktný formulár.
7. **Ako prebieha kúpa** – 4 kroky s animovanou časovou osou.
8. **Dolina** – scroll-driven panoráma Tatier s výškami štítov.
9. **Dolina v obrazoch** – galéria fotografií Tatier (po stiahnutí fotiek).
10. **Kontakt** – formulár (FormSubmit) + priame kontakty.

## Logo

Použité je originálne logo (červené FV, FALCONS VALLEY™, وادي الصقور):

- `public/logo-full.png` (+ `@2x`) – celé logo s priehľadným pozadím (pätička)
- `public/logo-mark.png` – samotná značka FV (lišta)
- `public/favicon.png`, `apple-touch-icon.png`, `icon-512.png` – ikony

Ak dostanete logo vo vektore (SVG), stačí ním nahradiť tieto súbory.

## Fotografie Vysokých Tatier

V priečinku `public/tatry/` je 13 voľne licencovaných fotiek (leto, jeseň, zima,
večer) z Flickru – Popradské pleso, Kriváň, Skalnaté pleso, Východná Vysoká,
podhorie. Používajú sa v hero sekcii, v Príbehu (každý krok iné ročné obdobie),
v sekcii Dolina a v galérii „Dolina v obrazoch“. Autori a licencie sú v
`public/tatry/CREDITS.md` a v `src/content/photos.ts`; pätička ich uvádza
automaticky (CC BY to vyžaduje).

Fotky môžete nahradiť vlastnými – zachovajte názov súboru alebo upravte cestu
v `src/content/photos.ts`. Odporúčaná šírka 1920 px. Ak súbor chýba, stránka
ho preskočí a použije ilustráciu.

## Technológie

Vite + React 19 + TypeScript, Tailwind CSS 4, Motion (animácie), Lenis
(plynulý scroll), lucide-react (ikony), písma Outfit + Inter (lokálne).

## Spustenie

```bash
cd falcon-valley
npm install
npm run dev      # http://localhost:5173
npm run build    # produkčný build do dist/
npm run preview
npm run lint
```

## Ako pridať alebo upraviť sokola

Všetky sokoly sú v súbore `src/content/falcons.ts` v poli `falcons`.

1. Fotky vložte do `public/falcons/<id>/` (napr. `public/falcons/tatra/01.jpg`).
   Odporúčaný pomer strán 4:5, šírka aspoň 1200 px.
2. Video: buď mp4 v tom istom priečinku, alebo odkaz na YouTube.
3. Pridajte záznam:

```ts
{
  id: 'tatra',                 // malé písmená, bez diakritiky
  name: 'Tatra',
  species: 'peregrine',        // peregrine | saker | gyr | gyr-peregrine | gyr-saker | lanner
  sex: 'female',               // male | female
  hatched: '2026-04-18',
  weightGrams: 1040,
  wingspanCm: 112,             // voliteľné
  origin: { sk: 'Vlastný odchov, Falcons Valley', en: 'Own breeding, Falcons Valley' },
  ringNumber: 'SK 26 FV 0412',
  cites: 'SK/CITES/26/0412',   // voliteľné
  microchip: '941000012345678',// voliteľné
  parents: { sire: 'Kriváň', dam: 'Bystrá' }, // voliteľné
  price: 2900,                 // EUR; bez ceny = "cena na vyžiadanie"
  status: 'available',         // available | reserved | sold | breeding (chovný, nepredajný)
  photos: ['/falcons/tatra/01.jpg', '/falcons/tatra/02.jpg'],
  video: { type: 'youtube', src: 'https://youtu.be/XXXXXXXXXXX' },
  // alebo: video: { type: 'file', src: '/falcons/tatra/let.mp4', poster: '/falcons/tatra/01.jpg' },
  description: { sk: '…', en: '…' },
  traits: [{ sk: 'Pokojná povaha', en: 'Calm temperament' }],
}
```

Sokoly so stavom `breeding` sa zobrazujú v sekcii „Naše sokoly“, ostatné
v shope. Sokol bez fotiek dostane automaticky ilustráciu.

## Čo doplniť pred spustením (označené `DOPLNIŤ`)

V `src/content/site.ts`:

- e-mail, telefón, Instagram a YouTube,
- `formEndpoint` – adresa FormSubmit s vaším e-mailom
  (`https://formsubmit.co/ajax/vas@email.sk`); po prvom odoslaní príde
  aktivačný e-mail, ktorý treba potvrdiť,
- texty sekcií podľa potreby (všetky texty sú v tomto súbore, SK aj EN).

Ukážkové sokoly v `src/content/falcons.ts` nahraďte reálnymi.

## Nasadenie

`npm run build` vytvorí statický web v `dist/` – stačí nahrať na ľubovoľný
hosting (Websupport FTP, GitHub Pages, Netlify, Vercel). Build používa relatívne
cesty (`base: './'`), takže funguje aj v podpriečinku.
