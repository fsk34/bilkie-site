// "Evde çözdüm" — kâğıtta çözülen testlerin elle girişi (20 Eyl 2026; Benim Hocam elle giriş kalıbı).
// Amaç: Bilgie Koç çocuğun çalışmasının kâğıtta geçen yarısını da görsün; çocuk uygulamaya bağlı kalsın.
//   users/{uid}/evde/grade{g}/{kayitId} = { ders, konu, dogru, yanlis, kaynak?, yanlisNolar?, zaman }
// Kurallar (kullanıcı kararı): XP / lig / görev ETKİSİ YOK (doğrulanamaz veri, lig bozulmasın);
// yalnız SERİ işlenir (o gün çalıştı). Uygulama istatistiğine karışmaz, ayrı `kaynak:'ev'` gibi durur;
// Bilgie Koç zayıf/güçlü hesabında sayar ve bunu söyler ("evde çözdüklerin dahil").
// Yanlış soru numaraları Hata Turu'na giremez (soru metni yok), Yanlışlarım'da liste olarak durur.

import { get, push, ref as dbRef, set } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { sinifSinirla } from "./veri";

export type EvdeKayit = {
  id: string;
  ders: string;
  /** konu anahtarı (tN); ünite geneli için "" */
  konu: string;
  dogru: number;
  yanlis: number;
  /** kitap/kaynak adı, isteğe bağlı */
  kaynak: string;
  /** yanlış soru numaraları (kâğıttaki), isteğe bağlı */
  yanlisNolar: number[];
  zaman: number;
};

export const EVDE_TEK_GIRIS_TAVANI = 100;   // tek kayıtta en fazla soru (yanlışlıkla 1000 yazılmasın)

export const evdeYolu = (uid: string, sinif: number) => `users/${uid}/evde/grade${sinifSinirla(sinif)}`;

function sayi(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

/** Ham düğüm → liste, yeni → eski (saf). */
export function evdeKayitlariCoz(ham: unknown): EvdeKayit[] {
  const out: EvdeKayit[] = [];
  for (const [id, v] of Object.entries((ham ?? {}) as Record<string, Record<string, unknown>>)) {
    const k = v ?? {};
    const dogru = Math.max(0, sayi(k.dogru)), yanlis = Math.max(0, sayi(k.yanlis));
    if (dogru + yanlis === 0 || typeof k.ders !== "string") continue;
    out.push({
      id, ders: k.ders, konu: typeof k.konu === "string" ? k.konu : "", dogru, yanlis,
      kaynak: typeof k.kaynak === "string" ? k.kaynak : "",
      yanlisNolar: Array.isArray(k.yanlisNolar) ? k.yanlisNolar.map(sayi).filter((n) => n > 0) : [],
      zaman: sayi(k.zaman),
    });
  }
  return out.sort((a, b) => b.zaman - a.zaman);
}

export async function evdeKayitlariOku(uid: string, sinif: number): Promise<EvdeKayit[]> {
  try {
    const snap = await get(dbRef(kullaniciDb, evdeYolu(uid, sinif)));
    return evdeKayitlariCoz(snap.val());
  } catch {
    return [];
  }
}

export async function evdeKayitYaz(uid: string, sinif: number, k: Omit<EvdeKayit, "id" | "zaman">): Promise<void> {
  const yeni = push(dbRef(kullaniciDb, evdeYolu(uid, sinif)));
  await set(yeni, {
    ders: k.ders, konu: k.konu, dogru: k.dogru, yanlis: k.yanlis,
    ...(k.kaynak ? { kaynak: k.kaynak } : {}),
    ...(k.yanlisNolar.length > 0 ? { yanlisNolar: k.yanlisNolar } : {}),
    zaman: Date.now(),
  });
}

/** ders → konu → {dogru, soru} toplamı (konusuz kayıtlar ders toplamına girer, konuya değil). */
export type EvdeOzet = Record<string, { dogru: number; soru: number; konular: Record<string, { dogru: number; soru: number }> }>;

export function evdeOzetle(kayitlar: EvdeKayit[]): EvdeOzet {
  const out: EvdeOzet = {};
  for (const k of kayitlar) {
    const d = (out[k.ders] ??= { dogru: 0, soru: 0, konular: {} });
    d.dogru += k.dogru; d.soru += k.dogru + k.yanlis;
    if (k.konu) {
      const c = (d.konular[k.konu] ??= { dogru: 0, soru: 0 });
      c.dogru += k.dogru; c.soru += k.dogru + k.yanlis;
    }
  }
  return out;
}

/** "3, 7 9" → [3, 7, 9] */
export function yanlisNolariAyristir(metin: string): number[] {
  return [...new Set(metin.split(/[^0-9]+/).map((x) => Number.parseInt(x, 10)).filter((n) => n > 0 && n < 1000))].sort((a, b) => a - b);
}
