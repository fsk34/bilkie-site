// Gün/ay anahtarları — mobil uygulamayla AYNI: her şey Europe/Istanbul saatine göre.
// (iOS: Date+Keys.swift, Android: StreakScreen.kt)

const IST = "Europe/Istanbul";

/** "yyyy-MM-dd" (Istanbul) — sv-SE yerel ayarı zaten ISO biçiminde verir. */
export function gunAnahtari(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: IST }).format(d);
}

/** "yyyy-MM" (Istanbul) */
export function ayAnahtari(d: Date = new Date()): string {
  return gunAnahtari(d).slice(0, 7);
}

/** Ayın kaçıncı günü (1-31, Istanbul) */
export function gunNo(d: Date = new Date()): number {
  return Number(gunAnahtari(d).slice(8, 10));
}

/** "yyyy-MM-dd" → gün sayısı (karşılaştırma için; saat dilimi karışmasın diye UTC öğlen) */
function gunSayisi(anahtar: string): number | null {
  const m = anahtar?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], 12) / 86400000);
}

/** a, b'den tam bir gün önce mi? */
export function dunMu(oncekiAnahtar: string, bugunAnahtari: string): boolean {
  const a = gunSayisi(oncekiAnahtar);
  const b = gunSayisi(bugunAnahtari);
  if (a == null || b == null) return false;
  return b - a === 1;
}

/**
 * Ekranda gösterilecek seri değeri. Veritabanındaki `count` seri kopunca
 * sıfırlanmıyor — bu yüzden her yerde `lastDay` ile birlikte yorumlanır:
 * bugün ya da dün işaretliyse seri sürüyor, daha eskiyse kopmuş demektir.
 */
export function seriyiCoz(hamSayi: number, sonGun?: string | null): number {
  if (!hamSayi || hamSayi <= 0) return 0;
  if (!sonGun) return 0;
  const bugun = gunAnahtari();
  if (sonGun === bugun) return hamSayi;
  return dunMu(sonGun, bugun) ? hamSayi : 0;
}

/** Haftanın günü: Pazartesi = 0 … Pazar = 6 (Istanbul).
    iOS: StreakSummaryScreen.todayWeekIndex */
export function haftaGunIndeksi(d: Date = new Date()): number {
  const kisa = new Intl.DateTimeFormat("en-US", { timeZone: IST, weekday: "short" }).format(d);
  const sira = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const i = sira.indexOf(kisa);
  return i < 0 ? 0 : i;
}
