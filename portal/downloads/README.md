# Priame stiahnutie aplikácie

Sem patria vydané súbory:

- `nazovportalu-<verzia>.apk` – podpísaný Android balík (vytvorí `app/scripts/release.sh` alebo GitHub Actions `android-release.yml`)
- `nazovportalu-latest.apk` – kópia poslednej verzie pod stabilným názvom
- `version.json` – verzia, odkaz, SHA-256, veľkosť a zmeny; číta ho stránka `/aplikacia.html` a aj samotná aplikácia (kontrola aktualizácií)

APK súbory sú v `.gitignore` (sú veľké a binárne); do webu sa nahrávajú pri nasadení alebo sa odkaz v `version.json` nastaví na GitHub Release.
