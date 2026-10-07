// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/tarih.ts (scripts/motor_esitle.sh)
// Tarih anahtarları — Android TaskManager.kt:62-110, StreakScreen.kt, domain/Sezon.kt ile birebir.
// Bütün takvim İstanbul. Gün anahtarı "YYYY-MM-DD" bir TAKVİM GÜNÜDÜR: hesaplar UTC gece yarısında
// yapılır (saat dilimi/yaz saati kayması olmaz); yalnız "şu an hangi gün" sorusu İstanbul'a göre çözülür.

const GUN_MS = 86_400_000;
const GUN_ANAHTARI = /^(\d{4})-(\d{2})-(\d{2})$/;

/** ms → İstanbul takvim günü "YYYY-MM-DD". */
export function istanbulGunu(ms: number): string {
  // en-CA biçimi YYYY-MM-DD verir
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(ms));
}

/** "YYYY-MM-DD" geçerli bir takvim günü mü (2026-02-30 gibi tarihler reddedilir). */
export function gecerliGun(gun: unknown): gun is string {
  if (typeof gun !== "string") return false;
  const m = GUN_ANAHTARI.exec(gun);
  if (!m) return false;
  const t = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
  return gunAnahtari(t) === gun;
}

function utc(gun: string): number {
  const m = GUN_ANAHTARI.exec(gun);
  if (!m) throw new Error(`geçersiz gün: ${gun}`);
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!);
}

function gunAnahtari(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const a = String(d.getUTCMonth() + 1).padStart(2, "0");
  const g = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${a}-${g}`;
}

/** gun + n gün */
export function gunEkle(gun: string, n: number): string {
  return gunAnahtari(utc(gun) + n * GUN_MS);
}

/** b − a (gün). */
export function gunFarki(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / GUN_MS);
}

/** "YYYY-MM" (görev ayı, seri ayı) */
export function ayAnahtari(gun: string): string {
  return gun.slice(0, 7);
}

/** Ay 1..12 */
export function ayNo(gun: string): number {
  return +gun.slice(5, 7);
}

/** Ayın günü 1..31 */
export function gunNo(gun: string): number {
  return +gun.slice(8, 10);
}

/** Seri gün düğümü: SIFIRSIZ gün ("5", "05" DEĞİL) — StreakScreen.kt:663 */
export function seriGunAnahtari(gun: string): string {
  return String(gunNo(gun));
}

/**
 * ISO 8601 hafta (Pazartesi başlar, yılın ilk haftası ≥4 gün içerir) — Android isoWeekCalendar.
 * Dönüş: { yil (hafta yılı), hafta 1..53 }
 */
export function isoHafta(gun: string): { yil: number; hafta: number } {
  const t = utc(gun);
  const d = new Date(t);
  const haftaGunu = (d.getUTCDay() + 6) % 7;          // Pzt=0 … Paz=6
  const persembe = t + (3 - haftaGunu) * GUN_MS;      // bu haftanın perşembesi
  const yil = new Date(persembe).getUTCFullYear();
  const ilkPersembe = (() => {
    const oca4 = Date.UTC(yil, 0, 4);
    const g = (new Date(oca4).getUTCDay() + 6) % 7;
    return oca4 + (3 - g) * GUN_MS;
  })();
  return { yil, hafta: 1 + Math.round((persembe - ilkPersembe) / (7 * GUN_MS)) };
}

/** "YYYY-Www" — TaskManager.weekKeyYw */
export function haftaAnahtari(gun: string): string {
  const { yil, hafta } = isoHafta(gun);
  return `${yil}-W${String(hafta).padStart(2, "0")}`;
}

/** Lig sezonu — domain/Sezon.kt LIG_DONEMLERI (iOS Sezon.swift, web sezon.ts ile aynı tablo). */
const LIG_DONEMLERI: ReadonlyArray<readonly [string, string]> = [
  ["2026-09-14", "2026_2027_guz"],
  ["2027-02-08", "2026_2027_bahar"],
  ["2027-06-26", "2027_yaz"],
];
const LIG_ESKI = "2025_2026_guz";

export function ligSezonu(gun: string): string {
  let anahtar = LIG_ESKI;
  for (const [baslangic, ad] of LIG_DONEMLERI) {
    if (gun >= baslangic) anahtar = ad;
    else break;
  }
  return anahtar;
}

/** Rozet yılı (öğretim yılı Eyl–Ağu): Eyl 2026 → "2026_2027", Ağu 2027 → "2026_2027". */
export function rozetYili(gun: string): string {
  const y = +gun.slice(0, 4);
  const b = ayNo(gun) >= 9 ? y : y - 1;
  return `${b}_${b + 1}`;
}

/** AyGorsel.ANAHTAR — 0 tabanlı */
const AY_ANAHTAR = [
  "ocak", "subat", "mart", "nisan", "mayis", "haziran",
  "temmuz", "agustos", "eylul", "ekim", "kasim", "aralik",
] as const;

export function rozetAyAnahtari(gun: string): string {
  return AY_ANAHTAR[ayNo(gun) - 1]!;
}
