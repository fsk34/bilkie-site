// Bitiş ekranının seri + görev özeti — şartname §8.2 (Android data/olay/OlayTahmin.kt karşılığı).
// Ekran sunucuyu beklemez. Android'den farkı: kuralların ayrı bir kopyası YOK — sunucunun karar motoru
// (motor/, scripts/motor_esitle.sh ile kopyalanır) burada önbellekteki verilerle AYNEN çalıştırılır.
//
//  1) Olayın okuma planındaki düğümler (görevler, seri, günlük bayraklar, ilk-kez işareti) okunur;
//     kutuda bekleyen ÖNCEKİ olaylar sırayla uygulanır (sunucu onları henüz işlemedi), sonra bu olay.
//  2) Aynı anda sunucunun `sonuc`'u beklenir; gelirse o kazanır.
// Okunamayan bölüm (çevrimdışı + önbellekte yok) gösterilmez — boş durumdan hesaplanmış yanlış
// sayı ("1 günlük seri") göstermektense özet atlanır.

import { onValue, ref as dbRef } from "firebase/database";
import { gorevKatalogDb, kullaniciDb } from "../firebase";
import { onbellekli } from "../onbellek";
import { hatirlananDeger } from "../canli";
import { tavanli } from "../hata";
import type { GorevDegisimi, GorevDonemi } from "../gorevYaz";
import { bekleyenler, sonucBekle, type Yazilan } from "./kutu";
import { dogrula } from "./motor/dogrula";
import { katalogSec } from "./motor/gorev";
import { isle, okumaPlani } from "./motor/motor";
import { dugum, tamSayi, type Dugum } from "./motor/sayi";
import { istanbulGunu } from "./motor/tarih";
import { artirMi, type Katalog, type Olay } from "./motor/tipler";

/** Önbellekten anında döner; dönmezse (çevrimdışı, önbellekte yok) bu kadar sonra vazgeçilir. */
const OKUMA_MS = 1500;
/** Sunucu sonucu beklemesi — okumalarla AYNI ANDA başlar; sonuç akışının 3 sn tavanına sığar. */
const SUNUCU_MS = 2500;

export type SeriOzeti = { sayi: number; maske: number; ilkBugun: boolean };
export type BitisOzeti = {
  seri: SeriOzeti | null;
  gorevler: GorevDegisimi[];
  /** Sunucunun ya da yerel motorun "ilk kez" kararı (defter, quiz, yazılı XP) */
  ilkKez?: boolean;
  sunucudan: boolean;
};

/* ------------------------------------------------------------------ okuma */

/** RTDB tam sayı anahtarlı düğümleri dizi döndürebilir → nesneye (yerel ağaca yazılabilsin). */
function nesnele(v: unknown): unknown {
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
async function oku(db: typeof kullaniciDb, yol: string): Promise<unknown> {
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

type HamKatalog = { daily?: unknown; weekly?: unknown; monthly?: unknown };

/** Görev kataloğu ham düğümleri (içerik, değişmez) — sekme boyunca önbellekte. Okunamazsa null. */
async function hamKatalog(): Promise<HamKatalog | null> {
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

function yoldanAl(kok: Dugum, yol: string): unknown {
  let v: unknown = kok;
  for (const p of yol.split("/")) {
    if (typeof v !== "object" || v === null) return undefined;
    v = (v as Dugum)[p];
  }
  return v;
}

function yolaKoy(kok: Dugum, yol: string, deger: unknown): void {
  const parca = yol.split("/");
  let d = kok;
  for (const p of parca.slice(0, -1)) {
    if (typeof d[p] !== "object" || d[p] === null) d[p] = {};
    d = d[p] as Dugum;
  }
  d[parca[parca.length - 1]] = deger;
}

/* ----------------------------------------------------------------- motor */

const OKUNMAYAN = (anahtar: string) => anahtar === "xp" || anahtar === "adim" || anahtar.startsWith("kova:");

function donemleri(k: Katalog): Map<string, { donem: GorevDonemi; baslik: string; xp: number }> {
  const m = new Map<string, { donem: GorevDonemi; baslik: string; xp: number }>();
  const ekle = (liste: Katalog["gunluk"], donem: GorevDonemi) => {
    for (const t of liste) if (!m.has(t.id)) m.set(t.id, { donem, baslik: t.title, xp: t.xp });
  };
  ekle(k.gunluk, "gunluk");
  ekle(k.haftalik, "haftalik");
  ekle(k.aylik, "aylik");
  return m;
}

/** Motorun / sunucunun görev farkları → sonuç ekranının satırları (başlık + dönem katalogdan). */
function gorevSatirlari(ham: unknown, k: Katalog | null, okunamayan: Set<GorevDonemi>): GorevDegisimi[] {
  if (!k) return [];
  const tanim = donemleri(k);
  const out: GorevDegisimi[] = [];
  for (const x of Object.values(dugum(ham))) {
    const f = dugum(x);
    const id = typeof f.id === "string" ? f.id : "";
    const t = tanim.get(id);
    if (!t || okunamayan.has(t.donem)) continue;
    out.push({
      id, baslik: t.baslik, xp: t.xp, donem: t.donem,
      onceki: tamSayi(f.onceki), yeni: tamSayi(f.yeni), hedef: tamSayi(f.hedef),
      // Motor tamamlanmış görevi atlar → farkta "bitti" = bu olayla YENİ bitti
      yeniBitti: f.bitti === true,
    });
  }
  return out;
}

/**
 * Yerel tahmin: [yazilan] + kutuda bekleyen önceki olaylar, sunucu motoruyla.
 * Okumalar sunucu bu olayı işlemeden önceki durumu görmeli — bitişte HEMEN çağrılır.
 */
async function yerelTahmin(uid: string, yazilan: Yazilan, katalogSoz: Promise<HamKatalog | null>): Promise<BitisOzeti | null> {
  const bugun = istanbulGunu(Date.now());
  const sira = [
    ...bekleyenler(uid).filter((b) => b.id !== yazilan.id).map((b) => ({ id: b.id, ham: b.olay as unknown })),
    { id: yazilan.id, ham: yazilan.olay as unknown },
  ];
  const olaylar: Array<{ o: Olay; eski: boolean }> = [];
  for (const { id, ham } of sira) {
    const d = dogrula(id, ham, bugun);
    if (d.tamam) olaylar.push({ o: d.olay, eski: d.eski });
  }
  const son = olaylar[olaylar.length - 1];
  if (!son || son.o.id !== yazilan.id) return null;   // bu olay geçersiz: sunucu da reddeder

  // Bütün planların yolları tek seferde, paralel
  const yollar = new Set<string>();
  for (const { o, eski } of olaylar) {
    for (const [a, y] of Object.entries(okumaPlani(uid, o, eski))) if (!OKUNMAYAN(a)) yollar.add(y);
  }
  const kok: Dugum = {};
  const okunamayanYol = new Set<string>();
  const [hamK] = await Promise.all([
    katalogSoz,
    ...[...yollar].map(async (y) => {
      const v = await oku(kullaniciDb, y);
      if (v === undefined) okunamayanYol.add(y);
      else if (v !== null) yolaKoy(kok, y, v);
    }),
  ]);

  let cikti: ReturnType<typeof isle> | null = null;
  let katalog: Katalog | null = null;
  for (const { o, eski } of olaylar) {
    katalog = hamK ? katalogSec(hamK, o.gun) : null;
    const okunan: Record<string, unknown> = {};
    for (const [a, y] of Object.entries(okumaPlani(uid, o, eski))) okunan[a] = OKUNMAYAN(a) ? undefined : yoldanAl(kok, y);
    cikti = isle(uid, o, eski, okunan, katalog, Date.now());
    // Sonraki olay bu olayın etkilerini görsün
    for (const [y, v] of Object.entries(cikti.yazilacak)) {
      yolaKoy(kok, y, artirMi(v) ? tamSayi(yoldanAl(kok, y)) + v.artir : v);
    }
  }
  if (!cikti) return null;

  const plan = okumaPlani(uid, son.o, son.eski);
  const okunamadi = (a: string) => plan[a] !== undefined && okunamayanYol.has(plan[a]);
  const okunamayanDonem = new Set<GorevDonemi>();
  if (okunamadi("gorevGunluk")) okunamayanDonem.add("gunluk");
  if (okunamadi("gorevHaftalik")) okunamayanDonem.add("haftalik");
  if (okunamadi("gorevAylik")) okunamayanDonem.add("aylik");

  const s = cikti.sonuc;
  return {
    seri: s.seri && !okunamadi("seri") ? { sayi: s.seri.sayi, maske: s.seri.maske, ilkBugun: s.seri.ilkBugun } : null,
    gorevler: gorevSatirlari(s.gorevler, katalog, okunamayanDonem),
    ilkKez: okunamadi("isaret") ? undefined : s.ilkKez,
    sunucudan: false,
  };
}

/** Sunucunun `olaylar/{id}/sonuc` düğümü → özet. Reddedilen olay (`hata`) → null. */
function sunucuOzeti(sonuc: Record<string, unknown>, katalog: Katalog | null): BitisOzeti | null {
  if (sonuc.hata != null) return null;
  const s = sonuc.seri == null ? null : dugum(sonuc.seri);
  return {
    seri: s ? { sayi: tamSayi(s.sayi), maske: tamSayi(s.maske), ilkBugun: s.ilkBugun === true } : null,
    gorevler: gorevSatirlari(sonuc.gorevler, katalog, new Set()),
    ilkKez: typeof sonuc.ilkKez === "boolean" ? sonuc.ilkKez : undefined,
    sunucudan: true,
  };
}

/**
 * Bitiş özeti: yerel tahmin ile sunucu sonucu AYNI ANDA başlar; sunucu sonucu gelirse o kazanır.
 * Hata fırlatmaz; hiçbiri yoksa boş özet.
 */
export async function bitisOzeti(uid: string, yazilan: Yazilan): Promise<BitisOzeti> {
  const katalogSoz = hamKatalog();
  const [yerel, sunucu, hamK] = await Promise.all([
    yerelTahmin(uid, yazilan, katalogSoz).catch(() => null),
    sonucBekle(uid, yazilan.id, SUNUCU_MS).catch(() => null),
    katalogSoz,
  ]);
  const katalog = hamK ? katalogSec(hamK, yazilan.olay.gun) : null;
  return (sunucu && sunucuOzeti(sunucu, katalog)) ?? yerel ?? { seri: null, gorevler: [], sunucudan: false };
}
