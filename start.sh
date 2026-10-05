#!/usr/bin/env bash
# Spustenie firemnej aplikácie na macOS / Linux: nainštaluje Node.js (ak chýba), závislosti, voliteľne ukážkové dáta, spustí aplikáciu.
set -e
cd "$(dirname "$0")"
echo "============================================================"
echo " SX Workforce – firemná aplikácia"
echo "============================================================"

need_node() { ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/v\([0-9]*\).*/\1/')" -lt 22 ]; }
if need_node; then
  echo "Node.js 22+ nie je nainštalovaný. Inštalujem..."
  if command -v brew >/dev/null 2>&1; then brew install node@22 && brew link --overwrite node@22 || brew install node
  elif command -v apt-get >/dev/null 2>&1; then curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then curl -fsSL https://rpm.nodesource.com/setup_22.x | sudo bash - && sudo dnf install -y nodejs
  else
    echo "Inštalujem cez nvm..."; curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
    export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"; nvm install 22; nvm use 22
  fi
fi
if need_node; then echo "Node.js sa nepodarilo nainštalovať. Stiahnite ho z https://nodejs.org (LTS) a spustite skript znova."; exit 1; fi
echo "Node.js $(node -v) nájdený."

[ -d node_modules ] || { echo "Inštalujem závislosti aplikácie..."; npm install --omit=dev; }
if [ ! -f data/app.db ]; then
  read -r -p "Načítať ukážkové dáta (vzorová firma)? [a/N]: " DEMO
  case "$DEMO" in a|A|y|Y) npm run demo ;; esac
fi
echo
echo "Spúšťam aplikáciu na http://localhost:3000 — prihlásenie admin / admin (pri ukážke aj kancelaria, dispecer, uctovnik / demo1234)."
echo "Ukončenie: Ctrl+C"
( sleep 2; command -v xdg-open >/dev/null && xdg-open http://localhost:3000 || command -v open >/dev/null && open http://localhost:3000 ) >/dev/null 2>&1 &
npm start
