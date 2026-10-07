#!/bin/sh
# Sunucu karar motorunu (Android deposu functions/src/motor) web'e kopyalar: app/lib/olay/motor/.
# Web bitiş ekranının yerel tahmini SUNUCUYLA AYNI kodu çalıştırsın diye (şartname §8.2) — elle
# düzenleme YAPILMAZ, değişiklik sunucuda yapılıp bu betik çalıştırılır.
#   sh scripts/motor_esitle.sh            kopyala
#   sh scripts/motor_esitle.sh --denetle  fark varsa çıkış kodu 1 (kopyalamaz)
set -eu
KAYNAK="${MOTOR_KAYNAK:-$HOME/AndroidStudioProjects/Bilkie/functions/src/motor}"
HEDEF="$(cd "$(dirname "$0")/.." && pwd)/app/lib/olay/motor"
# budama.ts / lig.ts yalnız sunucuda çalışır (istemcinin işi değil)
DOSYALAR="tarih sayi tipler gorev seri gunluk dogrula motor"

[ -d "$KAYNAK" ] || { echo "kaynak yok: $KAYNAK" >&2; exit 2; }
GECICI="$(mktemp -d)"
trap 'rm -rf "$GECICI"' EXIT

for d in $DOSYALAR; do
  {
    echo "// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/$d.ts (scripts/motor_esitle.sh)"
    # Node'un .ts uzantılı içe aktarımları → Next için uzantısız
    sed -E 's#(from "\./[a-z]+)\.ts"#\1"#' "$KAYNAK/$d.ts"
  } > "$GECICI/$d.ts"
done

if [ "${1:-}" = "--denetle" ]; then
  fark=0
  for d in $DOSYALAR; do
    cmp -s "$GECICI/$d.ts" "$HEDEF/$d.ts" || { echo "FARKLI: $d.ts"; fark=1; }
  done
  [ $fark -eq 0 ] && echo "motor eşit"
  exit $fark
fi

mkdir -p "$HEDEF"
for d in $DOSYALAR; do cp "$GECICI/$d.ts" "$HEDEF/$d.ts"; done
echo "kopyalandı → $HEDEF"
