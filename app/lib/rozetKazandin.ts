// "Rozeti Kazandın" sahnesinin verisi — Android RozetKazandin.kt / iOS RozetKazandinOverlay.swift.
// Bir kez gösterme: users/{uid}/badges_seen/{rozet yılı}/{ay}; üç platform aynı bayrağı okur,
// telefonda görülen kutlama web'de tekrar çıkmaz.

import { get, ref as dbRef, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { rozetYiliAnahtari } from "./sezon";
import { AY_ANAHTAR } from "./ayGorsel";
import { ROZET_YILI } from "../(uygulama)/basarimlar/basarimlar";
import { sessizHata } from "./hata";

/** Bu oturumda kutlananlar — yazım sunucuya varmadan yeniden tetiklenmesin. */
const buOturumdaKutlanan = new Set<string>();

/** Kazanılmış ama henüz kutlanmamış aylar (0 tabanlı), rozet yılı sırasında (Eylül → Ağustos). */
export async function bekleyenRozetAylari(uid: string): Promise<number[]> {
  if (!uid) return [];
  const yil = rozetYiliAnahtari();
  try {
    const [kazanilan, gorulen] = await Promise.all([
      get(dbRef(kullaniciDb, `users/${uid}/badges/${yil}`)),
      get(dbRef(kullaniciDb, `users/${uid}/badges_seen/${yil}`)),
    ]);
    const k = (kazanilan.val() ?? {}) as Record<string, unknown>;
    const g = (gorulen.val() ?? {}) as Record<string, unknown>;
    const out: number[] = [];
    for (const anahtar of Object.keys(k)) {
      if (k[anahtar] !== true || g[anahtar] === true) continue;
      if (buOturumdaKutlanan.has(`${yil}/${anahtar}`)) continue;
      const i = (AY_ANAHTAR as readonly string[]).indexOf(anahtar.trim().toLowerCase());
      if (i >= 0) out.push(i);
    }
    const sira = (i: number) => (ROZET_YILI as readonly number[]).indexOf(i);
    return out.sort((a, b) => sira(a) - sira(b));
  } catch (e) {
    sessizHata("rozetKazandin", e);
    return [];
  }
}

/** Kutlama kapanınca — bir daha gösterilmez. */
export async function rozetGorulduIsaretle(uid: string, ay: number): Promise<void> {
  if (!uid) return;
  const yil = rozetYiliAnahtari();
  const anahtar = AY_ANAHTAR[ay];
  buOturumdaKutlanan.add(`${yil}/${anahtar}`);
  try {
    await set(dbRef(kullaniciDb, `users/${uid}/badges_seen/${yil}/${anahtar}`), true);
  } catch (e) {
    sessizHata("rozetKazandin", e);
  }
}
