#!/usr/bin/env python3
"""
Konu testlerinin HALKA AÇIK kısmını üretir: data/icerik/testler.json

Kaynak: Firebase `konutestleri` veritabanının dışa aktarımı (Firebase Console →
Realtime Database → konutestleri → ⋮ → JSON'u dışa aktar).

Neden betik: her testin 30 sorusundan yalnız İLK ADIMI (s1, 10 soru) yayınlanıyor.
Kalan 20 soru depoya da girmiyor — tam dışa aktarım 8,4 MB, bu çıktı 1,4 MB.
Yeni test eklendiğinde dışa aktarımı yenileyip bunu tekrar çalıştırmak gerekir.

Konu ADLARI koddan geliyor: app/lib/katalog.ts içindeki başlıklar "[tN]" etiketi
taşıyor ve test anahtarlarıyla birebir eşleşiyor (760/760 doğrulandı).

Kullanım:
    python3 scripts/testleri_cikar.py ~/Downloads/konutestleri-export.json
"""
import collections
import json
import os
import re
import sys

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CIKTI = os.path.join(KOK, "data", "icerik", "testler.json")
KATALOG = os.path.join(KOK, "app", "lib", "katalog.ts")

TR = {"ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
      "Ç": "c", "Ğ": "g", "İ": "i", "I": "i", "Ö": "o", "Ş": "s", "Ü": "u"}


def slug(s: str) -> str:
    s = "".join(TR.get(c, c) for c in s).lower()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def sayi(s: str) -> int:
    return int(re.sub(r"\D", "", s) or 0)


def katalogu_oku():
    """(sınıf, ders, tN) → (konu adı, ünite adı)"""
    src = open(KATALOG, encoding="utf-8").read()
    bas = src.index("{", src.index("KATALOG"))
    son = src.index("\n};", bas)
    kat = json.loads(src[bas:son + 2])
    out = {}
    for sn, dersler in kat.items():
        for ders, uniteler in dersler.items():
            for u in uniteler:
                for konu in u["topics"]:
                    m = re.search(r"\[(t\d+)\]$", konu.strip())
                    if m:
                        out[(int(sn), ders, m.group(1))] = (konu[:m.start()].strip(), u["title"])
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    adlar = katalogu_oku()
    ham = json.load(open(sys.argv[1], encoding="utf-8"))["tests"]

    cikti, kullanilan = {}, collections.defaultdict(set)
    sayfa = soru = eslesmeyen = 0

    # Sıra KARARLI olmalı: slug çakışmasına verilen "-2" eki her çalıştırmada
    # aynı teste düşsün, yoksa yayındaki adresler sessizce değişir.
    for g in sorted(ham, key=sayi):
        sn = sayi(g)
        for ders in sorted(ham[g]):
            for tk in sorted(ham[g][ders], key=sayi):
                k = (sn, ders, tk)
                if k not in adlar:
                    eslesmeyen += 1
                    continue
                konu_ad, unite_ad = adlar[k]
                tv = ham[g][ders][tk] or {}
                s1 = tv.get("s1")
                if not isinstance(s1, dict):
                    continue
                sorular = []
                for qk in sorted(s1, key=lambda x: int(x[1:]) if x[1:].isdigit() else 0):
                    q = s1[qk]
                    if isinstance(q, dict) and q.get("text"):
                        sorular.append({"s": q["text"], "o": q.get("options") or [], "d": q.get("correct")})
                if not sorular:
                    continue
                # Aynı ders içinde aynı adlı konular var (ör. 6/türkçe
                # "Düşünceyi Geliştirme" üç kez) — ek sıra numarası alır.
                temel = slug(konu_ad)
                yol, i = temel, 2
                while yol in kullanilan[(sn, ders)]:
                    yol, i = f"{temel}-{i}", i + 1
                kullanilan[(sn, ders)].add(yol)
                cikti.setdefault(str(sn), {}).setdefault(ders, []).append({
                    "t": tk, "ad": konu_ad, "slug": yol, "unite": unite_ad,
                    "toplam": sum(len(x) for x in tv.values() if isinstance(x, dict)),
                    "sorular": sorular,
                })
                sayfa += 1
                soru += len(sorular)

    json.dump(cikti, open(CIKTI, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{CIKTI}  ({os.path.getsize(CIKTI) // 1024} KB)")
    print(f"test sayfası: {sayfa}   açılan soru: {soru}")
    if eslesmeyen:
        print(f"⚠️  katalogda karşılığı olmayan test: {eslesmeyen} (yayınlanmadı)")


if __name__ == "__main__":
    main()
