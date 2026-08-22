#!/bin/bash
# Bilkie uygulama içi ekran görüntüsü alıcı
#   ./ss.sh topla [dakika]  → TELEFONDAN topla (kolay yol, varsayılan 30 dk)
#   ./ss.sh çek <ad>        → tek kare, kayıpsız PNG (kalite yolu)
#   ./ss.sh siteye          → hepsini site ölçüsüne indir → ../public/ekran/
#   ./ss.sh hazirla         → durum çubuğunu sabitle (çubuklar kırpıldığı için şart değil)
#   ./ss.sh bitir           → demo modundan çık
#
# NEDEN DEMO MODU: gerçek durum çubuğunda operatör adı, gerçek saat, pil yüzdesi
# ve bildirim rozetleri olur. Görselleri hem dağıtır hem tarihlendirir. Demo modu
# hepsini sabitler: saat 09:41, pil %100, sinyal dolu, bildirim yok.
# NEDEN screencap: emülatörün kendi kamera düğmesi bazen cihaz çerçevesi ekliyor
# ya da ölçekliyor. screencap ham kareyi verir — sıkıştırma ve ölçekleme yok.
set -e
ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
# Sistem çubuğu yükseklikleri — Redmi Note 10S / 1080x2400 / MIUI 14'te ölçüldü.
# Android 13'te policy_control (tam ekran) artık çalışmıyor, çubuklar gizlenemiyor;
# o yüzden yakaladıktan SONRA kırpıyoruz.
# Başka cihaza geçersen: düz zeminli bir ekran (açılış) yakala, simgelerin bittiği
# satırı bul, +14px pay bırak.
UST="${UST:-91}"   # durum çubuğu
ALT="${ALT:-106}"  # gezinme çubuğu
CIKTI="${CIKTI:-$(cd "$(dirname "$0")" && pwd)/cikti}"
HEDEF="$(cd "$(dirname "$0")/.." && pwd)/public/ekran"
D(){ "$ADB" shell am broadcast -a com.android.systemui.demo "$@" >/dev/null; }

case "${1:-}" in
  hazirla)
    "$ADB" wait-for-device
    "$ADB" shell settings put global sysui_demo_allowed 1
    D -e command enter
    D -e command clock -e hhmm 0941
    D -e command battery -e level 100 -e plugged false
    D -e command network -e wifi show -e level 4
    D -e command network -e mobile show -e level 4 -e datatype false
    D -e command notifications -e visible false
    echo "✓ durum çubuğu sabitlendi (09:41 · %100 · sinyal dolu · bildirim yok)"
    ;;
  çek|cek)
    [ -z "${2:-}" ] && { echo "kullanım: ./ss.sh çek <ad>"; exit 1; }
    mkdir -p "$CIKTI"
    "$ADB" exec-out screencap -p > "$CIKTI/$2.raw.png"
    python3 "$(dirname "$0")/kirp.py" "$CIKTI/$2" "$UST" "$ALT"
    ;;
  topla)
    # TELEFONDAN TOPLA: sen telefonda normal şekilde ekran görüntüsü al
    # (ses kısma + güç). Sonra bu komut son N dakikada alınmış BİLKİE karelerini
    # çeker, çubukları kırpar, sırayla numaralar. Dizüstüne hiç gitmeden
    # istediğin kadar ekran gezebilirsin — tek gidiş geliş.
    # ⚠️ MIUI ekran görüntülerini JPG kaydediyor (kayıplı). Siteye 764px'e
    # küçültüldüğü için gözle fark edilmez; kayıpsız isteyen "çek"i kullansın.
    DAK="${2:-30}"
    mkdir -p "$CIKTI"
    echo "son $DAK dakikadaki Bilkie kareleri toplanıyor…"
    LIST=$("$ADB" shell "find /sdcard/DCIM/Screenshots -name '*com.bilkie.app*' -mmin -$DAK 2>/dev/null | sort" | tr -d '\r')
    [ -z "$LIST" ] && { echo "  hiç kare bulunamadı — telefonda ekran görüntüsü aldın mı?"; exit 0; }
    i=1
    for f in $LIST; do
      n=$(printf "%02d" $i)
      "$ADB" pull "$f" "$CIKTI/$n.raw" >/dev/null 2>&1
      python3 "$(dirname "$0")/kirp.py" "$CIKTI/$n" "$UST" "$ALT" ham
      i=$((i+1))
    done
    echo "→ $CIKTI içinde $((i-1)) kare. İstediğin adla yeniden adlandır, sonra: ./ss.sh siteye"
    ;;

  siteye)
    mkdir -p "$HEDEF"
    python3 - "$CIKTI" "$HEDEF" <<'PY'
import sys, glob, os
from PIL import Image, ImageDraw
kaynak, hedef = sys.argv[1], sys.argv[2]
# Site 2x için ~764px genişlik istiyor; köşeler CSS kasasıyla uyumlu yuvarlanır.
GEN = 764
for f in sorted(glob.glob(os.path.join(kaynak, "*.png"))):
    im = Image.open(f).convert("RGBA")
    h = round(im.size[1] * GEN / im.size[0])
    im = im.resize((GEN, h), Image.LANCZOS)
    r = round(GEN * 13/382)                       # kasadaki köşe yarıçapıyla aynı oran
    m = Image.new("L", (GEN, h), 0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,GEN-1,h-1], radius=r, fill=255)
    im.putalpha(m)
    cik = os.path.join(hedef, os.path.basename(f))
    im.save(cik)
    print(f"  → {os.path.basename(f)}  {GEN}x{h}  (oran {GEN/h:.3f})")
print("\n⚠️ Ekran oranı değiştiyse app/page.tsx içindeki .tel-kasa aspect-ratio'sunu")
print("   bu orana eşitle, yoksa object-fit:cover kenarlardan kırpar.")
PY
    ;;
  bitir) D -e command exit; echo "✓ demo modundan çıkıldı" ;;
  *) sed -n '2,9p' "$0" ;;
esac
