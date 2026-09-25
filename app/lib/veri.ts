// Web uygulamasının veri katmanı.
// Mobil uygulamayla AYNI Firebase yollarına yazar; semantik iOS/Android ile birebir:
//   XP     → users/{uid}/xp/grade{N}/total          (transaction, monoton artar)
//   Seri   → users/{uid}/streak                     (transaction, gün maskesi + count)
//   Test   → users/{uid}/progress_test/grade{N}/{ders}/{konu}
//   Can    → users/{uid}/lives                      (günlük 3'e sıfırlanır)
// Başarımlar, görevler ve istatistik kovaları da web'den YAZILIYOR (3 Eyl 2026):
//   ilerleme.ts · gorevYaz.ts · istatistikYaz.ts

import {
  endAt,
  get,
  limitToLast,
  orderByChild,
  ref as dbRef,
  runTransaction,
  serverTimestamp,
  set,
  startAt,
  update,
  type QueryConstraint,
} from "firebase/database";
import type { CanliSorgu } from "./canli";
import { defterlerDb, gorevKatalogDb, kelimeGezmeceDb, kullaniciDb, sudokuDb, testlerDb, wordleDb, yazililarDb } from "./firebase";
import { ayAnahtari, gunAnahtari, gunNo, dunMu, haftaGunIndeksi, seriyiCoz } from "./tarih";
import { onbellekli } from "./onbellek";
import { sessizHata, tavanli } from "./hata";
import { ligAnahtari, rozetYiliAnahtari } from "./sezon";
import { AY_ANAHTAR } from "./ayGorsel";
import {
  defterDersAnahtari,
  dizi,
  sayfalariCevir,
  sayi,
  type DefterBlok,
  type DefterSayfa,
} from "./defterBicim";

// Tipler eskiden burada tanımlıydı; dışarıdan bu dosyadan alanlar kırılmasın.
export type { DefterBlok, DefterSayfa };


export const XP_DOGRU_TEST = 2;      // iOS/Android: XpRules.testCorrectXp
export const ADIM_SAYISI = 3;        // her konu 3 adım (s1..s3)
export const CAN_LIMITI = 3;
export const ACT_TEST = 1 << 0;      // seri aktivite biti (iOS: ACT_TEST)

// Lig sezonu tarihe göre çözülür (XpManager.leagueSeasonKey → Sezon.ligAnahtari);
// her yazma/okuma anında hesaplanır ki dönem değişince sabit kalmasın.
const SEZON = () => ligAnahtari();

export function sinifSinirla(g: number): number {
  return Math.max(3, Math.min(8, Math.round(g || 3)));
}


/* ------------------------------------------------------------------ profil */

export type Profil = {
  adSoyad: string;
  kullaniciAdi: string;
  eposta: string;
  avatar: string;
  sinif: number;
  sinifEtiketi: string;
};

export const profilYolu = (uid: string) => `users/${uid}/profile`;

/** Ham profil düğümünü çözer (saf) — okuma ve canlı dinleme ortak kullanır. */
export function profilCoz(ham: unknown): Profil | null {
  if (ham == null) return null;
  const p = ham as Record<string, any>;
  const sinif = sinifSinirla(sayi(p.grade));
  return {
    adSoyad: p.fullName ?? p.name ?? "",
    kullaniciAdi: p.username ?? "",
    eposta: p.email ?? "",
    avatar: p.avatar ?? "profil0",
    sinif,
    sinifEtiketi: p.gradeLabel ?? `${sinif}. Sınıf`,
  };
}

export async function profilOku(uid: string): Promise<Profil | null> {
  const snap = await get(dbRef(kullaniciDb, profilYolu(uid)));
  return snap.exists() ? profilCoz(snap.val()) : null;
}

/* --------------------------------------------------------------- üst bilgi */

export type UstBilgi = { xp: number; seri: number; bugunAktif: boolean; can: number };

/** Üst bilginin okunduğu 4 düğüm — tek seferlik okuma da canlı dinleme de bunları kullanır. */
export function ustBilgiYollari(uid: string, sinif: number): string[] {
  const g = sinifSinirla(sinif);
  return [
    `users/${uid}/xp/grade${g}`,
    `users/${uid}/stats/grade${g}/score/totalXp`,
    `users/${uid}/streak`,
    `users/${uid}/lives`,
  ];
}

/** Ham düğümlerden üst bilgiyi türetir (saf) — okuma ve dinleme aynı mantığı paylaşsın diye. */
export function ustBilgiCoz(xpHam: unknown, statsHam: unknown, seriHam: unknown, canHam: unknown): UstBilgi {
  const xpNode = (xpHam ?? {}) as Record<string, unknown>;
  // iOS XpManager.ensureLoaded ile aynı: stats ve xp düğümlerinin BÜYÜĞÜ alınır
  const xp = Math.max(sayi(statsHam), sayi(xpNode.total), sayi(xpNode.totalXp), 0);

  const seriNode = (seriHam ?? {}) as Record<string, unknown>;
  const sonGun = (seriNode.lastDay as string | undefined) ?? null;
  const seri = seriyiCoz(sayi(seriNode.count), sonGun);

  const canNode = (canHam ?? {}) as Record<string, unknown>;
  const can =
    canNode.lastReset === gunAnahtari()
      ? Math.max(0, Math.min(CAN_LIMITI, sayi(canNode.remaining)))
      : CAN_LIMITI;

  return { xp, seri, bugunAktif: sonGun === gunAnahtari(), can };
}

export async function ustBilgiOku(uid: string, sinif: number): Promise<UstBilgi> {
  const [xp, stats, seri, can] = await Promise.all(
    ustBilgiYollari(uid, sinif).map((y) => get(dbRef(kullaniciDb, y)))
  );
  return ustBilgiCoz(xp.val(), stats.val(), seri.val(), can.val());
}

/* -------------------------------------------------------------------- can  */

/**
 * Canlarda TEK yazma yolu (Android LivesRepository.degistir, 24 Eyl 2026): transaction — gün
 * değiştiyse önce {3, 0, bugün}, sonra `delta` (yanlış: -1) 0..3 içinde; `odul` ise rewardedToday +1.
 * Mutlak değer YAZILMAZ → iki cihaz / bayat ekran değeri birbirini ezmez. Ateşle-unut: çevrimdışında
 * yerelde uygulanır (canlı dinleyici hemen görür), bağlantı gelince sunucuda yeniden koşar.
 * `delta = 0` → yalnız gün sıfırlaması (aynı günse yazma yok).
 */
export function canDegistir(uid: string, delta: number, odul = false): void {
  if (!uid) return;
  const bugun = gunAnahtari();
  const sinirla = (n: number) => Math.max(0, Math.min(CAN_LIMITI, n));
  runTransaction(dbRef(kullaniciDb, `users/${uid}/lives`), (mevcut) => {
    const d = { ...((mevcut ?? {}) as Record<string, unknown>) };
    if (d.lastReset !== bugun) {
      d.remaining = CAN_LIMITI;
      d.rewardedToday = 0;
      d.lastReset = bugun;
    } else if (delta === 0 && !odul) {
      return undefined;   // aynı gün, değişiklik yok → iptal
    }
    if (delta !== 0) {
      const cur = d.remaining == null ? CAN_LIMITI : sinirla(sayi(d.remaining));
      d.remaining = sinirla(cur + delta);
    }
    if (odul) d.rewardedToday = Math.min(CAN_LIMITI, sinirla(sayi(d.rewardedToday)) + 1);
    return d;
  }).catch((e) => sessizHata("can", e));
}

/* --------------------------------------------------------------- ilerleme  */

/** ders altındaki tüm konuların tamamlanan adım sayısı: { t1: 2, t5: 3, ... } */
export async function dersIlerlemesi(
  uid: string,
  sinif: number,
  dersKey: string
): Promise<Record<string, number>> {
  const g = sinifSinirla(sinif);
  const snap = await get(
    dbRef(kullaniciDb, `users/${uid}/progress_test/grade${g}/${dersKey}`)
  );
  const out: Record<string, number> = {};
  if (!snap.exists()) return out;
  const v = snap.val() ?? {};
  for (const konu of Object.keys(v)) {
    out[konu] = Math.max(0, Math.min(ADIM_SAYISI, sayi(v[konu]?.completedSteps)));
  }
  return out;
}

export async function konuAdimiOku(
  uid: string,
  sinif: number,
  dersKey: string,
  konuKey: string
): Promise<number> {
  const g = sinifSinirla(sinif);
  const snap = await get(
    dbRef(
      kullaniciDb,
      `users/${uid}/progress_test/grade${g}/${dersKey}/${konuKey}/completedSteps`
    )
  );
  return Math.max(0, Math.min(ADIM_SAYISI, sayi(snap.val())));
}

/** Adım sonucunu yazar (iOS TestScreen.saveProgress ile birebir). */
export async function adimSonucuYaz(params: {
  uid: string;
  sinif: number;
  dersKey: string;
  konuKey: string;
  adim: number;
  dogru: number;
  toplam: number;
  oncekiTamamlanan: number;
}): Promise<void> {
  const { uid, dersKey, konuKey, adim, dogru, toplam } = params;
  const g = sinifSinirla(params.sinif);
  const kok = `users/${uid}/progress_test/grade${g}/${dersKey}/${konuKey}`;

  // Üç yazma AYNI ANDA başlar, sırayla beklenmez (Android testBitisiniYaz, 24 Eyl 2026):
  // çevrimdışıyken ilk söz dönmediği için sıralı zincirde completedSteps hiç yazılmıyordu.
  // 1) completedSteps EN BAŞTA — TRANSACTION + max: düz yazımda, web sayfası açıkken telefondan
  // bir adım bitirilirse web'in elindeki bayat değer telefonun ilerlemesini geri alıyordu.
  const adimlar = runTransaction(dbRef(kullaniciDb, `${kok}/completedSteps`), (m) =>
    Math.min(ADIM_SAYISI, Math.max(sayi(m), adim))
  );

  // 2) Adım sonucu — Android TestScreens.kt ile aynı alanlar.
  // ⚠️ score = doğru × XP_DOGRU_TEST (2). Eskiden burada ×5 yazılıyordu; telefon ×2
  // yazdığı için aynı test iki cihazda farklı puanla kaydediliyordu.
  const sonuc = update(dbRef(kullaniciDb), {
    [`${kok}/step${adim}/correct`]: dogru,
    [`${kok}/step${adim}/total`]: toplam,
    [`${kok}/step${adim}/score`]: dogru * XP_DOGRU_TEST,
    [`${kok}/step${adim}/completedAt`]: serverTimestamp(),
  });

  // 3) Deneme sayacı — Android'de transaction (bu adım kaç kez çözüldü)
  const deneme = runTransaction(dbRef(kullaniciDb, `${kok}/step${adim}/attempts`), (m) => sayi(m) + 1);

  await Promise.all([adimlar, sonuc, deneme]);

}

/* ---------------------------------------------- ilerleme (canlı dinlenir) */
/* Liste ekranlarındaki çubuklar için: sınıfın TAMAMI tek düğümden okunur, böylece
   ders listesi ile ders içi ekran AYNI aboneliği paylaşır (5 ayrı okuma yerine 1). */

export const testIlerlemeYolu = (uid: string, sinif: number) =>
  `users/${uid}/progress_test/grade${sinifSinirla(sinif)}`;

/** ders → konu → tamamlanan adım (saf). */
export function testIlerlemesiCoz(ham: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [ders, konular] of Object.entries((ham ?? {}) as Record<string, any>)) {
    const d: Record<string, number> = {};
    for (const [konu, v] of Object.entries((konular ?? {}) as Record<string, any>)) {
      d[konu] = Math.max(0, Math.min(ADIM_SAYISI, sayi(v?.completedSteps)));
    }
    out[ders] = d;
  }
  return out;
}

export const defterIlerlemeYollari = (uid: string, sinif: number) => {
  const g = sinifSinirla(sinif);
  return [`users/${uid}/progress_defter/grade${g}`, `users/${uid}/progress_defter_done/grade${g}`];
};

/** ders → ünite → defter durumu (saf). */
export function defterIlerlemesiCoz(
  ilerlemeHam: unknown, bitenHam: unknown
): Record<string, Record<string, DefterDurumu>> {
  const ilerleme = (ilerlemeHam ?? {}) as Record<string, any>;
  const biten = (bitenHam ?? {}) as Record<string, any>;
  const out: Record<string, Record<string, DefterDurumu>> = {};
  for (const ders of new Set([...Object.keys(ilerleme), ...Object.keys(biten)])) {
    const i = (ilerleme[ders] ?? {}) as Record<string, any>;
    const b = (biten[ders] ?? {}) as Record<string, any>;
    const d: Record<string, DefterDurumu> = {};
    for (const u of new Set([...Object.keys(i), ...Object.keys(b)])) {
      d[u] = {
        okunanSayfa: sayi(i[u]?.currentPage),
        toplamSayfa: sayi(i[u]?.totalPages),
        bitti: b[u] === true,
      };
    }
    out[ders] = d;
  }
  return out;
}

/** Sınıflı kök — Android `rememberYaziliSubjectCompletedSteps` ile aynı yol. */
export const yaziliIlerlemeYolu = (uid: string, sinif: number) =>
  `users/${uid}/progress_yazili/grade${sinifSinirla(sinif)}`;

/** ders → sınav → tamamlanan adım (saf). */
export function yaziliIlerlemesiCoz(ham: unknown): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const [ders, sinavlar] of Object.entries((ham ?? {}) as Record<string, any>)) {
    const d: Record<string, number> = {};
    for (const [sinav, v] of Object.entries((sinavlar ?? {}) as Record<string, any>)) {
      d[sinav] = Math.max(0, Math.min(YAZILI_ADIM_SAYISI, sayi(v?.completedSteps)));
    }
    out[ders] = d;
  }
  return out;
}

/* -------------------------------------------------------------------- XP   */

/** users/{uid}/xp/grade{N}/total'ı transaction ile artırır; yeni toplamı döndürür. */
export async function xpEkle(
  uid: string,
  sinif: number,
  miktar: number,
  sebep = "test"
): Promise<number> {
  const delta = Math.max(0, Math.round(miktar));
  if (!uid || delta <= 0) return 0;
  const g = sinifSinirla(sinif);
  const ref = dbRef(kullaniciDb, `users/${uid}/xp/grade${g}`);

  const sonuc = await runTransaction(ref, (mevcut) => {
    const d = (mevcut ?? {}) as Record<string, unknown>;
    const cur = Math.max(sayi(d.total), sayi(d.totalXp));
    d.total = cur + delta;
    d.lastAdd = { amount: delta, reason: sebep };
    return d;
  });

  const yeni = Math.max(
    sayi((sonuc.snapshot.val() ?? {}).total),
    sayi((sonuc.snapshot.val() ?? {}).totalXp)
  );
  // Zaman damgası transaction dışında (sentinel'in transaction içinde yeniden
  // çalıştırılması değeri kaydırabiliyor)
  update(ref, { updatedAt: serverTimestamp() }).catch((e) => sessizHata("xp", e));
  // Lig satırı: tek yazıcı, puan asla düşmez, ad/avatar'a dokunmaz (beklenmez — çevrimdışı dönmez)
  void ligSatiriYaz(uid, g, yeni, null);
  return yeni;
}

/* ------------------------------------------------------------------- seri  */

export type SeriSonucu = {
  basarili: boolean;
  ilkAktiviteBugun: boolean;
  sayi: number;
  maske: number;
};

/**
 * Günün aktivite bitini işaretler, seriyi günde BİR KEZ artırır.
 * iOS markStreakActivity / Android StreakScreen.markStreakActivity ile birebir.
 */
export async function seriIsaretle(uid: string, bit: number): Promise<SeriSonucu> {
  if (!uid) return { basarili: false, ilkAktiviteBugun: false, sayi: 0, maske: 0 };

  const bugun = gunAnahtari();
  const ay = ayAnahtari();
  const gun = gunNo();

  let ilkAktivite = false;
  let yeniSayi = 0;
  let yeniMaske = 0;

  try {
    const sonuc = await runTransaction(
      dbRef(kullaniciDb, `users/${uid}/streak`),
      (mevcut) => {
        const d = (mevcut ?? {}) as Record<string, any>;
        d.days = d.days ?? {};
        d.days[ay] = d.days[ay] ?? {};
        const eski = sayi(d.days[ay][gun]);
        yeniMaske = eski | bit;
        d.days[ay][gun] = yeniMaske;

        const sonGun: string | undefined = d.lastDay;
        ilkAktivite = sonGun !== bugun;

        if (ilkAktivite) {
          const suren = sonGun ? dunMu(sonGun, bugun) : false;
          yeniSayi = suren ? Math.max(sayi(d.count) + 1, 1) : 1;
          d.count = yeniSayi;
          d.lastDay = bugun;
        } else {
          yeniSayi = Math.max(sayi(d.count), 0);
        }
        return d;
      }
    );
    if (!sonuc.committed) {
      return { basarili: false, ilkAktiviteBugun: false, sayi: 0, maske: 0 };
    }
  } catch {
    return { basarili: false, ilkAktiviteBugun: false, sayi: 0, maske: 0 };
  }

  return {
    basarili: true,
    ilkAktiviteBugun: ilkAktivite,
    sayi: Math.max(0, yeniSayi),
    maske: yeniMaske,
  };
}

/* ------------------------------------------------------------------ sorular */

/** anahtar: DB'deki soru düğümü adı (q1, 1…) — yanlış soru takibinde kimlik (hatalar.ts) */
export type Soru = { anahtar: string; metin: string; secenekler: string[]; dogruIndeks: number };

/**
 * tests/grade{N}/{ders}/{konu}/s{adim} → sorular.
 * Alan adları içerikte tutarsız (text/question/soru/q · a/options/opts · correct/answer),
 * mobil uygulamadaki ayrıştırıcının aynısı uygulanıyor.
 */
export async function sorulariGetir(
  sinif: number,
  dersKey: string,
  konuKey: string,
  adim: number
): Promise<Soru[]> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`sorular:${sinifSinirla(sinif)}:${dersKey}:${konuKey}:${adim}`, async () => {
    const g = sinifSinirla(sinif);
    const yol = `tests/grade${g}/${dersKey}/${konuKey}/s${adim}`;
    const snap = await get(dbRef(testlerDb, yol));
    if (!snap.exists()) return [];

    const ham = snap.val() ?? {};
    const anahtarlar = Object.keys(ham).sort((a, b) => {
      const na = Number.parseInt(a.replace(/\D/g, ""), 10);
      const nb = Number.parseInt(b.replace(/\D/g, ""), 10);
      if (Number.isNaN(na) || Number.isNaN(nb)) return a.localeCompare(b, "tr");
      return na - nb;
    });

    const out: Soru[] = [];
    for (const k of anahtarlar) {
      const c = ham[k] ?? {};
      const metin = String(c.text ?? c.question ?? c.soru ?? c.q ?? "").trim();

      let secenekler: string[] = [];
      const secenekDugumu = c.a ?? c.options ?? c.opts ?? null;
      // Şık metni konsolda sayı girilmiş olabilir (ör. 12) — metne çevrilir, atılmaz (Android soruMetni)
      const metne = (x: unknown): string => (typeof x === "string" ? x : typeof x === "number" ? String(x) : "");
      if (Array.isArray(secenekDugumu)) {
        secenekler = secenekDugumu.map(metne).filter((x) => x.trim());
      } else if (secenekDugumu && typeof secenekDugumu === "object") {
        const ks = Object.keys(secenekDugumu);
        const sayisal = ks.every((x) => !Number.isNaN(Number.parseInt(x, 10)));
        const sirali = sayisal
          ? ks.sort((x, y) => Number.parseInt(x, 10) - Number.parseInt(y, 10))
          : ["a", "b", "c", "d", "A", "B", "C", "D"].filter((x) => ks.includes(x));
        secenekler = sirali
          .map((x) => metne(secenekDugumu[x]))
          .filter((x) => x.trim());
      } else {
        for (const harf of ["a", "b", "c", "d", "A", "B", "C", "D"]) {
          const v = metne(c[harf]);
          if (v.trim()) secenekler.push(v);
        }
      }

      const son = Math.max(0, Math.min(secenekler.length - 1, dogruIndeksiCoz(c) ?? 0));

      if (metin && secenekler.length > 0) {
        out.push({ anahtar: k, metin, secenekler, dogruIndeks: son });
      }
    }
    return out;
  });
}

/**
 * Doğru şık indeksi (Android soruDogruIndeksi, 24 Eyl 2026): correct / correctIndex / correct_index
 * sayı (0 tabanlı) ya da metin ("2" ya da "A".."D"); yoksa answer / dogru harfi. Çözülemezse null.
 * Eskiden yalnız sayı kabul ediliyordu: konsoldan "2" metni girilen soruda doğru şık A sayılıyordu.
 */
export function dogruIndeksiCoz(c: Record<string, unknown>): number | null {
  const harf = (t: string): number | null => ({ A: 0, B: 1, C: 2, D: 3 } as Record<string, number>)[t.trim().toUpperCase()] ?? null;
  for (const alan of ["correct", "correctIndex", "correct_index"]) {
    const v = c[alan];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    if (typeof v === "string" && v.trim()) {
      const n = /^-?\d+$/.test(v.trim()) ? Number.parseInt(v.trim(), 10) : harf(v);
      if (n != null) return n;
    }
  }
  for (const alan of ["answer", "dogru"]) {
    const v = c[alan];
    const t = v == null ? "" : String(v);
    if (t.trim()) return harf(t) ?? 0;
  }
  return null;
}

/* ------------------------------------------------------------------- lig  */

/** XP → lig anahtarı ve başlığı (iOS XpManager.leagueForXp + profileLeagueTitle). */
const LIGLER: { key: string; ad: string; min: number; max: number | null }[] = [
  { key: "baslangic",   ad: "BAŞLANGIÇ",   min: 0,    max: 499 },
  { key: "gelisim",     ad: "GELİŞİM",     min: 500,  max: 1499 },
  { key: "ustalik",     ad: "USTALIK",     min: 1500, max: 2999 },
  { key: "sampiyonlar", ad: "ŞAMPİYONLAR", min: 3000, max: 4999 },
  { key: "efsaneler",   ad: "EFSANELER",   min: 5000, max: 7499 },
  { key: "zirve",       ad: "ZİRVE",       min: 7500, max: null },
];

export type Lig = { key: string; ad: string; min: number; max: number | null };

export function ligBul(xp: number): Lig {
  const x = Math.max(0, xp);
  return LIGLER.find((l) => x >= l.min && (l.max == null || x <= l.max)) ?? LIGLER[0];
}

/* --------------------------------------------------------------- görevler */

export type Gorev = { id: string; baslik: string; ilerleme: number; hedef: number; xp: number };

export type GorevTanim = { id: string; baslik: string; xp: number; kind: string; params: Record<string, unknown> };

/** iOS TaskManager.taskTarget — görev türüne göre hedef sayısı. */
export function gorevHedefi(t: GorevTanim): number {
  const p = t.params ?? {};
  const s = (k: string) => sayi(p[k]);
  switch ((t.kind || "").toLowerCase()) {
    case "notebook_pages":     return Math.max(1, s("pages"));
    case "test_correct":       return Math.max(1, s("minCorrect"));
    case "notebook_complete":  return Math.max(1, s("count") || s("target"));
    case "take_test":          return Math.max(1, s("count") || s("target"));
    case "test_total_correct": return Math.max(1, s("totalCorrect") || s("target"));
    case "combo_defter_test":  return Math.max(1, s("count") || s("target"));
    case "weekly_active_days": return Math.max(1, s("days"));
    case "yazili_correct":     return Math.max(1, s("minCorrect"));
    case "quiz_complete":      return Math.max(1, s("count") || s("target"));
    default:                   return 1;
  }
}

/* Görev tanımlarını OKUMA tarafı. Yazma tarafı `gorevYaz.ts`te (Android TaskManager
   .applyEvent portu). Yollar iOS TaskManager.loadTodayUi ile aynı. */
export const gunlukGorevDurumYolu = (uid: string) => `users/${uid}/tasks/${gunAnahtari()}`;

/** Görev tanımlarını kullanıcının ilerlemesiyle birleştirir (saf). */
export function gorevleriBirlestir(tanimlar: GorevTanim[], durumHam: unknown): Gorev[] {
  const durum = (durumHam ?? {}) as Record<string, any>;
  return tanimlar.map((t) => {
    const hedef = Math.max(1, gorevHedefi(t));
    const st = durum[t.id] ?? {};
    const bitti = st.completed === true;
    const ilerleme = Math.max(0, Math.min(hedef, bitti ? hedef : sayi(st.progress)));
    return { id: t.id, baslik: t.baslik, ilerleme, hedef, xp: t.xp };
  });
}

/**
 * Bugüne denk gelen günlük görev TANIMLARI (içerik — değişmez, önbelleğe alınır).
 * İlerleme burada yok; onu `gorevleriBirlestir` ekler.
 */
export async function gunlukGorevTanimlari(): Promise<GorevTanim[]> {
  const bugun = gunAnahtari();
  const ay = Number(bugun.slice(5, 7));
  const gun = Number(bugun.slice(8, 10));
  return onbellekli(`gorevKatalog:daily:${bugun}`, async () => {
    const snap = await get(dbRef(gorevKatalogDb, "taskCatalog/daily"));
    if (!snap.exists()) return [];
    const tanimlar: GorevTanim[] = [];
    const ham = snap.val() ?? {};
    for (const anahtar of Object.keys(ham)) {
      const c = ham[anahtar] ?? {};
      if (String(c.period ?? "").toLowerCase() !== "daily") continue;
      if (sayi(c.month) !== ay || sayi(c.day) !== gun) continue;
      const id = String(c.id ?? anahtar);
      const baslik = String(c.title ?? "");
      const kind = String(c.kind ?? "");
      if (!id || !baslik || !kind) continue;
      tanimlar.push({ id, baslik, xp: sayi(c.xp), kind, params: c.params ?? {} });
    }
    return tanimlar;
  }, { kalici: true });
}

export async function gunlukGorevler(uid: string): Promise<Gorev[]> {
  const tanimlar = await gunlukGorevTanimlari();
  if (tanimlar.length === 0) return [];
  const durumSnap = await get(dbRef(kullaniciDb, gunlukGorevDurumYolu(uid)));
  return gorevleriBirlestir(tanimlar, durumSnap.val());
}

/* ------------------------------------------------------------- seri ekranı */

export const ACT_DEFTER = 1 << 1;
export const ACT_YAZILI = 1 << 2;

export type SeriAy = {
  sayi: number;          // çözülmüş seri (lastDay'e göre)
  sonGun: string | null;
  gunler: Record<number, number>;   // ayın günü → aktivite maskesi
};

/** Bir ayın seri verisi: users/{uid}/streak (count/lastDay) + days/{yyyy-MM}. */
export async function seriAyiOku(uid: string, ayAnahtari: string): Promise<SeriAy> {
  const snap = await get(dbRef(kullaniciDb, `users/${uid}/streak`));
  const v = snap.val() ?? {};
  const sonGun: string | null = v.lastDay ?? null;

  const gunler: Record<number, number> = {};
  const ayDugumu = v.days?.[ayAnahtari] ?? {};
  for (const k of Object.keys(ayDugumu)) {
    const g = Number.parseInt(k, 10);
    if (Number.isNaN(g) || g < 1 || g > 31) continue;
    gunler[g] = sayi(ayDugumu[k]);
  }

  return { sayi: seriyiCoz(sayi(v.count), sonGun), sonGun, gunler };
}

/**
 * Bu haftanın hangi günlerinde aktivite var? (Pazartesi = 0 … Pazar = 6)
 * iOS: StreakSummaryScreen.loadWeekDays — gelecek günler atlanır, hiç işaret
 * yoksa bugün dolu sayılır (özet ekranı hep en az bir halka gösterir).
 */
export async function haftaninAktifGunleri(uid: string): Promise<number[]> {
  const bugunIndeks = haftaGunIndeksi();
  if (!uid) return [bugunIndeks];

  let gunlerDugumu: Record<string, Record<string, unknown>> = {};
  try {
    const snap = await get(dbRef(kullaniciDb, `users/${uid}/streak/days`));
    gunlerDugumu = (snap.val() ?? {}) as Record<string, Record<string, unknown>>;
  } catch {
    return [bugunIndeks];
  }

  const bulunan: number[] = [];
  const simdi = Date.now();
  for (let i = 0; i <= bugunIndeks; i++) {
    const t = new Date(simdi - (bugunIndeks - i) * 86400000);
    const maske = sayi(gunlerDugumu?.[ayAnahtari(t)]?.[String(gunNo(t))]);
    if (maske !== 0) bulunan.push(i);
  }
  return bulunan.length > 0 ? bulunan : [bugunIndeks];
}

/* ---------------------------------------------------------------- defter  */

export const XP_DEFTER_TAMAM = 50;   // iOS/Android: XpRules.defterCompleteXp





/** Uygulamadaki parseBlock ile aynı tip eşlemesi. */


/**
 * Defter sayfaları: defterler/grade{N}/subjects/{ders}/units/{ünite}/pages
 * Ünite anahtarı doğrudan tutmazsa uygulamadaki gibi listeden çözülür
 * (birebir eşleşme → "{ünite}_" öneki → sıradaki indeks).
 */
export async function defterSayfalariGetir(
  sinif: number,
  dersKey: string,
  uniteKey: string
): Promise<DefterSayfa[]> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`defterSayfa:${sinifSinirla(sinif)}:${dersKey}:${uniteKey}`, async () => {
    const g = sinifSinirla(sinif);
    const ders = defterDersAnahtari(g, dersKey);
    const kok = `defterler/grade${g}/subjects/${ders}/units`;

    let snap = await get(dbRef(defterlerDb, `${kok}/${uniteKey}/pages`));
    if (!snap.exists()) {
      const uniteler = await get(dbRef(defterlerDb, kok));
      const anahtarlar = uniteler.exists() ? Object.keys(uniteler.val() ?? {}) : [];
      const indeks = (Number.parseInt(uniteKey.replace(/\D/g, ""), 10) || 1) - 1;
      const cozulen =
        anahtarlar.find((k) => k === uniteKey || k.startsWith(`${uniteKey}_`)) ??
        anahtarlar[indeks] ??
        uniteKey;
      snap = await get(dbRef(defterlerDb, `${kok}/${cozulen}/pages`));
    }
    return sayfalariCevir(snap.val());
  });
}

export type DefterDurumu = { okunanSayfa: number; toplamSayfa: number; bitti: boolean };

/** Bir dersteki tüm ünitelerin defter durumu: ilerleme + tamamlanma işareti. */
export async function defterIlerlemesi(
  uid: string,
  sinif: number,
  dersKey: string
): Promise<Record<string, DefterDurumu>> {
  const g = sinifSinirla(sinif);
  const [ilerlemeSnap, bitenSnap] = await Promise.all([
    get(dbRef(kullaniciDb, `users/${uid}/progress_defter/grade${g}/${dersKey}`)),
    get(dbRef(kullaniciDb, `users/${uid}/progress_defter_done/grade${g}/${dersKey}`)),
  ]);
  const ilerleme = ilerlemeSnap.val() ?? {};
  const biten = bitenSnap.val() ?? {};

  const out: Record<string, DefterDurumu> = {};
  for (const k of new Set([...Object.keys(ilerleme), ...Object.keys(biten)])) {
    out[k] = {
      okunanSayfa: sayi(ilerleme[k]?.currentPage),
      toplamSayfa: sayi(ilerleme[k]?.totalPages),
      bitti: biten[k] === true,
    };
  }
  return out;
}

function defterYolu(uid: string, sinif: number, dersKey: string, uniteKey: string): string {
  return `users/${uid}/progress_defter/grade${sinifSinirla(sinif)}/${dersKey}/${uniteKey}`;
}

export async function defterSayfaYaz(
  uid: string, sinif: number, dersKey: string, uniteKey: string, sayfa: number
): Promise<void> {
  // updatedAt (20 Eyl): ana ekranın "kaldığın yer" kartı yarım defteri de en son dokunulan iş sayar
  await update(dbRef(kullaniciDb, defterYolu(uid, sinif, dersKey, uniteKey)), { currentPage: sayfa, updatedAt: serverTimestamp() });
}

/**
 * Defter açılırken kaldığı sayfa (1 tabanlı; 0 = baştan). Bitmiş defter baştan açılır — 20 Eyl 2026
 * (kullanıcı kararı): ana ekrandaki "3/12 sayfa · Devam Et" vaadiyle tutarlı. Android/iOS'a da işlenecek.
 */
export async function defterKaldigiSayfa(
  uid: string, sinif: number, dersKey: string, uniteKey: string
): Promise<number> {
  try {
    const g = sinifSinirla(sinif);
    const [ilerleme, bitti] = await Promise.all([
      get(dbRef(kullaniciDb, defterYolu(uid, g, dersKey, uniteKey))),
      get(dbRef(kullaniciDb, `users/${uid}/progress_defter_done/grade${g}/${dersKey}/${uniteKey}`)),
    ]);
    if (bitti.val() === true) return 0;
    return Math.max(0, sayi((ilerleme.val() ?? {}).currentPage));
  } catch {
    return 0;
  }
}

export async function defterToplamSayfaYaz(
  uid: string, sinif: number, dersKey: string, uniteKey: string, toplam: number
): Promise<void> {
  await update(dbRef(kullaniciDb, defterYolu(uid, sinif, dersKey, uniteKey)), { totalPages: toplam });
}

export type DefterBitisSonucu = { ilkKez: boolean; xp: number; seri: SeriSonucu | null };

/**
 * Defteri tamamla: seri + işaret + XP(50) — Android DefterScreens "Bitir" zinciri.
 * Seri HER tamamlamada işaretlenir (Android son sayfaya gelince `markStreakActivity`,
 * ilk-kez şartından ÖNCE). XP ve başarım/görev/istatistik YALNIZ ilk tamamlamada;
 * işaret `progress_defter_done` transaction ile konur (çift ödül olmasın).
 * ⚠️ Eskiden seri de ilk-kez şartının içindeydi: daha önce bitirilmiş bir defteri
 * yeniden okumak web'de seriyi sürdürmüyordu, Android'de sürdürüyordu.
 */
export async function defterTamamla(
  uid: string, sinif: number, dersKey: string, uniteKey: string, toplamSayfa: number
): Promise<DefterBitisSonucu> {
  const g = sinifSinirla(sinif);
  // Beklenmez: çevrimdışıyken söz dönmez, tamamlama işareti ve seri de başlasın (24 Eyl 2026)
  update(dbRef(kullaniciDb, defterYolu(uid, sinif, dersKey, uniteKey)), {
    currentPage: toplamSayfa,
    totalPages: toplamSayfa,
  }).catch((e) => sessizHata("defterSayfa", e));

  const seriIs = seriIsaretle(uid, ACT_DEFTER);
  const isaret = dbRef(kullaniciDb, `users/${uid}/progress_defter_done/grade${g}/${dersKey}/${uniteKey}`);
  let ilkKez = false;
  try {
    const sonuc = await runTransaction(isaret, (mevcut) => {
      if (mevcut === true) return;      // zaten tamamlanmış → iptal
      return true;
    });
    ilkKez = sonuc.committed && sonuc.snapshot.val() === true;
  } catch {
    ilkKez = false;
  }

  const seri = await seriIs;
  if (!ilkKez) return { ilkKez: false, xp: 0, seri };

  // Android: reason "defter_complete" — beklenmez
  xpEkle(uid, g, XP_DEFTER_TAMAM, "defter_complete").catch((e) => sessizHata("xp", e));
  return { ilkKez: true, xp: XP_DEFTER_TAMAM, seri };
}

/* -------------------------------------------------------------- lig tablosu */

export type LigSatiri = {
  uid: string;
  sira: number;
  ad: string;
  puan: number;
  avatar: string;
  sensin: boolean;
  /** Liste ligin ilk LIG_LISTE_LIMITI kişisi; "Sen" onların dışındaysa gerçek sıra bilinmez → "50+" */
  disarida?: boolean;
};

/** Lig listesi: ligin puan aralığında en yüksek N kişi (sunucuda süzülür — Android LIG_LISTE_LIMITI) */
export const LIG_LISTE_LIMITI = 50;

/**
 * Sezon sıralaması: leaderboards/leagues/grade{N}/{sezon}
 * Uygulamadaki sıralama kuralı: puana göre azalan, eşitlikte ada göre artan.
 */
export const ligTablosuYolu = (sinif: number) =>
  `leaderboards/leagues/grade${sinifSinirla(sinif)}/${SEZON()}`;

/**
 * Lig sorgusunun kısıtları (Android LeagueScreen, 24 Eyl 2026): orderByChild("points") + ligin
 * aralığı (startAt/endAt) + limitToLast(50). Eskiden sınıf+sezon düğümünün TAMAMI iniyordu.
 * `.indexOn: points` kuralı yayınlanmasa da çalışır (istemci süzer, yalnız uyarı).
 */
export function ligSorgusu(lig: Lig): CanliSorgu {
  const kisitlar: QueryConstraint[] = [orderByChild("points"), startAt(lig.min)];
  if (lig.max != null) kisitlar.push(endAt(lig.max));   // en üst ligde üst sınır yok
  kisitlar.push(limitToLast(LIG_LISTE_LIMITI));
  return { anahtar: `lig:${lig.key}:${LIG_LISTE_LIMITI}`, kisitlar };
}

/**
 * Sorgu sonucunu sıralı satırlara çevirir (saf). Sorgu zaten kendi ligini getiriyor; yine de ligin
 * dışında kalanlar süzülür (kural yayınlanmamışsa / puan arada değiştiyse). Kendi satırın yoksa
 * `benim` ile eklenir; liste dolu ve puanın en düşükten büyük değilse `disarida` ("50+").
 */
export function ligSatirlariCoz(
  hamDugum: unknown, uid: string, lig: Lig, benim: { ad: string; avatar: string; puan: number } | null
): LigSatiri[] {
  const ham = (hamDugum ?? {}) as Record<string, any>;
  let enDusuk = Number.POSITIVE_INFINITY;
  const satirlar: LigSatiri[] = Object.keys(ham).map((k) => {
    const c = ham[k] ?? {};
    const puan = Math.max(0, sayi(c.points));
    if (puan < enDusuk) enDusuk = puan;
    const ad = String(c.name ?? c.username ?? c.kullaniciAdi ?? "").trim() || (k === uid ? (benim?.ad || "Sen") : `@${k.slice(0, 6)}`);
    return { uid: k, sira: 0, ad, puan, avatar: String(c.avatar ?? "").trim() || "profil0", sensin: k === uid };
  });
  const toplamGelen = satirlar.length;
  const kademedekiler = satirlar.filter((s) => ligBul(s.puan).key === lig.key);
  if (!kademedekiler.some((s) => s.sensin) && benim) {
    kademedekiler.push({
      uid, sira: 0, ad: benim.ad || "Sen", puan: Math.max(0, benim.puan), avatar: benim.avatar || "profil0", sensin: true,
      disarida: toplamGelen >= LIG_LISTE_LIMITI && benim.puan <= enDusuk,
    });
  }
  // Eşitlikte ada göre — Türkçe harmanlama DEĞİL, düz karşılaştırma (Android thenBy { it.name },
  // iOS `<` ikisi de kod noktası sırası); "50+" satırı en sonda.
  kademedekiler.sort((a, b) =>
    Number(!!a.disarida) - Number(!!b.disarida) ||
    (a.puan !== b.puan ? b.puan - a.puan : a.ad < b.ad ? -1 : a.ad > b.ad ? 1 : 0)
  );
  return kademedekiler.map((s, i) => ({ ...s, sira: i + 1 }));
}

/* ---- kendi satırın: TEK okuma kuralı + TEK yazıcı (Android XpManager.ligSatiriYaz, 24 Eyl 2026) ---- */

export type LigKimlik = { name: string; avatar: string };

/**
 * Profil düğümünden lig adı/avatarı: username → kullaniciAdi → "Kullanıcı".
 * ⚠️ Ad-soyad (fullName/name) lig tablosuna ASLA yazılmaz — sınıftaki herkes okuyor.
 * Profil yoksa null (yazma yapılmaz: "Kullanıcı · profil0" hayaleti olmasın).
 */
export function ligKimligiCoz(profilHam: unknown): LigKimlik | null {
  if (profilHam == null || typeof profilHam !== "object") return null;
  const p = profilHam as Record<string, unknown>;
  const metin = (k: string) => (typeof p[k] === "string" ? (p[k] as string).trim() : "");
  return { name: metin("username") || metin("kullaniciAdi") || "Kullanıcı", avatar: metin("avatar") || "profil0" };
}

const LIG_OKUMA_MS = 8000;
// Sunucuda olduğunu bildiğimiz son satır ("uid|gradeN|sezon") — aynı değer için yazma/transaction yok
const bilinenSatirlar = new Map<string, { puan: number; kimlik: LigKimlik }>();
// Profil kimliği bellek önbelleği: yalnız satır YOKSA / adsızsa kullanılır, var olan adı ezmez
let kimlikOnbellek: { uid: string; kimlik: LigKimlik } | null = null;

function satirAnahtari(uid: string, g: number) { return `${uid}|grade${g}|${SEZON()}`; }

/** Ekranın dinleyicisi kendi satırını görünce: aynı değerler için bir daha yazılmaz. */
export function ligSatiriGoruldu(uid: string, sinif: number, puan: number, ad: string, avatar: string): void {
  if (!uid || !ad) return;
  bilinenSatirlar.set(satirAnahtari(uid, sinifSinirla(sinif)), { puan: Math.max(0, puan), kimlik: { name: ad, avatar: avatar || "profil0" } });
}

async function kimlikGetir(uid: string): Promise<LigKimlik | null> {
  if (kimlikOnbellek?.uid === uid) return kimlikOnbellek.kimlik;
  const snap = await tavanli(get(dbRef(kullaniciDb, profilYolu(uid))), LIG_OKUMA_MS);
  const k = snap ? ligKimligiCoz(snap.val()) : null;
  if (k) kimlikOnbellek = { uid, kimlik: k };
  return k;
}

/**
 * Sınıfın lig puanı — TEK kaynak (ustBilgiCoz ile aynı kural): max(stats/grade{g}/score/totalXp,
 * xp/grade{g}/total|totalXp). Yalnız bu iki küçük düğüm. Hiçbiri okunamazsa null → çağıran YAZMAMALI.
 */
export async function ligPuaniOku(uid: string, sinif: number): Promise<number | null> {
  if (!uid) return null;
  const g = sinifSinirla(sinif);
  const [stats, xp] = await Promise.all([
    tavanli(get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/score/totalXp`)), LIG_OKUMA_MS),
    tavanli(get(dbRef(kullaniciDb, `users/${uid}/xp/grade${g}`)), LIG_OKUMA_MS),
  ]);
  if (!stats && !xp) return null;
  const x = (xp?.val() ?? {}) as Record<string, unknown>;
  return Math.max(0, stats ? sayi(stats.val()) : 0, sayi(x.total), sayi(x.totalXp));
}

/**
 * Lig satırını yazar — YALNIZ bir şey değiştiyse ve puanı ASLA düşürmeden (transaction:
 * max(sunucu, yeni); hiçbir alan değişmiyorsa iptal → ağa yazma gitmez; `atMs` yalnız gerçek yazmada).
 * `kimlik` verilirse ad/avatar ona çekilir (taze profil okuyan çağıran); null ise satırdakiler korunur,
 * yalnız eksikse profil ile doldurulur. Hata fırlatmaz; çevrimdışıyken 10 sn'de bırakılır.
 */
export async function ligSatiriYaz(uid: string, sinif: number, puan: number, kimlik: LigKimlik | null): Promise<void> {
  if (!uid) return;
  try {
    const g = sinifSinirla(sinif);
    const hedef = Math.max(0, Math.round(puan));
    const anahtar = satirAnahtari(uid, g);
    const bilinen = bilinenSatirlar.get(anahtar);
    if (bilinen && bilinen.puan >= hedef && (!kimlik || (kimlik.name === bilinen.kimlik.name && kimlik.avatar === bilinen.kimlik.avatar))) return;

    const yedek = kimlik ?? (await kimlikGetir(uid));
    if (!yedek) return;   // profil okunamadı: hayalet satır yazma
    const sezon = SEZON();
    const sonuc = await tavanli(runTransaction(dbRef(kullaniciDb, `${ligTablosuYolu(g)}/${uid}`), (mevcut) => {
      const d = { ...((mevcut ?? {}) as Record<string, unknown>) };
      const varOlan = mevcut != null;
      const eskiPuan = Math.max(0, sayi(d.points));
      const eskiAd = typeof d.name === "string" ? d.name.trim() : "";
      const eskiAvatar = typeof d.avatar === "string" ? d.avatar.trim() : "";
      const yeniPuan = Math.max(eskiPuan, hedef);   // asla düşme
      const yeniAd = kimlik?.name ?? (eskiAd || yedek.name);
      const yeniAvatar = kimlik?.avatar ?? (eskiAvatar || yedek.avatar);
      const degisti = !varOlan || d.points == null || yeniPuan !== eskiPuan || yeniAd !== eskiAd ||
        yeniAvatar !== eskiAvatar || d.grade == null || d.season == null;
      if (!degisti) return undefined;   // iptal
      return { ...d, points: yeniPuan, name: yeniAd, avatar: yeniAvatar, grade: g, season: sezon, atMs: serverTimestamp() };
    }), 10000);
    if (!sonuc) return;
    const v = (sonuc.snapshot.val() ?? {}) as Record<string, unknown>;
    if (!sonuc.snapshot.exists()) return;
    const satir = {
      puan: Math.max(0, sayi(v.points)),
      kimlik: { name: (typeof v.name === "string" && v.name.trim()) || yedek.name, avatar: (typeof v.avatar === "string" && v.avatar.trim()) || yedek.avatar },
    };
    bilinenSatirlar.set(anahtar, satir);
    // Kullanıcı altında sezon puanı (debug / stats) — yalnız gerçek yazmada, beklenmez
    if (sonuc.committed) {
      update(dbRef(kullaniciDb, `users/${uid}/league`), {
        seasonKey: sezon, [`seasonPoints/grade${g}`]: satir.puan, updatedAt: serverTimestamp(),
      }).catch((e) => sessizHata("lig", e));
    }
  } catch (e) {
    sessizHata("lig", e);
  }
}

/** Ekran açılınca kendi satırı (Android LeagueScreen adım 1-3): profil + puan TAZE okunur;
    ikisi de okunduysa yazılır (değişiklik yoksa yazma gitmez). Profil kimliği önbelleğe bildirilir. */
export async function ligKendiniYayinla(uid: string, sinif: number): Promise<void> {
  const [profSnap, puan] = await Promise.all([
    tavanli(get(dbRef(kullaniciDb, profilYolu(uid))), LIG_OKUMA_MS),
    ligPuaniOku(uid, sinif),
  ]);
  const kimlik = profSnap ? ligKimligiCoz(profSnap.val()) : null;
  if (kimlik) kimlikOnbellek = { uid, kimlik };
  if (puan != null && kimlik) await ligSatiriYaz(uid, sinif, puan, kimlik);
}

/* ------------------------------------------------------------------ yazılı */

export const XP_DOGRU_YAZILI = 4;      // iOS/Android: XpRules.yaziliCorrectXp
export const YAZILI_ADIM_SAYISI = 2;   // her ders için step1 + step2

export type YaziliTip = "siralama" | "acikuclu" | "test" | "dogruyanlis";

export type SiralamaSorusu = { id: string; yonerge: string; hedef: string; parcalar: string[] };

/** Fen/Sosyal içerikte farklı anahtarlarla durabiliyor (uygulamadaki aday listesi). */
function yaziliDersAdaylari(dersKey: string): string[] {
  switch (dersKey) {
    case "fen":    return ["fen", "fen_bilimleri", "fenbilimleri"];
    case "sosyal": return ["sosyal", "sosyal_bilgiler", "sosyalbilgiler"];
    default:       return [dersKey];
  }
}

/** İçeriğin gerçekte hangi ders anahtarında olduğunu bulur (uygulamadaki probe). */
export async function yaziliDersCoz(
  sinif: number, dersKey: string, sinavKey: string
): Promise<string> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`yaziliDers:${sinifSinirla(sinif)}:${dersKey}:${sinavKey}`, async () => {
    const g = sinifSinirla(sinif);
    for (const aday of yaziliDersAdaylari(dersKey)) {
      const snap = await get(dbRef(yazililarDb, `writtenQuestions/grade${g}/${aday}/${sinavKey}`));
      if (snap.exists() && snap.hasChildren()) return aday;
    }
    return yaziliDersAdaylari(dersKey)[0];
  });
}

/** Ders bazında tamamlanan adım sayısı (0-2). */
export async function yaziliIlerlemesi(
  uid: string, sinif: number, dersler: string[], sinavKey: string
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    dersler.map(async (d) => {
      const snap = await get(
        dbRef(kullaniciDb, `${yaziliIlerlemeYolu(uid, sinif)}/${d}/${sinavKey}/completedSteps`)
      );
      out[d] = Math.max(0, Math.min(YAZILI_ADIM_SAYISI, sayi(snap.val())));
    })
  );
  return out;
}

/** Sıradaki adım: 1 tamamlandıysa step2, aksi halde step1 (uygulamadaki kural). */
export function yaziliSiradakiAdim(tamamlanan: number): "step1" | "step2" {
  return tamamlanan >= 1 ? "step2" : "step1";
}

/** writtenQuestions/grade{N}/{ders}/{sınav}/steps/{adım}/siralama */
export async function yaziliSiralamaSorulari(
  sinif: number, ders: string, sinavKey: string, adim: string
): Promise<SiralamaSorusu[]> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`yaziliSira:${sinifSinirla(sinif)}:${ders}:${sinavKey}:${adim}`, async () => {
    const g = sinifSinirla(sinif);
    const snap = await get(
      dbRef(yazililarDb, `writtenQuestions/grade${g}/${ders}/${sinavKey}/steps/${adim}/siralama`)
    );
    if (!snap.exists()) return [];

    const ham = snap.val() ?? {};
    const anahtarlar = Object.keys(ham).sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
    const out: SiralamaSorusu[] = [];
    for (const k of anahtarlar) {
      const c = ham[k] ?? {};
      const hedef = String(c.target_sentence ?? c.correctSentence ?? c.target ?? "").trim();
      const parcalar = dizi(c.tokens ?? c.words ?? c.kelimeler);
      if (!hedef || parcalar.length === 0) continue;
      out.push({
        id: String(c.id ?? k),
        yonerge: String(c.instruction ?? ""),
        hedef,
        parcalar,
      });
    }
    return out;
  });
}

/** Uygulamadaki normalizeOrder: ayraçları boşluğa çevirip küçült. */
export function siralamaKarsilastir(cevap: string, hedef: string): boolean {
  const d = (s: string) =>
    s.replace(/ -> /g, " ").replace(/ - /g, " ").replace(/-/g, " ")
      .replace(/\s+/g, " ").trim().toLocaleLowerCase("tr");
  return d(cevap) === d(hedef);
}

export type AcikSorusu = {
  id: string; pasaj: string; soru: string; cevaplar: string[];
  buyukKucukOnemli: boolean; gorselYolu?: string;
};
export type YaziliTestSorusu = {
  id: string; soru: string; secenekler: { anahtar: string; metin: string }[];
  dogru: string; gorselYolu?: string;
};
export type DogruYanlisSorusu = { id: string; ifade: string; dogru: "D" | "Y" };

function yaziliYol(sinif: number, ders: string, sinav: string, adim: string, tip: YaziliTip): string {
  return `writtenQuestions/grade${sinifSinirla(sinif)}/${ders}/${sinav}/steps/${adim}/${tip}`;
}

/** Düğüm anahtarlarını (q1, q2, q10…) sayısal sırayla verir. */
function siraliAnahtarlar(ham: Record<string, unknown>): string[] {
  return Object.keys(ham).sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
}

export async function yaziliAcikSorulari(
  sinif: number, ders: string, sinav: string, adim: string
): Promise<AcikSorusu[]> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`yaziliAcik:${sinifSinirla(sinif)}:${ders}:${sinav}:${adim}`, async () => {
    const snap = await get(dbRef(yazililarDb, yaziliYol(sinif, ders, sinav, adim, "acikuclu")));
    if (!snap.exists()) return [];
    const ham = snap.val() ?? {};
    const out: AcikSorusu[] = [];
    for (const k of siraliAnahtarlar(ham)) {
      const c = ham[k] ?? {};
      const soru = String(c.question ?? "").trim();
      if (!soru) continue;
      out.push({
        id: String(c.id ?? k),
        pasaj: String(c.passage ?? ""),
        soru,
        cevaplar: dizi(c.answers),
        buyukKucukOnemli: c.caseSensitive === true,
        gorselYolu: typeof c.imageRef === "string" ? c.imageRef : undefined,
      });
    }
    return out;
  });
}

export async function yaziliTestSorulari(
  sinif: number, ders: string, sinav: string, adim: string
): Promise<YaziliTestSorusu[]> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`yaziliTest:${sinifSinirla(sinif)}:${ders}:${sinav}:${adim}`, async () => {
    const snap = await get(dbRef(yazililarDb, yaziliYol(sinif, ders, sinav, adim, "test")));
    if (!snap.exists()) return [];
    const ham = snap.val() ?? {};
    const out: YaziliTestSorusu[] = [];
    for (const k of siraliAnahtarlar(ham)) {
      const c = ham[k] ?? {};
      const soru = String(c.question ?? "").trim();
      const dogru = String(c.correct ?? "").toLocaleUpperCase("tr");
      const secenekDugumu = (c.options ?? {}) as Record<string, unknown>;
      const secenekler = Object.keys(secenekDugumu)
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map((anahtar) => ({ anahtar, metin: String(secenekDugumu[anahtar] ?? "") }))
        .filter((s) => s.metin.trim().length > 0);
      // Uygulama 4 şıkkı olmayan soruyu atlar
      if (!soru || !dogru || secenekler.length !== 4) continue;
      out.push({
        id: String(c.id ?? k), soru, secenekler, dogru,
        gorselYolu: typeof c.imageRef === "string" ? c.imageRef : undefined,
      });
    }
    return out;
  });
}

export async function yaziliDogruYanlisSorulari(
  sinif: number, ders: string, sinav: string, adim: string
): Promise<DogruYanlisSorusu[]> {
  // İçerik — değişmez, önbellekten servis edilir.
  return onbellekli(`yaziliDY:${sinifSinirla(sinif)}:${ders}:${sinav}:${adim}`, async () => {
    const snap = await get(dbRef(yazililarDb, yaziliYol(sinif, ders, sinav, adim, "dogruyanlis")));
    if (!snap.exists()) return [];
    const ham = snap.val() ?? {};
    const out: DogruYanlisSorusu[] = [];
    for (const k of siraliAnahtarlar(ham)) {
      const c = ham[k] ?? {};
      const ifade = String(c.statement ?? "").trim();
      const dogru = String(c.correct ?? "").toLocaleUpperCase("tr");
      if (!ifade || (dogru !== "D" && dogru !== "Y")) continue;
      out.push({ id: String(c.id ?? k), ifade, dogru: dogru as "D" | "Y" });
    }
    return out;
  });
}

/** iOS TurkishText.normalizeAnswerText: kırp, çoklu boşluğu teke indir, gerekiyorsa küçült. */
export function acikCevapDogruMu(
  yazilan: string, cevaplar: string[], buyukKucukOnemli: boolean
): boolean {
  const d = (s: string) => {
    const t = s.trim().replace(/\s+/g, " ");
    return buyukKucukOnemli ? t : t.toLocaleLowerCase("tr");
  };
  const u = d(yazilan);
  return cevaplar.some((c) => d(c) === u);
}

/** Soru görselinin indirme adresi (Storage yolu → URL). */
export async function yaziliGorselAdresi(yol: string): Promise<string | null> {
  try {
    const { getDownloadURL, ref: sRef } = await import("firebase/storage");
    const { storage } = await import("./firebase");
    return await getDownloadURL(sRef(storage, yol));
  } catch {
    return null;
  }
}

export type YaziliBitisSonucu = { xp: number; ilkKez: boolean; seri: SeriSonucu | null };

/**
 * Yazılı adımı bitti — Android `markYaziliFinished` + `awardYaziliXpAndAddOnce` +
 * `markStreakActivity(ACT_YAZILI)`.
 *
 * ⚠️ Yol SINIFLI: `progress_yazili/grade{N}/{ders}/{sınav}`. Eskiden web (ve iOS) sınıfsız
 * `progress_yazili/{ders}/{sınav}` yazıyordu; Android'in canlı ekranı sınıflı yolu okuduğu
 * için web'de çözülen yazılı telefonda görünmüyordu (tersi de). Android'in sınıfsız yolu
 * okuyan `YaziliSubjectsScreen` ölü kod (14 Eyl 2026 tespiti).
 *
 * Alanlar Android'le aynı: completedSteps (mevcut ile MAX — transaction), correct, total,
 * score, completedAt. XP adım başına BİR kez: `xp_once/yazili/grade{N}/{ders}/{sınav}/{adım}`
 * (Android aynı düğümü transaction'la kilitliyor). Seri her çözümde işaretlenir.
 */
export async function yaziliTamamla(params: {
  uid: string; sinif: number; dersKey: string; sinavKey: string;
  adim: "step1" | "step2"; dogru: number; toplam: number;
}): Promise<YaziliBitisSonucu> {
  const { uid, sinif, dersKey, sinavKey, adim, dogru, toplam } = params;
  const g = sinifSinirla(sinif);
  const tamamlanan = adim === "step1" ? 1 : 2;
  const puan = Math.max(0, dogru) * XP_DOGRU_YAZILI;
  const kok = `users/${uid}/progress_yazili/grade${g}/${dersKey}/${sinavKey}`;

  // İlerleme, XP ve seri AYNI ANDA başlar, sırayla beklenmez (24 Eyl 2026): çevrimdışıyken ilk
  // transaction dönmediği için sıralı zincirde sonrakiler hiç başlamıyordu. completedSteps önce.
  void Promise.all([
    runTransaction(dbRef(kullaniciDb, `${kok}/completedSteps`), (m) =>
      Math.min(YAZILI_ADIM_SAYISI, Math.max(sayi(m), tamamlanan))
    ),
    update(dbRef(kullaniciDb, kok), {
      correct: Math.max(0, dogru),
      total: Math.max(0, toplam),
      score: puan,
      completedAt: serverTimestamp(),
    }),
  ]).catch((e) => sessizHata("yaziliIlerleme", e));

  // XP bir kez — Android awardYaziliXpAndAddOnce (abort = daha önce verilmiş)
  const xpIs = (async () => {
    if (puan <= 0) return false;
    let ilkKez = false;
    try {
      const once = await runTransaction(
        dbRef(kullaniciDb, `users/${uid}/xp_once/yazili/grade${g}/${dersKey}/${sinavKey}/${adim}`),
        (m) => (m === true ? undefined : true)
      );
      ilkKez = once.committed && once.snapshot.val() === true;
    } catch {
      ilkKez = false;
    }
    if (ilkKez) xpEkle(uid, g, puan, "yazili").catch((e) => sessizHata("xp", e));
    return ilkKez;
  })();

  const [ilkKez, seri] = await Promise.all([xpIs, seriIsaretle(uid, ACT_YAZILI)]);
  return { xp: ilkKez ? puan : 0, ilkKez, seri };
}

/* -------------------------------------------------------------- istatistik */

export type TestIstatistigi = {
  cozulenSoru: number; dogru: number; basariOrani: number;
  ortalamaSaniye: number; toplamPuan: number;
  okunanDefter: number; hazirlananYazili: number;
};

export type Dilim = { id: string; etiket: string; soru: number; oran: number; renk: string };

export type DefterKarti = {
  tamamlanan: number; baslanan: number; okunanSayfa: number;
  yuzde: number; toplam: number;
  quizTamamlanan: number; quizToplam: number;
};

/** Tek konunun test istatistiği (uygulamadaki loadTopicStats). */
export type KonuIstatistigi = { basari: number; soru: number; ortSn: number };

export type YaziliIstatistigi = { basariOrani: number; ortalamaSaniye: number };

const DERS_ANAHTARLARI = ["turkce", "matematik", "fen", "ingilizce", "sosyal"];
const DERS_ETIKET: Record<string, string> = {
  turkce: "Türkçe", matematik: "Matematik", fen: "Fen",
  sosyal: "Sosyal", ingilizce: "İngilizce",
};
const DERS_RENK: Record<string, string> = {
  turkce: "#72CEFD", matematik: "#F04B74", fen: "#40DB18",
  sosyal: "#FDEB4B", ingilizce: "#971FB5",
};

/** Yazılı sütun grafiğindeki kısa ders etiketleri (iOS yaziliSubjectLabel). */
const DERS_KISA: Record<string, string> = {
  turkce: "TR", matematik: "MAT", fen: "FEN", ingilizce: "İNG", sosyal: "SOS",
};

/** Ders rengi — uygulamadaki lessonColor. */
export function dersRengi(key: string): string {
  return DERS_RENK[key] ?? "#95D5DE";
}

/** Düğümdeki değer 0 ise eski (kök) alana düşer — uygulamadaki fallback zinciri. */
function alan(dugum: Record<string, any>, yeni: string, eski?: string): number {
  const parcalar = yeni.split("/");
  let v: any = dugum;
  for (const p of parcalar) v = v?.[p];
  const n = sayi(v);
  if (n !== 0 || !eski) return n;
  return sayi(dugum?.[eski]);
}

/**
 * İstatistik alt ağacı: users/{uid}/stats/grade{N} — TEK canlı düğüm.
 *
 * 21 Eyl'e kadar İstatistik ekranı bu ağacın 6 parçasını ayrı `get()`lerle her açılışta
 * yeniden çekiyordu. Şimdi ekran ağacın tamamına abone (canliVeri.useIstatistikAgaci);
 * aşağıdaki çözücüler SAF: ham düğümü alır, sayı üretir. Test/defter/quiz/yazılı
 * bitince Firebase değişikliği kendisi getirir; geçersizleştirme mantığı yok.
 * Ağaç yalnız sayaç içerir (müfredat boyutuyla sınırlı, kullanımla büyümez).
 */
export const istatistikAgaciYolu = (uid: string, sinif: number) =>
  `users/${uid}/stats/grade${sinifSinirla(sinif)}`;

/** Ders seçiliyse subjects/{ders}, değilse overall düğümü. */
function istatistikDugumu(ham: unknown, dersKey: string | null): Record<string, any> {
  const agac = (ham ?? {}) as Record<string, any>;
  return (dersKey ? agac.subjects?.[dersKey] : agac.overall) ?? {};
}

export function testIstatistigiCoz(ham: unknown, dersKey: string | null): TestIstatistigi {
  const v = istatistikDugumu(ham, dersKey);

  const soru = alan(v, "tests/totalQuestions", "totalQuestions");
  const dogru = alan(v, "tests/totalCorrect", "totalCorrect");
  const puan = alan(v, "tests/totalScore", "totalPoints");

  let oran = alan(v, "tests/successRate");
  if (oran === 0 && soru > 0) oran = (dogru / soru) * 100;

  let ortSn = alan(v, "tests/avgDurationSec");
  if (ortSn === 0) {
    const toplamSn = alan(v, "tests/totalDurationSec", "totalDurationSec");
    const cozulen = alan(v, "tests/solvedCount", "solvedCount");
    if (cozulen > 0 && toplamSn > 0) ortSn = toplamSn / cozulen;
    else {
      const ms = alan(v, "tests/totalElapsedMs", "totalElapsedMs");
      const deneme = alan(v, "tests/attempts", "attempts");
      if (deneme > 0) ortSn = ms / deneme / 1000;
    }
  }

  return {
    cozulenSoru: soru,
    dogru,
    basariOrani: Math.max(0, Math.min(100, Math.round(oran))),
    ortalamaSaniye: Math.max(0, Math.round(ortSn)),
    toplamPuan: puan,
    okunanDefter: alan(v, "defter/completedNotebooks", "readNotebooks"),
    hazirlananYazili: alan(v, "yazili/preparedExams", "preparedExams"),
  };
}

/** Tüm dersler → ders kırılımı; tek ders → ünite kırılımı (yoksa tek dilim). */
export function istatistikDilimleriCoz(agacHam: unknown, dersKey: string | null): Dilim[] {
  const agac = (agacHam ?? {}) as Record<string, any>;

  if (!dersKey) {
    const ham = (agac.subjects ?? {}) as Record<string, any>;
    const out: Dilim[] = [];
    for (const k of Object.keys(ham)) {
      const soru = sayi(ham[k]?.tests?.totalQuestions);
      const dogru = sayi(ham[k]?.tests?.totalCorrect);
      if (soru <= 0) continue;
      out.push({
        id: k, etiket: DERS_ETIKET[k] ?? k, soru,
        oran: Math.max(0, Math.min(100, Math.round((dogru / soru) * 100))),
        renk: DERS_RENK[k] ?? "#6BC1FF",
      });
    }
    return out.sort((a, b) => b.soru - a.soru);
  }

  const palet = ["#6BC1FF", "#FFC93C", "#2ECC71", "#E67E22", "#9B59B6", "#95D5DE"];
  const uHam = (agac.subjects?.[dersKey]?.units ?? {}) as Record<string, any>;
  const uniteler: Dilim[] = [];
  let i = 0;
  for (const k of Object.keys(uHam)) {
    const soru = sayi(uHam[k]?.tests?.totalQuestions);
    const dogru = sayi(uHam[k]?.tests?.totalCorrect);
    if (soru <= 0) continue;
    uniteler.push({
      id: k, etiket: k.toLocaleUpperCase("tr"), soru,
      oran: Math.max(0, Math.min(100, Math.round((dogru / soru) * 100))),
      renk: palet[i % palet.length],
    });
    i += 1;
  }
  if (uniteler.length > 0) {
    const no = (k: string) => Number.parseInt(k.replace(/\D/g, ""), 10) || 999;
    return uniteler.sort((a, b) => no(a.id) - no(b.id));
  }

  // Ünite kırılımı yoksa ders seviyesinde tek dilim
  const d = agac.subjects?.[dersKey] ?? {};
  const soru = sayi(d?.tests?.totalQuestions);
  const dogru = sayi(d?.tests?.totalCorrect);
  if (soru <= 0) return [];
  return [{
    id: dersKey, etiket: DERS_ETIKET[dersKey] ?? dersKey, soru,
    oran: Math.max(0, Math.min(100, Math.round((dogru / soru) * 100))),
    renk: DERS_RENK[dersKey] ?? "#6BC1FF",
  }];
}

/** Defter kartı — uygulamadaki fetchDefterCardInfo (ünite anahtarı u+sayı olanlar sayılır). */
/** progress_defter · progress_defter_done · quiz_done ham düğümlerinden (üçü de canlı hook'larla zaten dinleniyor). */
export function defterKartBilgisiCoz(
  progHam: unknown, doneHam: unknown, quizHam: unknown, dersKey: string | null, uniteSayisi: (ders: string) => number
): DefterKarti {

  const uniteMi = (k: string) => /^u\d+$/.test(k) || /^u\d+_/.test(k);
  const dersleri = (ham: Record<string, any>) =>
    dersKey ? [ham?.[dersKey] ?? {}] : Object.values(ham ?? {});

  let baslanan = 0;
  let okunanSayfa = 0;
  for (const ders of dersleri((progHam ?? {}) as Record<string, any>)) {
    for (const [k, v] of Object.entries((ders ?? {}) as Record<string, any>)) {
      if (!uniteMi(k)) continue;
      baslanan += 1;
      okunanSayfa += Math.max(0, sayi(v?.currentPage));
    }
  }

  let tamamlanan = 0;
  for (const ders of dersleri((doneHam ?? {}) as Record<string, any>)) {
    for (const [k, v] of Object.entries((ders ?? {}) as Record<string, any>)) {
      if (!uniteMi(k)) continue;
      if (v === true) tamamlanan += 1;
    }
  }

  // Quiz: uygulamada anahtar süzgeci YOK, doğru olan her düğüm sayılır.
  let quizTamamlanan = 0;
  for (const ders of dersleri((quizHam ?? {}) as Record<string, any>)) {
    for (const v of Object.values((ders ?? {}) as Record<string, any>)) {
      if (v === true) quizTamamlanan += 1;
    }
  }

  const dersler = dersKey ? [dersKey] : DERS_ANAHTARLARI;
  const toplam = dersler.reduce((t, d) => t + uniteSayisi(d), 0);
  const yuzde = toplam > 0 ? Math.max(0, Math.min(100, Math.round((tamamlanan / toplam) * 100))) : 0;

  // Uygulamada quiz toplamı = ünite toplamı (her ünitenin bir quiz'i var).
  return { tamamlanan, baslanan, okunanSayfa, yuzde, toplam, quizTamamlanan, quizToplam: toplam };
}



/** Ana ekranın öneri kutusu: TÜM derslerin konu istatistiği tek okumada (subjects düğümü). */
export async function tumKonuIstatistikleri(
  uid: string, sinif: number
): Promise<Record<string, Record<string, KonuIstatistigi>>> {
  const g = sinifSinirla(sinif);
  const out: Record<string, Record<string, KonuIstatistigi>> = {};
  try {
    const snap = await get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/subjects`));
    const ham = (snap.val() ?? {}) as Record<string, any>;
    for (const [ders, v] of Object.entries(ham)) out[ders] = konuIstatistikleriCoz(v?.topics);
  } catch {
    /* okunamadıysa öneri çıkmaz — uydurmayız */
  }
  return out;
}

/** topics düğümü → konu → {basari, soru, ortSn} (saf). */
export function konuIstatistikleriCoz(hamDugum: unknown): Record<string, KonuIstatistigi> {
  const ham = (hamDugum ?? {}) as Record<string, any>;
  const out: Record<string, KonuIstatistigi> = {};
  for (const [k, v] of Object.entries(ham)) {
    const soru = sayi(v?.tests?.totalQuestions);
    const dogru = sayi(v?.tests?.totalCorrect);
    const kayitli = sayi(v?.tests?.successRate);
    const basari = kayitli !== 0
      ? Math.max(0, Math.min(100, Math.round(kayitli)))
      : soru > 0 ? Math.max(0, Math.min(100, Math.round((dogru / soru) * 100))) : 0;

    let ortSn = sayi(v?.tests?.avgDurationSec);
    if (ortSn === 0) {
      const toplamSn = sayi(v?.tests?.totalDurationSec);
      const cozulen = sayi(v?.tests?.solvedCount);
      if (cozulen > 0 && toplamSn > 0) ortSn = toplamSn / cozulen;
      else {
        const ms = sayi(v?.tests?.totalElapsedMs);
        const deneme = sayi(v?.tests?.attempts);
        if (deneme > 0) ortSn = ms / deneme / 1000;
      }
    }
    out[k] = { basari, soru, ortSn: Math.max(0, Math.round(ortSn)) };
  }
  return out;
}

export function yaziliIstatistigiCoz(ham: unknown, dersKey: string | null): YaziliIstatistigi {
  const v = istatistikDugumu(ham, dersKey);
  const hazir = alan(v, "yazili/preparedExams", "preparedExams");
  const cozulen = alan(v, "yazili/solvedCount");
  if (hazir === 0 && cozulen === 0) return { basariOrani: 0, ortalamaSaniye: 0 };

  let oran = alan(v, "yazili/successRate");
  if (oran === 0) {
    const soru = alan(v, "yazili/totalQuestions");
    const dogru = alan(v, "yazili/totalCorrect");
    oran = soru > 0 ? (dogru / soru) * 100 : 0;
  }

  let ortSn = alan(v, "yazili/avgDurationSec");
  if (ortSn === 0) {
    const toplamSn = alan(v, "yazili/totalDurationSec");
    const deneme = alan(v, "yazili/attempts") || hazir;
    if (deneme > 0 && toplamSn > 0) ortSn = toplamSn / deneme;
  }

  return {
    basariOrani: Math.max(0, Math.min(100, Math.round(oran))),
    ortalamaSaniye: Math.max(0, Math.round(ortSn)),
  };
}

export function yaziliDersCubuklariCoz(agacHam: unknown): Dilim[] {
  const ham = ((agacHam ?? {}) as Record<string, any>).subjects ?? {};
  return DERS_ANAHTARLARI.map((k) => ({
    id: k,
    etiket: DERS_KISA[k] ?? k.slice(0, 3).toLocaleUpperCase("tr"),
    soru: 0,
    oran: Math.max(0, Math.min(100, Math.round(sayi(ham?.[k]?.yazili?.successRate)))),
    renk: DERS_RENK[k],
  }));
}

/* ---------------------------------------------------------------- oyunlar */

/**
 * Oyun ilerlemesi / rekoru için "büyükse yaz" (Android oyunBuyukseYaz, 24 Eyl 2026): mevcut değer
 * yeniden küçükse (ya da yoksa) yazar, değilse transaction'ı bırakır — okuma gelmeden/başarısızken
 * yapılan yazma gerçek değeri EZMEZ. Ateşle-unut: çevrimdışında dönmez, beklenmez. `tavan` aşılmaz.
 */
export function buyukseYaz(yol: string, yeni: number, tavan?: number): void {
  const hedef = Math.round(tavan != null ? Math.min(yeni, tavan) : yeni);
  runTransaction(dbRef(kullaniciDb, yol), (m) => {
    const mevcut = typeof m === "number" ? m : typeof m === "string" && m.trim() !== "" ? Number(m) : null;
    if (mevcut != null && Number.isFinite(mevcut) && mevcut >= hedef) return undefined;
    return hedef;
  }).catch((e) => sessizHata("oyunIlerleme", e));
}

/** Oyun ilerlemesi okuma tavanı (Android 6 sn) */
const OYUN_OKUMA_MS = 6000;

/** Oyunun en iyi skoru — uygulamayla AYNI düğüm (users/{uid}/{oyun}/bestScore). Okunamazsa null. */
export async function enIyiSkorOku(uid: string, oyun: string): Promise<number | null> {
  const snap = await tavanli(get(dbRef(kullaniciDb, `users/${uid}/${oyun}/bestScore`)), OYUN_OKUMA_MS);
  return snap ? Math.max(0, sayi(snap.val())) : null;
}

/** Rekor — "büyükse yaz" (okuma gelmemiş olsa bile sunucudaki rekor ezilmez). */
export function enIyiSkorYaz(uid: string, oyun: string, skor: number): void {
  if (skor > 0) buyukseYaz(`users/${uid}/${oyun}/bestScore`, Math.max(0, skor));
}

/* ----------------------------------------------------------------- wordle */

export const WORDLE_BOLUM_SAYISI = 300;

/** Bölümün kelimesi — İÇERİK, önbelleğe alınır (wordle/words/{index}). */
export async function wordleKelime(indeks: number): Promise<string> {
  return onbellekli(`wordleKelime:${indeks}`, async () => {
    try {
      const snap = await get(dbRef(wordleDb, `wordle/words/${indeks}`));
      const v = snap.val();
      return typeof v === "string" ? v : "";
    } catch {
      return "";
    }
  }, { kalici: true });
}

export const wordleSeviyeYolu = (uid: string) => `users/${uid}/wordle/currentLevel`;

/** Sıradaki bölüm (1..300; 300'ü aşmış eski kayıt 300'e sınırlanır — "301/300" olmasın). Okunamazsa 1. */
export async function wordleSeviyeOku(uid: string): Promise<number> {
  const snap = await tavanli(get(dbRef(kullaniciDb, wordleSeviyeYolu(uid))), 8000);
  const v = snap ? sayi(snap.val()) : 1;
  return Math.min(WORDLE_BOLUM_SAYISI, v >= 1 ? v : 1);
}

/** Bölüm bitince: oynanan bölümden hesaplanır (mevcut + 1), 300 tavanlı, "büyükse yaz" (Android wlAdvanceLevel). */
export function wordleSeviyeIlerlet(uid: string, mevcut: number): void {
  buyukseYaz(wordleSeviyeYolu(uid), mevcut + 1, WORDLE_BOLUM_SAYISI);
}

/* ----------------------------------------------------------------- sudoku */

export const SUDOKU_ZORLUKLARI = ["easy", "medium", "hard"] as const;
export type SudokuZorluk = (typeof SUDOKU_ZORLUKLARI)[number];
export const SUDOKU_BOLUM_SAYISI = 10;

export type SudokuBulmaca = { bulmaca: number[][]; cozum: number[][] };

function matrise(ham: unknown): number[][] {
  const d = (ham ?? {}) as Record<string, Record<string, unknown>>;
  return Array.from({ length: 9 }, (_, r) =>
    Array.from({ length: 9 }, (_, c) => sayi(d?.[String(r)]?.[String(c)]))
  );
}

/** Bulmaca İÇERİKTİR — önbelleğe alınır (sudoku/{zorluk}/{idx}). */
export async function sudokuBulmaca(zorluk: string, idx: number): Promise<SudokuBulmaca | null> {
  return onbellekli(`sudoku:${zorluk}:${idx}`, async () => {
    try {
      const snap = await get(dbRef(sudokuDb, `sudoku/${zorluk}/${idx}`));
      if (!snap.exists()) return null;
      const v = snap.val() ?? {};
      return { bulmaca: matrise(v.puzzle), cozum: matrise(v.solution) };
    } catch {
      return null;
    }
  }, { kalici: true });
}

export const sudokuIlerlemeYolu = (uid: string) => `users/${uid}/sudoku`;

/** İlerleme (sıradaki bulmaca, 1 tabanlı). Okunamazsa null — (1,1,1) ile ezilmesin. */
export async function sudokuIlerlemesi(uid: string): Promise<Record<SudokuZorluk, number> | null> {
  const snap = await tavanli(get(dbRef(kullaniciDb, sudokuIlerlemeYolu(uid))), OYUN_OKUMA_MS);
  if (!snap) return null;
  const v = snap.val() ?? {};
  return {
    easy: Math.max(1, sayi(v.easy) || 1),
    medium: Math.max(1, sayi(v.medium) || 1),
    hard: Math.max(1, sayi(v.hard) || 1),
  };
}

/** Bitirilen bulmacadan sonraki bölüm — "büyükse yaz", ilerleme geriye düşmez. */
export function sudokuIlerlemeYaz(uid: string, zorluk: string, bolum: number): void {
  buyukseYaz(`users/${uid}/sudoku/${zorluk}`, bolum);
}

/** Yalnız "hepsi bitti → baştan": bilinçli geri alma, sunucudan OKUNMUŞ değere göre çağrılır. */
export function sudokuIlerlemeSifirla(uid: string, zorluk: string): void {
  set(dbRef(kullaniciDb, `users/${uid}/sudoku/${zorluk}`), 1).catch((e) => sessizHata("sudoku", e));
}

/* --------------------------------------------------------- kelime gezmece */

export const KG_BOLUM_SAYISI = 100;

export type KgYerlesim = { kelime: string; satir: number; sutun: number; yon: "right" | "down" };
export type KgBolum = { anahtar: string; harfler: string[]; kelimeler: KgYerlesim[]; bonus: string[] };

/** Bölüm İÇERİKTİR — önbelleğe alınır (levels/level_{n}). */
export async function kgBolum(anahtar: string): Promise<KgBolum | null> {
  return onbellekli(`kg:${anahtar}`, async () => {
    try {
      const snap = await get(dbRef(kelimeGezmeceDb, `levels/${anahtar}`));
      if (!snap.exists()) return null;
      const v = snap.val() ?? {};

      const harfler = Object.values((v.letters ?? {}) as Record<string, unknown>)
        .filter((x): x is string => typeof x === "string");
      if (harfler.length === 0) return null;

      const kelimeler: KgYerlesim[] = [];
      for (const [kelime, ham] of Object.entries((v.words ?? {}) as Record<string, any>)) {
        if (ham?.row == null || ham?.col == null) continue;
        kelimeler.push({
          kelime,
          satir: sayi(ham.row),
          sutun: sayi(ham.col),
          yon: ham.dir === "down" ? "down" : "right",
        });
      }
      if (kelimeler.length === 0) return null;

      const bonus = Object.values((v.bonus ?? {}) as Record<string, unknown>)
        .filter((x): x is string => typeof x === "string");

      return { anahtar, harfler, kelimeler, bonus };
    } catch {
      return null;
    }
  }, { kalici: true });
}

export const kgSeviyeYolu = (uid: string) => `users/${uid}/kelimeGezmece/currentLevel`;

/** Okunamazsa 1 (yazma "büyükse yaz" olduğu için gerçek ilerleme ezilmez). */
export async function kgSeviyeOku(uid: string): Promise<number> {
  const snap = await tavanli(get(dbRef(kullaniciDb, kgSeviyeYolu(uid))), OYUN_OKUMA_MS);
  const v = snap ? sayi(snap.val()) : 1;
  return v >= 1 ? v : 1;
}

export function kgSeviyeYaz(uid: string, bolum: number): void {
  buyukseYaz(kgSeviyeYolu(uid), Math.max(1, bolum));
}

/* ------------------------------------------------------- haftalık / aylık */

/** ISO benzeri hafta anahtarı: "2026-W36" (Pazartesi başlangıçlı, Istanbul). */
export function haftaAnahtari(d: Date = new Date()): string {
  // Istanbul'daki tarihi al, sonra ISO hafta numarasını hesapla
  const [y, m, g] = gunAnahtari(d).split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, g));
  const gun = (t.getUTCDay() + 6) % 7;               // Pazartesi = 0
  t.setUTCDate(t.getUTCDate() - gun + 3);            // haftanın perşembesi
  const yil = t.getUTCFullYear();
  const ilkPersembe = new Date(Date.UTC(yil, 0, 4));
  const ofset = (ilkPersembe.getUTCDay() + 6) % 7;
  ilkPersembe.setUTCDate(ilkPersembe.getUTCDate() - ofset + 3);
  const hafta = 1 + Math.round((t.getTime() - ilkPersembe.getTime()) / (7 * 86400000));
  return `${yil}-W${String(hafta).padStart(2, "0")}`;
}

/** ISO hafta numarası (1-53) — katalogdaki `weekly.week` bu sayıyla eşleşir. */
function haftaNo(): number {
  return Number.parseInt(haftaAnahtari().split("-W")[1], 10) || 1;
}

/** Görev katalogu içeriktir (değişmez) → ham düğüm önbellekte tutulur, süzme her seferinde. */
async function katalogHam(bolum: "weekly" | "monthly"): Promise<Record<string, any>> {
  return onbellekli(`gorevKatalog:${bolum}`, async () => {
    const snap = await get(dbRef(gorevKatalogDb, `taskCatalog/${bolum}`));
    return (snap.val() ?? {}) as Record<string, any>;
  }, { kalici: true });
}

async function katalogTanimlari(
  bolum: "weekly" | "monthly",
  filtre: (c: Record<string, any>) => boolean
): Promise<GorevTanim[]> {
  const ham = await katalogHam(bolum);
  const out: GorevTanim[] = [];
  for (const anahtar of Object.keys(ham)) {
    const c = ham[anahtar] ?? {};
    if (String(c.period ?? "").toLowerCase() !== bolum) continue;
    if (!filtre(c)) continue;
    const id = String(c.id ?? anahtar);
    const baslik = String(c.title ?? "");
    const kind = String(c.kind ?? "");
    if (!id || !baslik || !kind) continue;
    out.push({ id, baslik, xp: sayi(c.xp), kind, params: c.params ?? {} });
  }
  return out;
}

/** İlerleme düğümünü okuyup tanımlarla birleştirir (haftalık/aylık görevler için). */
async function gorevleriOkuVeBirlestir(tanimlar: GorevTanim[], yol: string): Promise<Gorev[]> {
  if (tanimlar.length === 0) return [];
  const snap = await get(dbRef(kullaniciDb, yol));
  return gorevleriBirlestir(tanimlar, snap.val());
}

/** Haftalık görev TANIMLARI — ISO hafta numarasıyla birebir (Android/iOS aynı). */
export async function haftalikGorevTanimlari(): Promise<GorevTanim[]> {
  // Yaz tatili (Temmuz, Ağustos): haftalık görev YOK — Android `loadWeeklyDefsFromCatalog`
  // ve iOS'taki karşılığı bu kapıyı uyguluyor. Katalogda yaz haftaları zaten boş, kapı yedek.
  const ay0 = Number(gunAnahtari().slice(5, 7)) - 1;   // İstanbul takvimi (görev günü = seri günü)
  if (ay0 === 6 || ay0 === 7) return [];

  // Döngü yok: eski `% 21` aynı görevi 21 hafta sonra alakasız bir haftada tekrar gösteriyordu.
  const hedefHafta = haftaNo();
  return katalogTanimlari("weekly", (c) => sayi(c.week) === hedefHafta);
}

/** Aylık görev TANIMLARI — katalogda ay 1-tabanlı da olabilir, uygulamadaki gibi normalize edilir. */
export async function aylikGorevTanimlari(): Promise<GorevTanim[]> {
  const buAy0 = Number(gunAnahtari().slice(5, 7)) - 1;
  return katalogTanimlari("monthly", (c) => {
    let ay = sayi(c.month);
    if (ay >= 1) ay -= 1;
    return ay === buAy0;
  });
}

export const haftalikGorevDurumYolu = (uid: string) => `users/${uid}/tasksWeekly/${haftaAnahtari()}`;
export const aylikGorevDurumYolu = (uid: string) => `users/${uid}/tasksMonthly/${ayAnahtari()}`;

export async function haftalikGorevler(uid: string): Promise<Gorev[]> {
  return gorevleriOkuVeBirlestir(await haftalikGorevTanimlari(), haftalikGorevDurumYolu(uid));
}

export async function aylikGorevler(uid: string): Promise<Gorev[]> {
  return gorevleriOkuVeBirlestir(await aylikGorevTanimlari(), aylikGorevDurumYolu(uid));
}

/** Ay bitimine kalan gün (banner'daki "N GÜN"). */
/** Aya kalan gün, BUGÜN DAHİL — Android `daysLeftInMonth` ("including today"). Eskiden web bir eksik gösteriyordu. */
export function ayaKalanGun(): number {
  const [y, m, g] = gunAnahtari().split("-").map(Number);
  const sonGun = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.max(1, sonGun - g + 1);
}

/* ------------------------------------------------------ başarımlar/rozetler */

// Rozet yılı: öğretim yılı (Eyl–Ağu), lig anahtarından AYRI — bkz. sezon.ts.
const ROZET_SEZON = () => rozetYiliAnahtari();
// ⚠️ Eskiden 6 aylıktı (ocak…haziran): Eylül–Aralık rozeti kayıtlı olsa bile çözülmüyordu.
const AY_ANAHTARI: Record<string, number> = Object.fromEntries(AY_ANAHTAR.map((k, i) => [k, i]));

/**
 * Başarım sayaçları — uygulamadaki loadEnrichedAchievements ile aynı:
 * users/{uid}/achievements/{key}/current temel alınır, sonra XP/lig/kişisel rekorlar
 * ve streak/days maskesinden hesaplanan "mükemmel gün/hafta/ay" ile zenginleştirilir.
 */
/**
 * Başarım sayaçlarının okunduğu YOLLAR.
 * ⚠️ Eskiden `users/{uid}` KÖKÜ okunuyordu (uygulama da öyle yapıyor) — o düğümün altında
 * bütün test/defter/yazılı ilerlemesi, istatistikler ve görev geçmişi var; her açılışta
 * yüzlerce KB iniyordu. Artık yalnız gereken 5 küçük düğüm okunuyor; üstelik ilk ikisi
 * üst bilgiyle AYNI yollar olduğu için canlı katman onları zaten paylaşıyor.
 */
export function basarimYollari(uid: string, sinif: number): string[] {
  const g = sinifSinirla(sinif);
  return [
    `users/${uid}/xp/grade${g}`,
    `users/${uid}/stats/grade${g}/score/totalXp`,
    `users/${uid}/achievements`,
    `users/${uid}/personal_records/grade${g}`,
    // `streak/days` DEĞİL: üst bilgi zaten `streak` düğümünü dinliyor → aynı abonelik paylaşılır
    `users/${uid}/streak`,
  ];
}

/** Ham düğümlerden başarım sayaçlarını türetir (saf) — uygulamadaki zenginleştirmenin aynısı. */
export function basarimlariCoz(
  xpHam: unknown, statsXpHam: unknown, basarimHam: unknown,
  rekorHam: unknown, seriHam: unknown
): Record<string, number> {
  const out: Record<string, number> = {};
  const basarimlar = (basarimHam ?? {}) as Record<string, any>;
  for (const [k, node] of Object.entries(basarimlar)) {
    out[k] = sayi(node?.current);
  }

  // En yüksek puan + lig
  const xpNode = (xpHam ?? {}) as Record<string, any>;
  const xp = Math.max(sayi(xpNode.total), sayi(statsXpHam));
  out.enyuksekpuan = xp;
  const ligSirasi: Record<string, number> = {
    baslangic: 1, gelisim: 2, ustalik: 3, sampiyonlar: 4, efsaneler: 5, zirve: 6,
  };
  out.enyukseklig = ligSirasi[ligBul(xp).key] ?? 1;

  // Kişisel rekorlar sınıfa özel (uygulamada global yedek YOK)
  const pr = (rekorHam ?? {}) as Record<string, any>;
  out.enuzunseri = Math.max(0, sayi(pr.enuzunseri));
  const sinifHatasiz = Math.max(0, sayi(pr.hatasiztest));
  out.hatasiztest = sinifHatasiz > 0 ? sinifHatasiz : (out.hatasiztest ?? 0);

  // streak/days maskesinden çalışılan günler
  const calisilanGunler = new Set<string>();
  const seriGunleri = ((seriHam ?? {}) as Record<string, any>).days ?? {};
  for (const [ay, gunler] of Object.entries(seriGunleri as Record<string, any>)) {
    for (const [gk, maske] of Object.entries((gunler ?? {}) as Record<string, any>)) {
      const gn = Number.parseInt(gk, 10);
      if (Number.isNaN(gn)) continue;
      if ((sayi(maske) & (ACT_TEST | ACT_DEFTER | ACT_YAZILI)) !== 0) {
        calisilanGunler.add(`${ay}-${String(gn).padStart(2, "0")}`);
      }
    }
  }

  out.mukemmgun = calisilanGunler.size;

  // Tam hafta: 7 günü de dolu haftalar
  const haftalar: Record<string, Set<number>> = {};
  for (const anahtar of calisilanGunler) {
    const [y, m, d] = anahtar.split("-").map(Number);
    const hk = haftaAnahtari(new Date(Date.UTC(y, m - 1, d, 12)));
    (haftalar[hk] ??= new Set()).add(d);
  }
  out.mukemmhafta = Object.values(haftalar).filter((s) => s.size >= 7).length;

  // Tam ay: ayın bütün günleri dolu aylar
  const aylar: Record<string, Set<number>> = {};
  for (const anahtar of calisilanGunler) {
    const [y, m, d] = anahtar.split("-").map(Number);
    (aylar[`${y}-${String(m).padStart(2, "0")}`] ??= new Set()).add(d);
  }
  out.mukemmay = Object.entries(aylar).filter(([ay, gunler]) => {
    const [y, m] = ay.split("-").map(Number);
    const gunSayisi = new Date(Date.UTC(y, m, 0)).getUTCDate();
    return gunler.size >= gunSayisi;
  }).length;

  out.yazkampi = Math.max(0, sayi(basarimlar.yazkampi?.current));
  return out;
}

export async function basarimlariOku(uid: string, sinif: number): Promise<Record<string, number>> {
  const [xp, statsXp, basarim, rekor, gunler] = await Promise.all(
    basarimYollari(uid, sinif).map((y) => get(dbRef(kullaniciDb, y)))
  );
  return basarimlariCoz(xp.val(), statsXp.val(), basarim.val(), rekor.val(), gunler.val());
}

/** Kazanılmış ay rozetleri: users/{uid}/badges/{sezon}/{ay} === true */
export const rozetYolu = (uid: string) => `users/${uid}/badges/${ROZET_SEZON()}`;

/** Ham rozet düğümünü ay indekslerine çevirir (saf). */
export function rozetleriCoz(hamDugum: unknown): number[] {
  if (hamDugum == null) return [];
  const ham = hamDugum as Record<string, unknown>;
  const out: number[] = [];
  for (const [k, deger] of Object.entries(ham)) {
    const i = AY_ANAHTARI[k.trim().toLowerCase()];
    if (deger === true && i != null) out.push(i);
  }
  return out.sort((a, b) => a - b);
}

export async function rozetAylari(uid: string): Promise<number[]> {
  const snap = await get(dbRef(kullaniciDb, rozetYolu(uid)));
  return rozetleriCoz(snap.val());
}

/* ------------------------------------------------- bölümlü oyun ilerlemesi */
// Ok Bulmaca ve Resim Yapboz (15 Eyl 2026, yaz kampından Oyunlar'a taşındı).
// Düğüm: users/{uid}/{oyun} = sıradaki bölüm numarası (Sudoku'nun kalıbı; üç platform aynı).

export type BolumluOyun = "okbulmaca" | "yapboz";

/** Okunamazsa (çevrimdışı / 6 sn) 1 — yazma "büyükse yaz" olduğu için gerçek ilerleme ezilmez. */
export async function oyunBolumu(uid: string, oyun: BolumluOyun): Promise<number> {
  const snap = await tavanli(get(dbRef(kullaniciDb, `users/${uid}/${oyun}`)), OYUN_OKUMA_MS);
  return snap ? Math.max(1, sayi(snap.val()) || 1) : 1;
}

export function oyunBolumuYaz(uid: string, oyun: BolumluOyun, bolum: number): void {
  buyukseYaz(`users/${uid}/${oyun}`, bolum);
}
