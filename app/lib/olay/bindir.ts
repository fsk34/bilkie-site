// Kutuda bekleyen olayların EKRANA bindirilmesi — şartname §8.2 (Android YerelMotor.seriBindir +
// OlayKutusu.tahminiXp karşılığı). Hiçbir şey YAZMAZ: canlı (ya da hatırlanan) düğüm değerlerine,
// sunucunun henüz işlemediği olaylar sunucu motorunun kendisiyle uygulanır. Sunucu işleyince olay
// kutudan düşer ve canlı değer zaten yenidir (sunucu etkileri + `islendi` tek yazmada).

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { onValue, ref as dbRef } from "firebase/database";
import { gorevKatalogDb, kullaniciDb } from "../firebase";
import { onbellekli } from "../onbellek";
import { hatirlananDeger } from "../canli";
import { tavanli } from "../hata";
import { bekleyenler, bekleyenYazmalar, kutuAbone, kutuSurumu, type BekleyenYazma } from "./kutu";
import { dogrula } from "./motor/dogrula";
import { katalogSec } from "./motor/gorev";
import { isle, okumaPlani } from "./motor/motor";
import { dugum, tamSayi, type Dugum } from "./motor/sayi";
import { istanbulGunu } from "./motor/tarih";
import { artirMi, type Olay } from "./motor/tipler";

export type SiraliOlay = { o: Olay; eski: boolean };

/** Önbellekten anında döner; dönmezse (çevrimdışı, önbellekte yok) bu kadar sonra vazgeçilir. */
const OKUMA_MS = 1500;

/* ------------------------------------------------------------------ okuma */

/** RTDB tam sayı anahtarlı düğümleri dizi döndürebilir → nesneye (yerel ağaca yazılabilsin). */
export function nesnele(v: unknown): unknown {
  if (Array.isArray(v) || (typeof v === "object" && v !== null)) {
    const o: Dugum = {};
    for (const [k, x] of Object.entries(dugum(v))) o[k] = nesnele(x);
    return o;
  }
  return v;
}

/**
 * Tek seferlik okuma; önbellekten anında döner. undefined = okunamadı.
 * Ağ/bellek dönmezse ekranların hatırladığı son değer (localStorage) kullanılır: sekme internetsiz
 * açılınca Firebase'in bellek önbelleği boştur, ama Görevler/ana ekran bu düğümleri daha önce
 * çizdiyse son değerleri cihazdadır. Bekleyen olaylar zaten üstüne uygulanır.
 */
export async function oku(db: typeof kullaniciDb, yol: string): Promise<unknown> {
  const v = await tavanli(
    new Promise<unknown>((coz, red) => {
      onValue(dbRef(db, yol), (s) => coz(nesnele(s.val())), red, { onlyOnce: true });
    }),
    OKUMA_MS
  ).catch(() => undefined);
  if (v !== undefined) return v;
  const h = hatirlananDeger(db, yol);
  return h.bulundu ? nesnele(h.veri) : undefined;
}

export type HamKatalog = { daily?: unknown; weekly?: unknown; monthly?: unknown };

/** Görev kataloğu ham düğümleri (içerik, değişmez) — sekme boyunca önbellekte. Okunamazsa null. */
export async function hamKatalog(): Promise<HamKatalog | null> {
  try {
    return await onbellekli("olay:katalog", async () => {
      const [daily, weekly, monthly] = await Promise.all(
        ["daily", "weekly", "monthly"].map((b) => oku(gorevKatalogDb, `taskCatalog/${b}`))
      );
      if (daily === undefined || weekly === undefined || monthly === undefined) throw new Error("katalog okunamadı");
      return { daily, weekly, monthly };
    }, { kalici: true });
  } catch {
    return null;
  }
}



/* ------------------------------------------------------------- yerel ağaç */

export function yoldanAl(kok: Dugum, yol: string): unknown {
  let v: unknown = kok;
  for (const p of yol.split("/")) {
    if (typeof v !== "object" || v === null) return undefined;
    v = (v as Dugum)[p];
  }
  return v;
}

export function yolaKoy(kok: Dugum, yol: string, deger: unknown): void {
  const parca = yol.split("/");
  let d = kok;
  for (const p of parca.slice(0, -1)) {
    if (typeof d[p] !== "object" || d[p] === null) d[p] = {};
    d = d[p] as Dugum;
  }
  d[parca[parca.length - 1]] = deger;
}

/** Okuma planında yer alıp yerel tahminde OKUNMAYAN anahtarlar (ekran bunları göstermez). */
export const OKUNMAYAN = (anahtar: string) => anahtar === "xp" || anahtar === "adim" || anahtar.startsWith("kova:");

/** Ham kutu girdileri → geçerli olaylar (sunucunun da kabul edeceği), ts sırasıyla. */
export function gecerliOlaylar(ham: Array<{ id: string; olay: unknown }>): SiraliOlay[] {
  const bugun = istanbulGunu(Date.now());
  const out: SiraliOlay[] = [];
  for (const { id, olay } of ham) {
    const d = dogrula(id, olay, bugun);
    if (d.tamam) out.push({ o: d.olay, eski: d.eski });
  }
  return out;
}

/**
 * Olayları sırayla motordan geçirir; her olayın yazacakları [kok]'a uygulanır (sonraki olay öncekinin
 * etkisini görür). [kok] YERİNDE değişir. Dönüş: son olayın motor çıktısı.
 */
export function motorZinciri(
  uid: string, kok: Dugum, olaylar: SiraliOlay[], hamK: HamKatalog | null
): ReturnType<typeof isle> | null {
  let cikti: ReturnType<typeof isle> | null = null;
  for (const { o, eski } of olaylar) {
    const katalog = hamK ? katalogSec(hamK, o.gun) : null;
    const okunan: Record<string, unknown> = {};
    for (const [a, y] of Object.entries(okumaPlani(uid, o, eski))) okunan[a] = OKUNMAYAN(a) ? undefined : yoldanAl(kok, y);
    cikti = isle(uid, o, eski, okunan, katalog, Date.now());
    for (const [y, v] of Object.entries(cikti.yazilacak)) {
      yolaKoy(kok, y, artirMi(v) ? tamSayi(yoldanAl(kok, y)) + v.artir : v);
    }
  }
  return cikti;
}

/**
 * Tek düğümün bindirilmiş hali: [ham] (canlı değer) [yol]'a konur, bekleyen olaylar uygulanır,
 * aynı yol geri okunur. Bekleyen yoksa [ham] aynen döner (nesne kimliği korunur).
 */
export function dugumBindir(
  uid: string, yol: string, ham: unknown, olaylar: SiraliOlay[], hamK: HamKatalog | null
): unknown {
  if (olaylar.length === 0) return ham;
  const kok: Dugum = {};
  // Motor girdiyi değiştirmesin diye kopya (canlı katmanın nesnesi paylaşılıyor)
  if (ham != null) yolaKoy(kok, yol, structuredClone(ham));
  motorZinciri(uid, kok, olaylar, hamK);
  return yoldanAl(kok, yol) ?? null;
}

/**
 * `users/{uid}/streak` + bekleyen olaylar (seri sayfası, seri özeti halkası). Ağ dönmezse ekranların
 * hatırladığı son değer; o da yoksa undefined (çağıran eski davranışına düşer).
 */
export async function seriOku(uid: string): Promise<unknown> {
  const yol = `users/${uid}/streak`;
  const ham = await oku(kullaniciDb, yol);
  if (ham === undefined) return undefined;
  return dugumBindir(uid, yol, ham, gecerliOlaylar(bekleyenler(uid)), null);
}

/**
 * İstemcinin kendi yazdığı DÜZ alanların bindirilmesi (web'e özgü): Firebase web SDK yazmayı yalnız
 * bellekte tutar — sekme internetsiz yeniden açılınca adım işareti (stepN), quiz_bitti, defter bitti
 * gibi alanlar canlı değerde yoktur, yalnız kutudadır. Kutudaki haritalardan [yol] altına düşen düz
 * değerler [ham]'ın kopyasına uygulanır (null = sil, sunucu zamanı = girdinin zamanı).
 * ARTIRMA ATLANIR: aynı sekmede SDK yazmayı zaten belleğe uygulamıştır, bir daha eklemek çift sayardı.
 * Bu yüzden yalnız tekrar uygulanması zararsız alanları okuyan ekranlar kullanır.
 */
export function istemciBindir(yazmalar: BekleyenYazma[], yol: string, ham: unknown): unknown {
  const on = `${yol}/`;
  let kok: Dugum | null = null;
  for (const { ts, h } of yazmalar) {
    for (const [tam, ham0] of Object.entries(h)) {
      if (!tam.startsWith(on)) continue;
      let v = ham0;
      if (typeof v === "object" && v !== null && ".sv" in v) {
        if ((v as { ".sv": unknown })[".sv"] !== "timestamp") continue;   // increment
        v = ts;
      }
      if (!kok) kok = { k: ham == null ? {} : structuredClone(nesnele(ham)) } as Dugum;
      const goreli = `k/${tam.slice(on.length)}`;
      if (v === null) {
        const parca = goreli.split("/");
        const ust = yoldanAl(kok, parca.slice(0, -1).join("/"));
        if (typeof ust === "object" && ust !== null) delete (ust as Dugum)[parca[parca.length - 1]];
      } else {
        yolaKoy(kok, goreli, v);
      }
    }
  }
  return kok ? kok.k : ham;
}

/* ------------------------------------------------------------------ kancalar */

/** Kutu her değiştiğinde artan sayı (bindirme memo'larının bağımlılığı). */
export function useKutuSurumu(): number {
  return useSyncExternalStore(kutuAbone, kutuSurumu, () => 0);
}

/** [ham] canlı değerinin kutudaki istemci düz alanlarıyla bindirilmiş hali (bkz. istemciBindir). */
export function useIstemciBindir<T>(uid: string | null | undefined, yol: string | null, ham: T): T {
  const surum = useKutuSurumu();
  return useMemo(() => {
    if (!uid || !yol || ham === null) return ham;
    const y = bekleyenYazmalar(uid);
    return y.length ? (istemciBindir(y, yol, ham) as T) : ham;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, yol, ham, surum]);
}

const BOS: SiraliOlay[] = [];

/**
 * [uid]'nin kutuda bekleyen geçerli olayları; kutu değişince yenilenir. Bekleyen yoksa sabit boş dizi
 * (bindirme yapan memo'lar boşuna yeniden hesaplanmasın).
 */
export function useBekleyenOlaylar(uid: string | null | undefined): SiraliOlay[] {
  const surum = useKutuSurumu();
  return useMemo(() => {
    if (!uid) return BOS;
    const l = gecerliOlaylar(bekleyenler(uid));
    return l.length ? l : BOS;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, surum]);
}

/** Görev kataloğu ham düğümleri (cihazda önbellekli); yalnız [gerekli] iken yüklenir. Okunamazsa null. */
export function useHamKatalog(gerekli: boolean): HamKatalog | null {
  const [k, setK] = useState<HamKatalog | null>(null);
  useEffect(() => {
    if (!gerekli || k) return;
    let iptal = false;
    hamKatalog().then((h) => { if (!iptal && h) setK(h); });
    return () => { iptal = true; };
  }, [gerekli, k]);
  return k;
}
