# Yakalanan ham kareden sistem çubuklarını keser.
# 4. argüman "ham" ise kaynak .raw (telefondan çekilen JPG), değilse .raw.png
import sys, os
from PIL import Image
ad, ust, alt = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
kaynak = ad + (".raw" if len(sys.argv) > 4 else ".raw.png")
im = Image.open(kaynak).convert("RGB")
w, h = im.size
im.crop((0, ust, w, h - alt)).save(ad + ".png")
os.remove(kaynak)
n = Image.open(ad + ".png")
print(f"  \u2713 {os.path.basename(ad)}.png  {n.size[0]}x{n.size[1]}  oran {n.size[0]/n.size[1]:.3f}")
