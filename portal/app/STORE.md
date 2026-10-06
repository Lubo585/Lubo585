# Publikovanie v App Store a Google Play – čo treba vedieť

## Najdôležitejšie upozornenie

Obidva obchody **zakazujú aplikácie, ktoré sprostredkúvajú platené erotické alebo sexuálne služby**:

- **Apple App Store Review Guidelines 1.1.4**: zakázaný „overtly sexual or pornographic material“ a aplikácie, ktoré „facilitate prostitution“ alebo slúžia na „hookup“ s eskortným obsahom. Apple takéto aplikácie zamieta aj pri decentnom vizuáli, ak je účel zrejmý.
- **Google Play, Inappropriate Content → Sexual Content**: zakázané sú aplikácie propagujúce „sexual entertainment, escort services or other services that may be interpreted as providing sexual acts in exchange for compensation“.

Aplikácia v podobe erotickej inzercie spoločníčok a privátov preto **s vysokou pravdepodobnosťou neprejde** schválením ani v jednom obchode, bez ohľadu na technickú kvalitu. Pripravili sme ju tak, aby bola technicky pripravená na obchody, ale distribučnú stratégiu treba zvoliť s týmto vedomím.

## Reálne možnosti distribúcie

| Možnosť | Android | iOS | Poznámka |
|---|---|---|---|
| **PWA (web appka)** | ✅ „Pridať na plochu“, ikona, offline, push (Chrome) | ✅ Pridať na plochu, push od iOS 16.4 | Už hotové (`manifest.webmanifest`, `sw.js`). Žiadne schvaľovanie, aktualizácie okamžite. **Odporúčaný hlavný kanál.** |
| **Priame stiahnutie APK** | ✅ z webu, s návodom na povolenie inštalácie | ❌ | Bežné v tomto segmente. Aktualizácie cez vlastný kanál alebo Capgo. |
| **Alternatívne obchody** | ✅ napr. Aptoide, Uptodown; v EÚ od 2024 aj iné obchody | ✅ v EÚ alternatívne obchody (DMA, iOS 17.4+) s notarizáciou Apple | Apple notarizácia stále kontroluje bezpečnosť, nie obsah; obsahové pravidlá určuje obchod. |
| **Oficiálne obchody s obmedzenou verziou** | ⚠️ | ⚠️ | Verzia „zoznamka / spoločenské stretnutia“ bez cenníkov a explicitných služieb, s prísnym 18+ ratingom. Riziko zamietnutia a trvalého zablokovania vývojárskeho účtu (Apple aj Google blokujú účty za opakované porušenia), čo ohrozí aj iné vaše aplikácie. |

**Zvolená stratégia: priame stiahnutie z webu.** Stránka `/aplikacia.html` ponúka Android APK (s SHA-256 a návodom) a pre iPhone pridanie PWA na plochu. Aplikácia si sama kontroluje `downloads/version.json` a ponúkne novú verziu. Obchody prípadne neskôr so „soft“ verziou **na samostatnom vývojárskom účte**.

## Ak sa rozhodnete odoslať do obchodov

### Spoločné
- Vekový rating **18+** (Apple 17+, Google „Mature 17+“/IARC 18) a funkčná brána overenia veku.
- Pravidlá obsahu, nahlasovanie, blokovanie používateľov a kontakt na podporu priamo v aplikácii (Apple 1.2 UGC: filter, nahlasovanie, blokovanie, kontakt).
- Zásady ochrany súkromia na verejnej URL (`/ochrana-sukromia.html`) a možnosť zmazať účet v aplikácii (Apple 5.1.1(v), Google Account deletion).
- Platby za topovanie: Apple vyžaduje In-App Purchase pre digitálny obsah (30/15 % provízia); Google od 2024 povoľuje alternatívne platby v EÚ s poplatkom. Externé platobné brány pre erotický obsah (CCBill, Segpay) obchody v appke nepovolia.

### Apple App Store
- Apple Developer Program (99 USD/rok), Xcode, macOS.
- App Store Connect: snímky obrazovky 6,7" a 6,5", popis, kľúčové slová, Privacy Nutrition Labels (zbierané údaje: e-mail, telefón, fotky, poloha nie).
- Testovanie cez TestFlight pred odoslaním.

### Google Play
- Google Play Console (25 USD jednorazovo), **nový účet od 2023 musí najprv 14 dní testovať s 12 testermi** (closed testing) pred produkciou.
- Data safety formulár, IARC dotazník, Target API level podľa aktuálnej požiadavky (Capacitor 8 cieli na API 35).
- Podpis cez Play App Signing, formát AAB.

## Kontrolný zoznam pred odoslaním
- [ ] `package.json` → version zvýšená, `app_config.min_app_version` nastavené
- [ ] `js/config.js` obsahuje produkčný Supabase URL/kľúč
- [ ] Ikony a splash (`npm run assets`), názov a `appId` finálne (po zmene appId nový záznam v obchode!)
- [ ] `.well-known/assetlinks.json` a `apple-app-site-association` nasadené na doméne
- [ ] Zmazanie účtu funguje (RPC + kaskáda v DB je pripravená cez `on delete cascade`)
- [ ] Právne texty skontrolované advokátom, kontakt na zodpovednú osobu podľa DSA
