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
import { useCanli, useCanliSorgu } from "./canli";
import { tavanli } from "./hata";
import { sonDokunulanCoz, type SonDokunulan } from "./anaEkran";
import { quizBitenlerYolu, quizBitenleriCoz } from "./quiz";
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
  istatistikAgaciYolu,
  haftalikGorevTanimlari,
  ligBul,
  ligSatirlariCoz,
  ligSorgusu,
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

/** Ana ekranın "Kaldığın yer" kartı: progress_test + progress_defter (abonelikler paylaşılır), farklı çözüm. */
export function useSonDokunulan(sinif: number): SonDokunulan | null | undefined {
  // `undefined` = bilinmiyor (kimlik/ilk açılış); `null` = biliniyor, hiç dokunulmamış.
  const v = useKullaniciDugumleri<{ son: SonDokunulan | null }>(
    kullaniciDb,
    (uid) => [testIlerlemeYolu(uid, sinif), defterIlerlemeYollari(uid, sinif)[0]],
    (h) => ({ son: sonDokunulanCoz(h[0], h[1]) }),
    { son: null },
    2
  );
  return v === null ? undefined : v.son;
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

/** ders → ünite → true. Ana ekranın Devam Et zinciri (Defter → testler → Quiz) ve öneri kutusu. */
export function useQuizBitenler(sinif: number): Record<string, Record<string, boolean>> | null {
  return useKullaniciDugumu(
    kullaniciDb, (uid) => quizBitenlerYolu(uid, sinif), quizBitenleriCoz, {}
  );
}

/* ------------------------------------------------------------- istatistik */

/**
 * users/{uid}/stats/grade{N} ağacının tamamı — İstatistik ekranı ve Bilgie Koç bunu
 * dinler, sayıları veri.ts'teki saf `…Coz` çözücülerle türetir.
 *
 * Neden tek ağaç: eskiden 6 ayrı `get()` her açılışta ağa gidiyordu; test bitirip
 * dönünce sayı taze ama her dönüşte yükleniyor noktası vardı. Canlı abonelikte ilk
 * çizim son bilinen değerle (yerel önce), güncel değer arkadan gelir; test/defter/
 * quiz/yazılı bitince değişiklik kendiliğinden düşer — geçersizleştirme kodu yok.
 * Abonelik yalnız bu ekranlar açıkken yaşar (+30 sn), girmeyen kullanıcıya maliyet yok.
 * `null` = henüz bilinmiyor (çizme); `{}` = biliniyor, hiç veri yok.
 */
export function useIstatistikAgaci(sinif: number): Record<string, unknown> | null {
  return useKullaniciDugumu(
    kullaniciDb, (uid) => istatistikAgaciYolu(uid, sinif), (ham) => (ham ?? {}) as Record<string, unknown>, {}
  );
}

/** Defter kartı için üç ham düğüm (progress_defter · progress_defter_done · quiz_done) — abonelikler diğer hook'larla paylaşılır. */
export function useDefterKartiHam(sinif: number): [unknown, unknown, unknown] | null {
  return useKullaniciDugumleri(
    kullaniciDb,
    (uid) => [...defterIlerlemeYollari(uid, sinif), quizBitenlerYolu(uid, sinif)],
    (v) => [v[0], v[1], v[2]] as [unknown, unknown, unknown],
    [null, null, null],
    3
  );
}

export function useYaziliIlerlemesi(sinif: number): Record<string, Record<string, number>> | null {
  return useKullaniciDugumu(
    kullaniciDb, (uid) => yaziliIlerlemeYolu(uid, sinif), yaziliIlerlemesiCoz, {}
  );
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

/** Görev listesi + okuma durumu. `hata` = katalog okunamadı ("görev yok" ile karışmasın). */
export type GorevDurumu = { gorevler: Gorev[] | null; hata: boolean; tekrarDene: () => void };

/** Görev TANIMLARI katalogdan (içerik, önbellekli); İLERLEME kullanıcının kendi verisi. */
export function useGorevDurumu(tur: GorevTuru): GorevDurumu {
  const kaynak = GOREV_KAYNAKLARI[tur];
  // null = yükleniyor; "hata" = okunamadı (çevrimdışı / zaman aşımı) — Android TaskManager.okumaHatasi
  const [tanimlar, setTanimlar] = useState<GorevTanim[] | "hata" | null>(null);
  const [deneme, setDeneme] = useState(0);

  useEffect(() => {
    let iptal = false;
    tavanli(kaynak.tanimlar(), 8000).then((t) => { if (!iptal) setTanimlar(t ?? "hata"); });
    return () => { iptal = true; };
  }, [kaynak, deneme]);

  const ilerleme = useKullaniciDugumu<Record<string, unknown>>(
    kullaniciDb, kaynak.yol, (ham) => (ham ?? {}) as Record<string, unknown>, {}
  );

  return useMemo(() => {
    const tekrarDene = () => { setTanimlar(null); setDeneme((d) => d + 1); };
    if (tanimlar === "hata") return { gorevler: null, hata: true, tekrarDene };
    if (tanimlar === null || ilerleme === null) return { gorevler: null, hata: false, tekrarDene };
    return { gorevler: gorevleriBirlestir(tanimlar, ilerleme), hata: false, tekrarDene };
  }, [tanimlar, ilerleme]);
}

export function useGorevler(tur: GorevTuru): Gorev[] | null {
  return useGorevDurumu(tur).gorevler;
}

export const useGunlukGorevler = () => useGorevler("gunluk");

/* -------------------------------------------------------------------- lig */

/**
 * Lig tablosu — BAŞKASININ değiştirdiği veri, o yüzden canlı ama YEREL ÖNCE değil:
 * eski sıralamayı göstermek yanlış olur, tablo gelene kadar boş kalır.
 * 24 Eyl 2026 (Android LeagueScreen): yalnız KENDİ LİGİN sorgulanır — orderByChild("points") +
 * ligin aralığı + limitToLast(50), sunucuda süzülür. Lig, XP'den (ustBilgi: stats/xp düğümlerinin
 * büyüğü = lige yazılan kural) bulunur; XP bilinene kadar sorgu kurulmaz. XP eşiği geçip lig
 * değişince sorgu anahtarı değişir, abonelik yenilenir. Ligin dışındaysan "Sen" satırı "50+".
 */
export function useLigTablosu(sinif: number): LigSatiri[] | null {
  const { hazir, uid } = useKullanici();
  const ust = useUstBilgi(sinif);
  const profil = useProfil();
  const lig = ust ? ligBul(ust.xp) : null;
  const sorgu = useMemo(() => (lig ? ligSorgusu(lig) : null), [lig]);
  const { veri, yuklendi } = useCanliSorgu<unknown>(kullaniciDb, hazir && uid ? ligTablosuYolu(sinif) : null, sorgu);
  return useMemo(() => {
    if (!hazir) return null;
    if (!uid) return [];
    if (!lig || !yuklendi) return null;
    const benim = { ad: profil?.kullaniciAdi?.trim() || "Sen", avatar: profil?.avatar || "profil0", puan: ust?.xp ?? 0 };
    return ligSatirlariCoz(veri, uid, lig, benim);
  }, [hazir, uid, veri, yuklendi, lig, profil, ust]);
}
