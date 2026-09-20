// Ana ekranın veri mantığı (19 Eyl 2026 yeniden kurgu) — SAF, ağ yok.
//   • kaldığın yer: progress_test'teki step{n}/completedAt damgalarından en son dokunulan konu
//   • Devam Et kartının üç hâli: hiç test yok → "Hadi başlayalım", yarım konu → "Kaldığın yerden",
//     son konu bitmiş → "Sıradaki konu" (kart hiç ölmez, her zaman tek tıkla bir işe götürür)
//   • Bilkie'nin önerisi: kural tabanlı, en fazla 2 madde; veri yetersizse öneri YOK
//     (uydurma yok: bkz. feedback-no-fake-precision)

import { konuAyristir, uniteler, type Unite } from "./katalog";
import { ADIM_SAYISI, type DefterDurumu } from "./veri";

export const DERS_SIRASI = ["turkce", "matematik", "fen", "sosyal", "ingilizce"] as const;

function sayi(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

/* --------------------------------------------------------------- kaldığın yer */

export type SonDokunulan = { ders: string; konu: string; adim: number; zaman: number };

/**
 * Ham progress_test düğümünden (ders → konu → step{n}/completedAt) en son dokunulan konu.
 * completedAt'i üç platform da yazıyor (Android TestScreens.kt, iOS saveProgress, web adimSonucuYaz).
 */
export function sonDokunulanCoz(ham: unknown): SonDokunulan | null {
  let en: SonDokunulan | null = null;
  type Adim = { completedAt?: unknown };
  type Konu = { completedSteps?: unknown } & Record<string, Adim | unknown>;
  for (const [ders, konular] of Object.entries((ham ?? {}) as Record<string, Record<string, Konu>>)) {
    for (const [konu, v] of Object.entries(konular ?? {})) {
      let zaman = 0;
      for (let a = 1; a <= ADIM_SAYISI; a++) zaman = Math.max(zaman, sayi((v?.[`step${a}`] as Adim | undefined)?.completedAt));
      if (zaman <= 0) continue;
      if (!en || zaman > en.zaman) {
        en = { ders, konu, adim: Math.max(0, Math.min(ADIM_SAYISI, sayi(v?.completedSteps))), zaman };
      }
    }
  }
  return en;
}

/* -------------------------------------------------------------- devam kartı */
/* 20 Eyl 2026 (kullanıcı kararı): kart artık tek tip iş değil, ünitenin doğal sırasını izler:
     Defter → konu testleri (3 adım) → Quiz → sonraki ünitenin defteri → …
   Defter zaten bitmişse atlanır (zorla gösterme yok). "Son dokunulan" hâlâ progress_test'ten
   gelir (defter/quiz düğümlerinde zaman damgası yok); zincir o testten ileri yürüdüğü için
   yarım defter / bekleyen quiz kendiliğinden sıraya girer. */

export type DevamTuru = "defter" | "test" | "quiz";

export type DevamKarti = {
  /** dersbitti: son dokunulan test'in dersi baştan sona bitmiş ve sıradaki iş başka derste (kutlama hâli) */
  hal: "basla" | "devam" | "siradaki" | "dersbitti";
  tur: DevamTuru;
  /** yalnız dersbitti: biten dersin anahtarı ve ünite sayısı */
  bitenDers?: string;
  bitenUnite?: number;
  ders: string;
  uniteAdi: string;
  uniteIndeks: number;
  /** Kart başlığı: test → konu adı, defter/quiz → ünite adı */
  baslik: string;
  href: string;
  /** test: tamamlanan adım (0..3) */
  adim: number;
  /** defter: okunan / toplam sayfa (toplam 0 = hiç açılmamış) */
  okunanSayfa: number;
  toplamSayfa: number;
  /** 0..1 — ilerleme çubuğu; quiz'de her zaman 0 */
  oran: number;
};

type Is =
  | { tur: "defter"; ders: string; uniteAdi: string; uniteIndeks: number; key: string }
  | { tur: "test";   ders: string; uniteAdi: string; uniteIndeks: number; key: string; konuAdi: string }
  | { tur: "quiz";   ders: string; uniteAdi: string; uniteIndeks: number; key: string };

/** Sınıfın tüm işleri katalog sırasında (Türkçe → … → İngilizce; ünite içinde defter → testler → quiz). */
function isSirasi(sinif: number): Is[] {
  const out: Is[] = [];
  for (const ders of DERS_SIRASI) {
    uniteler(sinif, ders).forEach((u, ui) => {
      const ortak = { ders, uniteAdi: u.title, uniteIndeks: ui };
      // Ders sayfasıyla aynı anahtar kuralı: defterKey/quizKey boşsa ünite anahtarı
      if (!u.defterYok) out.push({ tur: "defter", ...ortak, key: u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key });
      for (const t of u.topics) {
        const { baslik, testKey } = konuAyristir(t);
        if (testKey) out.push({ tur: "test", ...ortak, key: testKey, konuAdi: baslik });
      }
      out.push({ tur: "quiz", ...ortak, key: u.quizKey && u.quizKey.length > 0 ? u.quizKey : u.key });
    });
  }
  return out;
}

export type DevamVerisi = {
  /** ders → konu → tamamlanan adım (useTestIlerlemesi) */
  ilerleme: Record<string, Record<string, number>>;
  /** ders → ünite → defter durumu (useDefterIlerlemesi) */
  defter: Record<string, Record<string, DefterDurumu>>;
  /** ders → ünite → true (useQuizBitenler) */
  quiz: Record<string, Record<string, boolean>>;
};

/** Bir iş için {bitti, başlandı, kart alanları}. */
function isDurumu(is_: Is, v: DevamVerisi) {
  if (is_.tur === "test") {
    const adim = Math.min(ADIM_SAYISI, v.ilerleme[is_.ders]?.[is_.key] ?? 0);
    return { bitti: adim >= ADIM_SAYISI, basladi: adim > 0, adim, okunanSayfa: 0, toplamSayfa: 0, oran: adim / ADIM_SAYISI };
  }
  if (is_.tur === "defter") {
    const d = v.defter[is_.ders]?.[is_.key];
    const okunan = d?.okunanSayfa ?? 0, toplam = d?.toplamSayfa ?? 0;
    const oran = toplam > 0 ? Math.min(1, okunan / toplam) : 0;
    return { bitti: d?.bitti === true, basladi: okunan > 0, adim: 0, okunanSayfa: okunan, toplamSayfa: toplam, oran };
  }
  return { bitti: v.quiz[is_.ders]?.[is_.key] === true, basladi: false, adim: 0, okunanSayfa: 0, toplamSayfa: 0, oran: 0 };
}

function karta(is_: Is, hal: DevamKarti["hal"], d: ReturnType<typeof isDurumu>): DevamKarti {
  const href = is_.tur === "test" ? `/test/${is_.ders}/${is_.key}`
    : is_.tur === "defter" ? `/defter/${is_.ders}/${is_.key}` : `/quiz/${is_.ders}/${is_.key}`;
  return {
    hal, tur: is_.tur, ders: is_.ders, uniteAdi: is_.uniteAdi, uniteIndeks: is_.uniteIndeks,
    baslik: is_.tur === "test" ? is_.konuAdi : is_.uniteAdi,
    href, adim: d.adim, okunanSayfa: d.okunanSayfa, toplamSayfa: d.toplamSayfa, oran: d.oran,
  };
}

/**
 * Devam Et kartı.
 *   • Hiç test dokunulmamış → zincirin başından ilk bitmemiş iş (Başla; yarım defterse Devam Et)
 *   • Son dokunulan test yarım → o test (Başla/Devam Et)
 *   • Son test bitmiş → zincirde ondan SONRAKİ ilk bitmemiş iş, başa sararak (Sıradaki;
 *     iş yarım başlanmışsa Devam Et). Her şey bitmişse null (kart çıkmaz).
 */
export function devamKartiHesapla(sinif: number, son: SonDokunulan | null, veri: DevamVerisi): DevamKarti | null {
  const sira = isSirasi(sinif);
  if (sira.length === 0) return null;

  const i = son ? sira.findIndex((k) => k.tur === "test" && k.ders === son.ders && k.key === son.konu) : -1;
  if (i >= 0) {
    const d = isDurumu(sira[i], veri);
    if (!d.bitti) return karta(sira[i], d.basladi ? "devam" : "basla", d);
  }
  const baslangic = i >= 0 ? i + 1 : 0;
  for (let n = 0; n < sira.length; n++) {
    const is_ = sira[(baslangic + n) % sira.length];
    const d = isDurumu(is_, veri);
    if (d.bitti) continue;
    // Ders sınırı aşıldı ve son dokunulan ders tamamen bitmiş → kutlama hâli (bayrak yok: ilk
    // Matematik testi çözülünce "son dokunulan" oraya geçer, kart kendiliğinden normale döner).
    // Sıradaki iş daha önce yarım bırakılmış olsa da kutlanır; düğme "…e devam et" der.
    if (i >= 0 && son && is_.ders !== son.ders && dersBittiMi(sira, son.ders, veri)) {
      return { ...karta(is_, "dersbitti", d), bitenDers: son.ders, bitenUnite: uniteler(sinif, son.ders).length };
    }
    const hal: DevamKarti["hal"] = d.basladi ? "devam" : i >= 0 ? "siradaki" : "basla";
    return karta(is_, hal, d);
  }
  return null;
}

function dersBittiMi(sira: Is[], ders: string, veri: DevamVerisi): boolean {
  const isler = sira.filter((k) => k.ders === ders);
  return isler.length > 0 && isler.every((k) => isDurumu(k, veri).bitti);
}

/* ------------------------------------------------------------- ders oranları */
/* 20 Eyl 2026 (kullanıcı kararı, B seçeneği): bar artık yalnız test adımlarını değil ünitenin
   iş zincirini sayar — defter 1 + her konu 3 adım + quiz 1. Devam Et kartı ve "dersi bitirdin"
   kutlamasıyla aynı dil: defter/quiz yapılmadan %100 olmaz. Android/iOS'ta da aynı hesaba geçilmeli
   (eski hesapla %100 görünen ders yeni hesapta düşer; mobil güncellemesinde açıklanmalı). */

export type IsOrani = { yapilan: number; toplam: number };

/** Bir ünitenin iş sayımı: defter (varsa) + konu adımları + quiz. */
export function uniteIsOrani(u: Unite, ders: string, veri: DevamVerisi): IsOrani {
  let yapilan = 0, toplam = 0;
  if (!u.defterYok) {
    toplam += 1;
    const defterKey = u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key;
    if (veri.defter[ders]?.[defterKey]?.bitti) yapilan += 1;
  }
  for (const t of u.topics) {
    const { testKey } = konuAyristir(t);
    if (!testKey) continue;
    toplam += ADIM_SAYISI;
    yapilan += Math.min(ADIM_SAYISI, veri.ilerleme[ders]?.[testKey] ?? 0);
  }
  toplam += 1;
  const quizKey = u.quizKey && u.quizKey.length > 0 ? u.quizKey : u.key;
  if (veri.quiz[ders]?.[quizKey] === true) yapilan += 1;
  return { yapilan, toplam };
}

/** Ders → 0..1 (ünite iş sayımlarının toplamı). Ana ekran ders kartı ve ders sayfası özet çubuğu. */
export function dersOranlari(sinif: number, veri: DevamVerisi): Record<string, number> {
  const out: Record<string, number> = {};
  for (const ders of DERS_SIRASI) {
    const liste = uniteler(sinif, ders);
    if (liste.length === 0) continue;
    let yapilan = 0, toplam = 0;
    for (const u of liste) { const o = uniteIsOrani(u, ders, veri); yapilan += o.yapilan; toplam += o.toplam; }
    out[ders] = toplam > 0 ? Math.min(1, yapilan / toplam) : 0;
  }
  return out;
}

/* -------------------------------------------------------------------- öneri */

export type KonuIstatistikOzeti = { basari: number; soru: number };

export type Oneri = {
  kural: "guclendir" | "quiz" | "bosluk";
  ders: string;
  baslik: string;
  neden: string;
  href: string;
  eylem: string;
};

/** Güçlendir kuralı: bu kadar sorudan azıyla "zayıf" demeyiz. */
export const ONERI_SORU_ESIGI = 10;
/** Başarı bu yüzdenin üstündeyse "tekrar çöz" önerisi çıkmaz. */
export const ONERI_BASARI_TAVANI = 70;

/**
 * En fazla 2 öneri. Sıra: Güçlendir (en düşük başarı, ≥10 soru, <%70) → Quiz kaldı (defter
 * bitmiş, quiz çözülmemiş) → Boşluk (hiç dokunulmamış ders). Aynı kuraldan tek madde.
 * `istatistik`: ders → konu → {basari, soru}; `defter`: ders → ünite → durum; `quiz`: ders → ünite → true.
 * Kartın gösterdiği quiz atlanır; yerine varsa o dersteki bir sonraki bekleyen quiz gelir.
 */
export function onerileriHesapla(args: {
  sinif: number;
  ilerleme: Record<string, Record<string, number>>;
  istatistik: Record<string, Record<string, KonuIstatistikOzeti>>;
  defter: Record<string, Record<string, DefterDurumu>>;
  quiz: Record<string, Record<string, boolean>>;
  dersAdi: (ders: string) => string;
  /** Devam Et kartı zaten bu quizi gösteriyorsa öneride tekrar etme (20 Eyl) */
  haricQuiz?: { ders: string; key: string } | null;
  /** Kart zaten bu derse "geçelim mi?" diyorsa "hiç dokunmadın" önerisi tekrar etmesin (20 Eyl) */
  haricDers?: string | null;
}): Oneri[] {
  const { sinif, ilerleme, istatistik, defter, quiz, dersAdi, haricQuiz, haricDers } = args;
  const out: Oneri[] = [];

  // 1) Güçlendir
  let zayif: { ders: string; konuKey: string; basari: number; soru: number } | null = null;
  for (const ders of DERS_SIRASI) {
    for (const [konuKey, s] of Object.entries(istatistik[ders] ?? {})) {
      if (s.soru < ONERI_SORU_ESIGI || s.basari >= ONERI_BASARI_TAVANI) continue;
      if (!zayif || s.basari < zayif.basari) zayif = { ders, konuKey, basari: s.basari, soru: s.soru };
    }
  }
  if (zayif) {
    const ad = konuAdiBul(sinif, zayif.ders, zayif.konuKey);
    if (ad) {
      out.push({
        kural: "guclendir", ders: zayif.ders,
        baslik: `${ad} konusunu bir kez daha çöz`,
        neden: `${zayif.soru} soruda %${zayif.basari} doğru — en zayıf konun`,
        href: `/test/${zayif.ders}/${zayif.konuKey}`, eylem: "ÇÖZ",
      });
    }
  }

  // 2) Defter bitmiş, quiz çözülmemiş
  for (const ders of DERS_SIRASI) {
    const liste = uniteler(sinif, ders);
    for (let i = 0; i < liste.length; i++) {
      const u = liste[i];
      const defterKey = u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key;
      const quizKey = u.quizKey && u.quizKey.length > 0 ? u.quizKey : u.key;
      if (haricQuiz && haricQuiz.ders === ders && haricQuiz.key === quizKey) continue;
      if ((u.defterYok || defter[ders]?.[defterKey]?.bitti) && !quiz[ders]?.[quizKey]) {
        out.push({
          kural: "quiz", ders,
          baslik: `${i + 1}. ünitenin quizi seni bekliyor`,
          neden: `${dersAdi(ders)} · defteri bitirdin, quiz çözülmedi`,
          href: `/quiz/${ders}/${quizKey}`, eylem: "QUIZ",
        });
        break;
      }
    }
    if (out.length >= 2) return out;
  }

  // 3) Hiç dokunulmamış ders (yalnız başka bir şey öneriyorsak — tek başına "hiç" anlamsız)
  if (out.length > 0) {
    for (const ders of DERS_SIRASI) {
      if (ders === haricDers) continue;
      const liste = uniteler(sinif, ders);
      if (liste.length === 0) continue;
      const dokunuldu = Object.values(ilerleme[ders] ?? {}).some((a) => a > 0);
      if (dokunuldu) continue;
      const ilk = liste[0].topics.map(konuAyristir).find((k) => k.testKey);
      if (!ilk) continue;
      out.push({
        kural: "bosluk", ders,
        baslik: `${dersAdi(ders)} dersine hiç dokunmadın`,
        neden: `${liste[0].title} ile başla`,
        href: `/test/${ders}/${ilk.testKey}`, eylem: "BAŞLA",
      });
      break;
    }
  }
  return out.slice(0, 2);
}

function konuAdiBul(sinif: number, ders: string, konuKey: string): string | null {
  for (const u of uniteler(sinif, ders)) {
    for (const t of u.topics) {
      const k = konuAyristir(t);
      if (k.testKey === konuKey) return k.baslik;
    }
  }
  return null;
}

/* ---------------------------------------------------------------- ders adı */

/** "Türkçeyi bitirdin" / "Matematiğe geçelim mi?" — ders adı özel ad değil: kesme yok, k→ğ yumuşar
 *  (TDK: Türkçe/İngilizce gibi dil adlarına gelen ekler de kesmeyle ayrılmaz). Ünlü uyumu elle. */
export function dersEkli(ders: string, sinif: number, ek: "i" | "e"): string {
  const ad = dersEtiketi(ders, sinif);
  const I: Record<string, string> = {
    "Türkçe": "Türkçeyi", "Matematik": "Matematiği", "Fen Bilimleri": "Fen Bilimlerini",
    "Sosyal Bilgiler": "Sosyal Bilgileri", "Hayat Bilgisi": "Hayat Bilgisini",
    "T.C. İnkılap Tarihi": "İnkılap Tarihini", "İngilizce": "İngilizceyi",
  };
  const E: Record<string, string> = {
    "Türkçe": "Türkçeye", "Matematik": "Matematiğe", "Fen Bilimleri": "Fen Bilimlerine",
    "Sosyal Bilgiler": "Sosyal Bilgilere", "Hayat Bilgisi": "Hayat Bilgisine",
    "T.C. İnkılap Tarihi": "İnkılap Tarihine", "İngilizce": "İngilizceye",
  };
  return (ek === "i" ? I : E)[ad] ?? ad;
}

/** Sosyal 3'te Hayat Bilgisi, 8'de İnkılap — ders sayfası ve listelerle aynı kural. */
export function dersEtiketi(ders: string, sinif: number): string {
  const AD: Record<string, string> = {
    turkce: "Türkçe", matematik: "Matematik", fen: "Fen Bilimleri", sosyal: "Sosyal Bilgiler", ingilizce: "İngilizce",
  };
  if (ders === "sosyal" && sinif === 3) return "Hayat Bilgisi";
  if (ders === "sosyal" && sinif === 8) return "T.C. İnkılap Tarihi";
  return AD[ders] ?? ders;
}
