// OLAY MODU bitiş yazmaları — şartname §7 "İ" satırları + olay, TEK çok-yollu yazmada.
// Transaction yok, okuma yok → internetsiz de anında kutuya girer, sekme kapansa da kaybolmaz.
// "S" satırları (completedSteps, günlük bayraklar, XP, lig, görev, seri, ilk-kez) → sunucu (olayIsle).
// Yollar Android'deki karşılıklarıyla birebir (dosya adları her fonksiyonda).
//
// Anahtarlar sunucunun kabul ettiği biçimde değilse null döner → çağıran eski yola düşer.

import { increment, serverTimestamp } from "firebase/database";
import { anahtarNormalize } from "../istatistikYaz";
import { hataDegisimleri, type SoruSonucu } from "../hatalar";
import { XP_DOGRU_TEST, sinifSinirla } from "../veri";
import { XP } from "./motor/motor";
import { kullaniciDb } from "../firebase";
import { oku } from "./bindir";
import { bekleyenler, olayYaz, type Yazilan } from "./kutu";

const ANAHTAR = /^[a-z0-9_]{1,48}$/;

const tamSayiAraliktaMi = (v: number, min: number, max: number) => Number.isInteger(v) && v >= min && v <= max;

/** Kova sayaçları (T12 / Y5) — türev %/ortalama OKURKEN hesaplanır (kovaHesap.ts), yazılmaz. */
function kovaArtir(y: Record<string, unknown>, kova: string, dogru: number, toplam: number, sureSn: number, puan: number, cozulen = 1): void {
  if (cozulen > 0) y[`${kova}/solvedCount`] = increment(cozulen);
  y[`${kova}/totalCorrect`] = increment(dogru);
  y[`${kova}/totalQuestions`] = increment(toplam);
  y[`${kova}/totalDurationSec`] = increment(sureSn);
  y[`${kova}/totalScore`] = increment(puan);
  y[`${kova}/updatedAt`] = serverTimestamp();
}

/** lastResult (T13 / Y6) — StatsManager.writeLastResult ile aynı alanlar. */
function sonSonuc(
  y: Record<string, unknown>, g: string,
  r: { tip: string; ders: string; konu: string; sinav: string; dogru: number; toplam: number; sureSn: number; puan: number }
): void {
  const son = `stats/${g}/lastResult`;
  y[`${son}/type`] = r.tip;
  y[`${son}/subjectKey`] = r.ders;
  y[`${son}/unitKey`] = "";
  y[`${son}/topicKey`] = anahtarNormalize(r.konu);
  y[`${son}/examKey`] = anahtarNormalize(r.sinav);
  y[`${son}/correct`] = r.dogru;
  y[`${son}/total`] = r.toplam;
  y[`${son}/successRate`] = r.toplam > 0 ? Math.min(100, Math.max(0, Math.round((r.dogru * 100) / r.toplam))) : 0;
  y[`${son}/durationSec`] = r.sureSn;
  y[`${son}/score`] = r.puan;
  y[`${son}/atMs`] = serverTimestamp();
  y[`stats/${g}/meta/lastUpdatedAt`] = serverTimestamp();
}

/* ------------------------------------------------------------------- test */

/** Android TestScreens.kt testOlayiniYaz (şartname §7.1). */
export function testOlayiniYaz(a: {
  uid: string; sinif: number; dersKey: string; konuKey: string; adim: number;
  dogru: number; toplam: number; sureSn: number; sonuclar: SoruSonucu[];
}): Yazilan | null {
  const sinif = sinifSinirla(a.sinif);
  if (!ANAHTAR.test(a.dersKey) || !ANAHTAR.test(a.konuKey) || !tamSayiAraliktaMi(a.adim, 1, 3) ||
      !tamSayiAraliktaMi(a.toplam, 0, 50) || !tamSayiAraliktaMi(a.dogru, 0, a.toplam)) return null;
  const g = `grade${sinif}`;
  const puan = a.dogru * XP_DOGRU_TEST;
  const sureSn = Math.max(0, Math.round(a.sureSn));
  const adim = `progress_test/${g}/${a.dersKey}/${a.konuKey}/step${a.adim}`;

  const y: Record<string, unknown> = {};
  // T2 T3 — adım sonucu + deneme
  y[`${adim}/correct`] = a.dogru;
  y[`${adim}/total`] = a.toplam;
  y[`${adim}/score`] = puan;
  y[`${adim}/completedAt`] = serverTimestamp();
  y[`${adim}/attempts`] = increment(1);
  // T4–T7 — başarımlar
  const hatasiz = a.toplam > 0 && a.dogru === a.toplam;
  y["achievements/testadet/current"] = increment(1);
  if (hatasiz) {
    y["achievements/testdogru/current"] = increment(1);
    y[`personal_records/${g}/hatasiztest`] = increment(1);
  }
  y["achievements/unitesenfoni/current"] = increment(1);
  // T10 — Hata Turu kayıtları
  Object.assign(y, hataDegisimleri(sinif, a.dersKey, a.sonuclar));
  // T12 — istatistik kovaları
  if (a.toplam > 0) {
    const konu = anahtarNormalize(a.konuKey);
    const kovalar = [`stats/${g}/overall/tests`, `stats/${g}/subjects/${a.dersKey}/tests`];
    if (konu) kovalar.push(`stats/${g}/subjects/${a.dersKey}/topics/${konu}/tests`);
    for (const k of kovalar) kovaArtir(y, k, a.dogru, a.toplam, sureSn, puan);
  }
  // T13 — son sonuç
  sonSonuc(y, g, { tip: "test", ders: a.dersKey, konu: a.konuKey, sinav: "", dogru: a.dogru, toplam: a.toplam, sureSn, puan });

  return olayYaz(a.uid, "test", sinif,
    { ders: a.dersKey, konu: a.konuKey, adim: a.adim, dogru: a.dogru, toplam: a.toplam }, y, puan);
}

/* -------------------------------------------------------------- hata turu */

/**
 * Android HataTuruScreen.bitir olay kolu (şartname §7.5, 6 Eki S3 geri alındı): hata kayıtları (H1)
 * + olay tek yazmada; sunucu yalnız XP (doğru×2) verir — seri ve görev YOK.
 * @param dersler ders → o dersin soru sonuçları (hata kayıtları ders başına)
 */
export function hataOlayiniYaz(a: {
  uid: string; sinif: number; dogru: number; dersler: Map<string, SoruSonucu[]>;
}): Yazilan | null {
  const sinif = sinifSinirla(a.sinif);
  const dogru = Math.min(50, Math.max(0, Math.trunc(a.dogru)));
  const y: Record<string, unknown> = {};
  const simdi = Date.now();
  for (const [ders, liste] of a.dersler) {
    if (!ANAHTAR.test(ders)) return null;
    Object.assign(y, hataDegisimleri(sinif, ders, liste, simdi));
  }
  return olayYaz(a.uid, "hata", sinif, { dogru }, y, dogru * XP_DOGRU_TEST);
}

/* ------------------------------------------------------------------- quiz */

/**
 * Android QuizScreens.quizOlayiniYaz (şartname §7.4, Q1 tamamı sunucuda). İstemci yalnız kendi
 * `quiz_bitti` alanını olayla AYNI yazmada işaretler: ekranlar quiz_done ∪ quiz_bitti okur, internetsiz de
 * anında bitmiş görünür. quiz_done'a dokunulmaz (yazılsa sunucu "ilk kez değil" sanardı).
 * İlk kez = sunucu işareti yok, istemci alanı yok, aynı quiz kutuda beklemiyor; okunamazsa "değil"
 * (puana uydurma 30 bindirilmez — sunucu işleyince gerçeği gelir).
 */
export async function quizOlayiniYaz(a: {
  uid: string; sinif: number; ders: string; unite: string;
}): Promise<{ yazilan: Yazilan; ilkKez: boolean } | null> {
  if (!ANAHTAR.test(a.ders) || !ANAHTAR.test(a.unite)) return null;
  const sinif = sinifSinirla(a.sinif);
  const g = `grade${sinif}`;
  const [isaret, istemci] = await Promise.all([
    oku(kullaniciDb, `users/${a.uid}/quiz_done/${g}/${a.ders}/${a.unite}`),
    oku(kullaniciDb, `users/${a.uid}/quiz_bitti/${g}/${a.ders}/${a.unite}`),
  ]);
  const bekliyor = bekleyenler(a.uid).some((b) =>
    b.olay.tur === "quiz" && b.olay.ders === a.ders && b.olay.unite === a.unite && b.xp > 0);
  const ilkKez = isaret !== undefined && istemci !== undefined && isaret !== true && istemci !== true && !bekliyor;
  const yazilan = olayYaz(a.uid, "quiz", sinif, { ders: a.ders, unite: a.unite },
    { [`quiz_bitti/${g}/${a.ders}/${a.unite}`]: true }, ilkKez ? XP.QUIZ : 0);
  return { yazilan, ilkKez };
}
