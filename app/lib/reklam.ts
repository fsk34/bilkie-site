// Reklam yapılandırması.
//
// Yayıncı kimliği AdMob ile AYNI hesaptan geliyor: AdMob uygulama kimliği
// `ca-app-pub-8784812800014128~…` → AdSense yayıncı kimliği `ca-pub-8784812800014128`.
// (Sitedeki `public/ads.txt` de bu numarayı ilan ediyor.)
//
// ⚠️ Reklam BİRİMİ ayrı: AdMob'un `ca-app-pub-…/3571814039` birimi web'de kullanılamaz.
// AdSense'te "Görüntülü reklam" birimi oluşturulup slot numarası buraya yazılacak.
// Slot boşken reklam bileşeni hiçbir şey çizmez — boş gri kutu görünmez.

export const REKLAM_ISTEMCI = "ca-pub-8784812800014128";

/** AdSense → Reklamlar → Reklam birimi → oluşturulunca `data-ad-slot` değeri buraya. */
export const REKLAM_SLOT_OYUN = "";

export function reklamAcikMi(): boolean {
  return REKLAM_SLOT_OYUN.trim().length > 0;
}
