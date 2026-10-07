"use client";

// Web'de hak (can) sistemi — TEK karar yeri (7 Eki 2026).
//
// Android'de hak 0 olunca "Hakların bitti!" çıkar, ödüllü reklamla +1 hak kazanılır (günde 3).
// Web'de ödüllü reklam yok → hak düşse de kazanmanın yolu yok; 0'da kilitlemek kullanıcıyı takar,
// kilitlemeden düşürmek ise anlamsız bir sayaç + AYNI günün Android haklarını tüketmek demekti
// (haklar `users/{uid}/lives`, üç platform ortak). Bu yüzden web'de hak sistemi KAPALI:
// yanlışta hak düşmez, sayaç gösterilmez. Kod yerinde (veri.ts canDegistir, sayaç bileşenleri).
//
// Açılış koşulları:
//  1) WEB_HAK_KAZANMA_YOLU: web'e ödüllü reklam (ya da başka bir hak kazanma yolu) gelince true.
//  2) Abone değil: "premium = sınırsız hak" kararı (22 Eyl abonelik hazırlığı; ödüllü reklam
//     abonelik kapısının bilerek dışındaydı, burada bağlanıyor). Aboneye hak düşmez, sayaç görünmez.

import { usePremium } from "./premium";

/** Web'de hak kazanma yolu var mı (ödüllü reklam). Gelince true + "Hakların bitti" penceresi eklenir. */
export const WEB_HAK_KAZANMA_YOLU = false;

/** Saf karar (test edilebilir). */
export function hakSistemiAcik(premiumAktif: boolean): boolean {
  return WEB_HAK_KAZANMA_YOLU && !premiumAktif;
}

/** Bu kullanıcıda hak düşer ve sayaç görünür mü. */
export function useHakSistemi(): boolean {
  return hakSistemiAcik(usePremium().aktif);
}
