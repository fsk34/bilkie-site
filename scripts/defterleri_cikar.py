#!/usr/bin/env python3
"""
Konu defterlerinin HALKA AÇIK kısmını üretir: data/icerik/defterler.json

Kaynak: Firebase `konudefterleri` veritabanının dışa aktarımı (Firebase Console →
Realtime Database → konudefterleri → ⋮ → JSON'u dışa aktar).

Neden betik: her defterin YARISI (en az 3 sayfa) yayınlanıyor, kalanı uygulamada.
Kapalı sayfalar depoya da girmiyor — testlerdeki kuralın aynısı (testleri_cikar.py).
Yeni ünite eklendiğinde ya da metin değiştiğinde dışa aktarımı yenileyip bunu
tekrar çalıştırmak gerekir.

Kural "yarısı, en az 3": ölçüldü (16 Eyl 2026, 199 ünite, medyan 8 sayfa) —
ilk 3 sayfa medyan 219 kelime, ilk 4 sayfa 289. Sabit 3 sayfa 143 üniteyi 250
kelimenin altında bırakıyordu; yarısı kuralı uzun defterde daha çok, kısa
defterde en az 3 sayfa açar. 4 sayfalık 4 ünitede 1 sayfa kapalı kalır.

Sayfa içeriği HAM bloklar olarak saklanır; dönüşüm çalışma anında
defterBicim.sayfalariCevir ile — uygulamayla aynı mantık, kopya değil.

Kullanım:
    python3 scripts/defterleri_cikar.py ~/Downloads/konudefterleri-export-3.json
"""
import json
import math
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.path.join(KOK, "data", "icerik", "defterler.json")
EN_AZ = 3


def sayi(s: str) -> int:
    return int(re.sub(r"\D", "", s) or 0)


def sayfalar(ham):
    """Firebase liste ya da {"0":..., "1":...} sözlüğü — sıralı, boşsuz."""
    if isinstance(ham, dict):
        ham = [ham[k] for k in sorted(ham, key=sayi)]
    return [p for p in (ham or []) if p and (p.get("blocks") or p.get("bloklar"))]


def main(yol: str) -> None:
    with open(yol, encoding="utf-8") as f:
        kok = json.load(f)
    defterler = kok.get("defterler", kok)

    cikti = {}
    unite_sayisi = acik_toplam = kapali_toplam = 0
    for grade_key, gv in defterler.items():
        for ders_key, dv in (gv.get("subjects") or {}).items():
            for u_key, uv in (dv.get("units") or {}).items():
                pg = sayfalar(uv.get("pages"))
                if not pg:
                    continue
                acik = max(EN_AZ, math.ceil(len(pg) / 2))
                acik = min(acik, len(pg))
                cikti.setdefault(grade_key, {}).setdefault(ders_key, {})[u_key] = {
                    "title": uv.get("title") or u_key,
                    "toplam": len(pg),
                    "pages": pg[:acik],
                }
                unite_sayisi += 1
                acik_toplam += acik
                kapali_toplam += len(pg) - acik

    os.makedirs(os.path.dirname(CIKTI), exist_ok=True)
    with open(CIKTI, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, separators=(",", ":"))

    boyut = os.path.getsize(CIKTI) / 1024
    print(f"{unite_sayisi} ünite → {CIKTI} ({boyut:.0f} KB)")
    print(f"açık sayfa {acik_toplam}, kapalı {kapali_toplam} (uygulamada)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
