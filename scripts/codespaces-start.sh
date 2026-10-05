#!/usr/bin/env bash
# Spustenie / reštart aplikácie v GitHub Codespaces (ak by sa automatický štart nepodaril)
cd "$(dirname "$0")/.."
pkill -f "node --no-warnings=ExperimentalWarning server.js" 2>/dev/null
[ -d node_modules ] || npm install
[ -f data/app.db ] || npm run demo
nohup npm start > /tmp/app.log 2>&1 &
sleep 3; tail -3 /tmp/app.log
echo "Hotovo. V záložke PORTY (Ports) kliknite na adresu portu 3000, prihlásenie admin / admin."
