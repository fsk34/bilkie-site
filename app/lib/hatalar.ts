// Yanlış soru takibi + Hata Turu (20 Eyl 2026) — Bilkie AI'nın "hatalarından öğren" kuralı.
// Duolingo "Mistakes" karşılığı: yanlış yapılan sorunun yalnız KİMLİĞİ saklanır (soru metni
// içerik DB'sinden yeniden okunur), 3 gün "olgunlaşınca" Hata Turu'nda tekrar sorulur.
//   users/{uid}/hatalar/grade{g}/{ders}/{konu}/{adim}_{soruKey} = { zaman, sayi }
//   • yanlış → zaman = şimdi, sayi +1     • doğru (test ya da tur) → kayıt silinir
// Kapsam v1: konu testleri. Yazılı soruları ayrı yükleyiciden geliyor, sonra.
// Yazma test bitişinde TEK update (soru başına ağ yok). Aynı kural üç platforma taşınacak.

import { get, increment, ref as dbRef, update } from "firebase/database";
import { kullaniciDb } from "./firebase";
import { sinifSinirla, sorulariGetir, type Soru } from "./veri";

/** Yanlış yapılan soru bu kadar gün sonra "olgunlaşır" (aralıklı tekrar: hemen değil, unutmaya yakın) */
export const HATA_OLGUNLASMA_GUN = 3;
/** Bir Hata Turu'nda en fazla soru */
export const HATA_TUR_SORU = 10;
/** Koç bu kadar olgun hata birikince Hata Turu önerir */
export const HATA_ONERI_ESIGI = 3;

export type Hata = { ders: string; konu: string; adim: number; soruKey: string; zaman: number; sayi: number };

export const hatalarYolu = (uid: string, sinif: number) => `users/${uid}/hatalar/grade${sinifSinirla(sinif)}`;

function sayi(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

/** Ham düğüm → düz liste (saf). Anahtar biçimi "{adim}_{soruKey}"; bozuk anahtar atlanır. */
export function hatalariCoz(ham: unknown): Hata[] {
  const out: Hata[] = [];
  for (const [ders, konular] of Object.entries((ham ?? {}) as Record<string, Record<string, Record<string, unknown>>>)) {
    for (const [konu, sorular] of Object.entries(konular ?? {})) {
      for (const [anahtar, v] of Object.entries(sorular ?? {})) {
        const m = anahtar.match(/^(\d)_(.+)$/);
        if (!m) continue;
        const kayit = (v ?? {}) as Record<string, unknown>;
        out.push({ ders, konu, adim: Number(m[1]), soruKey: m[2], zaman: sayi(kayit.zaman), sayi: Math.max(1, sayi(kayit.sayi)) });
      }
    }
  }
  return out;
}

export async function hatalariOku(uid: string, sinif: number): Promise<Hata[]> {
  try {
    const snap = await get(dbRef(kullaniciDb, hatalarYolu(uid, sinif)));
    return hatalariCoz(snap.val());
  } catch {
    return [];
  }
}

/** Olgunlaşmış (≥3 gün) hatalar — eskisi önce. */
export function olgunHatalar(hatalar: Hata[], simdi: number): Hata[] {
  const esik = simdi - HATA_OLGUNLASMA_GUN * 24 * 60 * 60 * 1000;
  return hatalar.filter((h) => h.zaman <= esik).sort((a, b) => a.zaman - b.zaman);
}

/** Test bitişinde biriktirilen sonuçlar: soru → doğru mu. Tek update ile yazılır. */
export type SoruSonucu = { konu: string; adim: number; soruKey: string; dogru: boolean };

export async function hataDegisimleriYaz(uid: string, sinif: number, ders: string, sonuclar: SoruSonucu[]): Promise<void> {
  if (sonuclar.length === 0) return;
  const simdi = Date.now();
  const degisim: Record<string, unknown> = {};
  for (const s of sonuclar) {
    const yol = `${ders}/${s.konu}/${s.adim}_${s.soruKey}`;
    if (s.dogru) degisim[yol] = null;                         // öğrenildi → kayıt silinir (yoksa zararsız)
    else { degisim[`${yol}/zaman`] = simdi; degisim[`${yol}/sayi`] = increment(1); }
  }
  await update(dbRef(kullaniciDb, hatalarYolu(uid, sinif)), degisim);
}

/** Hata Turu'nun sorusu: içerik + kimlik. */
export type TurSorusu = Soru & { ders: string; konu: string; adim: number };

/**
 * Hata Turu için soruları içerik DB'sinden toplar (adım başına tek okuma, önbellekli).
 * Olgun hatalar önce; azsa yeni hatalarla tamamlanır. Silinmiş/bulunamayan soru atlanır.
 */
export async function turSorulariniHazirla(sinif: number, hatalar: Hata[], simdi: number): Promise<TurSorusu[]> {
  const olgun = olgunHatalar(hatalar, simdi);
  const olgunSet = new Set(olgun);
  const sira = [...olgun, ...hatalar.filter((h) => !olgunSet.has(h)).sort((a, b) => a.zaman - b.zaman)].slice(0, HATA_TUR_SORU);
  const out: TurSorusu[] = [];
  const adimOnbellek = new Map<string, Soru[]>();
  for (const h of sira) {
    const k = `${h.ders}/${h.konu}/${h.adim}`;
    let sorular = adimOnbellek.get(k);
    if (!sorular) {
      try { sorular = await sorulariGetir(sinif, h.ders, h.konu, h.adim); } catch { sorular = []; }
      adimOnbellek.set(k, sorular);
    }
    const soru = sorular.find((s) => s.anahtar === h.soruKey);
    if (soru) out.push({ ...soru, ders: h.ders, konu: h.konu, adim: h.adim });
  }
  return out;
}
