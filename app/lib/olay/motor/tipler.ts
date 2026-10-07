// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/tipler.ts (scripts/motor_esitle.sh)
// Olay ve motor tipleri — şartname docs/sunucu-olay-sartnamesi.md §4.

export type OlayTuru = "test" | "defter" | "yazili" | "quiz" | "hata" | "evde" | "oyun";

/** users/{uid}/olaylar/{id} — istemcinin yazdığı biçim (doğrulanmamış ham hâli `unknown`). */
export interface Olay {
  id: string;
  tur: OlayTuru;
  sinif: number;
  /** İstanbul, bitiş anı "YYYY-MM-DD" */
  gun: string;
  ts: number;
  surum?: string;
  ders?: string;
  konu?: string;
  /** test: 1..3 · yazılı: "step1" | "step2" */
  adim?: number | string;
  dogru?: number;
  toplam?: number;
  sinav?: string;
  unite?: string;
  /** defter: bu oturumda geçilen yeni sayfa sayısı */
  sayfa?: number;
  /** defter: 10. ya da son sayfaya ulaşıldı */
  seri?: boolean;
  /** defter: son sayfada "Devam Et" */
  bitti?: boolean;
}

/** ServerValue.increment işareti — saf motor Firebase'i bilmez; işleyici çevirir. */
export interface Artir { readonly artir: number }
export const artir = (n: number): Artir => ({ artir: n });
export const artirMi = (v: unknown): v is Artir =>
  typeof v === "object" && v !== null && "artir" in v && Object.keys(v).length === 1;

export type Deger = string | number | boolean | null | Artir;

/** Tam yol (kökten) → değer. Yalnız YAPRAK yollar (çok-yollu update'te üst/alt çakışması olmasın). */
export type Yazilacak = Record<string, Deger>;

export interface GorevDegisimi { id: string; onceki: number; yeni: number; hedef: number; bitti: boolean }
export interface SeriSonucu { sayi: number; ilkBugun: boolean; maske: number }

export interface Sonuc {
  xp: number;
  ilkKez?: boolean;
  seri: SeriSonucu | null;
  gorevler: GorevDegisimi[];
  hata?: string;
}

/** Lig satırı işi (ana update'ten SONRA, ayrı transaction) — §6.2 */
export interface LigIsi { sinif: number; xpToplam: number }

export interface MotorCiktisi {
  yazilacak: Yazilacak;
  sonuc: Sonuc;
  lig: LigIsi | null;
}

/** Görev kataloğu tanımı (taskcatalog DB) */
export interface GorevTanimi {
  id: string;
  title: string;
  xp: number;
  kind: string;
  params: Record<string, unknown>;
}

export interface Katalog {
  gunluk: GorevTanimi[];
  haftalik: GorevTanimi[];
  aylik: GorevTanimi[];
}
