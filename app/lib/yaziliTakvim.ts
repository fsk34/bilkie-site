// Yazılı sınav takvimi — hangi yazılının ne zaman açık olduğunu VERİDEN okur.
//
// Android'deki `domain/YaziliTakvim.kt` ile AYNI düğümü, aynı kurallarla okur:
// `yazililar/takvim`. Üç platform (Android, iOS, web) tek takvimi paylaşıyor;
// konsoldan bir tarihi değiştirmek üçünde birden geçerli oluyor.
//
// ## Veri şekli
// ```json
// "takvim": {
//   "term1_exam1": { "ad": "1. Dönem 1. Yazılı", "sira": 1,
//                    "aktif": true, "baslar": "2026-11-02", "biter": "2027-01-23" }
// }
// ```
// - `aktif` : içerik hazır mı — ANA ANAHTAR. false ise sınav hiç görünmez
//   (kilitli bile değil; listede yer almaz).
// - `baslar` / `biter` : "yyyy-MM-dd", ikisi de isteğe bağlı. Tarihler ISO
//   olduğu için metin karşılaştırması doğru sıralar.
//
// ⚠️ Neden tek bir "sınav günü" yok: yazılı tarihini her okul kendi belirliyor.
// Ülke geneli tek gün yazsaydık öğrencilerin çoğu için yanlış olurdu.

import { get, ref as dbRef } from "firebase/database";
import { yazililarDb } from "./firebase";
import { tavanli } from "./hata";

export type YaziliSinav = {
  anahtar: string;
  ad: string;
  sira: number;
  /** Bugün çözülebilir mi. */
  acik: boolean;
  /** Açılış günü; kilitli sınavda "ne zaman açılacak" mesajı buradan yazılır. */
  baslar?: string;
};

/**
 * ⚠️ "Okunamadı" ile "açık sınav yok" AYRI durumlar. İkisi de boş liste dönseydi
 * ağ hatası olan öğrenci "yazılı dönemi kapalı" sanır, tekrar denemezdi.
 */
export type TakvimSonuc =
  | { durum: "basarili"; sinavlar: YaziliSinav[] }
  | { durum: "okunamadi" };

/** Bugünün "yyyy-MM-dd" anahtarı — yerel saate göre (öğrencinin takvimi bu). */
export function bugunAnahtari(d: Date = new Date()): string {
  const iki = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${iki(d.getMonth() + 1)}-${iki(d.getDate())}`;
}

// Konsoldan elle girilen değer metin/sayı karışık olabilir (Android YaziliTakvim, 24 Eyl 2026)
function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : typeof v === "number" || typeof v === "boolean" ? String(v) : "";
}
function mantiksal(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v.trim().toLowerCase() === "true" || v.trim() === "1";
  return false;
}
function tamsayi(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string" && /^-?\d+$/.test(v.trim())) return Number.parseInt(v.trim(), 10);
  return null;
}

/**
 * GELİŞTİRME ANAHTARI — yalnız localhost + `next dev`. Takvim kapalıyken yazılı akışını denemek için
 * bir sınavı açık sayar; canlı takvime ve diğer kullanıcılara dokunmaz (7 Eki 2026).
 *   açmak:   http://localhost:3000/yazili?yaziliac=term1_exam1
 *   kapatmak: http://localhost:3000/yazili?yaziliac=kapat
 * Seçim tarayıcıda (localStorage) kalır; ana ekran, ders sayfası ve liste aynı sınavı açık görür.
 */
const GELISTIRME_ANAHTARI = "bk-gelistirme-yazili-acik";
function gelistirmeAcikSinav(): string | null {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return null;
  if (window.location.hostname !== "localhost") return null;
  try {
    const istek = new URLSearchParams(window.location.search).get("yaziliac");
    if (istek === "kapat") window.localStorage.removeItem(GELISTIRME_ANAHTARI);
    else if (istek && /^[a-z0-9_]{1,48}$/.test(istek)) window.localStorage.setItem(GELISTIRME_ANAHTARI, istek);
    return window.localStorage.getItem(GELISTIRME_ANAHTARI);
  } catch {
    return null;
  }
}

/** Takvimdeki tüm `aktif` sınavlar, `sira`ya göre sıralı. Kilitliler de dahil. */
export async function yaziliTakvimi(bugun: string = bugunAnahtari()): Promise<TakvimSonuc> {
  let ham: Record<string, unknown> | null;
  // İzin / ağ hatası / 8 sn zaman aşımı (çevrimdışıyken get() bekleyebilir) — "kapalı" demek yanlış olur.
  const snap = await tavanli(get(dbRef(yazililarDb, "takvim")), 8000);
  if (!snap) return { durum: "okunamadi" };
  ham = (snap.val() ?? null) as Record<string, unknown> | null;

  // Düğüm yoksa: okuma başarılı ama takvim tanımlanmamış → açık sınav yok.
  if (!ham || typeof ham !== "object") return { durum: "basarili", sinavlar: [] };

  const out: YaziliSinav[] = [];
  const zorlaAcik = gelistirmeAcikSinav();
  for (const [anahtar, v] of Object.entries(ham)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    if (!mantiksal(o.aktif)) continue;

    const ad = metin(o.ad);
    if (!ad) continue; // adsız sınav ekrana basılamaz

    const baslar = metin(o.baslar);
    const biter = metin(o.biter);
    const basladi = !baslar || bugun >= baslar;
    const bitmedi = !biter || bugun <= biter;

    out.push({
      anahtar,
      ad,
      sira: tamsayi(o.sira) ?? Number.MAX_SAFE_INTEGER,
      acik: (basladi && bitmedi) || anahtar === zorlaAcik,
      baslar: baslar || undefined,
    });
  }
  return {
    durum: "basarili",
    sinavlar: out.sort((a, b) => a.sira - b.sira || a.anahtar.localeCompare(b.anahtar)),
  };
}

/**
 * "2026-11-02" → "2 Kasım'da açılacak".
 *
 * ⚠️ Bulunma eki ay adına göre DEĞİŞİR (ünsüz benzeşmesi + ünlü uyumu):
 * sert ünsüzle bitenler "-ta" alır (Mart'ta, Ocak'ta), ince ünlülüler "-de"
 * (Eylül'de). Hepsine "-da" yazmak "Mart'da" gibi hatalar üretiyor.
 */
const AY_EKLI = [
  "Ocak'ta", "Şubat'ta", "Mart'ta", "Nisan'da", "Mayıs'ta", "Haziran'da",
  "Temmuz'da", "Ağustos'ta", "Eylül'de", "Ekim'de", "Kasım'da", "Aralık'ta",
];

export function acilisMetni(baslar?: string): string {
  const genel = "Yazılı zamanı geldiğinde açılacak";
  const p = baslar?.split("-");
  if (!p || p.length !== 3) return genel;
  const ay = Number.parseInt(p[1], 10);
  const gun = Number.parseInt(p[2], 10);
  if (!Number.isFinite(ay) || !Number.isFinite(gun) || ay < 1 || ay > 12) return genel;
  return `${gun} ${AY_EKLI[ay - 1]} açılacak`;
}
