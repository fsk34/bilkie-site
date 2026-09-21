// Bilkie AI — kural tabanlı koç (20 Eyl 2026). SAF: ağ yok, React yok. API/LLM YOK:
// elimizdeki istatistikten teşhis çıkarır, Bilkie'nin ağzından tek cümle + en fazla 3 eylem üretir.
// Kırmızı çizgi (feedback-no-fake-precision): veri yetersizse teşhis UYDURMAZ, "seni tanıyayım" der.
//
// Girdi (hepsi zaten yazılıyor, yeni şema yok):
//   • stats/grade{N}/subjects/{ders}/tests + topics/{konu}/tests: successRate, totalQuestions,
//     avgDurationSec (test başına), updatedAt
//   • progress_test / progress_defter(_done) / quiz_done (DevamVerisi)
//   • yazılı takvimi (bir sonraki sınava kaç gün), seri (bugün aktif mi), saat
// Çıktı: KocPlani → ana ekrandaki "Bilkie AI" kartı. Sonra İstatistik'te tam alan (haftalık kova +
// son 5 sonuç eklenince trend: düzeliyor/geriliyor).

import { konuAyristir, uniteler } from "./katalog";
import { ADIM_SAYISI } from "./veri";
import { DERS_SIRASI, dersEkli, dersEtiketi, type DevamKarti, type DevamVerisi } from "./anaEkran";
import { HATA_ONERI_ESIGI } from "./hatalar";

/* ------------------------------------------------------------------- tipler */

export type KovaIstatistigi = {
  basari: number; soru: number; cozulen: number; ortSn: number; guncelleme: number;
  /** Evde çözülen soruların payı (0..1); süre/dikkat kuralları evde verisini KULLANMAZ (süre yok) */
  evPayi?: number;
};
export type DersIstatistigi = { tests: KovaIstatistigi | null; topics: Record<string, KovaIstatistigi> };
/** ders → {tests, topics} */
export type KocIstatistik = Record<string, DersIstatistigi>;

export type KocGirdi = {
  sinif: number;
  veri: DevamVerisi;
  istatistik: KocIstatistik;
  /** Devam Et kartının gösterdiği iş — aynı hedefi ikinci kez önerme */
  devam: DevamKarti | null;
  /** Bir sonraki (ya da açık) yazılı: kaç gün kaldı (açıksa 0) */
  yazili: { ad: string; anahtar: string; gunKaldi: number } | null;
  seri: { seri: number; bugunAktif: boolean } | null;
  /** Yanlış soru kayıtları (hatalar.ts): olgunlaşmış (≥3 gün) ve toplam sayı */
  hatalar: { olgun: number; toplam: number } | null;
  /** Şimdi (ms) ve günün saati — testlerde sabitlenebilsin diye dışarıdan */
  simdi: number;
  saat: number;
};

export type KocKural =
  | "az-veri" | "yazili" | "hata" | "dikkatsiz" | "zayif" | "yavas" | "defter-once"
  | "quiz" | "dengesiz" | "tekrar" | "seri" | "bosluk" | "harika";

export type KocEylem = { kural: KocKural; ders: string; baslik: string; neden: string; href: string; etiket: string };

export type KocPlani = {
  /** Bilkie'nin tek cümlelik mesajı (ana ekran kartı) */
  mesaj: string;
  /** Mesajın dayandığı kural — ölçüm/ayıklama için */
  kural: KocKural;
  /** Mesajın kendi eylemi (kartta tek düğme); yoksa null */
  eylem: KocEylem | null;
  /** Başka öneriler: en fazla 2, hepsi farklı dersten (birbirinden ve ana eylemden), Devam Et hedefi hariç */
  digerleri: KocEylem[];
};

/* ---------------------------------------------------------------- eşikler */

export const ESIK = {
  /** Bu kadar toplam sorudan azıyla koç teşhis koymaz */
  tanimaSoru: 20,
  /** Konu bazlı teşhisler için konu başına en az soru */
  konuSoru: 10,
  zayifBasari: 70,
  dikkatsizBasari: 60,
  /** Konu süresi ders ortalamasının bu katından kısaysa "hızlı" */
  hizliOran: 0.6,
  yavasBasari: 80,
  /** Konu süresi ders ortalamasının bu katından uzunsa "yavaş" */
  yavasOran: 1.5,
  yaziliGun: 21,
  /** Derse bu kadar gündür dokunulmamışsa "dengesiz" adayı */
  dokunulmadiGun: 14,
  /** Konu bitmişse ve bu kadar gündür dokunulmamışsa "tekrar" adayı */
  tekrarGun: 14,
  tekrarBasariTavani: 90,
  /** Seri hatırlatması bu saatten sonra */
  seriSaat: 18,
} as const;

const GUN = 24 * 60 * 60 * 1000;

/* --------------------------------------------------------------- çözücü */

function sayi(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
}

function kovaCoz(v: unknown): KovaIstatistigi | null {
  const t = (v ?? {}) as Record<string, unknown>;
  const soru = sayi(t.totalQuestions);
  if (soru <= 0) return null;
  const dogru = sayi(t.totalCorrect);
  const kayitli = sayi(t.successRate);
  const basari = kayitli !== 0 ? Math.round(kayitli) : Math.round((dogru / soru) * 100);
  return {
    basari: Math.max(0, Math.min(100, basari)),
    soru,
    cozulen: sayi(t.solvedCount),
    ortSn: Math.max(0, sayi(t.avgDurationSec)),
    guncelleme: sayi(t.updatedAt),
  };
}

/** stats/grade{N}/subjects ham düğümü → KocIstatistik (saf). */
export function kocIstatistikCoz(subjectsHam: unknown): KocIstatistik {
  const out: KocIstatistik = {};
  for (const [ders, v] of Object.entries((subjectsHam ?? {}) as Record<string, Record<string, unknown>>)) {
    const topics: Record<string, KovaIstatistigi> = {};
    for (const [konu, k] of Object.entries((v?.topics ?? {}) as Record<string, Record<string, unknown>>)) {
      const c = kovaCoz(k?.tests);
      if (c) topics[konu] = c;
    }
    out[ders] = { tests: kovaCoz(v?.tests), topics };
  }
  return out;
}

/**
 * Evde çözülenleri (evde.ts özeti) istatistiğe katar: konu başarı/soru ağırlıklı birleşir, `evPayi` işaretlenir.
 * Süre (ortSn) ve updatedAt uygulama verisinden kalır — dikkatsiz/yavaş kuralları ev verisine bakmaz.
 */
export function istatistikBirlestir(
  app: KocIstatistik,
  evde: Record<string, { dogru: number; soru: number; konular: Record<string, { dogru: number; soru: number }> }>
): KocIstatistik {
  const out: KocIstatistik = {};
  const dersler = new Set([...Object.keys(app), ...Object.keys(evde)]);
  for (const ders of dersler) {
    const a = app[ders] ?? { tests: null, topics: {} };
    const e = evde[ders];
    const topics: Record<string, KovaIstatistigi> = { ...a.topics };
    if (e) {
      for (const [konu, ev] of Object.entries(e.konular)) {
        const m = topics[konu];
        const appSoru = m?.soru ?? 0, appDogru = m ? Math.round((m.basari / 100) * m.soru) : 0;
        const soru = appSoru + ev.soru, dogru = appDogru + ev.dogru;
        topics[konu] = {
          basari: soru > 0 ? Math.round((dogru / soru) * 100) : 0, soru,
          cozulen: m?.cozulen ?? 0, ortSn: m?.ortSn ?? 0, guncelleme: m?.guncelleme ?? 0,
          evPayi: soru > 0 ? ev.soru / soru : 0,
        };
      }
    }
    const t = a.tests;
    const tests: KovaIstatistigi | null = e
      ? {
          basari: (t?.soru ?? 0) + e.soru > 0 ? Math.round(((t ? (t.basari / 100) * t.soru : 0) + e.dogru) / ((t?.soru ?? 0) + e.soru) * 100) : 0,
          soru: (t?.soru ?? 0) + e.soru, cozulen: t?.cozulen ?? 0, ortSn: t?.ortSn ?? 0, guncelleme: t?.guncelleme ?? 0,
          evPayi: e.soru / ((t?.soru ?? 0) + e.soru),
        }
      : t;
    out[ders] = { tests, topics };
  }
  return out;
}

/** Ağdan oku + çöz (tek okuma; kutu açılınca). */

/* ----------------------------------------------------------------- yardımcı */

type Konum = { ders: string; uniteAdi: string; uniteIndeks: number; konuAdi: string; konuKey: string; unite: ReturnType<typeof uniteler>[number] };

function konuBul(sinif: number, ders: string, konuKey: string): Konum | null {
  const liste = uniteler(sinif, ders);
  for (let i = 0; i < liste.length; i++) {
    for (const t of liste[i].topics) {
      const k = konuAyristir(t);
      if (k.testKey === konuKey) return { ders, uniteAdi: liste[i].title, uniteIndeks: i, konuAdi: k.baslik, konuKey, unite: liste[i] };
    }
  }
  return null;
}

const defterAnahtari = (u: ReturnType<typeof uniteler>[number]) => (u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key);
const quizAnahtari = (u: ReturnType<typeof uniteler>[number]) => (u.quizKey && u.quizKey.length > 0 ? u.quizKey : u.key);

function testHref(ders: string, konuKey: string) { return `/test/${ders}/${konuKey}`; }

/* ------------------------------------------------------------------ motor */

/**
 * Teşhisler öncelik sırasıyla denenir; ilk tutan mesajı verir, diğerleri (tutanlar) eylem olur.
 * Devam Et kartının hedefi eylemlerden ayıklanır. En fazla 3 eylem, aynı kuraldan tek.
 */
/** Tek gözlem: kural + Bilgie'nin cümlesi + (varsa) eylem. İstatistik'teki Bilgie Koç sekmesi hepsini listeler. */
export type KocGozlem = { kural: KocKural; mesaj: string; eylem: KocEylem | null };

/** Tutan TÜM kurallar öncelik sırasıyla (az-veri tutarsa tek başına döner). */
export function kocGozlemleri(g: KocGirdi): KocGozlem[] {
  const { sinif, veri, istatistik, yazili, seri, hatalar, simdi, saat } = g;
  const adaylar: KocGozlem[] = [];
  const dersAdi = (d: string) => dersEtiketi(d, sinif);

  const toplamSoru = DERS_SIRASI.reduce((t, d) => t + (istatistik[d]?.tests?.soru ?? 0), 0);

  // 0) Tanıma aşaması: veri yetersiz → teşhis yok
  if (toplamSoru < ESIK.tanimaSoru) {
    const kalan = ESIK.tanimaSoru - toplamSoru;
    return [{
      kural: "az-veri",
      mesaj: toplamSoru === 0
        ? "Seni henüz tanımıyorum. İlk testini çöz, nerede iyi nerede zorlanıyorsun görelim."
        : `Seni tanımaya başladım. ${kalan} soru daha çözersen sana özel plan çıkarabilirim.`,
      eylem: null,
    }];
  }

  // 1) Yazılıya N gün: o dersin en zayıf konusu
  if (yazili && yazili.gunKaldi <= ESIK.yaziliGun) {
    const zayif = enZayifKonu(sinif, istatistik, null);
    const gun = yazili.gunKaldi;
    const mesaj = gun === 0
      ? `${yazili.ad} dönemi açık! Zayıf konuları toparlayıp yazılıya girelim.`
      : `${yazili.ad} sınavına ${gun} gün var. ${zayif ? `Önce ${zayif.konuAdi} konusunu sağlamlaştıralım.` : "Her dersten bir tur çözelim."}`;
    adaylar.push({
      kural: "yazili", mesaj,
      eylem: zayif ? {
        kural: "yazili", ders: zayif.ders, baslik: `${zayif.konuAdi} — yazılı öncesi tekrar`,
        neden: `%${zayif.basari} doğru · ${gun === 0 ? "dönem açık" : `yazılıya ${gun} gün`}`,
        href: testHref(zayif.ders, zayif.konuKey), etiket: "ÇÖZ",
      } : null,
    });
  }

  // 2) Hata Turu: 3 gün önce yanlış yapılan sorular olgunlaştı (Duolingo "Mistakes"; en etkili tek kural)
  if (hatalar && hatalar.olgun >= HATA_ONERI_ESIGI) {
    adaylar.push({
      kural: "hata",
      mesaj: `Birkaç gün önce yanlış yaptığın ${hatalar.olgun} soru var. Hata turuyla hepsini temizleyelim mi?`,
      eylem: {
        kural: "hata", ders: "hata", baslik: `Hata turu — ${hatalar.olgun} soru`,
        neden: hatalar.toplam > hatalar.olgun ? `${hatalar.toplam - hatalar.olgun} yanlış daha olgunlaşıyor` : "yanlışlarını doğruya çevir",
        href: "/hata-turu", etiket: "TUR",
      },
    });
  }

  // 3) Dikkatsiz: hızlı + yanlış (konu süresi ders ortalamasının %60'ından kısa, başarı < %60)
  {
    let en: { ders: string; k: Konum; s: KovaIstatistigi; oran: number } | null = null;
    for (const ders of DERS_SIRASI) {
      const d = istatistik[ders];
      if (!d?.tests || d.tests.ortSn <= 0) continue;
      for (const [konuKey, s] of Object.entries(d.topics)) {
        if (s.soru < ESIK.konuSoru || s.ortSn <= 0 || (s.evPayi ?? 0) > 0) continue;
        const oran = s.ortSn / d.tests.ortSn;
        if (s.basari < ESIK.dikkatsizBasari && oran < ESIK.hizliOran) {
          const k = konuBul(sinif, ders, konuKey);
          if (k && (!en || oran < en.oran)) en = { ders, k, s, oran };
        }
      }
    }
    if (en) adaylar.push({
      kural: "dikkatsiz",
      mesaj: `${en.k.konuAdi} testlerinde çok hızlı geçiyorsun ve yanlışlar artıyor. Soruyu iki kez oku, acele etme.`,
      eylem: {
        kural: "dikkatsiz", ders: en.ders, baslik: `${en.k.konuAdi} — bu kez yavaş çöz`,
        neden: `%${en.s.basari} doğru · ders ortalamasından %${Math.round((1 - en.oran) * 100)} hızlı`,
        href: testHref(en.ders, en.k.konuKey), etiket: "ÇÖZ",
      },
    });
  }

  // 4) Zayıf konu (en düşük başarı, ≥10 soru, <%70)
  {
    const z = enZayifKonu(sinif, istatistik, ESIK.zayifBasari);
    if (z) adaylar.push({
      kural: "zayif",
      mesaj: `${z.konuAdi} konusunda zorlanıyorsun (%${z.basari}${z.evPayi > 0 ? ", evde çözdüklerin dahil" : ""}). Bir tur daha çözersek toparlarız.`,
      eylem: {
        kural: "zayif", ders: z.ders, baslik: `${z.konuAdi} konusunu bir kez daha çöz`,
        neden: `${z.soru} soruda %${z.basari} doğru — en zayıf konun`,
        href: testHref(z.ders, z.konuKey), etiket: "ÇÖZ",
      },
    });
  }

  // 5) Biliyor ama yavaş (başarı ≥ %80, süre ders ortalamasının 1,5 katı)
  {
    let en: { ders: string; k: Konum; s: KovaIstatistigi; oran: number } | null = null;
    for (const ders of DERS_SIRASI) {
      const d = istatistik[ders];
      if (!d?.tests || d.tests.ortSn <= 0) continue;
      for (const [konuKey, s] of Object.entries(d.topics)) {
        if (s.soru < ESIK.konuSoru || s.ortSn <= 0 || (s.evPayi ?? 0) > 0) continue;
        const oran = s.ortSn / d.tests.ortSn;
        if (s.basari >= ESIK.yavasBasari && oran >= ESIK.yavasOran) {
          const k = konuBul(sinif, ders, konuKey);
          if (k && (!en || oran > en.oran)) en = { ders, k, s, oran };
        }
      }
    }
    if (en) adaylar.push({
      kural: "yavas",
      mesaj: `${en.k.konuAdi} konusunu biliyorsun ama yavaşsın. Bir hız turu iyi gelir.`,
      eylem: {
        kural: "yavas", ders: en.ders, baslik: `${en.k.konuAdi} — hız turu`,
        neden: `%${en.s.basari} doğru ama ders ortalamasının ${en.oran.toFixed(1)} katı süre`,
        href: testHref(en.ders, en.k.konuKey), etiket: "HIZLAN",
      },
    });
  }

  // 6) Defter okumadan test: ünitede test var, defter hiç açılmamış
  {
    let bulunan: { ders: string; u: ReturnType<typeof uniteler>[number]; i: number } | null = null;
    dis: for (const ders of DERS_SIRASI) {
      const liste = uniteler(sinif, ders);
      for (let i = 0; i < liste.length; i++) {
        const u = liste[i];
        if (u.defterYok) continue;
        const dk = defterAnahtari(u);
        const d = veri.defter[ders]?.[dk];
        if (d?.bitti || (d?.okunanSayfa ?? 0) > 0) continue;
        const testVar = u.topics.some((t) => (veri.ilerleme[ders]?.[konuAyristir(t).testKey] ?? 0) > 0);
        if (testVar) { bulunan = { ders, u, i }; break dis; }
      }
    }
    if (bulunan) adaylar.push({
      kural: "defter-once",
      mesaj: `${dersAdi(bulunan.ders)} ${bulunan.i + 1}. ünitede test çözüyorsun ama defteri hiç açmadın. Önce okumak testleri kolaylaştırır.`,
      eylem: {
        kural: "defter-once", ders: bulunan.ders, baslik: `${bulunan.i + 1}. ünitenin defterini oku`,
        neden: bulunan.u.title,
        href: `/defter/${bulunan.ders}/${defterAnahtari(bulunan.u)}`, etiket: "OKU",
      },
    });
  }

  // 7) Quiz bekliyor (defter bitmiş, quiz çözülmemiş)
  {
    let bulunan: { ders: string; u: ReturnType<typeof uniteler>[number]; i: number } | null = null;
    dis: for (const ders of DERS_SIRASI) {
      const liste = uniteler(sinif, ders);
      for (let i = 0; i < liste.length; i++) {
        const u = liste[i];
        const defterTamam = u.defterYok || veri.defter[ders]?.[defterAnahtari(u)]?.bitti;
        if (defterTamam && !veri.quiz[ders]?.[quizAnahtari(u)]) { bulunan = { ders, u, i }; break dis; }
      }
    }
    if (bulunan) adaylar.push({
      kural: "quiz",
      mesaj: `${dersAdi(bulunan.ders)} ${bulunan.i + 1}. ünitenin defteri bitti, quizi seni bekliyor.`,
      eylem: {
        kural: "quiz", ders: bulunan.ders, baslik: `${bulunan.i + 1}. ünitenin quizini çöz`,
        neden: `${bulunan.u.title} · defter bitti, quiz kaldı`,
        href: `/quiz/${bulunan.ders}/${quizAnahtari(bulunan.u)}`, etiket: "QUIZ",
      },
    });
  }

  // 8) Dengesiz: bir derse ≥14 gündür dokunulmamış, başka derse son 7 günde dokunulmuş
  {
    const sonYedi = DERS_SIRASI.some((d) => simdi - (istatistik[d]?.tests?.guncelleme ?? 0) < 7 * GUN);
    if (sonYedi) {
      let en: { ders: string; gun: number } | null = null;
      for (const ders of DERS_SIRASI) {
        if (uniteler(sinif, ders).length === 0) continue;
        const g0 = istatistik[ders]?.tests?.guncelleme ?? 0;
        if (g0 === 0) continue; // hiç dokunulmamış ders "boşluk" kuralının işi
        const gun = Math.floor((simdi - g0) / GUN);
        if (gun >= ESIK.dokunulmadiGun && (!en || gun > en.gun)) en = { ders, gun };
      }
      if (en) {
        const ilk = ilkBitmemisKonu(sinif, en.ders, veri);
        adaylar.push({
          kural: "dengesiz",
          mesaj: `${dersAdi(en.ders)} dersine ${en.gun} gündür dokunmadın. Bugün ${dersEkli(en.ders, sinif, "e")} dönmek iyi gelir.`,
          eylem: ilk ? {
            kural: "dengesiz", ders: en.ders, baslik: `${ilk.konuAdi} — bu derse dön`,
            neden: `${en.gun} gündür dokunmadın`,
            href: testHref(en.ders, ilk.konuKey), etiket: "ÇÖZ",
          } : null,
        });
      }
    }
  }

  // 9) Tekrar zamanı: konu bitmiş (3/3), ≥14 gün önce, başarı < %90
  {
    let en: { k: Konum; s: KovaIstatistigi; gun: number } | null = null;
    for (const ders of DERS_SIRASI) {
      for (const [konuKey, s] of Object.entries(istatistik[ders]?.topics ?? {})) {
        if ((veri.ilerleme[ders]?.[konuKey] ?? 0) < ADIM_SAYISI) continue;
        if (s.guncelleme === 0 || s.basari >= ESIK.tekrarBasariTavani) continue;
        const gun = Math.floor((simdi - s.guncelleme) / GUN);
        if (gun < ESIK.tekrarGun) continue;
        const k = konuBul(sinif, ders, konuKey);
        if (k && (!en || gun > en.gun)) en = { k, s, gun };
      }
    }
    if (en) adaylar.push({
      kural: "tekrar",
      mesaj: `${en.k.konuAdi} konusunu ${en.gun} gün önce bitirdin. Unutmamak için kısa bir tekrar zamanı.`,
      eylem: {
        kural: "tekrar", ders: en.k.ders, baslik: `${en.k.konuAdi} — hatırlama turu`,
        neden: `${en.gun} gün önce %${en.s.basari} ile bitirdin`,
        href: testHref(en.k.ders, en.k.konuKey), etiket: "TEKRAR",
      },
    });
  }

  // 10) Seri riski: bugün aktif değil, akşam, seri var — yalnız mesaj (eylem = Devam Et kartı)
  if (seri && !seri.bugunAktif && seri.seri > 0 && saat >= ESIK.seriSaat) {
    adaylar.push({
      kural: "seri",
      mesaj: `${seri.seri} günlük serin bugün kopmasın. Kısa bir test yeter.`,
      eylem: null,
    });
  }

  // 11) Boşluk: hiç dokunulmamış ders
  for (const ders of DERS_SIRASI) {
    const liste = uniteler(sinif, ders);
    if (liste.length === 0) continue;
    const dokunuldu = (istatistik[ders]?.tests?.soru ?? 0) > 0 || Object.values(veri.ilerleme[ders] ?? {}).some((a) => a > 0);
    if (dokunuldu) continue;
    const ilk = ilkBitmemisKonu(sinif, ders, veri);
    if (!ilk) continue;
    adaylar.push({
      kural: "bosluk",
      mesaj: `${dersAdi(ders)} dersine hiç dokunmadın. ${liste[0].title} ile başlayalım mı?`,
      eylem: {
        kural: "bosluk", ders, baslik: `${dersAdi(ders)} dersine başla`,
        neden: `hiç dokunmadın · ${liste[0].title}`, href: testHref(ders, ilk.konuKey), etiket: "BAŞLA",
      },
    });
    break;
  }

  return adaylar;
}

/** Ana ekran kartı: ilk gözlem mesaj + düğme, diğerleri "Başka önerim" (≤2, farklı dersler). */
export function kocPlaniHesapla(g: KocGirdi): KocPlani {
  const adaylar = kocGozlemleri(g);
  if (adaylar.length === 1 && adaylar[0].kural === "az-veri") {
    return { kural: "az-veri", mesaj: adaylar[0].mesaj, eylem: null, digerleri: [] };
  }
  if (adaylar.length === 0) {
    return {
      kural: "harika",
      mesaj: "Her şey yolunda görünüyor. Kaldığın yerden devam et, ben buradayım.",
      eylem: null, digerleri: [],
    };
  }
  const { devam } = g;
  // Mesaj önceliği: gerçek teşhis > seri hatırlatması > boşluk ("hiç dokunmadın" zayıf bir sinyal)
  const ilk = adaylar.find((a) => a.kural !== "seri" && a.kural !== "bosluk")
    ?? adaylar.find((a) => a.kural === "seri")
    ?? adaylar[0];

  // Başka öneriler: ana eylemle aynı ders/hedef olmaz, dersler tekrar etmez, Devam Et hedefi hariç.
  // (Ekran görüntüsü, 20 Eyl: bir dersten üç madde çıkınca liste dağınık duruyordu.)
  const devamHref = devam ? devam.href : null;
  const dersler = new Set<string>(ilk.eylem ? [ilk.eylem.ders] : []);
  const hedefler = new Set<string>(ilk.eylem ? [ilk.eylem.href] : []);
  const digerleri: KocEylem[] = [];
  for (const a of adaylar) {
    const e = a.eylem;
    if (!e || a === ilk) continue;
    if (e.href === devamHref || hedefler.has(e.href) || dersler.has(e.ders)) continue;
    dersler.add(e.ders); hedefler.add(e.href);
    digerleri.push(e);
    if (digerleri.length >= 2) break;
  }
  return { kural: ilk.kural, mesaj: ilk.mesaj, eylem: ilk.eylem && ilk.eylem.href !== devamHref ? ilk.eylem : null, digerleri };
}

function enZayifKonu(sinif: number, istatistik: KocIstatistik, tavan: number | null) {
  let en: { ders: string; konuKey: string; konuAdi: string; basari: number; soru: number; evPayi: number } | null = null;
  for (const ders of DERS_SIRASI) {
    for (const [konuKey, s] of Object.entries(istatistik[ders]?.topics ?? {})) {
      if (s.soru < ESIK.konuSoru) continue;
      if (tavan !== null && s.basari >= tavan) continue;
      if (!en || s.basari < en.basari) {
        const k = konuBul(sinif, ders, konuKey);
        if (k) en = { ders, konuKey, konuAdi: k.konuAdi, basari: s.basari, soru: s.soru, evPayi: s.evPayi ?? 0 };
      }
    }
  }
  return en;
}

function ilkBitmemisKonu(sinif: number, ders: string, veri: DevamVerisi) {
  for (const u of uniteler(sinif, ders)) {
    for (const t of u.topics) {
      const k = konuAyristir(t);
      if (k.testKey && (veri.ilerleme[ders]?.[k.testKey] ?? 0) < ADIM_SAYISI) return { konuKey: k.testKey, konuAdi: k.baslik };
    }
  }
  return null;
}

/** Kuralın çocuk diliyle kısa etiketi (İstatistik'teki gözlem kartları). */
export const KURAL_ETIKETI: Record<KocKural, string> = {
  "az-veri": "Tanışma", yazili: "Yazılı", hata: "Yanlışlar", dikkatsiz: "Dikkat", zayif: "Güçlendir",
  yavas: "Hız", "defter-once": "Önce defter", quiz: "Quiz", dengesiz: "Denge", tekrar: "Tekrar",
  seri: "Seri", bosluk: "Yeni ders", harika: "Harika",
};
