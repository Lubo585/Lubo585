# SX Workforce – Website

Statische Unternehmenswebsite (Deutsch) für SX Workforce, s.r.o. – Personaldienstleister und Bauunternehmen für Projekte in Deutschland.

## Struktur

```
index.html          Startseite (Hero, Leistungen, Vorteile, Ablauf, Projekte, Team, Karriere, Kontakt)
impressum.html      Impressum (Platzhalter in eckigen Klammern ausfüllen)
datenschutz.html    Datenschutzerklärung
assets/css/style.css
assets/js/main.js   Navigation, Scroll-Reveal, Galerie-Lightbox, Kontaktformular, Cookie-Hinweis
assets/img/         Logo, Team- und Baustellenfotos
```

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
