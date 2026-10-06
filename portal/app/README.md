# Mobilná aplikácia NazovPortalu (iOS + Android)

Capacitor aplikácia, ktorá zabalí ten istý web (`portal/`) a pridá natívne funkcie. **Web, iPhone aj Android používajú jeden Supabase backend**, takže inzeráty, správy, hodnotenia a účty sú všade rovnaké a v reálnom čase.

## Ako to drží pokope

| Vrstva | Kde | Poznámka |
|---|---|---|
| Dáta | Supabase (Postgres, Storage, Realtime) | Jediný zdroj pravdy. Aplikácia nič podstatné neukladá lokálne, preto aktualizácia appky nikdy nezmaže dáta. |
| Prihlásenie | Supabase Auth, relácia v Capacitor Preferences | Prežije reštart aj aktualizáciu aplikácie. |
| Realtime | tabuľky `messages`, `conversations` | Správa odoslaná z webu sa okamžite zobrazí v telefóne a naopak. |
| Push | `device_tokens` + FCM/APNs | Token sa uloží po prihlásení; odosielanie rieši Edge Function (pozri nižšie). |
| Konfigurácia | tabuľka `app_config` | Údržba, oznamy, minimálna podporovaná verzia appky (vynútená aktualizácia bez straty dát). |
| Web kód | `www/` sa generuje z `../` skriptom `npm run build` | Jeden kód, tri platformy. |

## Prvé spustenie (na vývojárskom počítači)

```bash
cd portal/app
npm install
npm run sync            # zostaví www/ a skopíruje do android/ a ios/
npm run android         # otvorí Android Studio  (potrebný Android Studio + SDK)
npm run ios             # otvorí Xcode           (len macOS, Xcode + CocoaPods: cd ios/App && pod install)
```

`js/config.js` vo webe musí obsahovať Supabase URL a publishable key; appka ho zdieľa s webom.

## Verzie a aktualizácie bez straty dát

1. **Verzia aplikácie** je v `package.json` → `version` (napr. `1.2.0`). Android `versionCode` sa z nej počíta automaticky (1.2.0 → 10200), iOS nastavte v Xcode (`MARKETING_VERSION`) na rovnakú hodnotu.
2. **Databáza sa mení len pridávaním** nových migrácií do `supabase/migrations/` (`0006_...sql`). Nikdy neupravujte staré súbory a nepoužívajte `drop`/destruktívne zmeny bez migračnej cesty. Supabase si pamätá, čo už bolo nasadené; `supabase db push` aplikuje len nové.
3. **Spätná kompatibilita API**: stará verzia appky musí fungovať s novou databázou. Stĺpce nepremenúvajte, pridávajte nové; staré označte komentárom a odstráňte až keď `min_app_version` v `app_config` prekročí verzie, ktoré ich používajú.
4. **Vynútená aktualizácia**: zvýšte `min_app_version` v `app_config`. Staršie appky zobrazia výzvu na aktualizáciu, dáta zostanú v cloude.
5. **Zálohy**: v Supabase zapnite Point-in-Time Recovery (platený doplnok) alebo aspoň denné zálohy. Pred každou migráciou do produkcie spustite `supabase db dump`.
6. **OTA aktualizácie webovej časti** (bez čakania na schválenie v obchode): Capgo alebo Ionic Appflow Live Updates. Povolené sú len zmeny web kódu, nie natívnych pluginov.

## Push notifikácie

1. Firebase projekt → `google-services.json` do `android/app/`, APNs kľúč nahrať do Firebase.
2. iOS: v Xcode zapnúť capability *Push Notifications* a *Background Modes → Remote notifications*.
3. Odosielanie: Edge Function (napr. `supabase/functions/notify/`) číta `device_tokens` a volá FCM HTTP v1 API pri novej správe (Database Webhook na `messages` INSERT). Šablóna nie je súčasťou tohto commitu.

## Deep linky

`https://nazovportalu.sk/inzerat/...` sa otvorí priamo v aplikácii. Na webe musia byť súbory `/.well-known/assetlinks.json` (Android, doplňte SHA-256 odtlačok podpisového kľúča) a `/.well-known/apple-app-site-association` (iOS, doplňte Team ID), obidva sú pripravené v `portal/.well-known/`.

## Vydanie

- **Android**: `npm run release:android` → `android/app/build/outputs/bundle/release/app-release.aab`. Podpisový kľúč vytvorte raz (`keytool -genkey ...`), uložte mimo gitu a použite v `android/app/build.gradle` (`signingConfigs`) alebo cez Play App Signing.
- **iOS**: Xcode → Product → Archive → Distribute (vyžaduje Apple Developer účet, 99 USD/rok).
- CI: `.github/workflows/android.yml` zostaví debug APK pri každom pushi do `portal/`.

Podmienky obchodov a riziká schválenia sú v `STORE.md`. Prečítajte si ich pred prvým odoslaním.
