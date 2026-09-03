// Firebase App Check — istemci, veri istemeden önce "ben gerçek Bilkie'yim" kanıtı sunar.
//
// ⚠️ ŞU AN HİÇBİR İSTEĞİ REDDETMEZ. Reddetme, Firebase konsolunda ürün bazında
// "Enforce" açıldığında başlar. O düğmeye ancak web + Android + iOS yayına çıkıp
// ölçüdeki "doğrulanmış istek" oranı ~%100 olduktan sonra basılmalı; erken basılırsa
// eski uygulama sürümünde kalan kullanıcılar kilitlenir.
//
// Android karşılığı: MainActivity.onCreate (Play Integrity).

import { getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

/**
 * reCAPTCHA Enterprise site anahtarı.
 * Google Cloud → Fraud Defense'te oluşturulur (Web tipi, PUAN TABANLI, onay kutusu KAPALI).
 * API anahtarı gibi herkese açıktır, tarayıcıya iner — gizli değildir.
 *
 * BOŞ bırakılırsa App Check hiç kurulmaz ve site normal çalışmaya devam eder.
 * (Reklam slotundaki `REKLAM_SLOT_OYUN = ""` ile aynı kalıp.)
 */
export const RECAPTCHA_SITE_ANAHTARI = "6LfzW6ctAAAAAFqn3mMZ-z3iR0rlgHMCG0Ex0tOt";

let kuruldu = false;

/** Tarayıcıda bir kez çalışır. Sunucu tarafında hiçbir şey yapmaz.
 *  EŞZAMANLI: ilk veri çağrısından önce hazır olsun diye (eşzamansız kurulunca
 *  açılıştaki ilk istek jetonsuz gidiyor; zorunlu kılma açıldığında reddedilirdi). */
export function appCheckBaslat() {
  if (typeof window === "undefined") return;
  if (kuruldu || !RECAPTCHA_SITE_ANAHTARI) return;
  kuruldu = true;

  // Üretim anahtarına localhost EKLENMİYOR (Google'ın önerisi). Yerelde bunun yerine
  // hata ayıklama jetonu kullanılır: tarayıcı konsoluna bir jeton basılır, o jeton
  // Firebase → App Check → "Manage debug tokens" altına elle eklenir.
  if (window.location.hostname === "localhost") {
    (self as unknown as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(getApp(), {
    provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_ANAHTARI),
    isTokenAutoRefreshEnabled: true,
  });
}
