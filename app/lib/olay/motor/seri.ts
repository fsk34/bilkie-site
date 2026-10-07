// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/seri.ts (scripts/motor_esitle.sh)
// Seri — Android StreakScreen.kt:646 markStreakActivity + en uzun seri rekoru (şartname §6.3).
// Fark: olay SON İŞLENEN günden ESKİYSE (çoklu cihaz / saat kayması) Android seriyi 1'e düşürürdü;
// burada lastDay korunur, seri gün maskesinden yeniden sayılır ve asla düşmez.

import { ayAnahtari, gunEkle, gunFarki, seriGunAnahtari, gecerliGun } from "./tarih";
import { dugum, tamSayi } from "./sayi";
import type { SeriSonucu, Yazilacak } from "./tipler";

export const ACT_TEST = 1;
export const ACT_DEFTER = 2;
export const ACT_YAZILI = 4;

/** Geriye doğru en çok bu kadar gün sayılır (geç olay yeniden sayımı) */
const GERI_SAYIM_TAVANI = 400;

function maske(days: unknown, gun: string): number {
  return tamSayi(dugum(dugum(days)[ayAnahtari(gun)])[seriGunAnahtari(gun)]);
}

/**
 * @param streak users/{uid}/streak ham düğümü (count, lastDay, days, gradeChangedAt)
 * @param enUzunEski personal_records/grade{g}/enuzunseri
 */
export function seriIsle(
  uid: string, streak: unknown, gun: string, bit: number, sinif: number, enUzunEski: unknown,
  yaz: Yazilacak
): SeriSonucu {
  const s = dugum(streak);
  const kok = `users/${uid}/streak`;
  const days = structuredClone(dugum(s.days));

  // 1) gün maskesi |= bit
  const yeniMaske = maske(days, gun) | bit;
  const ay = ayAnahtari(gun), gNo = seriGunAnahtari(gun);
  days[ay] = { ...dugum(days[ay]), [gNo]: yeniMaske };
  yaz[`${kok}/days/${ay}/${gNo}`] = yeniMaske;

  // 2) sayı
  const L = typeof s.lastDay === "string" && gecerliGun(s.lastDay) ? s.lastDay : null;
  const count = Math.max(0, tamSayi(s.count));
  let yeniSayi: number;
  let ilkBugun: boolean;

  if (L === null || gun >= L) {
    ilkBugun = gun !== L;
    if (ilkBugun) {
      yeniSayi = L !== null && gunFarki(L, gun) === 1 ? Math.max(1, count + 1) : 1;
      yaz[`${kok}/count`] = yeniSayi;
      yaz[`${kok}/lastDay`] = gun;
    } else {
      yeniSayi = count;
    }
  } else {
    // geç olay: L'den geriye maskesi dolu ardışık günler
    ilkBugun = false;
    let ardisik = 0;
    for (let d = L; ardisik < GERI_SAYIM_TAVANI && maske(days, d) > 0; d = gunEkle(d, -1)) ardisik++;
    yeniSayi = Math.max(count, ardisik);
    if (yeniSayi !== count) yaz[`${kok}/count`] = yeniSayi;
  }

  // 3) en uzun seri (sınıf değişiminden bu yana kırpılmış) — StreakScreen.kt:750
  if (yeniSayi > 0) {
    const degisim = typeof s.gradeChangedAt === "string" && gecerliGun(s.gradeChangedAt) ? s.gradeChangedAt : null;
    const sinifSerisi = degisim !== null
      ? Math.min(yeniSayi, Math.max(0, gunFarki(degisim, gun)) + 1)
      : yeniSayi;
    if (sinifSerisi > Math.max(0, tamSayi(enUzunEski))) {
      yaz[`users/${uid}/personal_records/grade${sinif}/enuzunseri`] = sinifSerisi;
    }
  }

  return { sayi: yeniSayi, ilkBugun, maske: yeniMaske };
}
