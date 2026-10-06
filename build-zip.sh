#!/usr/bin/env bash
# Erstellt dist/sx-workforce-website.zip mit allen Dateien, die auf den Webspace gehören.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p dist
rm -f dist/sx-workforce-website.zip
zip -r -q dist/sx-workforce-website.zip \
  index.html impressum.html datenschutz.html 404.html \
  .htaccess favicon.ico robots.txt sitemap.xml \
  assets \
  -x 'assets/**/.DS_Store'
echo "Erstellt: dist/sx-workforce-website.zip ($(du -h dist/sx-workforce-website.zip | cut -f1))"
unzip -l dist/sx-workforce-website.zip | tail -1
