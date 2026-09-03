// İstatistik YAZMA katmanı — Android `data/stats/StatsManager.kt` → applyEvent portu.
// Web şimdiye kadar bu kovaları yalnızca OKUYORDU; telefondan çözülen test istatistiğe
// işleniyor, web'den çözülen işlenmiyordu. Bu dosya o farkı kapatıyor.
//
// Yollar birebir Android'deki gibi:
//   users/{uid}/stats/grade{N}/overall/tests                 (genel test kovası)
//   users/{uid}/stats/grade{N}/subjects/{ders}/tests         (ders kovası)
//   users/{uid}/stats/grade{N}/subjects/{ders}/units/{u}/tests
//   users/{uid}/stats/grade{N}/subjects/{ders}/topics/{konu}/tests
//   users/{uid}/stats/grade{N}/overall/defter/completedNotebooks
//   users/{uid}/stats/grade{N}/overall/yazili                (yazılı kovası)
//   users/{uid}/stats/grade{N}/lastResult                    (sonuç ekranı anlık görüntüsü)

import { ref as dbRef, runTransaction, update } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { sinifSinirla } from "./veri";
import { sessizHata } from "./hata";

export type IstatistikTipi = "test" | "defter" | "yazili";

export type IstatistikOlayi = {
  tip: IstatistikTipi;
  sinif: number;
  dersKey?: string | null;
  uniteKey?: string | null;
  konuKey?: string | null;
  dogru?: number;
  toplam?: number;
  sureSn?: number;
  puan?: number;
  sinavKey?: string | null;
  /** Yazılıda tekrar çözümde sayaç artmasın diye (Android: incrementCounter). */
  sayaciArtir?: boolean;
};

function sayi(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return Number.parseInt(v, 10) || 0;
  return 0;
}

/** Android `TurkishText.normalizeKey` — küçült, Türkçe harfleri sadeleştir, alfanümerik dışını `_` yap. */
export function anahtarNormalize(ham: string | null | undefined): string {
  const g = (ham ?? "").trim();
  if (!g) return "";
  return g
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function yuzde(dogru: number, toplam: number): number {
  if (toplam <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((dogru / toplam) * 100)));
}

/** Android `incrementInt` — transaction ile sayaç artırma. */
async function sayacArtir(yol: string, fark: number): Promise<void> {
  await runTransaction(dbRef(kullaniciDb, yol), (mevcut) => sayi(mevcut) + fark);
}

/**
 * Android `updateTestBucket` — bir kovanın toplamlarını transaction içinde günceller.
 * successRate ve avgDurationSec TÜREV alanlar: her yazımda yeniden hesaplanır.
 */
async function kovaGuncelle(
  yol: string,
  dogru: number,
  toplam: number,
  sureSn: number,
  puan: number,
  cozumSayisiniArtir = true
): Promise<void> {
  if (toplam <= 0) return;
  await runTransaction(dbRef(kullaniciDb, yol), (mevcut) => {
    const k = (mevcut ?? {}) as Record<string, unknown>;
    const cozulen = sayi(k.solvedCount) + (cozumSayisiniArtir ? 1 : 0);
    const toplamDogru = sayi(k.totalCorrect) + dogru;
    const toplamSoru = sayi(k.totalQuestions) + toplam;
    const toplamSure = sayi(k.totalDurationSec) + sureSn;
    const toplamPuan = sayi(k.totalScore) + puan;
    return {
      ...k,
      solvedCount: cozulen,
      totalCorrect: toplamDogru,
      totalQuestions: toplamSoru,
      totalDurationSec: toplamSure,
      totalScore: toplamPuan,
      successRate: toplamSoru > 0 ? Math.min(100, Math.max(0, (toplamDogru / toplamSoru) * 100)) : 0,
      avgDurationSec: cozulen > 0 ? Math.max(0, toplamSure / cozulen) : 0,
      updatedAt: Date.now(),
    };
  });
}

/** Android `writeLastResult` — sonuç ekranının okuduğu son çözüm anlık görüntüsü. */
async function sonSonucYaz(
  temel: string,
  tip: string,
  o: IstatistikOlayi,
  dogru: number,
  toplam: number,
  sureSn: number,
  puan: number
): Promise<void> {
  await update(dbRef(kullaniciDb, `${temel}/lastResult`), {
    type: tip,
    subjectKey: anahtarNormalize(o.dersKey),
    unitKey: anahtarNormalize(o.uniteKey),
    topicKey: anahtarNormalize(o.konuKey),
    examKey: anahtarNormalize(o.sinavKey),
    correct: dogru,
    total: toplam,
    successRate: yuzde(dogru, toplam),
    durationSec: sureSn,
    score: puan,
    atMs: Date.now(),
  });
}

/**
 * Tek giriş noktası — Android `StatsManager.applyEvent`.
 * Hatalar YUTULUR: istatistik yazımı akışı durdurmamalı (Android'de de try/catch içinde).
 */
export async function istatistikOlayiUygula(uid: string, o: IstatistikOlayi): Promise<void> {
  if (!uid) return;
  try {
    const g = sinifSinirla(o.sinif);
    const temel = `users/${uid}/stats/grade${g}`;
    const dogru = o.dogru ?? 0;
    const toplam = o.toplam ?? 0;
    const sureSn = o.sureSn ?? 0;
    const puan = o.puan ?? 0;
    const sayaciArtir = o.sayaciArtir !== false;
    const ders = anahtarNormalize(o.dersKey);

    if (o.tip === "test") {
      await kovaGuncelle(`${temel}/overall/tests`, dogru, toplam, sureSn, puan);
      await sonSonucYaz(temel, "test", o, dogru, toplam, sureSn, puan);

      if (ders) {
        const dersTemel = `${temel}/subjects/${ders}`;
        await kovaGuncelle(`${dersTemel}/tests`, dogru, toplam, sureSn, puan);

        const unite = anahtarNormalize(o.uniteKey);
        if (unite) await kovaGuncelle(`${dersTemel}/units/${unite}/tests`, dogru, toplam, sureSn, puan);

        const konu = anahtarNormalize(o.konuKey);
        if (konu) await kovaGuncelle(`${dersTemel}/topics/${konu}/tests`, dogru, toplam, sureSn, puan);
      }
    } else if (o.tip === "defter") {
      await sayacArtir(`${temel}/overall/defter/completedNotebooks`, 1);
      await update(dbRef(kullaniciDb, `${temel}/overall/defter`), { updatedAt: Date.now() });
      await sonSonucYaz(temel, "defter", o, 0, 0, sureSn, puan);

      if (ders) {
        await sayacArtir(`${temel}/subjects/${ders}/defter/completedNotebooks`, 1);
        await update(dbRef(kullaniciDb, `${temel}/subjects/${ders}/defter`), { updatedAt: Date.now() });
      }
    } else {
      // yazılı — her adım kendi try'ında: biri düşerse diğerleri yazılsın (Android'deki gibi)
      if (sayaciArtir) {
        try { await sayacArtir(`${temel}/overall/yazili/preparedExams`, 1); } catch { /* yoksay */ }
        try { await sayacArtir(`${temel}/overall/preparedExams`, 1); } catch { /* yoksay */ }
      }
      if (toplam > 0) {
        try {
          await kovaGuncelle(`${temel}/overall/yazili`, dogru, toplam, sureSn, puan, sayaciArtir);
        } catch { /* yoksay */ }
      }
      try { await sonSonucYaz(temel, "yazili", o, dogru, toplam, sureSn, puan); } catch { /* yoksay */ }

      if (ders) {
        const dersTemel = `${temel}/subjects/${ders}`;
        if (sayaciArtir) {
          try { await sayacArtir(`${dersTemel}/yazili/preparedExams`, 1); } catch { /* yoksay */ }
          try { await sayacArtir(`${dersTemel}/preparedExams`, 1); } catch { /* yoksay */ }
        }
        if (toplam > 0) {
          try {
            await kovaGuncelle(`${dersTemel}/yazili`, dogru, toplam, sureSn, puan, sayaciArtir);
          } catch { /* yoksay */ }
        }
      }
    }

    await update(dbRef(kullaniciDb, `${temel}/meta`), { lastUpdatedAt: Date.now() });
  } catch (e) {
    sessizHata("istatistik", e);
    /* istatistik yazımı akışı durdurmaz */
  }
}
