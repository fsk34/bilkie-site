"use client";

// Bilkie'ye özel veri kancaları. Mekanizma iki katmanda:
//   • `canli.tsx`          — paylaşımlı `onValue` abonelikleri (yol başına tek abonelik)
//   • `kullaniciVerisi.tsx` — YEREL ÖNCE kural: kullanıcının kendi verisi diske yazılır,
//                             ekran her zaman dolu açılır, `null` yalnız "bilinmiyor" demek
//
// Bu dosya yalnızca ANLAMI taşır: hangi yol, nasıl çözülür.
//
// Kova kuralı (bkz. reference-bilkie-web-veri-katmani):
//   kullanıcının kendi verisi → canlı + yerel önce (burada)
//   değişmeyen içerik         → `onbellek.ts`
//   derin detay ekranı        → doğrudan `veri.ts`, her açılışta taze

import { useEffect, useMemo, useState } from "react";
import { kullaniciDb } from "./firebase";
import { useCanli } from "./canli";
import { useKullanici, useKullaniciDugumleri, useKullaniciDugumu } from "./kullaniciVerisi";
import {
  aylikGorevDurumYolu,
  aylikGorevTanimlari,
  basarimYollari,
  basarimlariCoz,
  defterIlerlemeYollari,
  defterIlerlemesiCoz,
  gorevleriBirlestir,
  gunlukGorevDurumYolu,
  gunlukGorevTanimlari,
  haftalikGorevDurumYolu,
  haftalikGorevTanimlari,
  ligSatirlariCoz,
  ligTablosuYolu,
  profilCoz,
  profilYolu,
  rozetYolu,
  rozetleriCoz,
  testIlerlemeYolu,
  testIlerlemesiCoz,
  ustBilgiCoz,
  ustBilgiYollari,
  yaziliIlerlemeYolu,
  yaziliIlerlemesiCoz,
  type DefterDurumu,
  type Gorev,
  type GorevTanim,
  type LigSatiri,
  type Profil,
  type UstBilgi,
} from "./veri";

export { useKullanici } from "./kullaniciVerisi";

const BOS_UST: UstBilgi = { xp: 0, seri: 0, bugunAktif: false, can: 3 };

/* ------------------------------------------------------------- üst bilgi  */

/** XP / seri / can — sağ raydaki sayaçlar. */
export function useUstBilgi(sinif: number): UstBilgi | null {
  return useKullaniciDugumleri<UstBilgi>(
    kullaniciDb,
    (uid) => ustBilgiYollari(uid, sinif),
    (v) => ustBilgiCoz(v[0], v[1], v[2], v[3]),
    BOS_UST,
    4
  );
}

export function useProfil(): Profil | null {
  return useKullaniciDugumu<Profil | null>(kullaniciDb, profilYolu, profilCoz, null);
}

/* -------------------------------------------------------------- ilerleme  */
/* Sınıfın TAMAMI tek düğümden: liste ekranı ile ders içi ekran aynı aboneliği
   paylaşır. Test/defter/yazılı bitip düğüm yazılınca listeler kendiliğinden güncellenir. */

export function useTestIlerlemesi(sinif: number): Record<string, Record<string, number>> | null {
  return useKullaniciDugumu(
    kullaniciDb, (uid) => testIlerlemeYolu(uid, sinif), testIlerlemesiCoz, {}
  );
}

export function useDefterIlerlemesi(
  sinif: number
): Record<string, Record<string, DefterDurumu>> | null {
  return useKullaniciDugumleri(
    kullaniciDb,
    (uid) => defterIlerlemeYollari(uid, sinif),
    (v) => defterIlerlemesiCoz(v[0], v[1]),
    {},
    2
  );
}

export function useYaziliIlerlemesi(): Record<string, Record<string, number>> | null {
  return useKullaniciDugumu(kullaniciDb, yaziliIlerlemeYolu, yaziliIlerlemesiCoz, {});
}

/* ---------------------------------------------------- başarımlar/rozetler */

export function useBasarimlar(sinif: number): Record<string, number> | null {
  return useKullaniciDugumleri(
    kullaniciDb,
    (uid) => basarimYollari(uid, sinif),
    (v) => basarimlariCoz(v[0], v[1], v[2], v[3], v[4]),
    {},
    5
  );
}

export function useRozetler(): number[] | null {
  return useKullaniciDugumu<number[]>(kullaniciDb, rozetYolu, rozetleriCoz, []);
}

/* --------------------------------------------------------------- görevler */

export type GorevTuru = "gunluk" | "haftalik" | "aylik";

const GOREV_KAYNAKLARI: Record<GorevTuru, {
  tanimlar: () => Promise<GorevTanim[]>;
  yol: (uid: string) => string;
}> = {
  gunluk:   { tanimlar: gunlukGorevTanimlari,   yol: gunlukGorevDurumYolu },
  haftalik: { tanimlar: haftalikGorevTanimlari, yol: haftalikGorevDurumYolu },
  aylik:    { tanimlar: aylikGorevTanimlari,    yol: aylikGorevDurumYolu },
};

/** Görev TANIMLARI katalogdan (içerik, önbellekli); İLERLEME kullanıcının kendi verisi. */
export function useGorevler(tur: GorevTuru): Gorev[] | null {
  const kaynak = GOREV_KAYNAKLARI[tur];
  const [tanimlar, setTanimlar] = useState<GorevTanim[] | null>(null);

  useEffect(() => {
    let iptal = false;
    kaynak.tanimlar()
      .then((t) => { if (!iptal) setTanimlar(t); })
      .catch(() => { if (!iptal) setTanimlar([]); });
    return () => { iptal = true; };
  }, [kaynak]);

  const ilerleme = useKullaniciDugumu<Record<string, unknown>>(
    kullaniciDb, kaynak.yol, (ham) => (ham ?? {}) as Record<string, unknown>, {}
  );

  return useMemo(() => {
    if (tanimlar === null || ilerleme === null) return null;
    return gorevleriBirlestir(tanimlar, ilerleme);
  }, [tanimlar, ilerleme]);
}

export const useGunlukGorevler = () => useGorevler("gunluk");

/* -------------------------------------------------------------------- lig */

/**
 * Lig tablosu — BAŞKASININ değiştirdiği veri, o yüzden canlı ama YEREL ÖNCE değil:
 * eski sıralamayı göstermek yanlış olur, tablo gelene kadar boş kalır.
 * ⚠️ Ölçek: sınıftaki herkes bu düğümde; biri puan alınca tamamı tüm dinleyicilere iner.
 * Öğrenci sayısı büyürse ilk kısılacak yer burası (sayfalama / sunucu tarafı sıralama).
 */
export function useLigTablosu(sinif: number): LigSatiri[] | null {
  const { hazir, uid } = useKullanici();
  const { veri, yuklendi } = useCanli<unknown>(kullaniciDb, hazir && uid ? ligTablosuYolu(sinif) : null);
  return useMemo(() => {
    if (!hazir) return null;
    if (!uid) return [];
    if (!yuklendi) return null;
    return ligSatirlariCoz(veri, uid);
  }, [hazir, uid, veri, yuklendi]);
}
