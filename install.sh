#!/usr/bin/env bash
# Jednoriadková inštalácia pre macOS / Linux: stiahne aplikáciu z GitHubu, rozbalí do ~/SXWorkforce a spustí start.sh
set -e
DEST="$HOME/SXWorkforce"
echo "Sťahujem aplikáciu do $DEST ..."
mkdir -p "$DEST" && cd "$DEST"
curl -fsSL -o app.zip "https://github.com/Lubo585/Lubo585/archive/refs/heads/claude/determined-mccarthy-7jfplr.zip"
unzip -qo app.zip && rm app.zip
cp -R Lubo585-claude-determined-mccarthy-7jfplr/. . && rm -rf Lubo585-claude-determined-mccarthy-7jfplr
chmod +x start.sh
exec ./start.sh
