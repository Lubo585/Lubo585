# Mobilná aplikácia pre App Store a Google Play

Mobilná aplikácia je natívny obal (Capacitor) webovej aplikácie bežiacej na vašom serveri. Používatelia sa prihlásia rovnakými údajmi ako na webe, všetky dáta ostávajú na serveri, takže update aplikácie nikdy nemaže dáta. Web je zároveň PWA: na telefóne sa dá „Pridať na plochu“ aj bez obchodov.

## Požiadavky
- Node.js 22, účet **Apple Developer** (99 $/rok) a **Google Play Console** (jednorazovo 25 $).
- iOS build iba na macOS s Xcode; Android build s Android Studio (Windows/macOS/Linux).
- Aplikácia nasadená na verejnej HTTPS adrese (pozri DEPLOY.md). Adresu zapíšte do `capacitor.config.json` → `server.url`.

## Postup
```bash
cd mobile
npm install
# upravte appId (napr. sk.vasafirma.app), appName a server.url v capacitor.config.json
npx @capacitor/assets generate --iconBackgroundColor '#1d4ed8' --splashBackgroundColor '#1d4ed8'   # ikony zo súborov icon.png / splash.png (voliteľné)
npm run add:android      # vytvorí priečinok android/
npm run add:ios          # vytvorí priečinok ios/ (iba macOS)
npm run sync
npm run open:android     # Android Studio → Build → Generate Signed Bundle (AAB)
npm run open:ios         # Xcode → Product → Archive → Distribute App
```

## Publikovanie
**Google Play:** v Play Console vytvorte aplikáciu, nahrajte podpísaný `.aab`, vyplňte popis, snímky obrazovky (telefón 16:9 alebo 9:16), ikonu 512×512, zásady ochrany súkromia (URL), dotazník o obsahu a bezpečnosti dát. Interné testovanie → produkcia. Kontrola trvá zvyčajne 1–7 dní.

**App Store:** v App Store Connect vytvorte aplikáciu s rovnakým Bundle ID, cez Xcode nahrajte build, doplňte popis, snímky (6,7" a 5,5" iPhone), kategóriu Business, zásady ochrany súkromia, testovací účet pre recenzentov (vytvorte používateľa s rolou Kancelária). Apple vyžaduje, aby aplikácia nebola len „webová stránka“: tento obal má natívny splash screen, ikonu, status bar a funguje offline stránka; pre istotu v popise uveďte, že ide o firemnú aplikáciu pre zamestnancov (Business). Ak by recenzia aplikáciu odmietla ako čisto webovú, alternatívou je distribúcia cez **Apple Business Manager / neverejná aplikácia** (Unlisted App Distribution), ktorá je pre interné firemné aplikácie určená.

## Aktualizácie
Keďže aplikácia načítava web zo servera, väčšina zmien sa prejaví okamžite bez nového buildu. Nový build do obchodov je potrebný iba pri zmene ikony, názvu, adresy servera alebo natívnych pluginov.
