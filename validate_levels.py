#!/usr/bin/env python3
"""
Kelime Gezmece — Level Validator & Grid Builder
================================================
Kullanım:
  # Tüm levelleri validate et
  python3 validate_levels.py validate kelimezgezmece.json

  # Belirli bir level
  python3 validate_levels.py validate kelimezgezmece.json --level level_5

  # Yeni kelime grubu için grid oluştur
  python3 validate_levels.py build --main TABLO --words tablo,olta,balo,alo,bot,bol

  # JSON'daki level_4'ü yeniden oluştur
  python3 validate_levels.py build-level kelimezgezmece.json level_4

Kurallar:
  1. 2 harfli kelime olmayacak
  2. 4 harfli levelda min 2 adet 4-harfli kelime
  3. 5 harfli levelda min 2 adet 5-harfli kelime  (6+ için zorunluluk yok)
  4. Her levelda minimum 4 kelime
"""

import json
import sys
import argparse
from collections import Counter

# ──────────────────────────────────────────────
# Türkçe karakter normalizasyonu
# ──────────────────────────────────────────────
_TR_MAP = str.maketrans("ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ", "abcçdefgğhıijklmnoöprsştuüvyz")

def tr_lower(s: str) -> str:
    return s.translate(_TR_MAP)


# ──────────────────────────────────────────────
# Grid utility
# ──────────────────────────────────────────────
def get_cells(word: str, row: int, col: int, direction: str) -> list[tuple[int, int, str]]:
    """Kelimenin kapladığı (row, col, char) hücrelerini döndür."""
    cells = []
    for i, ch in enumerate(tr_lower(word)):
        r = row + (i if direction == "down" else 0)
        c = col + (i if direction == "right" else 0)
        cells.append((r, c, ch))
    return cells


def can_place(word: str, row: int, col: int, direction: str,
              grid: dict[tuple[int, int], str]) -> bool:
    """Kelime çakışma olmadan yerleştirilebilir mi?"""
    cells = get_cells(word, row, col, direction)
    for r, c, ch in cells:
        if (r, c) in grid and grid[(r, c)] != ch:
            return False
    return True


def score_placement(word: str, row: int, col: int, direction: str,
                    grid: dict[tuple[int, int], str]) -> float:
    """
    Kesişim sayısına göre puanla.
    Daha fazla kesişim = daha iyi (kelimeler birbirine bağlı olsun).
    """
    cells = get_cells(word, row, col, direction)
    n_inter = sum(1 for r, c, ch in cells if (r, c) in grid and grid[(r, c)] == ch)
    word_len = len(word)
    # Kesişim olmadan yerleştirme mümkün ama istemiyoruz (izole kelimeler kötü)
    if n_inter == 0 and grid:
        return -1.0
    # Bonus: kelime uzunluğuna orantılı kesişim oranı
    score = n_inter + (n_inter / max(word_len, 1)) * 0.5
    # Merkeze yakınlık bonusu (küçük koordinat tercih)
    score -= (abs(row) + abs(col)) * 0.01
    return score


# ──────────────────────────────────────────────
# Crossword builder
# ──────────────────────────────────────────────
def build_crossword(words_list: list[str]) -> dict[str, dict]:
    """
    Kelimeleri crossword şeklinde yerleştir.
    Döndürür: {word: {row, col, dir}}
    """
    if not words_list:
        return {}

    # Ana kelime (en uzun) ilk sıraya
    sorted_words = sorted(words_list, key=len, reverse=True)
    main = sorted_words[0]

    grid: dict[tuple[int, int], str] = {}
    placed: dict[str, dict] = {}

    # Ana kelimeyi (0,0) right'a yerleştir
    for r, c, ch in get_cells(main, 0, 0, "right"):
        grid[(r, c)] = ch
    placed[main] = {"row": 0, "col": 0, "dir": "right"}

    # Geri kalan kelimeleri sırayla dene
    for word in sorted_words[1:]:
        best_score = -999.0
        best_placement = None

        word_lower = tr_lower(word)

        # Mevcut grid hücrelerinin her harfini kesişim noktası olarak dene
        for (gr, gc), gch in list(grid.items()):
            for wi, wch in enumerate(word_lower):
                if wch != gch:
                    continue
                # "right" yönünde: wi. harf (gr, gc)'de olacak
                for direction in ["right", "down"]:
                    if direction == "right":
                        row, col = gr, gc - wi
                    else:
                        row, col = gr - wi, gc

                    if can_place(word, row, col, direction, grid):
                        s = score_placement(word, row, col, direction, grid)
                        if s > best_score:
                            best_score = s
                            best_placement = (row, col, direction)

        if best_placement:
            row, col, direction = best_placement
            for r, c, ch in get_cells(word, row, col, direction):
                grid[(r, c)] = ch
            placed[word] = {"row": row, "col": col, "dir": direction}
        else:
            # Yerleştirilemedi — izole olarak en son sütunun sağına koy
            max_c = max(c for _, c in grid) + 2 if grid else 0
            placed[word] = {"row": 0, "col": max_c, "dir": "right"}
            for r, c, ch in get_cells(word, 0, max_c, "right"):
                grid[(r, c)] = ch

    return placed


def print_grid(placed: dict[str, dict]):
    """Terminal'de grid'i yazdır."""
    if not placed:
        print("  (boş)")
        return

    grid: dict[tuple[int, int], str] = {}
    for word, info in placed.items():
        for r, c, ch in get_cells(word, info["row"], info["col"], info["dir"]):
            grid[(r, c)] = ch

    if not grid:
        return

    min_r = min(r for r, _ in grid)
    max_r = max(r for r, _ in grid)
    min_c = min(c for _, c in grid)
    max_c = max(c for _, c in grid)

    print()
    for r in range(min_r, max_r + 1):
        row_str = ""
        for c in range(min_c, max_c + 1):
            ch = grid.get((r, c), "·")
            row_str += ch.upper() + " "
        print("  " + row_str)
    print()


# ──────────────────────────────────────────────
# Validator
# ──────────────────────────────────────────────
def validate_level(key: str, lvl: dict) -> dict:
    letters = [tr_lower(l) for l in lvl.get("letters", [])]
    words = [tr_lower(w) for w in lvl.get("words", {}).keys()]
    n = len(letters)
    issues = []

    # Kural 1: 2 harfli kelime yok
    two_letter = [w for w in words if len(w) == 2]
    if two_letter:
        issues.append(f"2 harfli kelime(ler): {two_letter}")

    # Kural 2: minimum 4 kelime
    if len(words) < 4:
        issues.append(f"Sadece {len(words)} kelime (minimum 4)")

    # Kural 3: N-harfli levelda min 2 adet N-harfli kelime (sadece 4 ve 5 için)
    if n in (4, 5):
        full = [w for w in words if len(w) == n]
        if len(full) < 2:
            issues.append(f"{n}-harfli kelime sayısı: {len(full)} (minimum 2 gerekli)")

    return {
        "key": key,
        "n_letters": n,
        "letters": letters,
        "words": words,
        "issues": issues,
        "ok": len(issues) == 0,
    }


def cmd_validate(args):
    try:
        with open(args.json_file, encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"HATA: {e}")
        sys.exit(1)

    levels = data.get("levels", {})
    keys = sorted(levels.keys(), key=lambda k: int(k.split("_")[1]))

    if args.level:
        if args.level not in levels:
            print(f"HATA: {args.level} bulunamadı")
            sys.exit(1)
        keys = [args.level]

    results = [validate_level(k, levels[k]) for k in keys]
    ok = [r for r in results if r["ok"]]
    fail = [r for r in results if not r["ok"]]

    print(f"\n{'='*60}")
    print(f"  KELIME GEZMECE LEVEL VALİDATOR")
    print(f"{'='*60}")
    print(f"  Toplam : {len(results)}   ✅ {len(ok)}   ❌ {len(fail)}")
    print(f"{'='*60}\n")

    for r in fail:
        print(f"❌  {r['key']}  [{r['n_letters']} harf: {''.join(r['letters'])}]")
        print(f"    Kelimeler : {r['words']}")
        for issue in r["issues"]:
            print(f"    ⚠️  {issue}")
        print()

    if not fail:
        print("✅ Tüm levellar kurallara uygun!\n")

    # Özet tablo
    if fail:
        print(f"{'─'*60}")
        print(f"  {'Level':<12} {'N':<4} {'#Kelime':<9} Sorun")
        print(f"{'─'*60}")
        for r in fail:
            short = " | ".join(r["issues"])
            print(f"  {r['key']:<12} {r['n_letters']:<4} {len(r['words']):<9} {short}")
        print()


# ──────────────────────────────────────────────
# Build komutu
# ──────────────────────────────────────────────
def cmd_build(args):
    main_word = args.main.strip()
    words_raw = [w.strip() for w in args.words.split(",") if w.strip()]

    # Ana kelime listeye yoksa ekle
    words_lower = [tr_lower(w) for w in words_raw]
    main_lower = tr_lower(main_word)
    if main_lower not in words_lower:
        words_raw.insert(0, main_word)

    print(f"\nKelimeler: {words_raw}")
    placed = build_crossword(words_raw)

    print("\nGrid:")
    print_grid(placed)

    print("JSON çıktısı:")
    result = {}
    for word, info in placed.items():
        result[tr_lower(word)] = {
            "row": info["row"],
            "col": info["col"],
            "dir": info["dir"],
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))


# ──────────────────────────────────────────────
# Build-level: mevcut level'ı yeniden oluştur
# ──────────────────────────────────────────────
def cmd_build_level(args):
    try:
        with open(args.json_file, encoding="utf-8") as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"HATA: {e}")
        sys.exit(1)

    levels = data.get("levels", {})
    if args.level not in levels:
        print(f"HATA: {args.level} bulunamadı")
        sys.exit(1)

    lvl = levels[args.level]
    words_raw = list(lvl.get("words", {}).keys())

    print(f"\n{args.level}  letters={lvl.get('letters')}")
    print(f"Kelimeler: {words_raw}")

    placed = build_crossword(words_raw)
    print("\nGrid:")
    print_grid(placed)

    print("JSON çıktısı:")
    result = {}
    for word, info in placed.items():
        result[tr_lower(word)] = {
            "row": info["row"],
            "col": info["col"],
            "dir": info["dir"],
        }
    print(json.dumps(result, ensure_ascii=False, indent=2))


# ──────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Kelime Gezmece — validator & grid builder",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    sub = parser.add_subparsers(dest="cmd", required=True)

    # validate
    p_val = sub.add_parser("validate", help="Levelleri kural kontrolünden geçir")
    p_val.add_argument("json_file")
    p_val.add_argument("--level", help="Sadece bu level (örn: level_5)")

    # build
    p_build = sub.add_parser("build", help="Kelime listesinden grid oluştur")
    p_build.add_argument("--main", required=True, help="Ana kelime (en uzun)")
    p_build.add_argument("--words", required=True, help="Virgülle ayrılmış kelime listesi")

    # build-level
    p_bl = sub.add_parser("build-level", help="JSON'daki bir level için grid yeniden hesapla")
    p_bl.add_argument("json_file")
    p_bl.add_argument("level", help="Örn: level_4")

    args = parser.parse_args()

    if args.cmd == "validate":
        cmd_validate(args)
    elif args.cmd == "build":
        cmd_build(args)
    elif args.cmd == "build-level":
        cmd_build_level(args)


if __name__ == "__main__":
    main()
