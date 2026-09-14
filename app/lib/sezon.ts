// Sezon anahtarları — lig ve rozet yollarında kullanılan dönem kimlikleri.
// Android `domain/Sezon.kt` ve iOS `Domain/Sezon.swift` ile **birebir aynı tablo** —
// biri değişirse üçü de değişmeli, yoksa platformlar farklı listelere yazar.
//
// Neden: `"2025_2026_guz"` üç platformda dokuz yerde sabit yazılıydı; 2026-2027 yılı
// başladığında hâlâ geçen güzü söylüyordu.
//
// ## Lig anahtarı — MEB dönemleri
// 2026-2027 takvimi (meb.gov.tr, haber 41057): dersler 14 Eyl 2026, yarıyıl tatili
// 25 Oca–5 Şub 2027, ikinci dönem 8 Şub 2027, ders yılı sonu 25 Haz 2027.
// Ara tatiller (Kasım, Mart) dönemi bölmez; yarıyıl tatili güze dahil sayılır.
//
// | Aralık                    | Anahtar          |
// |---------------------------|------------------|
// | … – 13 Eyl 2026           | 2025_2026_guz    | (eski sabit — dokunulmadı)
// | 14 Eyl 2026 – 7 Şub 2027  | 2026_2027_guz    |
// | 8 Şub 2027 – 25 Haz 2027  | 2026_2027_bahar  |
// | 26 Haz 2027 – …           | 2027_yaz         | (yeni takvim açıklanınca satır eklenir)
//
// ## Rozet anahtarı — öğretim yılı
// Aylık rozetler `users/{uid}/badges/{yil}/{ay}` altında ve ekran Eylül→Ağustos'u tek
// takvim olarak gösterir. Lig gibi güz/bahar diye bölünseydi Eylül–Ocak rozetleri
// Şubat'ta ekrandan kaybolurdu. Bu yüzden rozet yılı Eylül'de başlar: `2026_2027`.

import { gunAnahtari } from "./tarih";

/** Dönem başlangıçları, artan sırada: "yyyy-MM-dd" (Istanbul) → anahtar. */
const LIG_DONEMLERI: [string, string][] = [
  ["2026-09-14", "2026_2027_guz"],
  ["2027-02-08", "2026_2027_bahar"],
  ["2027-06-26", "2027_yaz"],
];

/** Tablodaki ilk dönemden önceki tarihler için (mevcut veri burada). */
const LIG_ESKI = "2025_2026_guz";

export function ligAnahtari(simdi: Date = new Date()): string {
  const bugun = gunAnahtari(simdi); // ISO biçimi → dize karşılaştırması tarih sırasıdır
  let anahtar = LIG_ESKI;
  for (const [baslangic, ad] of LIG_DONEMLERI) {
    if (bugun >= baslangic) anahtar = ad;
    else break;
  }
  return anahtar;
}

/** Öğretim yılı: Eylül–Ağustos. Eyl 2026 → "2026_2027", Ağu 2027 → "2026_2027". */
export function rozetYiliAnahtari(simdi: Date = new Date()): string {
  const g = gunAnahtari(simdi);
  const yil = Number(g.slice(0, 4));
  const ay = Number(g.slice(5, 7));
  const baslangic = ay >= 9 ? yil : yil - 1;
  return `${baslangic}_${baslangic + 1}`;
}

/** Rozet ekranı başlığı: "2026-2027". */
export const rozetYiliBasligi = (simdi: Date = new Date()) =>
  rozetYiliAnahtari(simdi).replace("_", "-");
