// "Lig atladın" kutlamasının verisi — rozetKazandin.ts ile aynı kalıp.
//
// Neden: Ligler ekranındaki terfi animasyonu yalnız ekran AÇIKKEN lig değişirse
// oynuyordu (üç platformda da); test çözerken atlanan lig hiç kutlanmıyordu.
// Bir kez gösterme: users/{uid}/league/seenLeague = son kutlanan ligin sırası (1..6).
// Üç platform aynı değeri okur; telefonda görülen kutlama web'de tekrar çıkmaz.
// Kayıt YOKSA sessizce şimdiki lig yazılır — mevcut kullanıcıya "Başlangıç'a yükseldin" denmez.
// Düşüşte (sezon sıfırlanınca) yalnız değer güncellenir, sahne yok.

import { get, ref as dbRef, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { sessizHata } from "./hata";

export const LIG_SIRASI = ["baslangic", "gelisim", "ustalik", "sampiyonlar", "efsaneler", "zirve"] as const;
export const LIG_ADI: Record<string, string> = {
  baslangic: "Başlangıç Ligi", gelisim: "Gelişim Ligi", ustalik: "Ustalık Ligi",
  sampiyonlar: "Şampiyonlar Ligi", efsaneler: "Efsaneler Ligi", zirve: "Zirve Ligi",
};
export const ligSirasi = (key: string) => LIG_SIRASI.indexOf(key as (typeof LIG_SIRASI)[number]) + 1;   // 1..6, bilinmeyen 0

const yol = (uid: string) => `users/${uid}/league/seenLeague`;
/** Bu oturumda kutlanan — yazım sunucuya varmadan yeniden tetiklenmesin. */
let buOturumdaKutlanan = 0;

/**
 * Kutlanacak lig sırası, yoksa null. `simdiki` = XP'den bulunan ligin sırası (1..6).
 * Kayıt yoksa ya da şimdiki ≤ görülen ise yalnız kaydı hizalar.
 */
export async function bekleyenLigTerfisi(uid: string, simdiki: number): Promise<number | null> {
  if (!uid || simdiki <= 0 || simdiki <= buOturumdaKutlanan) return null;
  try {
    const snap = await get(dbRef(kullaniciDb, yol(uid)));
    const gorulen = Number(snap.val() ?? 0);
    if (gorulen <= 0 || simdiki < gorulen) {
      await set(dbRef(kullaniciDb, yol(uid)), simdiki);   // ilk kayıt / düşüş: sessiz hizala
      return null;
    }
    return simdiki > gorulen ? simdiki : null;
  } catch (e) {
    sessizHata("ligAtladin", e);
    return null;
  }
}

/** Kutlama kapanınca — bir daha gösterilmez. */
export async function ligTerfisiGorulduIsaretle(uid: string, sira: number): Promise<void> {
  if (!uid) return;
  buOturumdaKutlanan = Math.max(buOturumdaKutlanan, sira);
  try {
    await set(dbRef(kullaniciDb, yol(uid)), sira);
  } catch (e) {
    sessizHata("ligAtladin", e);
  }
}
