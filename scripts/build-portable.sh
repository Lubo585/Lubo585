#!/usr/bin/env bash
# Zostaví prenosný balík pre Windows (bez inštalácie): aplikácia + závislosti + spúšťač, ktorý si stiahne node.exe.
#   ./scripts/build-portable.sh            -> dist/SXWorkforce-portable-windows.zip
#   ./scripts/build-portable.sh --with-node  (pribalí aj node.exe, balík je o ~30 MB väčší, funguje offline)
set -e
cd "$(dirname "$0")/.."
NODE_VER=22.22.0
OUT=dist; rm -rf "$OUT/SXWorkforce" && mkdir -p "$OUT/SXWorkforce"
git archive HEAD | tar -x -C "$OUT/SXWorkforce"
cd "$OUT/SXWorkforce" && rm -rf mobile test .github dist Frontrunbotmain && npm ci --omit=dev --no-audit --no-fund >/dev/null
mkdir -p node data
cp ../../scripts/portable/SPUSTIT.bat ../../scripts/portable/PRECITAJ-MA.txt .
if [ "$1" = "--with-node" ]; then curl -fsSL -o node/node.exe "https://nodejs.org/dist/v$NODE_VER/win-x64/node.exe"; fi
cd .. && rm -f SXWorkforce-portable-windows.zip && zip -qr9 SXWorkforce-portable-windows.zip SXWorkforce && rm -rf SXWorkforce
echo "Hotovo: $OUT/SXWorkforce-portable-windows.zip ($(du -h SXWorkforce-portable-windows.zip | cut -f1))"
