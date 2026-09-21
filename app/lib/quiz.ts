// Ünite eşleştirme quizi — Android `QuizScreens.kt` portu.
//
// İçerik: `unitequizler` veritabanı, `quizzes/grade{N}/{ders}/units/{ünite}`.
// Ünite anahtarı ve düğüm yerleşimi veritabanında tutarsız olabildiği için Android'deki
// aday listesi + geri düşme zinciri birebir korunuyor.
//
// İlerleme: `users/{uid}/quiz_done/grade{N}/{ders}/{ünite}` = true
// Ödül: ilk tamamlamada +30 XP (XpRules.QUIZ_COMPLETE_XP). Seri, başarım, görev ve
// istatistik YAZILMIYOR — Android de yazmıyor (StatsManager'daki QUIZ_FINISHED bir TODO).

import { get, ref as dbRef, set } from "firebase/database";
import { kullaniciDb, quizDb } from "./firebase";
import { gorevOlayiUygula } from "./gorevYaz";
import { onbellekli } from "./onbellek";
import { sinifSinirla, xpEkle } from "./veri";

export const XP_QUIZ_TAMAM = 30;   // Android/iOS: XpRules.QUIZ_COMPLETE_XP

export type QuizCifti = { sol: string; sag: string };
export type QuizUnitesi = { baslik: string; sayfaBoyu: number; ciftler: QuizCifti[] };

/** Android `unitKeyCandidates` — aynı ünite farklı anahtarlarla durabiliyor. */
function uniteAdaylari(ham: string): string[] {
  const k = ham.trim();
  const adaylar = new Set<string>();
  if (k) adaylar.add(k);
  if (k.toLowerCase().startsWith("u")) {
    const usuz = k.slice(1);
    if (usuz) adaylar.add(usuz);
  } else {
    adaylar.add(`u${k}`);
  }
  const rakamlar = k.replace(/\D/g, "");
  const n = rakamlar ? Number.parseInt(rakamlar, 10) : NaN;
  if (Number.isFinite(n)) {
    adaylar.add(`u${n}`);
    adaylar.add(String(n));
    adaylar.add(`unit${n}`);
    adaylar.add(`unite${n}`);
  }
  return [...adaylar];
}

function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Bir düğümün ünite listesi mi olduğunu anlar (Android'deki geçerli anahtar süzgeci). */
function uniteAnahtarlari(dugum: Record<string, unknown>): string[] {
  return Object.keys(dugum).filter((k) => {
    const c = dugum[k] as Record<string, unknown> | null;
    if (!c || typeof c !== "object") return false;
    return c.items != null || c.pairs != null || c.pageSize !== undefined;
  });
}

/**
 * Ünitenin quiz içeriğini getirir. Android'deki dört aday yol sırayla denenir;
 * bulunan düğümde ünite anahtarı önce birebir, sonra `{ünite}_` öneki, en son
 * SIRA ile çözülür.
 */
export async function quizUnitesiGetir(
  sinif: number, dersKey: string, uniteKey: string
): Promise<QuizUnitesi | null> {
  const g = sinifSinirla(sinif);
  return onbellekli(`quiz:${g}:${dersKey}:${uniteKey}`, async () => {
    const yollar = [
      `quizzes/grade${g}/${dersKey}/units`,
      `quizzes/grade${g}/${dersKey}`,
      `quizzes/${dersKey}/units`,
      `quizzes/${dersKey}`,
    ];

    let bulunan: Record<string, unknown> | null = null;
    for (const yol of yollar) {
      let ham: Record<string, unknown> | null = null;
      try {
        const snap = await get(dbRef(quizDb, yol));
        ham = snap.exists() ? (snap.val() as Record<string, unknown>) : null;
      } catch {
        continue;
      }
      if (!ham) continue;

      // Düğümde "units" çocuğu varsa içine in
      const kok = (ham.units && typeof ham.units === "object"
        ? ham.units
        : ham) as Record<string, unknown>;
      const anahtarlar = uniteAnahtarlari(kok);
      if (anahtarlar.length === 0) continue;

      const adaylar = new Set(uniteAdaylari(uniteKey));
      const sira = Math.max(0, (Number.parseInt(uniteKey.replace(/\D/g, ""), 10) || 1) - 1);
      const secilen =
        anahtarlar.find((k) => adaylar.has(k)) ??
        anahtarlar.find((k) => k.startsWith(`${uniteKey}_`)) ??
        anahtarlar[sira] ??
        anahtarlar[0];

      bulunan = (kok[secilen] ?? null) as Record<string, unknown> | null;
      if (bulunan) break;
    }

    if (!bulunan) return null;

    const ogeler = (bulunan.items ?? bulunan.pairs ?? bulunan) as Record<string, unknown>;
    const ciftler: QuizCifti[] = [];
    for (const k of Object.keys(ogeler ?? {})) {
      const c = ogeler[k] as Record<string, unknown> | null;
      if (!c || typeof c !== "object") continue;
      const sol = metin(c.left) || metin(c.q);
      const sag = metin(c.right) || metin(c.a);
      if (sol && sag) ciftler.push({ sol, sag });
    }

    const sayfaBoyu = Math.min(10, Math.max(3, Number(bulunan.pageSize) || 5));
    return { baslik: metin(bulunan.title) || uniteKey, sayfaBoyu, ciftler };
  }, { kalici: true });
}

export const quizBittiYolu = (uid: string, sinif: number, dersKey: string, uniteKey: string) =>
  `users/${uid}/quiz_done/grade${sinifSinirla(sinif)}/${dersKey}/${uniteKey}`;

/** Sınıfın tüm bitmiş quizleri tek düğümde (ana ekranın canlı aboneliği). */
export const quizBitenlerYolu = (uid: string, sinif: number) =>
  `users/${uid}/quiz_done/grade${sinifSinirla(sinif)}`;

/** Ham quiz_done düğümü → ders → ünite → true (saf; `true` olmayan değerler atılır). */
export function quizBitenleriCoz(ham: unknown): Record<string, Record<string, boolean>> {
  const out: Record<string, Record<string, boolean>> = {};
  for (const [ders, uniteler] of Object.entries((ham ?? {}) as Record<string, Record<string, unknown>>)) {
    out[ders] = {};
    for (const [u, v] of Object.entries(uniteler ?? {})) if (v === true) out[ders][u] = true;
  }
  return out;
}

/** Bu ünitenin quizi daha önce bitirilmiş mi (ödül bir kez verilir). */
export async function quizBittiMi(
  uid: string, sinif: number, dersKey: string, uniteKey: string
): Promise<boolean> {
  try {
    const snap = await get(dbRef(kullaniciDb, quizBittiYolu(uid, sinif, dersKey, uniteKey)));
    return snap.val() === true;
  } catch {
    return false;
  }
}

/** Sınıfın TAMAMI için bitmiş quizler — liste ekranındaki işaret için tek okuma. */
export async function quizBitenler(
  uid: string, sinif: number, dersKey: string
): Promise<Record<string, boolean>> {
  try {
    const g = sinifSinirla(sinif);
    const snap = await get(dbRef(kullaniciDb, `users/${uid}/quiz_done/grade${g}/${dersKey}`));
    const ham = (snap.val() ?? {}) as Record<string, unknown>;
    const out: Record<string, boolean> = {};
    for (const k of Object.keys(ham)) if (ham[k] === true) out[k] = true;
    return out;
  } catch {
    return {};
  }
}

export type QuizBitisSonucu = { ilkKez: boolean; xp: number };

/**
 * Quizi tamamla — Android: önce `quiz_done` okunur, daha önce bitmişse ÖDÜL VERİLMEZ.
 * XP dışında bir şey yazılmaz (Android de yazmıyor).
 */
export async function quizTamamla(
  uid: string, sinif: number, dersKey: string, uniteKey: string
): Promise<QuizBitisSonucu> {
  const g = sinifSinirla(sinif);
  if (await quizBittiMi(uid, g, dersKey, uniteKey)) return { ilkKez: false, xp: 0 };

  await set(dbRef(kullaniciDb, quizBittiYolu(uid, g, dersKey, uniteKey)), true);
  await xpEkle(uid, g, XP_QUIZ_TAMAM, `quiz_${dersKey}_${uniteKey}`);
  // "Bir quiz tamamla" görevi (quiz_complete) — yalnız ilk bitişte, XP'yi engellemesin
  try { await gorevOlayiUygula(uid, { tip: "quiz_bitti", sinif: g }); } catch { /* görev yazılamazsa quiz yine bitti */ }
  return { ilkKez: true, xp: XP_QUIZ_TAMAM };
}

/** Sınıfın TÜM derslerinin bitmiş quizleri tek okumada (canlı abonelik istemeyen yerler için). */
export async function quizBitenlerTumu(
  uid: string, sinif: number
): Promise<Record<string, Record<string, boolean>>> {
  try {
    const snap = await get(dbRef(kullaniciDb, quizBitenlerYolu(uid, sinif)));
    return quizBitenleriCoz(snap.val());
  } catch {
    return {};
  }
}
