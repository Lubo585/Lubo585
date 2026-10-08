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

- **Impressum a Datenschutz** sú vyplnené (adresa, IČO, DIČ, IČ DPH, zápis v OR). Ak sa údaje zmenia, upravte bloky `id="impressum"` a `id="datenschutz"` v `index.html`.
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

## 7. Hosting na Websupporte + e‑mail cez Google Workspace

Doména aj webhosting sú na Websupporte, pošta beží cez Google Workspace (Gmail). Web a pošta sú nezávislé: web riadi záznam `A` (a `CNAME` pre www), poštu záznam `MX`.

### 7.1 Poradie krokov

1. **Websupport – objednať webhosting** k doméne sxworkforce.de (The Hosting) a vypnúť pôvodnú stavebnicu stránky.
2. **Websupport – SSL**: v detaile hostingu zapnúť bezplatný certifikát Let's Encrypt pre `sxworkforce.de` aj `www.sxworkforce.de`.
3. **Websupport – nahrať web**: obsah ZIP‑u do koreňového priečinka hostingu (vrátane `.htaccess`).
4. **Google Workspace – založiť účet** na admin.google.com s doménou `sxworkforce.de`, vytvoriť schránku `info@sxworkforce.de` (prípadne ďalšie, napr. pre Lucu Schulza a Petra Krška).
5. **Websupport – DNS záznamy** podľa tabuľky nižšie (overenie domény, MX, SPF, DKIM, DMARC).
6. **Google Admin – aktivovať Gmail** (Účet → Domény → Spravovať domény → Aktivovať Gmail). Google potom MX záznam skontroluje.
7. Poslať testovací e‑mail na info@sxworkforce.de a z neho odpovedať.

### 7.2 DNS záznamy na Websupporte

V administrácii Websupportu: Domény → sxworkforce.de → **DNS záznamy**. Ak Websupport ponúka „nastaviť záznamy pre externú poštu“ alebo predvoľbu pre Google Workspace, dá sa použiť, inak zadať ručne:

| Typ   | Názov (host) | Hodnota                                                        | Priorita | Poznámka |
|-------|--------------|----------------------------------------------------------------|----------|----------|
| A     | @            | IP adresa hostingu Websupport (uvedená v detaile hostingu)     |          | web |
| CNAME | www          | sxworkforce.de.                                                |          | web, ak Websupport nenastaví sám |
| MX    | @            | smtp.google.com.                                               | 1        | pošta cez Google |
| TXT   | @            | `v=spf1 include:_spf.google.com ~all`                          |          | SPF |
| TXT   | google._domainkey | hodnota DKIM z Google Admin (Aplikácie → Gmail → Overenie e‑mailu → Generovať záznam) | | DKIM |
| TXT   | _dmarc       | `v=DMARC1; p=quarantine; rua=mailto:info@sxworkforce.de`       |          | DMARC |
| TXT   | @            | `google-site-verification=…` (dostanete pri zakladaní Workspace) | | overenie domény |

Dôležité:

- Všetky **staré MX záznamy** (Websupport mail, prípadne iné) treba zmazať. Zostáva len jeden MX `smtp.google.com` s prioritou 1.
- Ak už existuje TXT záznam začínajúci `v=spf1`, nevytvárajte druhý, iba do neho doplňte `include:_spf.google.com`.
- DKIM záznam vygenerujte v Google Admin **až po** založení účtu a skopírujte ho presne, je dlhý.
- Po zmene DNS počkajte 1 až 24 hodín (výnimočne do 72 h). Dovtedy môžu e‑maily chodiť ešte na starý server.
- Pri DMARC začnite s `p=quarantine`; po pár týždňoch bez problémov môžete prepnúť na `p=reject`.

### 7.3 Kontaktný formulár a Google

Formulár na stránke otvára e‑mailový program návštevníka s predvyplnenou správou na info@sxworkforce.de, takže s Google Workspace funguje bez zmeny. Ak chcete správy odosielať priamo zo stránky, dá sa napojiť formulárová služba (Formspree, Web3Forms), ktorá ich doručí do Gmailu.
