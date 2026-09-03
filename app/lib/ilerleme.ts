// Test / defter / yazılı bitişinin TEK giriş noktası — Android `UserProgressRepository.kt` portu.
// Amaç: web'den çözülen bir test, telefondan çözülmüş gibi AYNI izi bıraksın.
//
// Android'de bu zincir üç yere dağılmış (TestScreens + DefterScreens + UserProgressRepository);
// burada tek yerde toplandı. Yazılan düğümler:
//   users/{uid}/achievements/{anahtar}/current          başarımlar
//   users/{uid}/personal_records/grade{N}/{anahtar}      kişisel rekorlar
//   users/{uid}/dailyActivity/{gün}/{bayrak}             aynı gün içinde ikili koşullar
//   + görev ilerlemesi (gorevYaz.ts) ve istatistik kovaları (istatistikYaz.ts)

import { get, ref as dbRef, runTransaction, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { gunAnahtari } from "./tarih";
import { sinifSinirla } from "./veri";
import { gorevOlayiUygula, testIdUret } from "./gorevYaz";
import { istatistikOlayiUygula } from "./istatistikYaz";
import { sessizHata } from "./hata";

function sayi(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return Number.parseInt(v, 10) || 0;
  return 0;
}

/* --------------------------------------------------------------- sayaçlar */

/** Android `incAchievement` — transaction, negatife düşmez. */
export async function basarimArtir(uid: string, anahtar: string, kadar = 1): Promise<void> {
  try {
    await runTransaction(
      dbRef(kullaniciDb, `users/${uid}/achievements/${anahtar}/current`),
      (mevcut) => Math.max(0, sayi(mevcut) + kadar)
    );
  } catch (e) {
    sessizHata("ilerleme", e);
    /* best-effort — Android'de de sessiz */
  }
}

/** Android `incPersonalRecord` — sınıfa özel rekor sayacı. */
export async function kisiselRekorArtir(
  uid: string, sinif: number, anahtar: string, kadar = 1
): Promise<void> {
  try {
    await runTransaction(
      dbRef(kullaniciDb, `users/${uid}/personal_records/grade${sinifSinirla(sinif)}/${anahtar}`),
      (mevcut) => Math.max(0, sayi(mevcut) + kadar)
    );
  } catch (e) {
    sessizHata("ilerleme", e);
    /* best-effort */
  }
}

/** Android `updatePersonalStreakRecord` — en uzun seri yalnızca BÜYÜKSE güncellenir. */
export async function enUzunSeriGuncelle(uid: string, sinif: number, yeniSayi: number): Promise<void> {
  if (yeniSayi <= 0) return;
  try {
    await runTransaction(
      dbRef(kullaniciDb, `users/${uid}/personal_records/grade${sinifSinirla(sinif)}/enuzunseri`),
      (mevcut) => Math.max(sayi(mevcut), yeniSayi)
    );
  } catch (e) {
    sessizHata("ilerleme", e);
    /* best-effort */
  }
}

/**
 * Android `setDailyFlagAndCheck` — "aynı gün içinde hem X hem Y" koşullu başarımları.
 * Bayrağı koyar; diğer bayrak da konmuşsa ve ödül daha önce verilmemişse başarımı artırır.
 */
async function gunlukBayrakVeKontrol(
  uid: string,
  konacakBayrak: string,
  digerBayrak: string,
  odulBayragi: string,
  basarimAnahtari: string
): Promise<void> {
  try {
    const kok = `users/${uid}/dailyActivity/${gunAnahtari()}`;
    await set(dbRef(kullaniciDb, `${kok}/${konacakBayrak}`), true);
    const snap = await get(dbRef(kullaniciDb, kok));
    const d = (snap.val() ?? {}) as Record<string, unknown>;
    if (d[digerBayrak] === true && d[odulBayragi] !== true) {
      await set(dbRef(kullaniciDb, `${kok}/${odulBayragi}`), true);
      await basarimArtir(uid, basarimAnahtari, 1);
    }
  } catch (e) {
    sessizHata("ilerleme", e);
    /* best-effort */
  }
}

/* ------------------------------------------------------------------ test */

export type TestBitisArgs = {
  uid: string;
  sinif: number;
  dersKey: string;
  konuKey: string;
  dogru: number;
  toplam: number;
  sureSn: number;
  /** Adım puanı — Android: doğru × XpRules.TEST_CORRECT_XP */
  puan: number;
};

/**
 * Test bitişinin tamamı: başarımlar + kişisel rekor + görevler + istatistik.
 * XP, seri ve adım ilerlemesi çağıran ekranda yazılıyor (Android'de de öyle).
 * Dönüş: görevlerde ilerleme oldu mu (sonuç ekranı bunu gösterir).
 */
export async function testBittiIsle(a: TestBitisArgs): Promise<boolean> {
  const hatasiz = a.toplam > 0 && a.dogru === a.toplam;

  // 1) Başarımlar — Android onTestFinished
  await basarimArtir(a.uid, "testadet", 1);
  if (hatasiz) {
    await basarimArtir(a.uid, "testdogru", 1);
    await kisiselRekorArtir(a.uid, a.sinif, "hatasiztest", 1);
  }
  // unitesenfoni: defter VEYA test tamamlandığında artar
  await basarimArtir(a.uid, "unitesenfoni", 1);
  // kusursuzsanat: aynı günde hem test hem defter
  await gunlukBayrakVeKontrol(a.uid, "testDone", "defterDone", "kusursuzsanatAwarded", "kusursuzsanat");
  // inceisci: aynı günde hem test hem yazılı HATASIZ
  if (hatasiz) {
    await gunlukBayrakVeKontrol(
      a.uid, "hatasizTestDone", "hatasizYaziliDone", "inceisciAwarded", "inceisci"
    );
  }

  // 2) Görevler — testId ile dedüplikasyon (aynı konu, farklı adım → tek sayım)
  let gorevIlerledi = false;
  try {
    gorevIlerledi = await gorevOlayiUygula(a.uid, {
      tip: "test_bitti",
      sinif: a.sinif,
      dogru: a.dogru,
      toplam: a.toplam,
      testId: testIdUret(a.sinif, a.dersKey, a.konuKey, null),
    });
  } catch (e) {
    sessizHata("ilerleme", e);
    /* görev yazımı akışı durdurmaz */
  }

  // 3) İstatistik kovaları — Android StatsManager.TEST_FINISHED (unitKey boş bırakılır)
  await istatistikOlayiUygula(a.uid, {
    tip: "test",
    sinif: a.sinif,
    dersKey: a.dersKey,
    uniteKey: "",
    konuKey: a.konuKey,
    dogru: a.dogru,
    toplam: a.toplam,
    sureSn: a.sureSn,
    puan: a.puan,
  });

  return gorevIlerledi;
}

/* ---------------------------------------------------------------- defter */

/**
 * Defter İLK KEZ tamamlandığında — Android: incrementAchievementCurrent("defteradet") +
 * onNotebookCompletedExtras + updateStatsForDefterComplete.
 * ⚠️ Yalnızca ilk tamamlamada çağrılmalı (çağıran `defterTamamla`nın `ilkKez` sonucuna bakar).
 * NOT: Android defter için StatsManager'a YAZMIYOR (defter istatistiği progress_defter'den
 * okunuyor) — burada da yazılmıyor, bilerek.
 */
export async function defterBittiIsle(
  uid: string, sinif: number, dersKey: string, uniteKey: string
): Promise<boolean> {
  await basarimArtir(uid, "defteradet", 1);
  await basarimArtir(uid, "unitesenfoni", 1);
  await gunlukBayrakVeKontrol(uid, "defterDone", "testDone", "kusursuzsanatAwarded", "kusursuzsanat");

  try {
    return await gorevOlayiUygula(uid, {
      tip: "defter_bitti",
      sinif,
      defterId: `${dersKey}/${uniteKey}`,   // Android: "$subjectKey/$topicKey"
    });
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- yazılı */

export type YaziliBitisArgs = {
  uid: string;
  sinif: number;
  dersKey: string;
  sinavKey: string;
  dogru: number;
  toplam: number;
  sureSn: number;
  puan: number;
  /** Aynı sınav tekrar çözülüyorsa sayaçlar artmasın. */
  sayaciArtir?: boolean;
};

/** Android `onYaziliCompleted` + `onYaziliAchievements` + StatsManager.YAZILI_FINISHED. */
export async function yaziliBittiIsle(a: YaziliBitisArgs): Promise<boolean> {
  const hatasiz = a.toplam > 0 && a.dogru === a.toplam;

  await basarimArtir(a.uid, "yaziliadet", 1);
  if (hatasiz) {
    await basarimArtir(a.uid, "yazilidogru", 1);
    await gunlukBayrakVeKontrol(
      a.uid, "hatasizYaziliDone", "hatasizTestDone", "inceisciAwarded", "inceisci"
    );
  }

  let gorevIlerledi = false;
  try {
    gorevIlerledi = await gorevOlayiUygula(a.uid, { tip: "yazili_bitti", sinif: a.sinif });
  } catch (e) {
    sessizHata("ilerleme", e);
    /* yoksay */
  }

  await istatistikOlayiUygula(a.uid, {
    tip: "yazili",
    sinif: a.sinif,
    dersKey: a.dersKey,
    sinavKey: a.sinavKey,
    dogru: a.dogru,
    toplam: a.toplam,
    sureSn: a.sureSn,
    puan: a.puan,
    sayaciArtir: a.sayaciArtir !== false,
  });

  return gorevIlerledi;
}

/* ------------------------------------------------- tüm günlük görevler bitti */

/** Android `onAllDailyTasksCompleted` — günün tüm görevleri bitince "gorevdedektifi". */
export async function tumGunlukGorevlerBitti(uid: string): Promise<void> {
  try {
    const kok = `users/${uid}/dailyActivity/${gunAnahtari()}`;
    const snap = await get(dbRef(kullaniciDb, `${kok}/allTasksAwarded`));
    if (snap.val() === true) return;
    await set(dbRef(kullaniciDb, `${kok}/allTasksAwarded`), true);
    await basarimArtir(uid, "gorevdedektifi", 1);
  } catch (e) {
    sessizHata("ilerleme", e);
    /* best-effort */
  }
}
