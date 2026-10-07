// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/motor.ts (scripts/motor_esitle.sh)
// Saf karar motoru — şartname §7 (yalnız "S" satırları). Ağ yok: işleyici önce `okumaPlani`ndaki
// düğümleri okur, sonra `isle` tek çok-yollu update'in içeriğini üretir.
// İstemcinin yazdıkları ("İ" satırları: adım sonucu, sayaçlar, Hata Turu kayıtları, Evde kaydı…)
// burada YOKTUR — onlar olayla aynı atomik istemci yazmasında gelir.

import { ayAnahtari, haftaAnahtari, rozetAyAnahtari, rozetYili } from "./tarih";
import { dugum, ondalik, yuvarlakSayi, tamSayi } from "./sayi";
import { bolumeUygula, hepsiBitti, type Bolum, type GorevOlayi } from "./gorev";
import { seriIsle, ACT_DEFTER, ACT_TEST, ACT_YAZILI } from "./seri";
import { GunlukBayraklar } from "./gunluk";
import { artir, type GorevDegisimi, type Katalog, type MotorCiktisi, type Olay, type SeriSonucu, type Yazilacak } from "./tipler";

/** domain/XpRules.kt */
export const XP = { TEST_DOGRU: 2, YAZILI_DOGRU: 4, DEFTER: 50, QUIZ: 30 } as const;

/** TurkishText.normalizeKey'in [a-z0-9_] girdideki etkisi (StatsManager topic anahtarı) */
const sade = (k: string) => k.replace(/_+/g, "_").replace(/^_|_$/g, "");

/** buildTestIdV1 (TaskManager.kt:1011) — adım katılmaz */
export function testIdUret(sinif: number, ders: string, konu: string): string {
  const ck = (s: string) => {
    const t = s.trim().toLowerCase();
    return t ? t.replace(/\s+/g, "_").replace(/\|/g, "_").replace(/\//g, "_") : "na";
  };
  return `v1|g${sinif}|${ck(ders)}|${ck(konu)}|s0`;
}

// Hata Turu ve Evde seriyi ilerletmez (6 Eki kararı, S3 geri alındı)
const seriGerekir = (o: Olay) =>
  o.tur === "test" || o.tur === "yazili" ||
  (o.tur === "defter" && (o.seri === true || o.bitti === true));

/** Okunacak düğümler: anahtar → tam yol. Kova anahtarları "kova:" ile başlar (geçiş dönemi türev tazeleme). */
export function okumaPlani(uid: string, o: Olay, eski: boolean): Record<string, string> {
  const u = `users/${uid}`, g = `grade${o.sinif}`;
  const p: Record<string, string> = { xp: `${u}/xp/${g}` };

  switch (o.tur) {
    case "test":
      p.adim = `${u}/progress_test/${g}/${o.ders}/${o.konu}/completedSteps`;
      p["kova:overall"] = `${u}/stats/${g}/overall/tests`;
      p["kova:ders"] = `${u}/stats/${g}/subjects/${o.ders}/tests`;
      p["kova:konu"] = `${u}/stats/${g}/subjects/${o.ders}/topics/${sade(o.konu!)}/tests`;
      break;
    case "yazili":
      p.adim = `${u}/progress_yazili/${g}/${o.ders}/${o.sinav}/completedSteps`;
      p.isaret = `${u}/xp_once/yazili/${g}/${o.ders}/${o.sinav}/${o.adim}`;
      p["kova:overall"] = `${u}/stats/${g}/overall/yazili`;
      p["kova:ders"] = `${u}/stats/${g}/subjects/${o.ders}/yazili`;
      break;
    case "defter":
      if (o.bitti) p.isaret = `${u}/progress_defter_done/${g}/${o.ders}/${o.konu}`;
      break;
    case "quiz":
      p.isaret = `${u}/quiz_done/${g}/${o.ders}/${o.unite}`;
      break;
  }

  if (!eski) {
    p.gunluk = `${u}/dailyActivity/${o.gun}`;
    p.gorevGunluk = `${u}/tasks/${o.gun}`;
    p.gorevHaftalik = `${u}/tasksWeekly/${haftaAnahtari(o.gun)}`;
    p.gorevAylik = `${u}/tasksMonthly/${ayAnahtari(o.gun)}`;
    if (seriGerekir(o)) {
      p.seri = `${u}/streak`;
      p.enUzun = `${u}/personal_records/${g}/enuzunseri`;
    }
  }
  return p;
}

/**
 * Olayın sunucu etkileri.
 * @param okunan okumaPlani anahtarları → ham değer (yoksa undefined/null)
 * @param katalog olayın gününe göre seçilmiş görev tanımları (katalogSec); okunamadıysa null → görev atlanır
 */
export function isle(
  uid: string, o: Olay, eski: boolean, okunan: Record<string, unknown>,
  katalog: Katalog | null, simdiMs: number
): MotorCiktisi {
  const u = `users/${uid}`, g = `grade${o.sinif}`;
  const yaz: Yazilacak = {};
  const gorevOlaylari: GorevOlayi[] = [];
  let xp = 0;
  let xpSebebi = "";
  let ilkKez: boolean | undefined;
  let seriBit = 0;

  const xpEkle = (n: number, sebep: string) => {
    if (n <= 0) return;
    xp += n;
    if (!xpSebebi) xpSebebi = sebep;
  };
  const gunluk = eski ? null : new GunlukBayraklar(uid, o.gun, okunan.gunluk, yaz);
  const adimYaz = (yol: string, hedef: number, tavan: number) => {
    const cur = tamSayi(okunan.adim);
    const yeni = Math.min(Math.max(cur, hedef), tavan);
    if (yeni !== cur) yaz[yol] = yeni;
  };

  switch (o.tur) {
    case "test": {
      const c = o.dogru!, t = o.toplam!;
      const hatasiz = t > 0 && c === t;
      adimYaz(`${u}/progress_test/${g}/${o.ders}/${o.konu}/completedSteps`, o.adim as number, 3);  // T1
      gunluk?.testBitti(hatasiz);                                                                   // T8 T9
      xpEkle(c * XP.TEST_DOGRU, "test");                                                            // T11
      gorevOlaylari.push({ tip: "TEST_FINISHED", correct: c, total: t, testId: testIdUret(o.sinif, o.ders!, o.konu!) });
      seriBit = ACT_TEST;
      break;
    }
    case "defter": {
      if ((o.sayfa ?? 0) > 0) gorevOlaylari.push({ tip: "NOTEBOOK_PAGES", pagesDelta: o.sayfa! });  // D1
      if (o.bitti) {
        ilkKez = okunan.isaret !== true;                                                            // D3
        if (ilkKez) {
          yaz[`${u}/progress_defter_done/${g}/${o.ders}/${o.konu}`] = true;
          yaz[`${u}/stats/${g}/overall/defter/completedNotebooks`] = artir(1);                     // D4
          yaz[`${u}/stats/${g}/subjects/${o.ders}/defter/completedNotebooks`] = artir(1);
          xpEkle(XP.DEFTER, "defter_complete");                                                     // D5
          yaz[`${u}/achievements/defteradet/current`] = artir(1);                                   // D6
          yaz[`${u}/achievements/unitesenfoni/current`] = artir(1);
          gunluk?.defterIlkKez();                                                                    // D7
          gorevOlaylari.push({ tip: "NOTEBOOK_COMPLETE", notebookId: `${o.ders}/${o.konu}` });       // D8
        }
      }
      if (o.seri || o.bitti) seriBit = ACT_DEFTER;                                                  // D2
      break;
    }
    case "yazili": {
      const c = o.dogru!, t = o.toplam!;
      adimYaz(`${u}/progress_yazili/${g}/${o.ders}/${o.sinav}/completedSteps`, o.adim === "step1" ? 1 : 2, 2); // Y1
      const puan = c * XP.YAZILI_DOGRU;
      if (puan > 0) {                                                                               // Y3
        ilkKez = okunan.isaret !== true;
        if (ilkKez) {
          yaz[`${u}/xp_once/yazili/${g}/${o.ders}/${o.sinav}/${o.adim}`] = true;
          xpEkle(puan, "yazili");
        }
      }
      if (t > 0 && c === t) gunluk?.yaziliHatasiz();                                                 // Y8
      gorevOlaylari.push({ tip: "YAZILI_COMPLETE", correct: c, total: t });                          // Y9
      seriBit = ACT_YAZILI;                                                                          // Y10
      break;
    }
    case "quiz": {
      ilkKez = okunan.isaret !== true;                                                               // Q1
      if (ilkKez) {
        yaz[`${u}/quiz_done/${g}/${o.ders}/${o.unite}`] = true;
        xpEkle(XP.QUIZ, `quiz_${o.ders}_${o.unite}`);
        gorevOlaylari.push({ tip: "QUIZ_COMPLETE" });
      }
      break;
    }
    case "hata":
      // Yalnız XP (H2). Seri/görev YOK (6 Eki: 1-2 tekrar sorusu "bugün çalıştım" sayılmaz)
      xpEkle(o.dogru! * XP.TEST_DOGRU, "hata_turu");
      break;
    case "evde":
      // Etki yok (6 Eki: doğrulanamayan elle giriş seri/görev/XP vermez). Kayıt istemcide (E1);
      // istemci bu olayı göndermez — eski/yanlış gönderim zararsız kapanır.
      break;
    case "oyun":
      gorevOlaylari.push({ tip: "GAME_PLAY" });                                                      // O1
      break;
  }

  // ---- görevler (§6.4) — eski olayda atlanır
  const farklar = new Map<string, GorevDegisimi>();
  if (!eski && katalog && gorevOlaylari.length > 0) {
    const bolumler: Array<Bolum & { aylik: boolean; gunluk: boolean }> = [
      { tanimlar: katalog.gunluk, durum: okunan.gorevGunluk, temelYol: `${u}/tasks/${o.gun}`, donemAnahtari: o.gun, aylik: false, gunluk: true },
      { tanimlar: katalog.haftalik, durum: okunan.gorevHaftalik, temelYol: `${u}/tasksWeekly/${haftaAnahtari(o.gun)}`, donemAnahtari: haftaAnahtari(o.gun), aylik: false, gunluk: false },
      { tanimlar: katalog.aylik, durum: okunan.gorevAylik, temelYol: `${u}/tasksMonthly/${ayAnahtari(o.gun)}`, donemAnahtari: ayAnahtari(o.gun), aylik: true, gunluk: false },
    ];
    for (const b of bolumler) {
      if (b.tanimlar.length === 0) continue;
      const r = bolumeUygula(b, gorevOlaylari, o.gun, simdiMs, yaz, farklar);
      if (b.gunluk && gunluk && hepsiBitti(b.tanimlar, r.sonDurum)) gunluk.gorevDedektifi();
      for (const def of r.yeniBitenler) {
        if (b.aylik) yaz[`${u}/badges/${rozetYili(o.gun)}/${rozetAyAnahtari(o.gun)}`] = true;
        xpEkle(def.xp, `task_${def.id}`);
      }
    }
  }

  // ---- seri (§6.3) — eski olayda atlanır
  let seri: SeriSonucu | null = null;
  if (!eski && seriBit !== 0) seri = seriIsle(uid, okunan.seri, o.gun, seriBit, o.sinif, okunan.enUzun, yaz);

  // ---- XP (§6.1)
  let lig: MotorCiktisi["lig"] = null;
  if (xp > 0) {
    const x = dugum(okunan.xp);
    const total = Math.max(0, yuvarlakSayi(x.total));
    const totalXp = Math.max(0, yuvarlakSayi(x.totalXp));
    const kok = `${u}/xp/${g}`;
    yaz[`${kok}/total`] = total >= totalXp ? artir(xp) : totalXp + xp;
    yaz[`${kok}/updatedAt`] = simdiMs;
    yaz[`${kok}/lastAdd/amount`] = xp;
    yaz[`${kok}/lastAdd/reason`] = xpSebebi;
    yaz[`${kok}/lastAdd/at`] = simdiMs;
    lig = { sinif: o.sinif, xpToplam: Math.max(total, totalXp) + xp };
  }

  // ---- geçiş dönemi: istemcinin artırdığı kovaların türev alanları (§9)
  for (const [anahtar, yol] of Object.entries(okumaPlani(uid, o, eski))) {
    if (!anahtar.startsWith("kova:")) continue;
    const k = dugum(okunan[anahtar]);
    const soru = ondalik(k.totalQuestions);
    if (soru <= 0) continue;
    const cozulen = ondalik(k.solvedCount);
    const oran = Math.min(100, Math.max(0, (ondalik(k.totalCorrect) / soru) * 100));
    const ort = cozulen > 0 ? Math.max(0, ondalik(k.totalDurationSec) / cozulen) : 0;
    if (ondalik(k.successRate) !== oran) yaz[`${yol}/successRate`] = oran;
    if (ondalik(k.avgDurationSec) !== ort) yaz[`${yol}/avgDurationSec`] = ort;
  }

  const sonuc: MotorCiktisi["sonuc"] = { xp, seri, gorevler: [...farklar.values()] };
  if (ilkKez !== undefined) sonuc.ilkKez = ilkKez;
  return { yazilacak: yaz, sonuc, lig };
}
