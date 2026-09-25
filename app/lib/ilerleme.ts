// Test / defter / yazılı bitişinin TEK giriş noktası — Android `UserProgressRepository.kt` portu.
// Amaç: web'den çözülen bir test, telefondan çözülmüş gibi AYNI izi bıraksın.
//
// Android'de bu zincir üç yere dağılmış (TestScreens + DefterScreens + UserProgressRepository);
// burada tek yerde toplandı. Yazılan düğümler:
//   users/{uid}/achievements/{anahtar}/current          başarımlar
//   users/{uid}/personal_records/grade{N}/{anahtar}      kişisel rekorlar
//   users/{uid}/dailyActivity/{gün}/{bayrak}             aynı gün içinde ikili koşullar
//   + görev ilerlemesi (gorevYaz.ts) ve istatistik kovaları (istatistikYaz.ts)

import { get, ref as dbRef, runTransaction } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { gunAnahtari, gunFarki } from "./tarih";
import { sinifSinirla } from "./veri";
import { gorevOlayiUygula, testIdUret, type GorevDegisimi } from "./gorevYaz";
import { istatistikOlayiUygula } from "./istatistikYaz";
import { sessizHata, tavanli } from "./hata";

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

/**
 * En uzun seri rekoru — Android `markStreakActivity` sonundaki TEK yazma (24 Eyl 2026):
 * seri, sınıf değişiminden (`streak/gradeChangedAt`) bu yana geçen günle KIRPILIR (rekor sınıfa
 * özel), yalnız BÜYÜKSE yazılır. Eskiden kırpılmamış sayı yazılıyordu; sınıf değiştiren
 * çocuğun yeni sınıftaki rekoru eski sınıfın serisiyle şişiyordu.
 * Çağıranlar BEKLEMEZ (void): çevrimdışıyken transaction dönmez, akış kilitlenmesin.
 */
export async function enUzunSeriGuncelle(uid: string, sinif: number, yeniSayi: number): Promise<void> {
  if (yeniSayi <= 0) return;
  try {
    const degisim = await tavanli(get(dbRef(kullaniciDb, `users/${uid}/streak/gradeChangedAt`)), 6000);
    if (degisim === undefined) return;   // okunamadı: kırpılamayan değer yazılmasın, sonraki etkinlik yazar
    const tarih = degisim.val();
    const fark = typeof tarih === "string" ? gunFarki(tarih, gunAnahtari()) : null;
    const sinifSerisi = fark != null && fark >= 0 ? Math.min(yeniSayi, fark + 1) : yeniSayi;
    await runTransaction(
      dbRef(kullaniciDb, `users/${uid}/personal_records/grade${sinifSinirla(sinif)}/enuzunseri`),
      (mevcut) => (sinifSerisi > sayi(mevcut) ? sinifSerisi : undefined)   // küçükse dokunma
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
    // Tek transaction (Android 24 Eyl): bayrak + ödül bayrağı birlikte; ödülü yalnız ödül bayrağını
    // false→true çeviren (commit eden) çağrı verir → iki cihaz / eşzamanlı bitiş ödülü iki kez veremez.
    const kok = `users/${uid}/dailyActivity/${gunAnahtari()}`;
    let buCevirdi = false;
    const sonuc = await runTransaction(dbRef(kullaniciDb, kok), (mevcut) => {
      const d = { ...((mevcut ?? {}) as Record<string, unknown>) };
      buCevirdi = false;
      d[konacakBayrak] = true;
      if (d[digerBayrak] === true && d[odulBayragi] !== true) {
        d[odulBayragi] = true;
        buCevirdi = true;
      }
      return d;
    });
    if (sonuc.committed && buCevirdi) await basarimArtir(uid, basarimAnahtari, 1);
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
export async function testBittiIsle(a: TestBitisArgs): Promise<GorevDegisimi[]> {
  const hatasiz = a.toplam > 0 && a.dogru === a.toplam;

  // Üç iş BİRBİRİNDEN BAĞIMSIZ (Android testBitisiniYaz, 24 Eyl 2026): çevrimdışıyken ilk
  // transaction dönmediği için sıralı zincirde görev/istatistik hiç başlamıyordu.
  // 1) Başarımlar — Android onTestFinished (beklenmez)
  void (async () => {
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
  })().catch((e) => sessizHata("ilerleme", e));

  // 3) İstatistik kovaları — Android StatsManager.TEST_FINISHED (unitKey boş bırakılır; beklenmez)
  void istatistikOlayiUygula(a.uid, {
    tip: "test",
    sinif: a.sinif,
    dersKey: a.dersKey,
    uniteKey: "",
    konuKey: a.konuKey,
    dogru: a.dogru,
    toplam: a.toplam,
    sureSn: a.sureSn,
    puan: a.puan,
  }).catch((e) => sessizHata("ilerleme", e));

  // 2) Görevler — testId ile dedüplikasyon (aynı konu, farklı adım → tek sayım)
  try {
    return await gorevOlayiUygula(a.uid, {
      tip: "test_bitti",
      sinif: a.sinif,
      dogru: a.dogru,
      toplam: a.toplam,
      testId: testIdUret(a.sinif, a.dersKey, a.konuKey, null),
    });
  } catch (e) {
    sessizHata("ilerleme", e);
    return [];   // görev yazımı akışı durdurmaz
  }
}

/* ---------------------------------------------------------------- defter */

/**
 * Defter İLK KEZ tamamlandığında — Android `addReadNotebookOnce` (stats sayaçları) +
 * incrementAchievementCurrent("defteradet") + onNotebookCompletedExtras +
 * updateStatsForDefterComplete (görev).
 * ⚠️ Yalnızca ilk tamamlamada çağrılmalı (çağıran `defterTamamla`nın `ilkKez` sonucuna bakar).
 * NOT: Android StatsManager.applyEvent'i defter için çağırmıyor ama `addReadNotebookOnce`
 * içinde `stats/grade{N}/overall/defter/completedNotebooks` ve
 * `subjects/{ders}/defter/completedNotebooks` sayaçlarını transaction ile artırıyor.
 * Eski not "Android yazmıyor" diyordu — yanlıştı; web'den bitirilen defterler istatistik
 * ekranındaki "okunan defter" sayısına hiç girmiyordu (14 Eyl 2026'da bulundu).
 */
export async function defterBittiIsle(
  uid: string, sinif: number, dersKey: string, uniteKey: string
): Promise<GorevDegisimi[]> {
  // Bağımsız işler, beklenmez (çevrimdışı transaction dönmez → görev hiç başlamıyordu)
  void istatistikOlayiUygula(uid, { tip: "defter", sinif, dersKey }).catch((e) => sessizHata("ilerleme", e));
  void (async () => {
    await basarimArtir(uid, "defteradet", 1);
    await basarimArtir(uid, "unitesenfoni", 1);
    await gunlukBayrakVeKontrol(uid, "defterDone", "testDone", "kusursuzsanatAwarded", "kusursuzsanat");
  })().catch((e) => sessizHata("ilerleme", e));

  try {
    return await gorevOlayiUygula(uid, {
      tip: "defter_bitti",
      sinif,
      defterId: `${dersKey}/${uniteKey}`,   // Android: "$subjectKey/$topicKey"
    });
  } catch {
    return [];
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
export async function yaziliBittiIsle(a: YaziliBitisArgs): Promise<GorevDegisimi[]> {
  const hatasiz = a.toplam > 0 && a.dogru === a.toplam;

  // Bağımsız işler, beklenmez (çevrimdışı transaction dönmez → sıradakiler hiç başlamıyordu)
  void (async () => {
    await basarimArtir(a.uid, "yaziliadet", 1);
    if (hatasiz) {
      await basarimArtir(a.uid, "yazilidogru", 1);
      await gunlukBayrakVeKontrol(
        a.uid, "hatasizYaziliDone", "hatasizTestDone", "inceisciAwarded", "inceisci"
      );
    }
  })().catch((e) => sessizHata("ilerleme", e));

  void istatistikOlayiUygula(a.uid, {
    tip: "yazili",
    sinif: a.sinif,
    dersKey: a.dersKey,
    sinavKey: a.sinavKey,
    dogru: a.dogru,
    toplam: a.toplam,
    sayaciArtir: a.sayaciArtir !== false,
    sureSn: a.sureSn,
    puan: a.puan,
  }).catch((e) => sessizHata("ilerleme", e));

  try {
    return await gorevOlayiUygula(a.uid, {
      tip: "yazili_bitti", sinif: a.sinif, dogru: a.dogru, toplam: a.toplam,
    });
  } catch (e) {
    sessizHata("ilerleme", e);
    return [];
  }
}
