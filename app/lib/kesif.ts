// Ana ekrandaki 4 keşif kutusunun veri katmanı — mobil uygulamayla AYNI yollar:
//   Atasözleri/Deyimler → atasozudeyimler : content/atasozleri_deyimler
//   Dünya Harikaları    → dunyaharikalari : dunyaHarikalari/categories
//   Meslek Grupları     → meslekler       : meslekler/{seviye}/categories
//   Türkiye'yi Keşfet   → turkiyeyikesfet : content/turkiyeyi_kesfet
//
// Uygulamadaki gibi her ekranın **bellek içi önbelleği** var (iOS: *Cache sınıfları):
// bir kez indirilen içerik ekranlar arası gidip gelirken yeniden indirilmez, ekran
// ilk karede dolu açılır (spinner yanıp sönmez). Sekme kapanınca sıfırlanır.

import { get, ref as dbRef, type DataSnapshot } from "firebase/database";
import { getDownloadURL, ref as storageRef } from "firebase/storage";
import {
  atasozDeyimlerDb,
  dunyaHarikalariDb,
  mesleklerDb,
  storage,
  turkiyeyiKesfetDb,
} from "./firebase";
import { onbellegeYaz, onbellekli, onbellektenOku } from "./onbellek";
import { gunAnahtari } from "./tarih";

function metin(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}
function tamsayi(v: unknown): number {
  if (typeof v === "number") return Math.trunc(v);
  if (typeof v === "string") { const n = Number.parseInt(v, 10); return Number.isNaN(n) ? 0 : n; }
  return 0;
}
/** RTDB sırasını koruyarak çocukları diziye alır (val() bazen dizi döndürüyor). */
function cocuklar(snap: DataSnapshot): DataSnapshot[] {
  const out: DataSnapshot[] = [];
  snap.forEach((c) => { out.push(c); });
  return out;
}

/* ------------------------------------------------------------- Storage adresi */

/** Storage yolunu indirilebilir adrese çevirir (iOS: urlCache).
    ⚠️ Adres erişim jetonu taşıdığı için YALNIZ bellekte tutulur, sessionStorage'a yazılmaz. */
export async function gorselAdresi(yol: string): Promise<string | null> {
  if (!yol) return null;
  return onbellekli(`storageAdres:${yol}`, async () => {
    try {
      return await getDownloadURL(storageRef(storage, yol));
    } catch {
      return null;
    }
  });
}

/* ------------------------------------------------------------ Meslek Grupları */

export type Meslek = { id: string; baslik: string; aciklama: string };

export const MESLEK_SEVIYELERI = [
  { key: "onlisans", ad: "Önlisans" },
  { key: "lisans", ad: "Lisans" },
] as const;
export const MESLEK_KATEGORILERI = ["Sağlık", "Teknoloji", "Tasarım", "İş", "Eğitim", "Hukuk"];

const meslekAnahtar = (seviye: string, kategori: string) => `meslek:${seviye}|${kategori}`;

export function mesleklerOnbellekten(seviye: string, kategori: string): Meslek[] | null {
  return onbellektenOku<Meslek[]>(meslekAnahtar(seviye, kategori), true);
}

/** meslekler/{seviye}/categories içinden başlığı `kategori` olan düğümün items'ı. */
export async function mesleklerGetir(seviye: string, kategori: string): Promise<Meslek[]> {
  try {
    const snap = await get(dbRef(mesleklerDb, `meslekler/${seviye}/categories`));
    const cikti: Meslek[] = [];
    for (const kat of cocuklar(snap)) {
      const baslik = metin(kat.child("title").val());
      if (baslik.toLocaleLowerCase("tr") !== kategori.toLocaleLowerCase("tr")) continue;
      for (const item of cocuklar(kat.child("items"))) {
        const t = metin(item.child("title").val());
        if (!t) continue;
        cikti.push({ id: item.key ?? String(cikti.length), baslik: t, aciklama: metin(item.child("meaning").val()) });
      }
    }
    cikti.sort((a, b) => a.baslik.localeCompare(b.baslik, "tr"));
    onbellegeYaz(meslekAnahtar(seviye, kategori), cikti, true);
    return cikti;
  } catch {
    return [];
  }
}

/* ----------------------------------------------------------- Dünya Harikaları */

export type Harika = {
  id: string; baslik: string; yer: string; gorsel: string; aciklama: string;
};
export type HarikaKategori = {
  id: string; baslik: string; ikon: string; ogeler: Harika[];
};

const HARIKA_ANAHTAR = "harikalar";
export function harikalarOnbellekten(): HarikaKategori[] | null {
  return onbellektenOku<HarikaKategori[]>(HARIKA_ANAHTAR, true);
}

export async function harikalariGetir(): Promise<HarikaKategori[]> {
  const snap = await get(dbRef(dunyaHarikalariDb, "dunyaHarikalari/categories"));
  const sonuc: HarikaKategori[] = [];
  for (const kat of cocuklar(snap)) {
    const ogeler: Harika[] = [];
    for (const item of cocuklar(kat.child("items"))) {
      ogeler.push({
        id: metin(item.child("id").val()) || (item.key ?? ""),
        baslik: metin(item.child("title").val()),
        yer: metin(item.child("location").val()),
        gorsel: metin(item.child("imageName").val()),
        aciklama: metin(item.child("description").val()),
      });
    }
    sonuc.push({
      id: metin(kat.child("id").val()) || (kat.key ?? ""),
      baslik: metin(kat.child("title").val()),
      ikon: metin(kat.child("iconImage").val()),
      ogeler,
    });
  }
  onbellegeYaz(HARIKA_ANAHTAR, sonuc, true);
  return sonuc;
}

/* --------------------------------------------------------- Türkiye'yi Keşfet */

export type KesfetYer = {
  id: string; baslik: string; nerede: string; neZaman: string;
  neden: string; ilginc: string; biliyorMuydun: string; gorsel: string;
};

const KESFET_ANAHTAR = "turkiyeyiKesfet";
export function kesfetOnbellekten(): KesfetYer[] | null {
  return onbellektenOku<KesfetYer[]>(KESFET_ANAHTAR, true);
}

/** content/turkiyeyi_kesfet: `order` varsa o sırayla, yoksa items'ın kendi sırasıyla. */
export async function kesfetGetir(): Promise<KesfetYer[]> {
  const kok = "content/turkiyeyi_kesfet";
  const [sira, ogeler] = await Promise.all([
    get(dbRef(turkiyeyiKesfetDb, `${kok}/order`)),
    get(dbRef(turkiyeyiKesfetDb, `${kok}/items`)),
  ]);

  const siraAnahtarlari: string[] = [];
  for (const c of cocuklar(sira)) {
    const k = metin(c.val());
    if (k) siraAnahtarlari.push(k);
  }
  const anahtarlar = siraAnahtarlari.length
    ? siraAnahtarlari
    : cocuklar(ogeler).map((c) => c.key ?? "").filter(Boolean);

  const liste: KesfetYer[] = [];
  for (const k of anahtarlar) {
    const d = ogeler.child(k);
    const baslik = metin(d.child("title").val());
    if (!baslik) continue;
    liste.push({
      id: k,
      baslik,
      nerede: metin(d.child("where").val()),
      neZaman: metin(d.child("when").val()),
      neden: metin(d.child("why").val()),
      ilginc: metin(d.child("funFact").val()),
      biliyorMuydun: metin(d.child("didYouKnow").val()),
      gorsel: metin(d.child("image").val()),
    });
  }
  onbellegeYaz(KESFET_ANAHTAR, liste, true);
  return liste;
}

/* ---------------------------------------------------- Atasözleri ve Deyimler */

export const TR_HARFLER = [
  "A","B","C","Ç","D","E","F","G","Ğ","H","I","İ","J","K","L","M",
  "N","O","Ö","P","R","S","Ş","T","U","Ü","V","Y","Z",
];

export type AdySayilari = { atasozleri: number; deyimler: number };
export type AdyOge = { id: string; metin: string; anlam: string };
export type AdyTur = "atasozleri" | "deyimler";

const ADY_KOK = "content/atasozleri_deyimler";

const ADY_SAYI_ANAHTAR = "adySayilari";
/** Önizleme GÜNE bağlı (günün atasözü) → anahtara gün girer, gece yarısı kendiliğinden tazelenir. */
const adyOnizlemeAnahtar = (harf: string) => `adyOnizleme:${gunAnahtari()}:${harf}`;
const adyListeAnahtar = (harf: string, tur: AdyTur) => `adyListe:${harf}|${tur}`;

export function adySayilariOnbellekten(): Record<string, AdySayilari> | null {
  return onbellektenOku<Record<string, AdySayilari>>(ADY_SAYI_ANAHTAR, true);
}
export function adyOnizlemeOnbellekten(harf: string) {
  return onbellektenOku<{ ata: AdyOge | null; dey: AdyOge | null }>(adyOnizlemeAnahtar(harf), true);
}
export function adyListeOnbellekten(harf: string, tur: AdyTur) {
  return onbellektenOku<AdyOge[]>(adyListeAnahtar(harf, tur), true);
}

export async function adySayilariniGetir(): Promise<Record<string, AdySayilari>> {
  const snap = await get(dbRef(atasozDeyimlerDb, `${ADY_KOK}/meta/counts`));
  const cikti: Record<string, AdySayilari> = {};
  for (const c of cocuklar(snap)) {
    if (!c.key) continue;
    cikti[c.key] = {
      atasozleri: tamsayi(c.child("atasozleri").val()),
      deyimler: tamsayi(c.child("deyimler").val()),
    };
  }
  onbellegeYaz(ADY_SAYI_ANAHTAR, cikti, true);
  return cikti;
}

/** Uygulamadaki günlük seçim: (harf sırası + tür + gün tohumu) % adet. */
export function adyGunlukIndeks(harf: string, tur: AdyTur, adet: number): number {
  if (adet <= 0) return 0;
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Istanbul" }).format(new Date());
  const tohum = Number(s.slice(0, 4)) * 10000 + Number(s.slice(5, 7)) * 100 + Number(s.slice(8, 10));
  const hi = Math.max(0, TR_HARFLER.indexOf(harf.toLocaleUpperCase("tr")));
  const ti = tur === "atasozleri" ? 0 : 100;
  return (hi + ti + tohum) % adet;
}

async function adyGunlukOge(harf: string, tur: AdyTur, adet: number): Promise<AdyOge | null> {
  if (adet <= 0) return null;
  try {
    const idx = adyGunlukIndeks(harf, tur, adet);
    const snap = await get(dbRef(atasozDeyimlerDb, `${ADY_KOK}/letters/${harf.toLocaleUpperCase("tr")}/${tur}`));
    const dogrudan = snap.child(String(idx));
    const oge = dogrudan.exists() ? dogrudan : cocuklar(snap)[idx];
    if (!oge) return null;
    const t = metin(oge.child("text").val());
    const m = metin(oge.child("meaning").val());
    if (!t || !m) return null;
    return { id: oge.key ?? String(idx), metin: t, anlam: m };
  } catch {
    return null;
  }
}

/** Seçili harfin günün atasözü + günün deyimi. */
export async function adyOnizlemeGetir(
  harf: string,
  sayilar: Record<string, AdySayilari>
): Promise<{ ata: AdyOge | null; dey: AdyOge | null }> {
  const hazir = adyOnizlemeOnbellekten(harf);
  if (hazir) return hazir;
  const s = sayilar[harf.toLocaleUpperCase("tr")] ?? { atasozleri: 0, deyimler: 0 };
  const [ata, dey] = await Promise.all([
    adyGunlukOge(harf, "atasozleri", s.atasozleri),
    adyGunlukOge(harf, "deyimler", s.deyimler),
  ]);
  const cift = { ata, dey };
  onbellegeYaz(adyOnizlemeAnahtar(harf), cift, true);
  return cift;
}

/** Bir harfin tüm atasözleri ya da deyimleri (anahtara göre sıralı). */
export async function adyListeGetir(harf: string, tur: AdyTur): Promise<AdyOge[]> {
  const anahtar = adyListeAnahtar(harf, tur);
  const hazir = onbellektenOku<AdyOge[]>(anahtar, true);
  if (hazir) return hazir;
  try {
    const snap = await get(dbRef(atasozDeyimlerDb, `${ADY_KOK}/letters/${harf.toLocaleUpperCase("tr")}/${tur}`));
    const cikti: AdyOge[] = [];
    for (const c of cocuklar(snap)) {
      const t = metin(c.child("text").val());
      const m = metin(c.child("meaning").val());
      if (!t || !m) continue;
      cikti.push({ id: c.key ?? String(cikti.length), metin: t, anlam: m });
    }
    cikti.sort((a, b) => a.id.localeCompare(b.id, "tr", { numeric: true }));
    onbellegeYaz(anahtar, cikti, true);
    return cikti;
  } catch {
    return [];
  }
}
