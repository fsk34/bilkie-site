"use client";

// Canlı veri katmanı — Firebase RTDB `onValue` aboneliklerini PAYLAŞTIRIR.
//
// Neden: aynı düğümü birden çok bileşen isteyebiliyor (sağ raydaki sayaç + Profil ekranı
// ikisi de XP'yi okuyor). Burada yol başına TEK abonelik açılır, sonuç tüm dinleyicilere
// dağıtılır. Son abone ayrılınca abonelik hemen kapanmaz: ekranlar arası gezinirken
// açıp kapamamak için BEKLEME_MS kadar açık kalır.
//
// Hangi veri canlı dinlenir? Sürekli ekranda duran ya da BAŞKASININ değiştirdiği veri:
// sağ raydaki sayaçlar, görev ilerlemesi, lig tablosu, profil. Değişmeyen içerik
// (sorular, defter sayfaları, katalog) `onbellek.ts`e, derin detay ekranları ise
// her açılışta taze okumaya bırakılır.

import { onValue, ref as dbRef, type Database } from "firebase/database";
import { VERITABANI_ADLARI } from "./firebase";
import { useMemo, useSyncExternalStore } from "react";

const BEKLEME_MS = 30_000;

export type CanliDurum<T> = { veri: T | null; yuklendi: boolean };

const BOS: CanliDurum<never> = { veri: null, yuklendi: false };

type Kayit = {
  durum: CanliDurum<unknown>;
  aboneler: Set<() => void>;
  kapat: () => void;
  zamanlayici: number | null;
};

const kayitlar = new Map<string, Kayit>();

/* ------------------------------------------------ son bilinen değer (ilk çizim) */
/* Sunucudan cevap gelene kadar ekranın BOŞ çizilmemesi için son bilinen değer bu
   cihazda saklanır ve ilk çizimde kullanılır. Önbellek DEĞİL: canlı değer birkaç yüz
   ms içinde gelip üstüne yazıyor; amaç yalnızca "0'dan doluyor" titremesini önlemek. */
const HATIRLA_ONEK = "bk-son:";

function hatirlananOku(anahtar: string): { bulundu: boolean; veri: unknown } {
  if (typeof window === "undefined") return { bulundu: false, veri: null };
  try {
    const ham = window.localStorage.getItem(HATIRLA_ONEK + anahtar);
    if (ham === null) return { bulundu: false, veri: null };
    return { bulundu: true, veri: JSON.parse(ham) };
  } catch {
    return { bulundu: false, veri: null };
  }
}

function hatirlananYaz(anahtar: string, veri: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(HATIRLA_ONEK + anahtar, JSON.stringify(veri));
  } catch {
    /* kota dolabilir ya da özel kip olabilir — hatırlamadan da çalışır */
  }
}

/** Çıkışta çağrılır: başka kullanıcı aynı tarayıcıda eski değerleri görmesin. */
export function hatirlananlariUnut(): void {
  if (typeof window === "undefined") return;
  try {
    for (const a of Object.keys(window.localStorage)) {
      if (a.startsWith(HATIRLA_ONEK)) window.localStorage.removeItem(a);
    }
  } catch {
    /* yok say */
  }
}

// Database örneğine sabit bir ad ver (iç alanlarına dokunmadan).
const dbAdlari = new WeakMap<Database, string>();
let dbSayaci = 0;
function dbAdi(db: Database): string {
  // Sabit ad varsa onu kullan — hatırlanan değerin anahtarı açılış sırasına göre
  // DEĞİŞMEMELİ, yoksa localStorage'daki kayıt bir daha bulunamaz.
  const sabit = VERITABANI_ADLARI.get(db);
  if (sabit) return sabit;
  let ad = dbAdlari.get(db);
  if (!ad) {
    dbSayaci += 1;
    ad = `db${dbSayaci}`;
    dbAdlari.set(db, ad);
  }
  return ad;
}

function kayitAl(db: Database, yol: string, hatirla = false): Kayit {
  const anahtar = `${dbAdi(db)}|${yol}`;
  const mevcut = kayitlar.get(anahtar);
  if (mevcut) {
    if (mevcut.zamanlayici !== null) {
      window.clearTimeout(mevcut.zamanlayici);
      mevcut.zamanlayici = null;
    }
    return mevcut;
  }

  const kayit: Kayit = { durum: BOS, aboneler: new Set(), kapat: () => {}, zamanlayici: null };
  kayitlar.set(anahtar, kayit);

  // Son bilinen değer varsa ekran ONUNLA çizilir; canlı değer gelince üstüne yazar.
  if (hatirla) {
    const { bulundu, veri } = hatirlananOku(anahtar);
    if (bulundu) kayit.durum = { veri, yuklendi: true };
  }

  const yaz = (veri: unknown) => {
    kayit.durum = { veri, yuklendi: true };
    if (hatirla) hatirlananYaz(anahtar, veri);
    for (const bildir of kayit.aboneler) bildir();
  };

  kayit.kapat = onValue(
    dbRef(db, yol),
    (snap) => yaz(snap.val()),
    () => {
      // Kural reddi / bağlantı hatası. Hatırlanan bir değer varsa ONA DOKUNMA:
      // geçici kopukluk yüzünden dolu çubukları boşaltmak yanlış olur.
      if (kayit.durum.yuklendi && kayit.durum.veri != null) return;
      kayit.durum = { veri: null, yuklendi: true };
      for (const bildir of kayit.aboneler) bildir();
    }
  );
  return kayit;
}

function abone(db: Database, yol: string, bildir: () => void, hatirla = false): () => void {
  const kayit = kayitAl(db, yol, hatirla);
  kayit.aboneler.add(bildir);
  return () => {
    kayit.aboneler.delete(bildir);
    if (kayit.aboneler.size > 0) return;
    // Son abone gitti — hemen kapatma, gezinme sırasında geri gelebilir
    kayit.zamanlayici = window.setTimeout(() => {
      if (kayit.aboneler.size > 0) return;
      kayit.kapat();
      for (const [a, k] of kayitlar) if (k === kayit) kayitlar.delete(a);
    }, BEKLEME_MS);
  };
}

/** Teşhis: şu an açık olan abonelikler (yol → dinleyen bileşen sayısı). */
export function canliOzet(): { yol: string; dinleyen: number }[] {
  return [...kayitlar.entries()].map(([anahtar, k]) => ({
    yol: anahtar.slice(anahtar.indexOf("|") + 1),
    dinleyen: k.aboneler.size,
  }));
}

/**
 * Bir düğümü canlı dinler. `yol` null ise (ör. giriş yapılmamışsa) abone olmaz.
 * Dönen `durum` nesnesi yalnız veri değişince yenilenir — gereksiz render olmaz.
 */
export function useCanli<T = unknown>(
  db: Database, yol: string | null, secenekler: { hatirla?: boolean } = {}
): CanliDurum<T> {
  const hatirla = !!secenekler.hatirla;
  const kanca = useMemo(() => {
    if (!yol) {
      return {
        abone: () => () => {},
        oku: () => BOS as CanliDurum<T>,
      };
    }
    return {
      abone: (bildir: () => void) => abone(db, yol, bildir, hatirla),
      oku: () => kayitAl(db, yol, hatirla).durum as CanliDurum<T>,
    };
  }, [db, yol, hatirla]);

  // Sunucu tarafında abonelik yok; ilk çizim "yüklenmedi" durumuyla yapılır.
  return useSyncExternalStore(kanca.abone, kanca.oku, () => BOS as CanliDurum<T>);
}

/**
 * Birden çok yolu birlikte dinler (ör. üst bilgi 4 düğüm okur).
 * ⚠️ Yalnız KÜÇÜK ve sayısı sabit düğüm kümeleri için: değişiklik algılaması
 * JSON karşılaştırmasıyla yapılıyor. Lig tablosu gibi büyük düğümlerde `useCanli` kullan.
 * Kanca kuralları bozulmasın diye tek abonelik/tek anlık görüntü kullanılır — yol
 * sayısı değişse bile kanca sırası sabittir. Dönen dizi, düğümlerden biri değişene
 * kadar aynı nesnedir; `veri` alanı yollarla aynı sırada gelir.
 */
export function useCanliCoklu(
  db: Database, yollar: (string | null)[], secenekler: { hatirla?: boolean } = {}
): { veriler: unknown[]; yuklendi: boolean } {
  const imza = yollar.join("\u0000");
  const hatirla = !!secenekler.hatirla;

  const kanca = useMemo(() => {
    const gecerli = yollar.filter((y): y is string => !!y);
    let onbellek: { veriler: unknown[]; yuklendi: boolean } = { veriler: yollar.map(() => null), yuklendi: false };
    let imzaSon = "";

    const oku = () => {
      const veriler = yollar.map((y) => (y ? kayitAl(db, y, hatirla).durum.veri : null));
      const yuklendi = gecerli.length === 0 || gecerli.every((y) => kayitAl(db, y, hatirla).durum.yuklendi);
      // Anlık görüntü kimliği sabit kalsın; yoksa useSyncExternalStore sonsuz döner.
      const yeniImza = JSON.stringify(veriler) + String(yuklendi);
      if (yeniImza !== imzaSon) {
        imzaSon = yeniImza;
        onbellek = { veriler, yuklendi };
      }
      return onbellek;
    };

    // Sunucu anlık görüntüsü SABİT olmalı — her çağrıda yeni nesne dönerse React döngüye girer.
    const sunucuDurumu = { veriler: yollar.map(() => null as unknown), yuklendi: false };

    return {
      abone: (bildir: () => void) => {
        const birakmalar = gecerli.map((y) => abone(db, y, bildir, hatirla));
        return () => { for (const b of birakmalar) b(); };
      },
      oku,
      bos: () => sunucuDurumu,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, imza, hatirla]);

  return useSyncExternalStore(kanca.abone, kanca.oku, kanca.bos);
}
