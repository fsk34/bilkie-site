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

function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Takvimdeki tüm `aktif` sınavlar, `sira`ya göre sıralı. Kilitliler de dahil. */
export async function yaziliTakvimi(bugun: string = bugunAnahtari()): Promise<TakvimSonuc> {
  let ham: Record<string, unknown> | null;
  try {
    const snap = await get(dbRef(yazililarDb, "takvim"));
    ham = (snap.val() ?? null) as Record<string, unknown> | null;
  } catch {
    // İzin ya da ağ hatası — "kapalı" demek yanlış olur.
    return { durum: "okunamadi" };
  }

  // Düğüm yoksa: okuma başarılı ama takvim tanımlanmamış → açık sınav yok.
  if (!ham || typeof ham !== "object") return { durum: "basarili", sinavlar: [] };

  const out: YaziliSinav[] = [];
  for (const [anahtar, v] of Object.entries(ham)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    if (o.aktif !== true) continue;

    const ad = metin(o.ad);
    if (!ad) continue; // adsız sınav ekrana basılamaz

    const baslar = metin(o.baslar);
    const biter = metin(o.biter);
    const basladi = !baslar || bugun >= baslar;
    const bitmedi = !biter || bugun <= biter;

    out.push({
      anahtar,
      ad,
      sira: typeof o.sira === "number" ? o.sira : Number.MAX_SAFE_INTEGER,
      acik: basladi && bitmedi,
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
