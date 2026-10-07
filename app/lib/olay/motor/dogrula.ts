// ⚠️ OTOMATİK KOPYA — elle değiştirme. Kaynak: functions/src/motor/dogrula.ts (scripts/motor_esitle.sh)
// Olay doğrulama — şartname §4. Reddedilen olayın etkisi olmaz (işleyici `sonuc.hata` + islendi yazar).

import { gecerliGun, gunFarki } from "./tarih";
import type { Olay, OlayTuru } from "./tipler";

const ANAHTAR = /^[a-z0-9_]{1,48}$/;
const TURLER: readonly OlayTuru[] = ["test", "defter", "yazili", "quiz", "hata", "evde", "oyun"];

/** Bu kadar günden eski olayda yalnız XP sayılır; görev/seri/günlük bayrak atlanır (KARAR S2). */
export const GEC_OLAY_GUN = 60;

export type Dogrulama =
  | { tamam: true; olay: Olay; eski: boolean }
  | { tamam: false; hata: string };

function tamSayiMi(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

/**
 * Ham olayı doğrular, sunucu gününe göre düzeltir.
 * - `gun` sunucunun bugününden ileri olamaz (ileri saat) → bugüne çekilir.
 * - 60 günden eski → eski = true.
 */
export function dogrula(id: string, ham: unknown, sunucuGunu: string): Dogrulama {
  if (typeof ham !== "object" || ham === null) return { tamam: false, hata: "olay nesne değil" };
  const o = ham as Record<string, unknown>;
  const red = (hata: string): Dogrulama => ({ tamam: false, hata });

  if (!TURLER.includes(o.tur as OlayTuru)) return red("tur geçersiz");
  const tur = o.tur as OlayTuru;
  if (!tamSayiMi(o.sinif, 3, 8)) return red("sinif geçersiz");
  if (!gecerliGun(o.gun)) return red("gun geçersiz");
  if (!tamSayiMi(o.ts, 0, Number.MAX_SAFE_INTEGER)) return red("ts geçersiz");

  const anahtar = (ad: string): boolean => typeof o[ad] === "string" && ANAHTAR.test(o[ad] as string);
  const dogruToplam = (tavan: number): string | null => {
    if (!tamSayiMi(o.toplam, 0, tavan)) return "toplam geçersiz";
    if (!tamSayiMi(o.dogru, 0, o.toplam as number)) return "dogru geçersiz";
    return null;
  };

  const olay: Olay = { id, tur, sinif: o.sinif as number, gun: o.gun as string, ts: o.ts as number };
  if (typeof o.surum === "string") olay.surum = o.surum.slice(0, 40);

  switch (tur) {
    case "test": {
      if (!anahtar("ders") || !anahtar("konu")) return red("ders/konu geçersiz");
      if (!tamSayiMi(o.adim, 1, 3)) return red("adim geçersiz");
      const h = dogruToplam(50); if (h) return red(h);
      Object.assign(olay, { ders: o.ders, konu: o.konu, adim: o.adim, dogru: o.dogru, toplam: o.toplam });
      break;
    }
    case "defter": {
      if (!anahtar("ders") || !anahtar("konu")) return red("ders/konu geçersiz");
      if (!tamSayiMi(o.sayfa, 0, 500)) return red("sayfa geçersiz");
      if (typeof o.seri !== "boolean" || typeof o.bitti !== "boolean") return red("seri/bitti geçersiz");
      Object.assign(olay, { ders: o.ders, konu: o.konu, sayfa: o.sayfa, seri: o.seri, bitti: o.bitti });
      break;
    }
    case "yazili": {
      if (!anahtar("ders") || !anahtar("sinav")) return red("ders/sinav geçersiz");
      if (o.adim !== "step1" && o.adim !== "step2") return red("adim geçersiz");
      const h = dogruToplam(100); if (h) return red(h);
      Object.assign(olay, { ders: o.ders, sinav: o.sinav, adim: o.adim, dogru: o.dogru, toplam: o.toplam });
      break;
    }
    case "quiz": {
      if (!anahtar("ders") || !anahtar("unite")) return red("ders/unite geçersiz");
      Object.assign(olay, { ders: o.ders, unite: o.unite });
      break;
    }
    case "hata": {
      if (!tamSayiMi(o.dogru, 0, 50)) return red("dogru geçersiz");
      olay.dogru = o.dogru;
      break;
    }
    case "evde":
    case "oyun":
      break;
  }

  let eski = false;
  if (olay.gun > sunucuGunu) olay.gun = sunucuGunu;          // ileri saat
  else if (gunFarki(olay.gun, sunucuGunu) > GEC_OLAY_GUN) eski = true;

  return { tamam: true, olay, eski };
}
