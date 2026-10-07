// Uzaktan anahtar `ayarlar/olayModu` (kullanici DB) — şartname §8.3 (Android data/olay/OlayModu.kt).
// Açıksa bitişler tek olay yazmasıyla gider, kapalıysa eski doğrudan yazmalar. Aynı bitiş asla iki
// yoldan yazılmaz: karar bitiş anında BİR KEZ [olayModuAcikMi] ile alınır.
//
// Biçim: {genel: bool, uidler: {uid: true}}. Okunamaz/biçimsizse KAPALI (eski yol tek başına güvenli).
// Son bilinen değer tarayıcıya da yazılır: internetsiz açılışta dinleyici dönmeyince mod "kapalı"
// sanılıp bitiş eski yoldan (çevrimdışı kaybolan transaction'larla) yazılmasın. Uzaktan kapatma
// çevrimiçi olunca geçerli.

import { onValue, ref as dbRef } from "firebase/database";
import { kullaniciDb } from "../firebase";

const ANAHTAR = "bk-olay-modu";

let ham: unknown = undefined;
let dinliyor = false;

function hatirlanan(): unknown {
  if (typeof window === "undefined") return null;
  try {
    const s = window.localStorage.getItem(ANAHTAR);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

/** Saf karar (Android OlayKodlama.modAcikMi). */
export function modAcikMi(deger: unknown, uid: string | null | undefined): boolean {
  if (!uid || typeof deger !== "object" || deger === null) return false;
  const m = deger as Record<string, unknown>;
  if (m.genel === true) return true;
  const liste = m.uidler;
  return typeof liste === "object" && liste !== null && (liste as Record<string, unknown>)[uid] === true;
}

/** Girişte: okuma izni auth ister. İzin hatasında düşer, sonraki girişte yeniden kurulur. */
export function olayModunuIzle(): () => void {
  if (dinliyor) return () => {};
  dinliyor = true;
  const birak = onValue(
    dbRef(kullaniciDb, "ayarlar/olayModu"),
    (s) => {
      ham = s.val();
      try {
        if (ham && typeof ham === "object") window.localStorage.setItem(ANAHTAR, JSON.stringify(ham));
        else window.localStorage.removeItem(ANAHTAR);
      } catch { /* yok say */ }
    },
    () => { dinliyor = false; }
  );
  return () => { birak(); dinliyor = false; };
}

export function olayModuAcikMi(uid: string | null | undefined): boolean {
  if (ham === undefined) ham = hatirlanan();
  return modAcikMi(ham, uid);
}
