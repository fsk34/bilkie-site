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
import { quizBitenlerYolu, quizBitenleriCoz, quizHamBirlestir, quizIstemciYolu } from "./quiz";
import { useKullanici, useKullaniciDugumleri, useKullaniciDugumu } from "./kullaniciVerisi";
import { dugumBindir, useBekleyenOlaylar, useHamKatalog, useIstemciBindir, useKutuSurumu } from "./olay/bindir";
import { bekleyenXp } from "./olay/kutu";
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
  sinifSinirla,
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

/**
 * XP / seri / can — sağ raydaki sayaçlar.
 * Olay modu (§8.2): kutuda bekleyen (sunucunun henüz işlemediği) olaylar bindirilir — puana ekranın
 * kesin bildiği XP (görev XP'si hariç, Android tahminiXp), seriye motorun kararı. İnternetsiz biten
 * test ana ekranda hemen görünür; sunucu işleyince olay kutudan düşer, canlı değer zaten yenidir.
 */
export function useUstBilgi(sinif: number): UstBilgi | null {
  const ham = useKullaniciDugumleri<unknown[] | null>(
    kullaniciDb,
    (uid) => ustBilgiYollari(uid, sinif),
    (v) => v,
    null,
    4
  );
  const { hazir, uid } = useKullanici();
  const bekleyen = useBekleyenOlaylar(uid);
  return useMemo(() => {
    if (!hazir) return null;          // kimlik çözülmedi → bilinmiyor
    if (!uid) return BOS_UST;         // misafir
    if (ham === null) return null;    // bu cihazda ilk açılış, ilk cevap gelmedi
    if (bekleyen.length === 0) return ustBilgiCoz(ham[0], ham[1], ham[2], ham[3]);
    const seri = dugumBindir(uid, `users/${uid}/streak`, ham[2], bekleyen, null);
    const u = ustBilgiCoz(ham[0], ham[1], seri, ham[3]);
    return { ...u, xp: u.xp + bekleyenXp(uid, sinifSinirla(sinif)) };
  }, [hazir, ham, uid, bekleyen, sinif]);
}

/**
 * users/{uid}/streak CANLI + kutuda bekleyen olaylar (Android 08bff20 seri sayfası): olay modunda seriyi
 * sunucu sonradan yazar, tek okuma bayat kalıyordu; internetsiz bitirilen iş bugünü hemen renklendirir.
 * Üst bilgiyle aynı abonelik. `null` = bilinmiyor.
 */
export function useSeriDugumu(): Record<string, unknown> | null {
  const r = useKullaniciDugumu<{ h: unknown }>(kullaniciDb, (uid) => `users/${uid}/streak`, (h) => ({ h }), { h: null });
  const { uid } = useKullanici();
  const bekleyen = useBekleyenOlaylar(uid);
  return useMemo(() => {
    if (r === null) return null;
    const h = uid && bekleyen.length ? dugumBindir(uid, `users/${uid}/streak`, r.h, bekleyen, null) : r.h;
    return (h ?? {}) as Record<string, unknown>;
  }, [r, uid, bekleyen]);
}

export function useProfil(): Profil | null {
  return useKullaniciDugumu<Profil | null>(kullaniciDb, profilYolu, profilCoz, null);
}

/* -------------------------------------------------------------- ilerleme  */
/* Sınıfın TAMAMI tek düğümden: liste ekranı ile ders içi ekran aynı aboneliği
   paylaşır. Test/defter/yazılı bitip düğüm yazılınca listeler kendiliğinden güncellenir. */

/**
 * Kullanıcı düğümünün HAM değeri + kutudaki istemci düz alanları (olay/bindir.ts istemciBindir).
 * `null` = bilinmiyor; `{ h }` = biliniyor (h düğüm değeri, boş olabilir).
 */
function useHamBindirilmis(yolUret: (uid: string) => string): { h: unknown } | null {
  const r = useKullaniciDugumu<{ h: unknown }>(kullaniciDb, yolUret, (h) => ({ h }), { h: null });
  const { uid } = useKullanici();
  const h = useIstemciBindir(uid, uid ? yolUret(uid) : null, r ? r.h : null);
  return useMemo(() => (r === null ? null : { h }), [r, h]);
}

export function useTestIlerlemesi(sinif: number): Record<string, Record<string, number>> | null {
  const r = useHamBindirilmis((uid) => testIlerlemeYolu(uid, sinif));
  return useMemo(() => (r === null ? null : testIlerlemesiCoz(r.h)), [r]);
}

/** Ana ekranın "Kaldığın yer" kartı: progress_test + progress_defter (abonelikler paylaşılır), farklı çözüm. */
export function useSonDokunulan(sinif: number): SonDokunulan | null | undefined {
  // `undefined` = bilinmiyor (kimlik/ilk açılış); `null` = biliniyor, hiç dokunulmamış.
  const t = useHamBindirilmis((uid) => testIlerlemeYolu(uid, sinif));
  const d = useHamBindirilmis((uid) => defterIlerlemeYollari(uid, sinif)[0]);
  return useMemo(() => (t === null || d === null ? undefined : sonDokunulanCoz(t.h, d.h)), [t, d]);
}

export function useDefterIlerlemesi(
  sinif: number
): Record<string, Record<string, DefterDurumu>> | null {
  // Kutudaki istemci alanları (currentPage, bitti) bindirilir — internetsiz biten defter yenilenince de bitmiş
  const pd = useHamBindirilmis((uid) => defterIlerlemeYollari(uid, sinif)[0]);
  const pdd = useHamBindirilmis((uid) => defterIlerlemeYollari(uid, sinif)[1]);
  return useMemo(() => (pd === null || pdd === null ? null : defterIlerlemesiCoz(pd.h, pdd.h)), [pd, pdd]);
}

/**
 * ders → ünite → true. Ana ekranın Devam Et zinciri (Defter → testler → Quiz) ve öneri kutusu.
 * quiz_done (sunucunun ilk-kez işareti) ∪ quiz_bitti (olay modunda istemcinin alanı, internetsiz de anında).
 */
export function useQuizBitenler(sinif: number): Record<string, Record<string, boolean>> | null {
  const sunucu = useHamBindirilmis((uid) => quizBitenlerYolu(uid, sinif));
  const istemci = useHamBindirilmis((uid) => quizIstemciYolu(uid, sinif));
  return useMemo(
    () => (sunucu === null || istemci === null ? null : quizBitenleriCoz(quizHamBirlestir(sunucu.h, istemci.h))),
    [sunucu, istemci]
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

/**
 * Defter kartı için üç ham düğüm (progress_defter · progress_defter_done · quiz_done ∪ quiz_bitti) —
 * abonelikler diğer hook'larla paylaşılır; kutudaki istemci alanları bindirilir.
 */
export function useDefterKartiHam(sinif: number): [unknown, unknown, unknown] | null {
  const pd = useHamBindirilmis((uid) => defterIlerlemeYollari(uid, sinif)[0]);
  const pdd = useHamBindirilmis((uid) => defterIlerlemeYollari(uid, sinif)[1]);
  const qd = useHamBindirilmis((uid) => quizBitenlerYolu(uid, sinif));
  const qb = useHamBindirilmis((uid) => quizIstemciYolu(uid, sinif));
  return useMemo(
    () => (pd === null || pdd === null || qd === null || qb === null ? null
      : [pd.h, pdd.h, quizHamBirlestir(qd.h, qb.h)] as [unknown, unknown, unknown]),
    [pd, pdd, qd, qb]
  );
}

export function useYaziliIlerlemesi(sinif: number): Record<string, Record<string, number>> | null {
  const r = useHamBindirilmis((uid) => yaziliIlerlemeYolu(uid, sinif));
  return useMemo(() => (r === null ? null : yaziliIlerlemesiCoz(r.h)), [r]);
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

  const canli = useKullaniciDugumu<Record<string, unknown>>(
    kullaniciDb, kaynak.yol, (ham) => (ham ?? {}) as Record<string, unknown>, {}
  );
  // Olay modu (§8.2): bekleyen olayların görev ilerlemesi sunucu motoruyla bindirilir
  const { uid } = useKullanici();
  const bekleyen = useBekleyenOlaylar(uid);
  const hamK = useHamKatalog(bekleyen.length > 0);
  const ilerleme = useMemo(() => {
    if (canli === null || !uid || bekleyen.length === 0 || !hamK) return canli;
    return (dugumBindir(uid, kaynak.yol(uid), canli, bekleyen, hamK) ?? {}) as Record<string, unknown>;
  }, [canli, uid, bekleyen, hamK, kaynak]);

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
  const kutuSurumu = useKutuSurumu();
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
    const satirlar = ligSatirlariCoz(veri, uid, lig, benim);
    // Kendi satırında bekleyen kesin XP (Android d33defe): görünen puan ve sıra onunla
    const bek = bekleyenXp(uid, sinifSinirla(sinif));
    if (bek <= 0) return satirlar;
    const yeni = satirlar.map((s) => (s.sensin && !s.disarida ? { ...s, bekleyen: bek } : s));
    const gorunen = (s: LigSatiri) => s.puan + (s.bekleyen ?? 0);
    yeni.sort((a, b) =>
      Number(!!a.disarida) - Number(!!b.disarida) ||
      (gorunen(a) !== gorunen(b) ? gorunen(b) - gorunen(a) : a.ad < b.ad ? -1 : a.ad > b.ad ? 1 : 0));
    return yeni.map((s, i) => ({ ...s, sira: i + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hazir, uid, veri, yuklendi, lig, profil, ust, sinif, kutuSurumu]);
}
