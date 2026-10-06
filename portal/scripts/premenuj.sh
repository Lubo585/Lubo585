#!/usr/bin/env bash
# Nahradí zástupný názov značky a doménu vo všetkých súboroch portálu.
# Použitie:  ./scripts/premenuj.sh "Zvodnice" "zvodnice.sk"
set -euo pipefail
NAZOV="${1:?Zadajte nový názov značky, napr. Zvodnice}"
DOMENA="${2:?Zadajte novú doménu, napr. zvodnice.sk}"
DIR="$(cd "$(dirname "$0")/.." && pwd)"
grep -rl --exclude-dir=.git --exclude-dir=scripts -e 'NazovPortalu' -e 'nazovportalu.sk' "$DIR" | while read -r f; do
  sed -i -e "s/nazovportalu\.sk/${DOMENA}/g" -e "s/NazovPortalu/${NAZOV}/g" "$f"
  echo "upravené: ${f#$DIR/}"
done
echo "Hotovo. Skontrolujte ešte <title> a meta description, či nový názov dobre znie v texte."
