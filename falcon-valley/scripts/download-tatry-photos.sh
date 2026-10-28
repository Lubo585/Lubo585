#!/usr/bin/env bash
# Stiahne voľne licencované fotografie Vysokých Tatier z Wikimedia Commons
# do priečinka public/tatry/ (šírka 1920 px – jedna z povolených veľkostí náhľadov).
#
# Použitie:  npm run photos        (alebo priamo: bash scripts/download-tatry-photos.sh)
#
# Licencie sú CC BY-SA – autori sú uvedení v src/content/photos.ts a v pätičke webu.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p public/tatry
UA="FalconsValleySite/1.0 (website photo fetch; contact: info@falconsvalley.sk)"
B="https://upload.wikimedia.org/wikipedia/commons/thumb"

get() { # get <cieľový súbor> <hash cesta> <názov súboru na Commons (URL-encoded)>
  local out="public/tatry/$1" url="$B/$2/$3/1920px-$3"
  if [ -s "$out" ]; then echo "✓ $1 (už existuje)"; return; fi
  echo "↓ $1"
  curl -fsSL -A "$UA" --retry 3 --retry-delay 5 -o "$out" "$url" || { echo "  ✗ zlyhalo: $url"; rm -f "$out"; }
  sleep 1
}

get hero.jpg                  5/5a "Strbske_Pleso_-_Mountains_2.jpg"
get strbske-pleso-sunset.jpg  9/97 "Drone_view_of_%C5%A0trbsk%C3%A9_pleso_at_sunset%2C_September_2024.jpg"
get zabia-dolina.jpg          6/69 "%C5%BDabia_dolina_mengusovsk%C3%A1_%C5%BBK2020.jpg"
get popradske-pleso.jpg       c/c3 "Popradsk%C3%A9_pleso_od_n%C3%A1stupov%C3%A9_cesty_do_sedla_pod_Ostrvou.JPG"
get velka-studena-dolina.jpg  8/8a "Ve%C4%BEk%C3%A1_Studen%C3%A1_dolina%E2%80%93top.jpg"
get gerlach.jpg               4/41 "Gerlachovsk%C3%BD_%C5%A1t%C3%ADt_od_T._Polianky_%281%29.jpg"
get krivan.jpg                9/91 "Kriv%C3%A1%C5%88_Vysok%C3%A9_Tatry_18_Slovensko3.jpg"
get strbske-pleso-aerial.jpg  0/06 "%C5%A0trbsk%C3%A9_Pleso_aerial_2018_01.jpg"
get mengusovska-dolina.jpg    9/92 "Mengusovsk%C3%A1_dolina%2C_Vysok%C3%A9_Tatry_%2837%29.JPG"
get gerlach-panorama.jpg      9/9d "Gerlach_a8.jpg"

echo "Hotovo. Fotky sú v public/tatry/."
