// "Lig atladın" kutlamasının verisi — rozetKazandin.ts ile aynı kalıp.
//
// Neden: Ligler ekranındaki terfi animasyonu yalnız ekran AÇIKKEN lig değişirse
// oynuyordu (üç platformda da); test çözerken atlanan lig hiç kutlanmıyordu.
// Bir kez gösterme: users/{uid}/league/seen/grade{g} = o sınıfta son kutlanan ligin sırası (1..6).
// Üç platform aynı değeri okur; telefonda görülen kutlama web'de tekrar çıkmaz.
// Kayıt YOKSA sessizce şimdiki lig yazılır — mevcut kullanıcıya "Başlangıç'a yükseldin" denmez.
// Düşüşte HİÇBİR ŞEY yazılmaz (Android 24 Eyl): eskiden aşağı hizalanıyordu; XP yüklenmeden
// değer düşüp aynı lig tekrar "atladın" diye kutlanıyordu.
// SINIF BAŞINA (26 Eyl 2026): lig XP'si sınıfa bağlı (xp/grade{g}) ama kayıt tek sayıydı
// (league/seenLeague) → 6. sınıfta Şampiyonlar'ı gören çocuk 7. sınıfa geçince Gelişim/Ustalık/
// Şampiyonlar hiç kutlanmıyordu. Artık league/seen/grade{g}; eski seenLeague'e dokunulmaz
// (eski sürümler okumaya devam eder — aynı düğümü nesneye çevirmek onların yazımıyla bozulurdu).

import { get, ref as dbRef, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { sinifSinirla } from "./veri";
import { sessizHata, tavanli } from "./hata";

export const LIG_SIRASI = ["baslangic", "gelisim", "ustalik", "sampiyonlar", "efsaneler", "zirve"] as const;
export const LIG_ADI: Record<string, string> = {
  baslangic: "Başlangıç Ligi", gelisim: "Gelişim Ligi", ustalik: "Ustalık Ligi",
  sampiyonlar: "Şampiyonlar Ligi", efsaneler: "Efsaneler Ligi", zirve: "Zirve Ligi",
};
export const ligSirasi = (key: string) => LIG_SIRASI.indexOf(key as (typeof LIG_SIRASI)[number]) + 1;   // 1..6, bilinmeyen 0

const yol = (uid: string, sinif: number) => `users/${uid}/league/seen/grade${sinifSinirla(sinif)}`;
/** Bu oturumda kutlanan (uid|sınıf → sıra) — yazım sunucuya varmadan yeniden tetiklenmesin. */
const buOturumdaKutlanan = new Map<string, number>();
const oturumAnahtari = (uid: string, sinif: number) => `${uid}|${sinifSinirla(sinif)}`;

/**
 * Kutlanacak lig sırası, yoksa null. `simdiki` = XP'den bulunan ligin sırası (1..6).
 * Kayıt yoksa sessizce şimdikini yazar; eşit/düşükte dokunmaz. Çağıran XP YÜKLENMEDEN çağırmamalı.
 */
export async function bekleyenLigTerfisi(uid: string, sinif: number, simdiki: number): Promise<number | null> {
  if (!uid || simdiki <= 0 || simdiki <= (buOturumdaKutlanan.get(oturumAnahtari(uid, sinif)) ?? 0)) return null;
  try {
    const snap = await tavanli(get(dbRef(kullaniciDb, yol(uid, sinif))), 8000);
    if (!snap) return null;   // okunamadı: kutlama yok, sonra yeniden denenir
    const gorulen = Number(snap.val() ?? 0) || 0;
    if (!snap.exists() || gorulen <= 0) {
      set(dbRef(kullaniciDb, yol(uid, sinif)), simdiki).catch((e) => sessizHata("ligAtladin", e));   // ilk kayıt: sessiz
      return null;
    }
    // Yalnız yukarı: kutlanır, kutlama kapanınca ligTerfisiGorulduIsaretle yazar. Eşit/düşükte hiçbir şey.
    return simdiki > gorulen ? simdiki : null;
  } catch (e) {
    sessizHata("ligAtladin", e);
    return null;
  }
}

/** Kutlama kapanınca — bir daha gösterilmez. */
export async function ligTerfisiGorulduIsaretle(uid: string, sinif: number, sira: number): Promise<void> {
  if (!uid) return;
  const k = oturumAnahtari(uid, sinif);
  buOturumdaKutlanan.set(k, Math.max(buOturumdaKutlanan.get(k) ?? 0, sira));
  try {
    await set(dbRef(kullaniciDb, yol(uid, sinif)), sira);
  } catch (e) {
    sessizHata("ligAtladin", e);
  }
}
