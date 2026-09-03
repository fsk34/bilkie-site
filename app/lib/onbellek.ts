// İçerik önbelleği — DEĞİŞMEYEN veriler için.
//
// Kural: buraya yalnızca içerik girer (test soruları, defter sayfaları, görev katalogu,
// keşif veritabanları). Kullanıcının kendi verisi (XP, seri, görev ilerlemesi, lig)
// buraya GİRMEZ — o `canli.tsx`teki dinleyicilerle taşınır, yoksa "geçersizleştirmeyi
// unutma" hatası kaçınılmaz olur.
//
// İki katman:
//  1. Bellek — sayfa ömrü boyunca.
//  2. sessionStorage (`kalici: true`) — sekme yenilense de durur, sekme kapanınca gider.
//     Oturum bazlı olması bilinçli: farklı kullanıcı girerse eski içerik taşınmasın.

const ONEK = "bk:";

type Kayit = { veri: unknown; kalici: boolean };

const bellek = new Map<string, Kayit>();
/** Aynı anda iki bileşen aynı şeyi isterse tek istek atılsın diye. */
const ucusta = new Map<string, Promise<unknown>>();

function oturumdanOku(anahtar: string): { bulundu: boolean; veri: unknown } {
  if (typeof window === "undefined") return { bulundu: false, veri: null };
  try {
    const ham = window.sessionStorage.getItem(ONEK + anahtar);
    if (ham === null) return { bulundu: false, veri: null };
    return { bulundu: true, veri: JSON.parse(ham) };
  } catch {
    return { bulundu: false, veri: null };
  }
}

function oturumaYaz(anahtar: string, veri: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ONEK + anahtar, JSON.stringify(veri));
  } catch {
    /* kota dolabilir ya da özel kip olabilir — önbellek olmadan da çalışır */
  }
}

/**
 * `anahtar` için değeri döndürür; yoksa `uretici` çalıştırılıp saklanır.
 * `kalici` verilirse sekme yenilenmesine de dayanır (yalnız JSON'a çevrilebilen veri için).
 */
export async function onbellekli<T>(
  anahtar: string,
  uretici: () => Promise<T>,
  secenekler: { kalici?: boolean } = {}
): Promise<T> {
  const kayit = bellek.get(anahtar);
  if (kayit) return kayit.veri as T;

  if (secenekler.kalici) {
    const { bulundu, veri } = oturumdanOku(anahtar);
    if (bulundu) {
      bellek.set(anahtar, { veri, kalici: true });
      return veri as T;
    }
  }

  const bekleyen = ucusta.get(anahtar);
  if (bekleyen) return bekleyen as Promise<T>;

  const istek = uretici()
    .then((veri) => {
      bellek.set(anahtar, { veri, kalici: !!secenekler.kalici });
      if (secenekler.kalici) oturumaYaz(anahtar, veri);
      return veri;
    })
    .finally(() => { ucusta.delete(anahtar); });

  ucusta.set(anahtar, istek);
  return istek;
}

/**
 * Beklemeden bakış: değer hazırsa döner, değilse null.
 * Ekranların "önbellek sıcaksa listeyi anında göster, arkada tazele" davranışı için.
 */
export function onbellektenOku<T>(anahtar: string, kalici = false): T | null {
  const kayit = bellek.get(anahtar);
  if (kayit) return kayit.veri as T;
  if (!kalici) return null;
  const { bulundu, veri } = oturumdanOku(anahtar);
  if (!bulundu) return null;
  bellek.set(anahtar, { veri, kalici: true });
  return veri as T;
}

/** Dışarıda üretilmiş bir değeri önbelleğe koyar. */
export function onbellegeYaz(anahtar: string, veri: unknown, kalici = false): void {
  bellek.set(anahtar, { veri, kalici });
  if (kalici) oturumaYaz(anahtar, veri);
}

/** Ön ek verilirse o ön ekle başlayanları, verilmezse hepsini siler. */
export function onbellegiBosalt(onEk?: string): void {
  for (const anahtar of [...bellek.keys()]) {
    if (onEk && !anahtar.startsWith(onEk)) continue;
    const kayit = bellek.get(anahtar);
    bellek.delete(anahtar);
    if (kayit?.kalici && typeof window !== "undefined") {
      try { window.sessionStorage.removeItem(ONEK + anahtar); } catch { /* yok say */ }
    }
  }
  if (!onEk && typeof window !== "undefined") {
    try {
      for (const a of Object.keys(window.sessionStorage)) {
        if (a.startsWith(ONEK)) window.sessionStorage.removeItem(a);
      }
    } catch { /* yok say */ }
  }
}
