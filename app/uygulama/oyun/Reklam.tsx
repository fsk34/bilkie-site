"use client";

// Oyun ekranı banner reklamı — Android `ads/BannerAdView.kt`in web karşılığı.
//
// ⚠️ AdMob web'de ÇALIŞMAZ (yalnız mobil uygulamalar için). Web'in karşılığı AdSense;
// yayıncı hesabı aynı (`pub-8784812800014128`) ama reklam birimi AYRI oluşturulur.
//
// Yerleşim Android'le birebir: yalnızca Blok Patla, 2048 ve Sudoku oyun ekranlarının
// ALTINDA. Öğrenme ekranlarında (test, defter, yazılı, quiz) ve oyun listesinde reklam
// YOK — uygulamada da yok.
//
// Çocuğa yönelik ayarlar Android'deki `TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE` ve
// `TAG_FOR_UNDER_AGE_OF_CONSENT_TRUE` ile aynı: kişiselleştirilmiş reklam kapalı.

import { useEffect, useRef } from "react";
import { REKLAM_ISTEMCI, REKLAM_SLOT_OYUN, reklamAcikMi } from "../../lib/reklam";

export default function Reklam() {
  const yerRef = useRef<HTMLModElement | null>(null);
  const itildiRef = useRef(false);

  useEffect(() => {
    if (!reklamAcikMi() || itildiRef.current || !yerRef.current) return;
    itildiRef.current = true;   // React geliştirme kipi effect'i iki kez çağırıyor
    try {
      const w = window as unknown as { adsbygoogle?: unknown[] };
      (w.adsbygoogle = w.adsbygoogle || []).push({});
    } catch {
      /* reklam yüklenemezse oyun etkilenmesin */
    }
  }, []);

  // Slot tanımlı değilse hiçbir şey çizilmez — boş gri kutu görünmesin
  if (!reklamAcikMi()) return null;

  return (
    <div className="bk-reklam">
      {/* Yükleyici betiği kök düzende (app/layout.tsx) — burada tekrar yüklenmez */}
      <ins
        ref={yerRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: 50 }}
        data-ad-client={REKLAM_ISTEMCI}
        data-ad-slot={REKLAM_SLOT_OYUN}
        data-ad-format="horizontal"
        data-full-width-responsive="true"
        // Android'deki iki bayrağın web karşılığı
        data-tag-for-child-directed-treatment="1"
        data-tag-for-under-age-of-consent="1"
      />
    </div>
  );
}
