#!/bin/sh
# Záloha databázy a príloh mimo servera (spúšťajte z cronu, napr. denne o 3:00):
#   0 3 * * * /opt/agentura/scripts-backup.sh /mnt/zalohy
set -e
DEST=${1:-./offsite-backups}
STAMP=$(date +%Y-%m-%d_%H%M)
mkdir -p "$DEST"
tar czf "$DEST/agentura-$STAMP.tgz" -C "$(dirname "$0")" data/app.db data/backups data/uploads 2>/dev/null || tar czf "$DEST/agentura-$STAMP.tgz" -C "$(dirname "$0")" data
# ponechaj 60 záloh
ls -1t "$DEST"/agentura-*.tgz | tail -n +61 | xargs -r rm -f
echo "Záloha: $DEST/agentura-$STAMP.tgz"
