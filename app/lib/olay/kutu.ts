// Gönderilecekler kutusu — şartname §8.1 (Android data/olay/OlayKutusu.kt portu).
// Bir bitiş = TEK çok-yollu yazma: istemcinin düz yazmaları/artırmaları + users/{uid}/olaylar/{id}.
// Ya hep ya hiç. Kalıcılık (seri, görev, XP, ilk-kez kararları) sunucuda (olayIsle).
//
// Web'de kutu ŞART (mobilde yedek): Firebase web SDK yazmayı yalnız bellekte tutar; sekme kapanınca
// gönderilmemiş yazma kaybolur. Önce localStorage'a yazılır, sonra gönderilir; açılışta ve bağlantı her
// gelişinde kutudakiler AYNI içerikle yeniden gönderilir. Kaç kez gönderilirse gönderilsin bir kez
// sayılır: kural `olaylar/$id` için "yalnız yoksa" der → ikinci gönderimde çok-yollu yazmanın TAMAMI
// reddedilir, artırmalar da tekrar uygulanmaz.
//
// increment()/serverTimestamp() web SDK'da düz nesnedir ({".sv": …}) → JSON'a gidip aynen döner.
// null = SİL (Hata Turu'nda doğru cevaplanan soru) → JSON null'ı korur.
//
// Girdi düşer: sunucu işleyince (olaylar/{id}/islendi görülünce) ya da PERMISSION_DENIED gelince
// (olay zaten var). Diğer hatada kalır. Birden çok sekme aynı girdiyi gönderebilir — kural zararsız kılar.

import { get, onValue, push, ref as dbRef, update } from "firebase/database";
import { auth, kullaniciDb } from "../firebase";
import { sessizHata } from "../hata";
import { istanbulGunu } from "./motor/tarih";

/** Sunucuya giden sürüm etiketi (olay.surum) — teşhis için. */
export const OLAY_SURUM = "web-1";

const ONEK = "bk-olay:";
/** Kutunun en uzun tuttuğu süre (şartname §11) */
const KUTU_OMUR_MS = 150 * 24 * 60 * 60 * 1000;

type Girdi = {
  ts: number;
  /** kökten çok-yollu yazma haritası */
  h: Record<string, unknown>;
  /** ekranın kesin bildiği XP (görev XP'si hariç) — sunucu işleyene kadar ana ekran puanına bindirilir */
  x: number;
};

export type Olay = Record<string, unknown> & { tur: string; sinif: number; gun: string; ts: number };
export type Yazilan = { id: string; olay: Olay };
export type Bekleyen = { id: string; olay: Olay; xp: number };

/* ------------------------------------------------------------------ depolama */

const anahtar = (uid: string, id: string) => `${ONEK}${uid}/${id}`;

function depoOku(a: string): Girdi | null {
  try {
    const ham = window.localStorage.getItem(a);
    if (!ham) return null;
    const g = JSON.parse(ham) as Girdi;
    return g && typeof g === "object" && g.h && typeof g.h === "object" ? g : null;
  } catch {
    return null;
  }
}

function depoAnahtarlari(uid: string): string[] {
  if (typeof window === "undefined") return [];
  const on = `${ONEK}${uid}/`;
  try {
    return Object.keys(window.localStorage).filter((a) => a.startsWith(on));
  } catch {
    return [];
  }
}

function depoSil(a: string): void {
  try { window.localStorage.removeItem(a); } catch { /* yok say */ }
}

/* ---------------------------------------------------------- değişim bildirimi */
// Ana ekran puan/seri bindirmesi kutu değişince yeniden hesaplansın (Android OlayKutusu.degisim).

let surum = 0;
const dinleyiciler = new Set<() => void>();
function degisti(): void {
  surum += 1;
  for (const d of dinleyiciler) d();
}
export function kutuAbone(d: () => void): () => void {
  dinleyiciler.add(d);
  return () => { dinleyiciler.delete(d); };
}
export const kutuSurumu = () => surum;

/* ------------------------------------------------------------------- bağlantı */

let bagli = false;
/** `.info/connected` (kullanici DB). Bağlı değilken sunucu sonucu beklenmez. */
export const bagliMi = () => bagli;

/* --------------------------------------------------------------------- yazma */

/**
 * Tek çok-yollu yazmanın haritası (kökten). [istemci] yolları `users/{uid}` altına görelidir —
 * başka kullanıcının düğümüne yazılamasın diye mutlak yol kabul edilmez.
 */
export function cokYollu(
  uid: string, id: string, olay: Olay, istemci: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [yol, v] of Object.entries(istemci)) {
    const temiz = yol.replace(/^\/+|\/+$/g, "");
    if (!temiz || temiz.startsWith("olay")) throw new Error(`geçersiz istemci yolu: ${yol}`);
    out[`users/${uid}/${temiz}`] = v;
  }
  out[`users/${uid}/olaylar/${id}`] = olay;
  return out;
}

/**
 * Bitişi kutuya yazar ve gönderir. Okuma/transaction YOK → çevrimdışı da anında döner.
 * @param alanlar türe özgü olay alanları (şartname §4: ders, konu, adim, dogru, toplam…)
 * @param istemci `users/{uid}` altına göreli yollar → değer (artırmalar `increment`)
 * @param tahminiXp ekranın kesin bildiği XP (görev XP'si hariç)
 */
export function olayYaz(
  uid: string, tur: string, sinif: number,
  alanlar: Record<string, unknown>, istemci: Record<string, unknown>, tahminiXp = 0
): Yazilan {
  const id = push(dbRef(kullaniciDb, `users/${uid}/olaylar`)).key;
  if (!id) throw new Error("olay kimliği üretilemedi");
  const ts = Date.now();
  // Ortak alanlar türe özgü olanları ezer (tek kaynak burası)
  const olay: Olay = { ...alanlar, tur, sinif, gun: istanbulGunu(ts), ts, surum: OLAY_SURUM };
  const h = cokYollu(uid, id, olay, istemci);
  try {
    window.localStorage.setItem(anahtar(uid, id), JSON.stringify({ ts, h, x: tahminiXp } satisfies Girdi));
  } catch (e) {
    // Kota/özel kip: kutusuz da gönderilir (sekme açık kaldıkça SDK dener)
    sessizHata("olayKutusu", e);
  }
  degisti();
  gonderBir(uid, id, h);
  return { id, olay };
}

/* ------------------------------------------------------------------- gönderme */

const ucusta = new Set<string>();
/** Sunucuya ulaştı, işlenmesi bekleniyor: bu sekmede yeniden gönderilmez. */
const onaylanan = new Set<string>();

function dus(a: string): void {
  onaylanan.delete(a);
  depoSil(a);
  degisti();
}

function gonderBir(uid: string, id: string, h: Record<string, unknown>): void {
  const a = anahtar(uid, id);
  if (onaylanan.has(a) || ucusta.has(a)) return;
  ucusta.add(a);
  update(dbRef(kullaniciDb), h)
    .then(() => {
      ucusta.delete(a);
      islenmeyiBekle(uid, id, a);
    })
    .catch((e: { code?: string }) => {
      ucusta.delete(a);
      // Ret iki sebepten olabilir: olay zaten var (önceki gönderim ulaşmış) ya da yazmanın bir yolu
      // kurala takıldı. Yalnız olay DB'de GERÇEKTEN varsa düş; yoksa kalır (sessiz kayıp olmasın).
      if (e?.code === "PERMISSION_DENIED" && auth.currentUser?.uid === uid) {
        get(dbRef(kullaniciDb, `users/${uid}/olaylar/${id}/ts`))
          .then((s) => {
            if (s.exists()) dus(a);
            else sessizHata("olayReddedildi", e);
          })
          .catch((e2) => sessizHata("olayGonder", e2));
      } else sessizHata("olayGonder", e);
    });
}

/**
 * `olaylar/{id}/islendi` görülünce düşer — o ana kadar ana ekran tahmini sürer (gerçek değer gelince
 * bindirme kalkar, puan bir an geri inmez). Sunucu bu sekmede hiç işlemezse girdi kalır; sonraki
 * açılışta yeniden gönderilir → kural reddeder → düşer.
 */
function islenmeyiBekle(uid: string, id: string, a: string): void {
  if (onaylanan.has(a)) return;
  onaylanan.add(a);
  tekSeferlikDinle(`users/${uid}/olaylar/${id}/islendi`, (v) => v != null, () => dus(a), () => { onaylanan.delete(a); });
}

/**
 * [kosul] sağlanana kadar dinler, sağlanınca bırakıp [tamam]'ı çağırır. Önbellekteki değer onValue
 * dönmeden (eşzamanlı) gelebilir — bırakma fonksiyonu o an henüz yoktur, sonradan bırakılır.
 */
function tekSeferlikDinle(
  yol: string, kosul: (v: unknown) => boolean, tamam: (v: unknown) => void, hata: () => void
): () => void {
  let bitti = false;
  let birak: (() => void) | null = null;
  const kapat = () => { bitti = true; birak?.(); };
  birak = onValue(
    dbRef(kullaniciDb, yol),
    (s) => { const v = s.val(); if (bitti || !kosul(v)) return; kapat(); tamam(v); },
    () => { if (bitti) return; kapat(); hata(); }
  );
  if (bitti) birak();
  return kapat;
}

/** Girişli kullanıcının kutudakilerini yeniden gönderir; ömrü dolanları atar. */
export function kutuyuGonder(uid: string): void {
  const simdi = Date.now();
  for (const a of depoAnahtarlari(uid)) {
    const g = depoOku(a);
    if (!g || simdi - (g.ts ?? 0) > KUTU_OMUR_MS) { depoSil(a); continue; }
    gonderBir(uid, a.slice(`${ONEK}${uid}/`.length), g.h);
  }
}

/** Girişte (OturumSaglayici): gönder + bağlantı her gelişinde yeniden gönder. Dönüş = bırak. */
export function kutuyuIzle(uid: string): () => void {
  return onValue(dbRef(kullaniciDb, ".info/connected"), (s) => {
    bagli = s.val() === true;
    if (bagli) kutuyuGonder(uid);
  });
}

/* ------------------------------------------------------------------ okuyucular */

/** Kutuda bekleyen (sunucunun henüz işlemediği) olaylar — ts sırasıyla. Yerel tahmin bunları bindirir (§8.2). */
export function bekleyenler(uid: string): Bekleyen[] {
  const out: Bekleyen[] = [];
  for (const a of depoAnahtarlari(uid)) {
    const id = a.slice(`${ONEK}${uid}/`.length);
    const g = depoOku(a);
    const olay = g?.h[`users/${uid}/olaylar/${id}`] as Olay | undefined;
    if (olay && typeof olay === "object") out.push({ id, olay, xp: typeof g!.x === "number" ? g!.x : 0 });
  }
  return out.sort((p, q) => (p.olay.ts ?? 0) - (q.olay.ts ?? 0));
}

/** Bekleyen olayların [sinif] için kesin tahmini XP toplamı (ana ekran puanı, §8.2). */
export function bekleyenXp(uid: string, sinif: number): number {
  return bekleyenler(uid).filter((b) => b.olay.sinif === sinif).reduce((t, b) => t + b.xp, 0);
}

/**
 * Sunucunun `olaylar/{id}/sonuc`'unu en çok [ms] bekler; gelmezse null (ekran yerel tahminle kalır).
 * Bağlı değilken beklemez.
 */
export function sonucBekle(uid: string, id: string, ms: number): Promise<Record<string, unknown> | null> {
  if (!bagli) return Promise.resolve(null);
  return new Promise((coz) => {
    const z = setTimeout(() => { birak(); coz(null); }, ms);
    const birak = tekSeferlikDinle(
      `users/${uid}/olaylar/${id}/sonuc`,
      (v) => typeof v === "object" && v !== null,
      (v) => { clearTimeout(z); coz(v as Record<string, unknown>); },
      () => { clearTimeout(z); coz(null); }
    );
  });
}

/** Hesap silme: o kullanıcının bekleyenleri silinen veriyi yeniden oluşturmasın. */
export function kutuKullaniciyiSil(uid: string): void {
  for (const a of depoAnahtarlari(uid)) { onaylanan.delete(a); depoSil(a); }
  degisti();
}
