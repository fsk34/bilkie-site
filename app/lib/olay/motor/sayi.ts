// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/sayi.ts (scripts/motor_esitle.sh)
// RTDB değerleri Int/Long/Double/String gelebilir — Android'deki okuyucularla aynı tolerans.

/** TaskManager.safeInt: sayı → kesir ATILIR (Double.toInt); metin yalnız tam sayıysa. */
export function tamSayi(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? Math.trunc(v) : 0;
  if (typeof v === "string" && /^[+-]?\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return 0;
}

/** XpManager.anyToInt: sayı → YUVARLANIR (Double → round). */
export function yuvarlakSayi(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v) : 0;
  if (typeof v === "string" && /^[+-]?\d+$/.test(v.trim())) return parseInt(v.trim(), 10);
  return 0;
}

/** Ondalıklı okuma (istatistik kovaları) */
export function ondalik(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") return Number(v) || 0;
  return 0;
}

export type Dugum = Record<string, unknown>;

/**
 * Düğüm nesnesi (değilse boş). RTDB, anahtarları tam sayı olup çoğu dolu düğümü DİZİ döndürür
 * (ör. streak/days/{ay} = {"1":…,"2":…} → [null, …]); dizi indeks anahtarlı nesneye çevrilir,
 * yoksa o günün maskesi 0 okunup üzerine yazılırdı.
 */
export function dugum(v: unknown): Dugum {
  if (Array.isArray(v)) {
    const o: Dugum = {};
    v.forEach((x, i) => { if (x !== null && x !== undefined) o[String(i)] = x; });
    return o;
  }
  return typeof v === "object" && v !== null ? (v as Dugum) : {};
}

/** "a/b/c" yolunu nesnede izler */
export function yoldan(kok: unknown, yol: string): unknown {
  let v: unknown = kok;
  for (const p of yol.split("/")) {
    if (typeof v !== "object" || v === null) return undefined;
    v = (v as Dugum)[p];
  }
  return v;
}
