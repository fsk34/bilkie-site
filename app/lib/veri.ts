// Web uygulamasının veri katmanı.
// Mobil uygulamayla AYNI Firebase yollarına yazar; semantik iOS/Android ile birebir:
//   XP     → users/{uid}/xp/grade{N}/total          (transaction, monoton artar)
//   Seri   → users/{uid}/streak                     (transaction, gün maskesi + count)
//   Test   → users/{uid}/progress_test/grade{N}/{ders}/{konu}
//   Can    → users/{uid}/lives                      (günlük 3'e sıfırlanır)
// Başarımlar, görevler ve istatistik kovaları da web'den YAZILIYOR (3 Eyl 2026):
//   ilerleme.ts · gorevYaz.ts · istatistikYaz.ts

import {
  get,
  ref as dbRef,
  runTransaction,
  serverTimestamp,
  set,
  update,
} from "firebase/database";
import { defterlerDb, gorevKatalogDb, kelimeGezmeceDb, kullaniciDb, sudokuDb, testlerDb, wordleDb, yazililarDb } from "./firebase";
import { ayAnahtari, gunAnahtari, gunNo, dunMu, haftaGunIndeksi, seriyiCoz } from "./tarih";
import { onbellekli } from "./onbellek";


export const XP_DOGRU_TEST = 2;      // iOS/Android: XpRules.testCorrectXp
export const ADIM_SAYISI = 3;        // her konu 3 adım (s1..s3)
export const CAN_LIMITI = 3;
export const ACT_TEST = 1 << 0;      // seri aktivite biti (iOS: ACT_TEST)

const SEZON = "2025_2026_guz";       // XpManager.leagueSeasonKey

export function sinifSinirla(g: number): number {
  return Math.max(3, Math.min(8, Math.round(g || 3)));
}

function sayi(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return Number.parseInt(v, 10) || 0;
  return 0;
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

/** Günü değişmişse canı 3'e çeker; güncel kalan canı döndürür. */
export async function canlariTazele(uid: string): Promise<number> {
  const bugun = gunAnahtari();
  const snap = await get(dbRef(kullaniciDb, `users/${uid}/lives`));
  const v = snap.val() ?? {};
  if (v.lastReset !== bugun) {
    await update(dbRef(kullaniciDb, `users/${uid}/lives`), {
      remaining: CAN_LIMITI,
      rewardedToday: 0,
      lastReset: bugun,
    });
    return CAN_LIMITI;
  }
  return Math.max(0, Math.min(CAN_LIMITI, sayi(v.remaining)));
}

export async function canYaz(uid: string, kalan: number): Promise<void> {
  await update(dbRef(kullaniciDb, `users/${uid}/lives`), {
    remaining: Math.max(0, Math.min(CAN_LIMITI, kalan)),
    lastReset: gunAnahtari(),
  });
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

  // Adım sonucu — Android TestScreens.kt ile aynı alanlar.
  // ⚠️ score = doğru × XP_DOGRU_TEST (2). Eskiden burada ×5 yazılıyordu; telefon ×2
  // yazdığı için aynı test iki cihazda farklı puanla kaydediliyordu.
  await update(dbRef(kullaniciDb), {
    [`${kok}/step${adim}/correct`]: dogru,
    [`${kok}/step${adim}/total`]: toplam,
    [`${kok}/step${adim}/score`]: dogru * XP_DOGRU_TEST,
    [`${kok}/step${adim}/completedAt`]: serverTimestamp(),
  });

  // Deneme sayacı — Android'de transaction (bu adım kaç kez çözüldü)
  await runTransaction(dbRef(kullaniciDb, `${kok}/step${adim}/attempts`), (m) => sayi(m) + 1);

  // ⚠️ completedSteps TRANSACTION + max olmalı: düz yazımda, web sayfası açıkken
  // telefondan bir adım bitirilirse web'in elindeki bayat değer telefonun
  // ilerlemesini geri alıyordu (Android: max(mevcut, adım)).
  await runTransaction(dbRef(kullaniciDb, `${kok}/completedSteps`), (m) =>
    Math.min(ADIM_SAYISI, Math.max(sayi(m), adim))
  );
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

export const yaziliIlerlemeYolu = (uid: string) => `users/${uid}/progress_yazili`;

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
  await update(ref, { updatedAt: serverTimestamp() });
  await ligPuaniYansit(uid, g, yeni);
  return yeni;
}

/** Lig tablosuna puanı yansıtır (iOS XpManager.mirrorLeaguePoints). */
async function ligPuaniYansit(uid: string, sinif: number, puan: number): Promise<void> {
  const g = sinifSinirla(sinif);
  const guvenli = Math.max(0, puan);
  const prof = await profilOku(uid);
  // Lig tablosu kullanıcı adını gösterir; yoksa ad-soyada düşer.
  const ad = prof?.kullaniciAdi?.trim() || prof?.adSoyad?.trim() || "Kullanıcı";
  const avatar = prof?.avatar || "profil0";

  await update(dbRef(kullaniciDb, `users/${uid}/league`), {
    seasonKey: SEZON,
    [`seasonPoints/grade${g}`]: guvenli,
    updatedAt: serverTimestamp(),
  });
  await update(
    dbRef(kullaniciDb, `leaderboards/leagues/grade${g}/${SEZON}/${uid}`),
    { points: guvenli, name: ad, avatar, updatedAt: serverTimestamp() }
  );
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

export type Soru = { metin: string; secenekler: string[]; dogruIndeks: number };

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
      if (Array.isArray(secenekDugumu)) {
        secenekler = secenekDugumu.filter((x) => typeof x === "string" && x.trim());
      } else if (secenekDugumu && typeof secenekDugumu === "object") {
        const ks = Object.keys(secenekDugumu);
        const sayisal = ks.every((x) => !Number.isNaN(Number.parseInt(x, 10)));
        const sirali = sayisal
          ? ks.sort((x, y) => Number.parseInt(x, 10) - Number.parseInt(y, 10))
          : ["a", "b", "c", "d", "A", "B", "C", "D"].filter((x) => ks.includes(x));
        secenekler = sirali
          .map((x) => secenekDugumu[x])
          .filter((x: unknown) => typeof x === "string" && x.trim());
      } else {
        for (const harf of ["a", "b", "c", "d", "A", "B", "C", "D"]) {
          const v = c[harf];
          if (typeof v === "string" && v.trim()) secenekler.push(v);
        }
      }

      let indeks: number | null = null;
      for (const alan of ["correct", "correctIndex", "correct_index"]) {
        if (typeof c[alan] === "number") { indeks = c[alan]; break; }
      }
      if (indeks == null) {
        const harf = String(c.answer ?? c.dogru ?? "").trim().toUpperCase();
        indeks = { A: 0, B: 1, C: 2, D: 3 }[harf as "A" | "B" | "C" | "D"] ?? 0;
      }
      const son = Math.max(0, Math.min(secenekler.length - 1, indeks));

      if (metin && secenekler.length > 0) {
        out.push({ metin, secenekler, dogruIndeks: son });
      }
    }
    return out;
  });
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

export type DefterBlok = {
  tip: string;
  baslik?: string;
  metin?: string;
  terim?: string;
  maddeler?: string[];
  adimlar?: string[];
  basliklar?: string[];
  satirlar?: string[][];
};

export type DefterSayfa = { no: number; bloklar: DefterBlok[] };

/** 3. sınıfta sosyal içeriği veritabanında hayat_bilgisi altında (uygulamayla aynı kural). */
function defterDersAnahtari(sinif: number, dersKey: string): string {
  return sinif === 3 && dersKey === "sosyal" ? "hayat_bilgisi" : dersKey;
}

function metin(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function dizi(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
      .map((k) => (v as Record<string, unknown>)[k])
      .filter((x): x is string => typeof x === "string");
  }
  return [];
}

/** Uygulamadaki parseBlock ile aynı tip eşlemesi. */
function blokCevir(ham: Record<string, unknown>): DefterBlok | null {
  const tip = metin(ham.type);
  const s = (k: string) => metin(ham[k]);
  switch (tip) {
    case "heading":                  return { tip: "baslik", baslik: s("title") };
    case "main_title": case "title":  return { tip: "baslik", baslik: s("text") };
    case "sub_title": case "subtitle":return { tip: "altbaslik", metin: s("text") };
    case "text": case "paragraph":    return { tip: "paragraf", metin: s("text") };
    case "highlight": case "info":    return { tip: "bilgi", metin: s("text") };
    case "bullet_list": case "list":  return { tip: "liste", baslik: s("title"), maddeler: dizi(ham.items) };
    case "note": case "example":      return { tip: "ornek", metin: s("text") };
    case "rule":                      return { tip: "kural", metin: s("text") };
    case "formula":                   return { tip: "formul", metin: s("text") };
    case "pattern":                   return { tip: "kalip", metin: s("text") };
    case "warning":                   return { tip: "uyari", metin: s("text") };
    case "definition":                return { tip: "tanim", terim: s("term"), metin: s("text") };
    case "steps": case "strategy":    return { tip: "adimlar", baslik: s("title"), adimlar: dizi(ham.steps) };
    case "problem":                   return { tip: "problem", baslik: s("title"), metin: s("text") };
    case "table": {
      const satirlar: string[][] = [];
      const r = ham.rows;
      if (Array.isArray(r)) for (const x of r) satirlar.push(dizi(x));
      else if (r && typeof r === "object") {
        for (const k of Object.keys(r as object).sort((a, b) => (Number(a) || 0) - (Number(b) || 0))) {
          satirlar.push(dizi((r as Record<string, unknown>)[k]));
        }
      }
      return { tip: "tablo", basliklar: dizi(ham.headers), satirlar };
    }
    default: return null;
  }
}

function sayfalariCevir(ham: unknown): DefterSayfa[] {
  if (!ham) return [];
  const liste = Array.isArray(ham)
    ? ham
    : Object.keys(ham as object)
        .sort((a, b) => (Number.parseInt(a.replace(/\D/g, ""), 10) || 0) - (Number.parseInt(b.replace(/\D/g, ""), 10) || 0))
        .map((k) => (ham as Record<string, unknown>)[k]);

  const out: DefterSayfa[] = [];
  liste.forEach((sayfa, i) => {
    if (!sayfa || typeof sayfa !== "object") return;
    const s = sayfa as Record<string, unknown>;
    const bloklarHam = s.blocks ?? s.bloklar ?? [];
    const bloklar: DefterBlok[] = [];
    const bl = Array.isArray(bloklarHam)
      ? bloklarHam
      : Object.keys(bloklarHam as object)
          .sort((a, b) => (Number.parseInt(a.replace(/\D/g, ""), 10) || 0) - (Number.parseInt(b.replace(/\D/g, ""), 10) || 0))
          .map((k) => (bloklarHam as Record<string, unknown>)[k]);
    for (const b of bl) {
      if (!b || typeof b !== "object") continue;
      const cevrilen = blokCevir(b as Record<string, unknown>);
      if (cevrilen) bloklar.push(cevrilen);
    }
    if (bloklar.length > 0) out.push({ no: sayi(s.page ?? s.pageNo) || i + 1, bloklar });
  });
  return out;
}

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
  await update(dbRef(kullaniciDb, defterYolu(uid, sinif, dersKey, uniteKey)), { currentPage: sayfa });
}

export async function defterToplamSayfaYaz(
  uid: string, sinif: number, dersKey: string, uniteKey: string, toplam: number
): Promise<void> {
  await update(dbRef(kullaniciDb, defterYolu(uid, sinif, dersKey, uniteKey)), { totalPages: toplam });
}

export type DefterBitisSonucu = { ilkKez: boolean; xp: number; seri: SeriSonucu | null };

/**
 * Defteri tamamla: işaret + XP(50) + seri — uygulamadaki onNotebookCompleted ile aynı.
 * Ödül YALNIZCA ilk tamamlamada verilir; işaret transaction ile konur (çift ödül olmasın).
 */
export async function defterTamamla(
  uid: string, sinif: number, dersKey: string, uniteKey: string, toplamSayfa: number
): Promise<DefterBitisSonucu> {
  const g = sinifSinirla(sinif);
  await update(dbRef(kullaniciDb, defterYolu(uid, sinif, dersKey, uniteKey)), {
    currentPage: toplamSayfa,
    totalPages: toplamSayfa,
  });

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

  if (!ilkKez) return { ilkKez: false, xp: 0, seri: null };

  await xpEkle(uid, g, XP_DEFTER_TAMAM, "defter");
  const seri = await seriIsaretle(uid, ACT_DEFTER);
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
};

/**
 * Sezon sıralaması: leaderboards/leagues/grade{N}/{sezon}
 * Uygulamadaki sıralama kuralı: puana göre azalan, eşitlikte ada göre artan.
 */
export const ligTablosuYolu = (sinif: number) =>
  `leaderboards/leagues/grade${sinifSinirla(sinif)}/${SEZON}`;

/**
 * Ham lig düğümünü sıralı satırlara çevirir (saf) — okuma ve canlı dinleme ortak kullanır.
 *
 * ⚠️ Lig tablosu sınıfın TAMAMINI tek düğümde tutuyor; ekranda gösterilen ise yalnızca
 * KENDİ LİG KADEMEN. Android `LeagueScreen.displayedRows` bunu şöyle yapıyor:
 *   kendi puanından kademeni bul → aynı kademedekileri süz → yeniden sırala → 1'den numarala
 * Bu süzgeç web'de yoktu: sınıfın tamamı listeleniyordu, bu yüzden 1. sıradaki kişi
 * telefondakinden farklı çıkıyordu (web sınıfın zirvesini, telefon kademenin zirvesini
 * gösteriyordu). Kademesi bulunamayan (listede satırı olmayan) kullanıcı 0 XP sayılır.
 */
export function ligSatirlariCoz(hamDugum: unknown, uid: string): LigSatiri[] {
  if (hamDugum == null) return [];
  const ham = hamDugum as Record<string, any>;
  const satirlar = Object.keys(ham).map((k) => {
    const c = ham[k] ?? {};
    const ad = String(c.name ?? "").trim() || `@${k.slice(0, 6)}`;
    return {
      uid: k,
      sira: 0,
      ad,
      puan: Math.max(0, sayi(c.points)),
      avatar: String(c.avatar ?? "").trim() || "profil0",
      sensin: k === uid,
    };
  });

  const benimKademem = ligBul(satirlar.find((s) => s.sensin)?.puan ?? 0).key;
  const kademedekiler = satirlar.filter((s) => ligBul(s.puan).key === benimKademem);

  // Eşitlikte ada göre — ama Türkçe harmanlama DEĞİL, düz karşılaştırma:
  // Android `thenBy { it.name }` ve iOS `$0.name < $1.name` ikisi de kod noktası
  // sırasını kullanıyor. localeCompare("tr") kullanılırsa "Çigdem" gibi adlar web'de
  // başka, telefonda başka sırada çıkıyordu.
  kademedekiler.sort((a, b) =>
    a.puan !== b.puan ? b.puan - a.puan : a.ad < b.ad ? -1 : a.ad > b.ad ? 1 : 0
  );
  return kademedekiler.map((s, i) => ({ ...s, sira: i + 1 }));
}

export async function ligTablosu(uid: string, sinif: number): Promise<LigSatiri[]> {
  const snap = await get(dbRef(kullaniciDb, ligTablosuYolu(sinif)));
  return ligSatirlariCoz(snap.val(), uid);
}

/** Ekran açılınca kendi satırını tazeler (uygulamadaki loadLeague adım 2). */
export async function ligKendiniYayinla(uid: string, sinif: number): Promise<void> {
  const g = sinifSinirla(sinif);
  const [prof, ust] = await Promise.all([profilOku(uid), ustBilgiOku(uid, g)]);
  const ad = prof?.kullaniciAdi?.trim() || prof?.adSoyad?.trim() || "Kullanıcı";
  await update(dbRef(kullaniciDb, `leaderboards/leagues/grade${g}/${SEZON}/${uid}`), {
    name: ad,
    avatar: prof?.avatar || "profil0",
    points: ust.xp,
    grade: g,
    season: SEZON,
    atMs: serverTimestamp(),
  });
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
  uid: string, dersler: string[], sinavKey: string
): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    dersler.map(async (d) => {
      const snap = await get(
        dbRef(kullaniciDb, `users/${uid}/progress_yazili/${d}/${sinavKey}/completedSteps`)
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

export type YaziliBitisSonucu = { xp: number; seri: SeriSonucu | null };

/**
 * Yazılı bitişi — uygulamadaki son halkanın (doğru-yanlış) yaptığı iş:
 * completedSteps (step1→1, step2→2) + XP (doğru-yanlış doğrusu × 4) + ACT_YAZILI serisi.
 * ⚠️ İlerleme SADE ders anahtarıyla yazılır (içerik 'fen_bilimleri' olsa da ilerleme 'fen').
 */
export async function yaziliTamamla(params: {
  uid: string; sinif: number; dersKey: string; sinavKey: string;
  adim: "step1" | "step2"; dogru: number;
}): Promise<YaziliBitisSonucu> {
  const { uid, sinif, dersKey, sinavKey, adim, dogru } = params;
  const tamamlanan = adim === "step1" ? 1 : 2;

  await update(
    dbRef(kullaniciDb, `users/${uid}/progress_yazili/${dersKey}/${sinavKey}`),
    { completedSteps: tamamlanan }
  );

  const xp = Math.max(0, dogru) * XP_DOGRU_YAZILI;
  if (xp > 0) await xpEkle(uid, sinif, xp, "yazili");
  const seri = await seriIsaretle(uid, ACT_YAZILI);
  return { xp, seri };
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

function istatistikYolu(uid: string, sinif: number, dersKey: string | null): string {
  const g = sinifSinirla(sinif);
  return dersKey
    ? `users/${uid}/stats/grade${g}/subjects/${dersKey}`
    : `users/${uid}/stats/grade${g}/overall`;
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

export async function testIstatistigi(
  uid: string, sinif: number, dersKey: string | null
): Promise<TestIstatistigi> {
  const snap = await get(dbRef(kullaniciDb, istatistikYolu(uid, sinif, dersKey)));
  const v = (snap.val() ?? {}) as Record<string, any>;

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
export async function istatistikDilimleri(
  uid: string, sinif: number, dersKey: string | null
): Promise<Dilim[]> {
  const g = sinifSinirla(sinif);

  if (!dersKey) {
    const snap = await get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/subjects`));
    const ham = (snap.val() ?? {}) as Record<string, any>;
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
  const uSnap = await get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/subjects/${dersKey}/units`));
  const uHam = (uSnap.val() ?? {}) as Record<string, any>;
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
  const dSnap = await get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/subjects/${dersKey}`));
  const soru = sayi(dSnap.val()?.tests?.totalQuestions);
  const dogru = sayi(dSnap.val()?.tests?.totalCorrect);
  if (soru <= 0) return [];
  return [{
    id: dersKey, etiket: DERS_ETIKET[dersKey] ?? dersKey, soru,
    oran: Math.max(0, Math.min(100, Math.round((dogru / soru) * 100))),
    renk: DERS_RENK[dersKey] ?? "#6BC1FF",
  }];
}

/** Defter kartı — uygulamadaki fetchDefterCardInfo (ünite anahtarı u+sayı olanlar sayılır). */
export async function defterKartBilgisi(
  uid: string, sinif: number, dersKey: string | null, uniteSayisi: (ders: string) => number
): Promise<DefterKarti> {
  const g = sinifSinirla(sinif);
  const [progSnap, doneSnap, quizSnap] = await Promise.all([
    get(dbRef(kullaniciDb, `users/${uid}/progress_defter/grade${g}`)),
    get(dbRef(kullaniciDb, `users/${uid}/progress_defter_done/grade${g}`)),
    get(dbRef(kullaniciDb, `users/${uid}/quiz_done/grade${g}`)),
  ]);

  const uniteMi = (k: string) => /^u\d+$/.test(k) || /^u\d+_/.test(k);
  const dersleri = (ham: Record<string, any>) =>
    dersKey ? [ham?.[dersKey] ?? {}] : Object.values(ham ?? {});

  let baslanan = 0;
  let okunanSayfa = 0;
  for (const ders of dersleri(progSnap.val() ?? {})) {
    for (const [k, v] of Object.entries((ders ?? {}) as Record<string, any>)) {
      if (!uniteMi(k)) continue;
      baslanan += 1;
      okunanSayfa += Math.max(0, sayi(v?.currentPage));
    }
  }

  let tamamlanan = 0;
  for (const ders of dersleri(doneSnap.val() ?? {})) {
    for (const [k, v] of Object.entries((ders ?? {}) as Record<string, any>)) {
      if (!uniteMi(k)) continue;
      if (v === true) tamamlanan += 1;
    }
  }

  // Quiz: uygulamada anahtar süzgeci YOK, doğru olan her düğüm sayılır.
  let quizTamamlanan = 0;
  for (const ders of dersleri(quizSnap.val() ?? {})) {
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

/** Konu konu test istatistiği: stats/grade{N}/subjects/{ders}/topics — anahtar = [tN] eki. */
export async function konuIstatistikleri(
  uid: string, sinif: number, dersKey: string
): Promise<Record<string, KonuIstatistigi>> {
  const g = sinifSinirla(sinif);
  const snap = await get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/subjects/${dersKey}/topics`));
  const ham = (snap.val() ?? {}) as Record<string, any>;
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

export async function yaziliIstatistigi(
  uid: string, sinif: number, dersKey: string | null
): Promise<YaziliIstatistigi> {
  const snap = await get(dbRef(kullaniciDb, istatistikYolu(uid, sinif, dersKey)));
  const v = (snap.val() ?? {}) as Record<string, any>;
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

export async function yaziliDersCubuklari(uid: string, sinif: number): Promise<Dilim[]> {
  const g = sinifSinirla(sinif);
  const snap = await get(dbRef(kullaniciDb, `users/${uid}/stats/grade${g}/subjects`));
  const ham = (snap.val() ?? {}) as Record<string, any>;
  return DERS_ANAHTARLARI.map((k) => ({
    id: k,
    etiket: DERS_KISA[k] ?? k.slice(0, 3).toLocaleUpperCase("tr"),
    soru: 0,
    oran: Math.max(0, Math.min(100, Math.round(sayi(ham?.[k]?.yazili?.successRate)))),
    renk: DERS_RENK[k],
  }));
}

/* ---------------------------------------------------------------- oyunlar */

/** Oyunun en iyi skoru — uygulamayla AYNI düğüm (users/{uid}/{oyun}/bestScore). */
export async function enIyiSkorOku(uid: string, oyun: string): Promise<number> {
  const snap = await get(dbRef(kullaniciDb, `users/${uid}/${oyun}/bestScore`));
  return Math.max(0, sayi(snap.val()));
}

export async function enIyiSkorYaz(uid: string, oyun: string, skor: number): Promise<void> {
  await set(dbRef(kullaniciDb, `users/${uid}/${oyun}/bestScore`), Math.max(0, Math.round(skor)));
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

export async function wordleSeviyeOku(uid: string): Promise<number> {
  try {
    const snap = await get(dbRef(kullaniciDb, wordleSeviyeYolu(uid)));
    const v = sayi(snap.val());
    return v >= 1 ? v : 1;
  } catch {
    return 1;
  }
}

/** Bölüm bitince seviyeyi bir artırır (uygulamadaki gibi 300'de durur). */
export async function wordleSeviyeIlerlet(uid: string, mevcut: number): Promise<void> {
  if (mevcut >= WORDLE_BOLUM_SAYISI) return;
  await set(dbRef(kullaniciDb, wordleSeviyeYolu(uid)), mevcut + 1);
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

export async function sudokuIlerlemesi(uid: string): Promise<Record<SudokuZorluk, number>> {
  try {
    const snap = await get(dbRef(kullaniciDb, sudokuIlerlemeYolu(uid)));
    const v = snap.val() ?? {};
    return {
      easy: Math.max(1, sayi(v.easy) || 1),
      medium: Math.max(1, sayi(v.medium) || 1),
      hard: Math.max(1, sayi(v.hard) || 1),
    };
  } catch {
    return { easy: 1, medium: 1, hard: 1 };
  }
}

export async function sudokuIlerlemeYaz(uid: string, zorluk: string, bolum: number): Promise<void> {
  await set(dbRef(kullaniciDb, `users/${uid}/sudoku/${zorluk}`), bolum);
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

export async function kgSeviyeOku(uid: string): Promise<number> {
  try {
    const snap = await get(dbRef(kullaniciDb, kgSeviyeYolu(uid)));
    const v = sayi(snap.val());
    return v >= 1 ? v : 1;
  } catch {
    return 1;
  }
}

export async function kgSeviyeYaz(uid: string, bolum: number): Promise<void> {
  await set(dbRef(kullaniciDb, kgSeviyeYolu(uid)), Math.max(1, bolum));
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

/** Yılın kaçıncı haftası (uygulamadaki `weekOfYear % 21` seçimi için). */
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

/** Haftalık görev TANIMLARI — uygulamadaki gibi hafta numarası % 21, boşsa 0'a düşer. */
export async function haftalikGorevTanimlari(): Promise<GorevTanim[]> {
  const hedefHafta = haftaNo() % 21;
  const tanimlar = await katalogTanimlari("weekly", (c) => sayi(c.week) === hedefHafta);
  if (tanimlar.length > 0) return tanimlar;
  return katalogTanimlari("weekly", (c) => sayi(c.week) === 0);
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
export function ayaKalanGun(): number {
  const [y, m, g] = gunAnahtari().split("-").map(Number);
  const sonGun = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Math.max(0, sonGun - g);
}

/* ------------------------------------------------------ başarımlar/rozetler */

const ROZET_SEZON = "2025_2026_guz";
const AY_ANAHTARI: Record<string, number> = {
  ocak: 0, subat: 1, mart: 2, nisan: 3, mayis: 4, haziran: 5,
};

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
export const rozetYolu = (uid: string) => `users/${uid}/badges/${ROZET_SEZON}`;

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
