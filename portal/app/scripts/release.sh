#!/usr/bin/env bash
# Vydanie Android APK na priame stiahnutie z webu.
# Použitie: ./scripts/release.sh 1.1.0 "Opravy chýb" "Nové filtre"
# Vyžaduje: Android SDK (ANDROID_HOME), JDK 21, podpisový kľúč v premenných
#   NP_KEYSTORE_PATH, NP_KEYSTORE_PASSWORD, NP_KEY_ALIAS, NP_KEY_PASSWORD
# Kľúč vytvoríte raz:  keytool -genkeypair -v -keystore nazovportalu.keystore -alias nazovportalu -keyalg RSA -keysize 4096 -validity 10000
# Kľúč NIKDY nestraťte a nezverejnite: aktualizácia podpísaná iným kľúčom sa nedá nainštalovať cez starú verziu.
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
VERSION="${1:?Zadajte verziu, napr. 1.1.0}"; shift || true
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Verzia musí byť X.Y.Z"; exit 1; }
: "${NP_KEYSTORE_PATH:?Chýba NP_KEYSTORE_PATH}" "${NP_KEYSTORE_PASSWORD:?}" "${NP_KEY_ALIAS:?}" "${NP_KEY_PASSWORD:?}"

cd "$HERE"
node -e "const f='package.json',p=require('./'+f);p.version='$VERSION';require('fs').writeFileSync(f,JSON.stringify(p,null,2)+'\n')"
npm run build
npx cap sync android
( cd android && chmod +x gradlew && ./gradlew assembleRelease --no-daemon )

APK_SRC="android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK_SRC" ] || { echo "APK sa nevytvoril (skontrolujte podpis)"; exit 1; }
OUT="$HERE/../downloads"; mkdir -p "$OUT"
APK="$OUT/nazovportalu-$VERSION.apk"
cp "$APK_SRC" "$APK"; cp "$APK_SRC" "$OUT/nazovportalu-latest.apk"
SHA=$(sha256sum "$APK" | cut -d' ' -f1)
SIZE=$(python3 -c "import os;print(round(os.path.getsize('$APK')/1048576,1))")
IFS='.' read -r MA MI PA <<< "$VERSION"; CODE=$((MA*10000+MI*100+PA))
python3 - "$VERSION" "$CODE" "$SHA" "$SIZE" "$@" <<'PY'
import json,sys,datetime
v,code,sha,size,*changes=sys.argv[1:]
p='../downloads/version.json'
try: old=json.load(open(p))
except Exception: old={}
old.update({"version":v,"versionCode":int(code),"apk":f"/downloads/nazovportalu-{v}.apk","sha256":sha,"sizeMB":float(size),
  "minAndroid":"7.0 (API 24)","releasedAt":datetime.datetime.utcnow().replace(microsecond=0).isoformat()+"Z",
  "changelog":changes or old.get("changelog",[])})
json.dump(old,open(p,'w'),ensure_ascii=False,indent=2); print("version.json aktualizovaný")
PY
# QR kód (ak sa zmenila doména)
echo
echo "Hotovo: $APK"
echo "SHA-256: $SHA"
echo "Nahrajte priečinok downloads/ na web (alebo pripojte APK ku GitHub Release a upravte pole apk vo version.json)."
echo "Potom v Supabase: update app_config set value = jsonb_set(value,'{android}','\"$VERSION\"') where key='min_app_version';  -- len ak chcete vynútiť aktualizáciu"
