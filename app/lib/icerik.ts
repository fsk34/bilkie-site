// Halka açık İÇERİK katmanı — yalnız SUNUCUDA çalışır.
//
// Neden ayrı: uygulamanın veri katmanı (veri.ts) canlı Firebase'den, giriş yapmış
// kullanıcı adına okur. İçerik sayfaları ise arama motoru için sunucuda çiziliyor;
// orada oturum yok ve Firebase'in içerik veritabanları anonim okumaya KAPALI (401).
//
// ⚠️ VERİ KAYNAĞI TEK YERDE: `defterlerHam()` / `testlerHam()` / `atasozleriHam()`. Bugün depodaki
// dışa aktarılmış JSON'u okuyorlar. Firebase servis hesabı anahtarı alınabilirse
// (bkz. proje notları: kuruluş politikası `disableServiceAccountKeyCreation`
// engelliyor) yalnız bu fonksiyonlar canlı okumaya çevrilir; sayfalar değişmez.
//
// Dönüşüm defterBicim.ts'ten geliyor — uygulamayla AYNI mantık, kopya değil.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sayfalariCevir, sayi, type DefterSayfa } from "./defterBicim";
import { konuAyristir, uniteler as katalogUniteleri } from "./katalog";

/* ------------------------------------------------------------------ kaynak */

let _defterler: Record<string, unknown> | null = null;
let _testler: Record<string, unknown> | null = null;
let _atasozleri: Record<string, unknown> | null = null;

function oku(dosya: string): Record<string, unknown> {
  // process.cwd(): Next derleme ve çalışma anında proje kökünden çalışır.
  const ham = readFileSync(join(process.cwd(), "data", "icerik", dosya), "utf8");
  return JSON.parse(ham) as Record<string, unknown>;
}

/**
 * Konu defterleri — her defterin YARISI (en az 3 sayfa) burada, kalanı uygulamada.
 *
 * Kapalı sayfalar depoda da durmuyor: tam dışa aktarım 2,5 MB, bu 665 KB.
 * Üretim betiği: scripts/defterleri_cikar.py. Sınıf/ders/ünite ağacı da bu
 * dosyadan çıkar (ayrı bir dizin dosyası yok; iki kaynak zamanla ayrışırdı).
 *
 * Tarihçe: 10 Eyl'de ünite sayfaları tamamen kapalıydı (dizin ders sayfasında
 * bitiyordu). 16 Eyl'de AdSense "düşük değerli içerik" deyince testlerdeki kısmi
 * açma kuralı defterlere de uygulandı — ölçüldü, sayfa başına medyan 287 kelime.
 */
function defterlerHam(): Record<string, unknown> {
  if (!_defterler) _defterler = oku("defterler.json");
  return _defterler;
}

function atasozleriHam(): Record<string, unknown> {
  if (!_atasozleri) {
    const k = oku("atasozleri.json").content as Record<string, unknown> | undefined;
    _atasozleri = ((k?.atasozleri_deyimler as Record<string, unknown>)?.letters ?? {}) as Record<string, unknown>;
  }
  return _atasozleri;
}

/**
 * Konu testleri — her testin YALNIZ 1. adımı (10 soru) burada.
 *
 * Testin tamamı 30 soru; kalan 20'si uygulamada. Dışa aktarımdan sadece açılacak
 * kısım çıkarıldı: kapalı sorular depoda da durmuyor (tam dosya 8,4 MB, bu 1,4 MB).
 * Üretim betiği: bkz. commit mesajı; katalog.ts'teki "[tN]" etiketleriyle eşleşiyor.
 */
function testlerHam(): Record<string, unknown> {
  if (!_testler) _testler = oku("testler.json");
  return _testler;
}

/* ------------------------------------------------------------- adres parçası */

/** Başlığı adres parçasına çevirir: "Geometrik Şekiller" → "geometrik-sekiller". */
export function slug(s: string): string {
  const tr: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", İ: "i", I: "i", Ö: "o", Ş: "s", Ü: "u",
  };
  return s
    .replace(/[çğıöşüÇĞİIÖŞÜ]/g, (c) => tr[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ------------------------------------------------------------------ dersler */

/** Ders anahtarı → ekranda görünen ad. 3. sınıfta sosyalin karşılığı Hayat Bilgisi. */
export const DERS_ADI: Record<string, string> = {
  turkce: "Türkçe",
  matematik: "Matematik",
  fen: "Fen Bilimleri",
  sosyal: "Sosyal Bilgiler",
  hayat_bilgisi: "Hayat Bilgisi",
  ingilizce: "İngilizce",
};

export function dersAdi(dersKey: string, sinif: number): string {
  if (dersKey === "sosyal" && sinif === 8) return "T.C. İnkılap Tarihi";
  return DERS_ADI[dersKey] ?? dersKey;
}

/* -------------------------------------------------------------------- tipler */

export type Unite = { key: string; baslik: string; slug: string; toplam: number; acik: number };
export type Ders = { key: string; ad: string; slug: string; uniteler: Unite[] };
export type Sinif = { sinif: number; slug: string; dersler: Ders[] };

/* ------------------------------------------------------------------ okuyucu */

/**
 * Ünite adı: defterin kendi adı; o jenerikse ("Ünite 1") uygulamanın kataloğundaki ad.
 *
 * Neden: 4-8. sınıf Türkçe defterleri (ve 8/sosyal) veritabanında "Ünite 1..5" diye
 * kayıtlı — 23 defter. Uygulama bu adı hiç göstermiyor, katalogdaki adı basıyor
 * ("Okuma", "Dil Yapıları ve Söz Varlığı"); web de öyle yapsın, yoksa sayfa başlığı
 * "Ünite 1 — 5. Sınıf Türkçe Konu Anlatımı" oluyor (17 Eyl'e kadar öyleydi).
 * Jenerik OLMAYAN adlarda defterinki kalır: 3/türkçe'de katalog yanlış deftere
 * bağlı (OKUMA → "Adlar"), oradaki adı katalogdan alsak sayfa içeriğiyle çelişirdi.
 */
function uniteAdi(defterAdi: string, sinif: number, dersSlug: string, key: string): string {
  if (!/^Ünite \d+$/i.test(defterAdi.trim())) return defterAdi;
  const ku = katalogUniteleri(sinif, dersSlug).find((u) => katalogDefterAnahtari(u) === key);
  return ku?.title ?? defterAdi;
}

function uniteleriCoz(kume: unknown, sinif: number, dersSlug: string): Unite[] {
  if (!kume || typeof kume !== "object") return [];
  const out: Unite[] = [];
  for (const [key, u] of Object.entries(kume as Record<string, unknown>)) {
    if (!u || typeof u !== "object") continue;
    const o = u as Record<string, unknown>;
    const baslik = uniteAdi(typeof o.title === "string" ? o.title : key, sinif, dersSlug, key);
    const pages = Array.isArray(o.pages) ? o.pages : [];
    if (baslik && pages.length) {
      out.push({ key, baslik, slug: slug(baslik), toplam: sayi(o.toplam) || pages.length, acik: pages.length });
    }
  }
  // Ünite anahtarları u1, u2… — sayısal sıra, alfabetik değil (u10 < u2 olmasın).
  out.sort((a, b) => sayiCek(a.key) - sayiCek(b.key));
  // Aynı derste aynı adlı üniteler (5/matematik "Sayılar ve Nicelikler" u2 + u4, MEB'de
  // gerçekten iki ünite): ikincisi "-2" ekini alır. Ek ünite sırasına göre verilir,
  // yeniden üretimde adres değişmez. Eksiz bırakılsa biri diğerini ezerdi (199 → 198).
  const gorulen = new Map<string, number>();
  for (const u of out) {
    const n = (gorulen.get(u.slug) ?? 0) + 1;
    gorulen.set(u.slug, n);
    if (n > 1) u.slug = `${u.slug}-${n}`;
  }
  return out;
}

function sayiCek(s: string): number {
  return Number.parseInt(s.replace(/\D/g, ""), 10) || 0;
}

/** Yayınlanabilir tüm sınıf/ders/ünite ağacı. Sayfa üretimi ve sitemap bunu kullanır. */
export function icerikAgaci(): Sinif[] {
  const ham = defterlerHam();
  const out: Sinif[] = [];
  for (const [gradeKey, gv] of Object.entries(ham)) {
    const sinif = sayiCek(gradeKey);
    if (!sinif) continue;
    const subjects = (gv ?? {}) as Record<string, unknown>;
    const dersler: Ders[] = [];
    for (const [dersKey, dv] of Object.entries(subjects)) {
      // hayat_bilgisi veritabanı adı; adreste ve ekranda "sosyal" olarak görünür
      // (uygulamadaki kuralın aynısı, bkz. defterBicim.defterDersAnahtari).
      const gorunenKey = dersKey === "hayat_bilgisi" ? "sosyal" : dersKey;
      const uniteler = uniteleriCoz(dv, sinif, gorunenKey);
      if (!uniteler.length) continue;
      dersler.push({
        key: dersKey,
        ad: dersAdi(dersKey, sinif),
        slug: gorunenKey,
        uniteler,
      });
    }
    if (dersler.length) {
      dersler.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
      out.push({ sinif, slug: `${sinif}-sinif`, dersler });
    }
  }
  return out.sort((a, b) => a.sinif - b.sinif);
}

export function sinifBul(sinifSlug: string): Sinif | undefined {
  return icerikAgaci().find((s) => s.slug === sinifSlug);
}

export function dersBul(sinifSlug: string, dersSlug: string): { sinif: Sinif; ders: Ders } | undefined {
  const sinif = sinifBul(sinifSlug);
  const ders = sinif?.dersler.find((d) => d.slug === dersSlug);
  return sinif && ders ? { sinif, ders } : undefined;
}

export function uniteBul(
  sinifSlug: string,
  dersSlug: string,
  uniteSlug: string
): { sinif: Sinif; ders: Ders; unite: Unite; sayfalar: DefterSayfa[] } | undefined {
  const b = dersBul(sinifSlug, dersSlug);
  const unite = b?.ders.uniteler.find((u) => u.slug === uniteSlug);
  if (!b || !unite) return undefined;
  const ham = ((defterlerHam()[`grade${b.sinif.sinif}`] as Record<string, unknown>)?.[b.ders.key] as
    Record<string, Record<string, unknown>>)?.[unite.key];
  return { ...b, unite, sayfalar: sayfalariCevir(ham?.pages) };
}

/* ------------------------------------------------------ atasözleri / deyimler */

export type Soz = { metin: string; anlam: string };
export type HarfKumesi = { harf: string; slug: string; atasozleri: Soz[]; deyimler: Soz[] };

function sozListesi(v: unknown): Soz[] {
  const it = Array.isArray(v) ? v : v && typeof v === "object" ? Object.values(v) : [];
  const out: Soz[] = [];
  for (const x of it) {
    if (!x || typeof x !== "object") continue;
    const o = x as Record<string, unknown>;
    const metin = typeof o.text === "string" ? o.text : "";
    const anlam = typeof o.meaning === "string" ? o.meaning : "";
    if (metin) out.push({ metin, anlam });
  }
  return out.sort((a, b) => a.metin.localeCompare(b.metin, "tr"));
}

export function harfKumeleri(): HarfKumesi[] {
  const ham = atasozleriHam();
  const out: HarfKumesi[] = [];
  for (const [harf, hv] of Object.entries(ham)) {
    const o = (hv ?? {}) as Record<string, unknown>;
    const atasozleri = sozListesi(o.atasozleri);
    const deyimler = sozListesi(o.deyimler);
    if (atasozleri.length || deyimler.length) {
      out.push({ harf, slug: slug(harf), atasozleri, deyimler });
    }
  }
  return out.sort((a, b) => a.harf.localeCompare(b.harf, "tr"));
}

export function harfBul(harfSlug: string): HarfKumesi | undefined {
  return harfKumeleri().find((h) => h.slug === harfSlug);
}


/* ------------------------------------------------------------- konu testleri */

export type TestSoru = { s: string; o: string[]; d?: number };
export type Test = {
  t: string;
  ad: string;
  slug: string;
  unite: string;
  toplam: number;      // testin TAM soru sayısı (30) — açık olan 10
  sorular: TestSoru[];
};
export type TestDers = { key: string; ad: string; slug: string; testler: Test[] };
export type TestSinif = { sinif: number; slug: string; dersler: TestDers[] };

export function testAgaci(): TestSinif[] {
  const ham = testlerHam() as Record<string, Record<string, Test[]>>;
  const out: TestSinif[] = [];
  for (const [sinifKey, dersler] of Object.entries(ham)) {
    const sinif = Number.parseInt(sinifKey, 10);
    if (!sinif) continue;
    const liste: TestDers[] = [];
    for (const [dersKey, testler] of Object.entries(dersler)) {
      if (!Array.isArray(testler) || !testler.length) continue;
      liste.push({ key: dersKey, ad: dersAdi(dersKey, sinif), slug: dersKey, testler });
    }
    if (liste.length) {
      liste.sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
      out.push({ sinif, slug: `${sinif}-sinif`, dersler: liste });
    }
  }
  return out.sort((a, b) => a.sinif - b.sinif);
}

export function testSinifBul(sinifSlug: string): TestSinif | undefined {
  return testAgaci().find((s) => s.slug === sinifSlug);
}

export function testDersBul(
  sinifSlug: string,
  dersSlug: string
): { sinif: TestSinif; ders: TestDers } | undefined {
  const sinif = testSinifBul(sinifSlug);
  const ders = sinif?.dersler.find((d) => d.slug === dersSlug);
  return sinif && ders ? { sinif, ders } : undefined;
}

export function testBul(
  sinifSlug: string,
  dersSlug: string,
  konuSlug: string
): { sinif: TestSinif; ders: TestDers; test: Test } | undefined {
  const b = testDersBul(sinifSlug, dersSlug);
  const test = b?.ders.testler.find((t) => t.slug === konuSlug);
  return b && test ? { ...b, test } : undefined;
}


/* ------------------------------------------------ ünite ↔ test çapraz bağı */

/*
 * İki katman birbirini bilsin: ünite sayfası "bu ünitenin testleri"ni, test sayfası
 * "konu anlatımını oku"yu göstersin. Bağ AD EŞLEŞTİRMEYLE DEĞİL, uygulamanın kendi
 * kataloğuyla kuruluyor: katalog.ts'teki ünite `defterKey` (yoksa anahtarın kendisi,
 * "u3" gibi) ile deftere, konu satırlarındaki "[tN]" ile testlere bağlı.
 * Ölçüldü (17 Eyl 2026): 199 defterin 197'si testli bir katalog ünitesine bağlanıyor;
 * 3/türkçe u5-u6'nın testi yok, 4/türkçe "Temalar" defteri yok.
 * Ad eşleştirme denendi: 146/199 — test ünite adları "Ünite 1 – …" biçiminde, tutmuyor.
 */

function katalogDefterAnahtari(u: { key: string; defterKey?: string }): string | null {
  return u.defterKey ?? (/^u\d+$/.test(u.key) ? u.key : null);
}

/*
 * ⚠️ 3/türkçe'de katalog yanlış deftere bağlı: OKUMA → u1 "Adlar (İsimler)", YAZMA → u2
 * "Eş Anlamlı…" — defterler dil bilgisi konusuna göre, testler beceri alanına göre.
 * Uygulamada da böyle (katalog üç platformda ortak). Web'de "Adlar" sayfasının altında
 * "Metnin Konusu" testini göstermek yanlış olur; o ders çapraz bağdan hariç.
 * Katalog düzeltilirse bu satır silinir.
 */
function caprazBagKapali(sinif: number, dersSlug: string): boolean {
  return sinif === 3 && dersSlug === "turkce";
}

/** Bir defter ünitesinin halka açık testleri (katalog sırasıyla). */
export function uniteTestleri(sinif: Sinif, ders: Ders, unite: Unite): { ders: TestDers; testler: Test[] } | null {
  if (caprazBagKapali(sinif.sinif, ders.slug)) return null;
  const tb = testDersBul(sinif.slug, ders.slug);
  if (!tb) return null;
  const ku = katalogUniteleri(sinif.sinif, ders.slug).find((u) => katalogDefterAnahtari(u) === unite.key);
  if (!ku) return null;
  const anahtarlar = ku.topics.map((t) => konuAyristir(t).testKey).filter(Boolean);
  const testler = anahtarlar
    .map((k) => tb.ders.testler.find((t) => t.t === k))
    .filter((t): t is Test => Boolean(t));
  return testler.length ? { ders: tb.ders, testler } : null;
}

/** Bir testin konu anlatımı (defter ünitesi) — yoksa null. */
export function testinUnitesi(sinif: TestSinif, ders: TestDers, test: Test): { sinif: Sinif; ders: Ders; unite: Unite } | null {
  if (caprazBagKapali(sinif.sinif, ders.slug)) return null;
  const ku = katalogUniteleri(sinif.sinif, ders.slug).find((u) =>
    u.topics.some((t) => konuAyristir(t).testKey === test.t)
  );
  const dk = ku ? katalogDefterAnahtari(ku) : null;
  if (!dk) return null;
  const db = dersBul(sinif.slug, ders.slug);
  const unite = db?.ders.uniteler.find((u) => u.key === dk);
  return db && unite ? { sinif: db.sinif, ders: db.ders, unite } : null;
}
