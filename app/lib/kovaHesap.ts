// İstatistik kovasının (stats/.../tests, stats/.../yazili) TÜREV değerleri — başarı % ve ortalama süre.
// TEK kural, bütün okuyucular buradan geçer (istatistik ekranı, Koç, ana ekran). Android `KovaHesap.kt`
// ve iOS `KovaHesap.swift` birebir aynı.
//
// Neden: kovada `successRate`/`avgDurationSec` hazır yazılı duruyor ama toplamlarla çelişebiliyor (eski
// sürümler, yarım kalan transaction'lar, istemci artırmaları). 5 Eki 2026'ya kadar pasta dilimleri
// toplamlardan, kartlar/Koç/ana ekran kayıtlı alandan okuyordu. Artık toplamlar TEK gerçek; kayıtlı alan
// yalnız toplam hiç yoksa (çok eski veri) kullanılır. Yuvarlama Math.round (yarım yukarı), Android ile aynı.

function sayi(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

/** Başarı oranı 0..100 (ondalıklı). Toplam soru varsa toplamlardan, yoksa kayıtlı alan. */
export function basariOrani(dogru: number, soru: number, kayitli: number): number {
  if (soru > 0) return Math.min(100, Math.max(0, (dogru / soru) * 100));
  return Math.min(100, Math.max(0, kayitli));
}

/** Başarı yüzdesi 0..100 (tam sayı, Math.round). */
export function basariYuzdesi(dogru: number, soru: number, kayitli: number): number {
  return Math.max(0, Math.min(100, Math.round(basariOrani(dogru, soru, kayitli))));
}

/**
 * Ortalama süre (sn). Yazan tarafın tanımıyla aynı: totalDurationSec / solvedCount.
 * Toplamlar yoksa kayıtlı alan; o da yoksa eski şemanın yedeği (yedekSn / yedekBolen).
 */
export function ortalamaSure(
  toplamSn: number, cozulen: number, kayitli: number, yedekSn = 0, yedekBolen = 0
): number {
  let v = 0;
  if (cozulen > 0 && toplamSn > 0) v = toplamSn / cozulen;
  else if (kayitli > 0) v = kayitli;
  else if (yedekBolen > 0 && yedekSn > 0) v = yedekSn / yedekBolen;
  return Math.max(0, v);
}

/** Kova düğümünden (ör. `topics/t1/tests` ham nesnesi) başarı yüzdesi. */
export function kovaBasariYuzdesi(kova: unknown): number {
  const t = (kova ?? {}) as Record<string, unknown>;
  return basariYuzdesi(sayi(t.totalCorrect), sayi(t.totalQuestions), sayi(t.successRate));
}

/** Kova düğümünden ortalama süre; eski şema yedeği totalElapsedMs / attempts. */
export function kovaOrtalamaSure(kova: unknown): number {
  const t = (kova ?? {}) as Record<string, unknown>;
  return ortalamaSure(
    sayi(t.totalDurationSec), sayi(t.solvedCount), sayi(t.avgDurationSec),
    sayi(t.totalElapsedMs) / 1000, sayi(t.attempts)
  );
}
