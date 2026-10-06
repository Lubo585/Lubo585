# Návod: ako nahodiť stránku SX Workforce na hosting

Stránka je čisto statická (HTML + CSS + JavaScript + obrázky). Nepotrebuje PHP, databázu ani žiadnu inštaláciu. Stačí nahrať súbory na webhosting.

## 1. Čo nahrať

Hotový balík je v súbore **`dist/sx-workforce-website.zip`**. Po rozbalení obsahuje:

```
index.html          celá stránka (one-page, Impressum a Datenschutz sú vyskakovacie okná)
404.html            chybová stránka
.htaccess           nastavenie servera (HTTPS presmerovanie, cache, 404)
favicon.ico         ikona
robots.txt          pre vyhľadávače
sitemap.xml         mapa stránky
assets/css/         štýly
assets/js/          skripty
assets/img/         logo a fotky
```

## 2. Nahodenie cez FTP alebo správcu súborov (Websupport, Hostinger, IONOS, Strato…)

1. Prihláste sa do administrácie hostingu a otvorte **Správcu súborov** (alebo sa pripojte cez FTP, napr. programom FileZilla).
2. Prejdite do koreňového priečinka domény. Najčastejšie sa volá `public_html`, `www`, `htdocs` alebo `web`.
3. Ak je v ňom nejaký starý obsah (napr. `index.html` z predošlej stránky), zmažte ho alebo ho presuňte do zálohy.
4. Nahrajte **celý obsah** rozbaleného ZIP-u (nie samotný priečinok, ale súbory v ňom). Musí tam byť priamo `index.html`.
5. Skontrolujte, že sa nahral aj súbor `.htaccess`. Je skrytý (začína bodkou), v FileZille zapnite „Server → Vynútiť zobrazenie skrytých súborov“.
6. Otvorte `https://www.sxworkforce.de/` v prehliadači. Hotovo.

Ak hosting ponúka priame nahranie ZIP-u a rozbalenie na serveri, nahrajte `sx-workforce-website.zip` do koreňového priečinka a rozbaľte ho tam.

## 3. HTTPS

V `.htaccess` je presmerovanie na `https://www.sxworkforce.de`. Preto musí byť na hostingu **aktívny SSL certifikát** (väčšinou bezplatný Let's Encrypt, zapína sa jedným klikom v administrácii). Ak certifikát ešte nemáte, najprv ho aktivujte, až potom nahrajte `.htaccess`, inak sa stránka bude presmerovávať na nefunkčnú HTTPS adresu.

Ak hosting nebeží na Apache (napr. nginx), `.htaccess` sa ignoruje. Stránka bude fungovať aj tak, iba presmerovanie a 404 stránku treba nastaviť v administrácii hostingu.

## 4. Pred spustením doplniť

- **Impressum** (v `index.html`, blok `id="impressum"`): adresa, registrový súd, číslo zápisu, IČO, IČ DPH sú zatiaľ v hranatých zátvorkách `[…]`.
- **Datenschutz** (v `index.html`, blok `id="datenschutz"`): adresa firmy v bode 1.
- **Kontaktný formulár**: po odoslaní otvorí e‑mailový program s predvyplnenou správou na `info@sxworkforce.de`. Ak chcete, aby sa správa posielala priamo zo servera, treba ho napojiť na formulárovú službu (napr. Formspree, Web3Forms) alebo PHP skript hostingu.

## 5. Test po nahodení

Otvorte stránku a skontrolujte:

- načíta sa cez `https://` a adresa bez `www` presmeruje na `www`,
- menu na mobile sa otvára a zatvára,
- fotky v galérii sa po kliknutí zväčšia,
- odkazy Impressum a Datenschutz v pätičke fungujú,
- neexistujúca adresa (napr. `/abc`) zobrazí vlastnú 404 stránku.

Automatický test sa dá spustiť lokálne príkazom `node tests/check-site.mjs` (vyžaduje Node.js a Playwright).

## 6. Lokálne zobrazenie bez hostingu

Stačí otvoriť `index.html` v prehliadači dvojklikom. Pre plnú funkčnosť (napr. 404 stránka) spustite v priečinku lokálny server:

```
npx http-server . -p 8080
```

a otvorte `http://localhost:8080`.
