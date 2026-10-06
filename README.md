# SX Workforce – Website

Statische Unternehmenswebsite (Deutsch) für SX Workforce, s.r.o. – Personaldienstleister und Bauunternehmen für Projekte in Deutschland.

## Struktur

```
index.html          Startseite (Hero, Leistungen, Vorteile, Ablauf, Projekte, Team, Karriere, Kontakt)
impressum.html      Impressum (Platzhalter in eckigen Klammern ausfüllen)
datenschutz.html    Datenschutzerklärung
assets/css/style.css
assets/js/main.js   Navigation, Scroll-Reveal, Galerie-Lightbox, Kontaktformular, Cookie-Hinweis
assets/img/         Logo, Team-, Baustellen- und Fahrzeugfotos
404.html            Fehlerseite
.htaccess           HTTPS-Umleitung, Caching, 404
robots.txt / sitemap.xml / favicon.ico
tests/check-site.mjs   automatischer Funktionstest (node tests/check-site.mjs)
build-zip.sh        erstellt dist/sx-workforce-website.zip für den Upload
```

Slowakische Schritt-für-Schritt-Anleitung für den Upload: `NAVOD-NAHODENIE.md`.

## Veröffentlichen

Es wird kein Build-Schritt benötigt. Die Dateien können direkt auf jeden Webspace hochgeladen oder über GitHub Pages ausgeliefert werden.

Lokal testen:

```
npx http-server . -p 8080
```

## Offene Punkte vor dem Livegang

- Impressum: Anschrift, Registernummer, IČO und USt-ID eintragen.
- Kontaktformular: aktuell öffnet es das E-Mail-Programm (mailto). Für einen serverseitigen Versand den Submit-Handler in `assets/js/main.js` an ein Formular-Backend anbinden.
- Google Fonts werden extern geladen; auf Wunsch lokal einbinden (siehe Datenschutzerklärung).
