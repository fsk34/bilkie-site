// Ay görsellerinin TEK KAYNAĞI — Android `AyGorsel.kt`in web karşılığı.
//
// Neden: bu bilgiler `gorevler/page.tsx` içinde altı aylık dizilerdi
// (`BANNERLAR`, `AY_RENK`) ve Temmuz–Aralık sessizce Ocak'a düşüyordu.
// Öğretim yılı Eylül'de başladığı için boşluk tam sezonun açılışına denk geliyordu.
//
// ⚠️ Her yerde 0 tabanlı ay — `Date.getMonth()` ile aynı (0 = Ocak).

/** Dosya adlarındaki ek (Türkçe karaktersiz). */
export const AY_ANAHTAR = [
  "ocak", "subat", "mart", "nisan", "mayis", "haziran",
  "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik",
] as const;

export const AY_AD = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
] as const;

/**
 * Ayın vurgu rengi (görev çubuğu dolgusu) — 14 Eyl 2026: banner'ın BASKIN tonundan türetildi
 * (doygun piksel kümesi ölçüldü), ray #4A538E üzerinde ≥3:1 kontrast verene kadar açıldı; üç
 * platformda aynı liste. Eskiden 7 ay "geçici" ve banner'la ilgisizdi (Haziran kırmızısı
 * mor banner üstünde 1,4:1'di). Temmuz/Ağustos'un banner'ı yok, o ikisi hâlâ geçici.
 */
const VURGU = [
  "#45B9EF", // Ocak
  "#45B7EF", // Şubat
  "#AFD85C", // Mart
  "#71D861", // Nisan
  "#E4A936", // Mayıs
  "#B69AFF", // Haziran
  "#FF8A3D", // Temmuz   — banner yok, geçici
  "#FFD54F", // Ağustos  — banner yok, geçici
  "#F98B42", // Eylül
  "#B2D861", // Ekim
  "#ADA0FF", // Kasım
  "#59B3FF", // Aralık
] as const;

/**
 * Banner üstündeki yazının rengi — zemin ÖLÇÜLEREK seçildi (Android ile aynı liste).
 * Kasım ve Aralık'ın zemininde siyah kontrast 3,3:1 ve 2,1:1'e düşüyordu.
 * Temmuz/Ağustos'un banner'ı yok; ekranın koyu zemini görünür, orada da beyaz.
 */
const YAZI_BEYAZ = new Set([6, 7, 10, 11]); // Temmuz, Ağustos, Kasım, Aralık

const norm = (ay0: number) => ((ay0 % 12) + 12) % 12;

export const ayAdi = (ay0: number) => AY_AD[norm(ay0)];
export const ayVurgu = (ay0: number) => VURGU[norm(ay0)];
export const ayYaziRengi = (ay0: number) => (YAZI_BEYAZ.has(norm(ay0)) ? "#fff" : "#000");

/**
 * Banner yolu. Temmuz/Ağustos'un görseli HENÜZ YOK → `null`.
 * Çağıran yer görseli hiç çizmemeli; eskiden Ocak banner'ı basılıyordu.
 */
export function ayBanner(ay0: number): string | null {
  const i = norm(ay0);
  if (i === 6 || i === 7) return null; // Temmuz, Ağustos
  return `/uygulama/${AY_ANAHTAR[i]}banner.webp`;
}
