// Halka açık İÇERİK katmanı — yalnız SUNUCUDA çalışır.
//
// Neden ayrı: uygulamanın veri katmanı (veri.ts) canlı Firebase'den, giriş yapmış
// kullanıcı adına okur. İçerik sayfaları ise arama motoru için sunucuda çiziliyor;
// orada oturum yok ve Firebase'in içerik veritabanları anonim okumaya KAPALI (401).
//
// ⚠️ VERİ KAYNAĞI TEK YERDE: `dizinHam()` / `atasozleriHam()`. Bugün depodaki
// dışa aktarılmış JSON'u okuyorlar. Firebase servis hesabı anahtarı alınabilirse
// (bkz. proje notları: kuruluş politikası `disableServiceAccountKeyCreation`
// engelliyor) yalnız bu iki fonksiyon canlı okumaya çevrilir; sayfalar değişmez.
//
// Dönüşüm defterBicim.ts'ten geliyor — uygulamayla AYNI mantık, kopya değil.

import { readFileSync } from "node:fs";
import { join } from "node:path";

/* ------------------------------------------------------------------ kaynak */

let _dizin: Record<string, unknown> | null = null;
let _atasozleri: Record<string, unknown> | null = null;

function oku(dosya: string): Record<string, unknown> {
  // process.cwd(): Next derleme ve çalışma anında proje kökünden çalışır.
  const ham = readFileSync(join(process.cwd(), "data", "icerik", dosya), "utf8");
  return JSON.parse(ham) as Record<string, unknown>;
}

/**
 * Sınıf → ders → ünite BAŞLIKLARI. İçeriğin kendisi burada YOK.
 *
 * ⚠️ Konu anlatımı metni bilerek depoda değil (kullanıcı kararı, 10 Eyl 2026):
 * halka açılmıyor, o yüzden ne sayfalara basılıyor ne de repoda duruyor.
 * `dizin.json` yalnız 12 KB başlık; tam dışa aktarım 2,4 MB idi.
 * Açma kararı verilirse: konudefterleri dışa aktarımı geri alınır ve
 * defterBicim.sayfalariCevir ile çizilir (dönüştürücü hazır duruyor).
 */
function dizinHam(): Record<string, unknown> {
  if (!_dizin) _dizin = oku("dizin.json");
  return _dizin;
}

function atasozleriHam(): Record<string, unknown> {
  if (!_atasozleri) {
    const k = oku("atasozleri.json").content as Record<string, unknown> | undefined;
    _atasozleri = ((k?.atasozleri_deyimler as Record<string, unknown>)?.letters ?? {}) as Record<string, unknown>;
  }
  return _atasozleri;
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

export type Unite = { key: string; baslik: string; slug: string };
export type Ders = { key: string; ad: string; slug: string; uniteler: Unite[] };
export type Sinif = { sinif: number; slug: string; dersler: Ders[] };

/* ------------------------------------------------------------------ okuyucu */

function uniteleriCoz(liste: unknown): Unite[] {
  if (!Array.isArray(liste)) return [];
  const out: Unite[] = [];
  for (const u of liste) {
    if (!u || typeof u !== "object") continue;
    const o = u as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key : "";
    const baslik = typeof o.title === "string" ? o.title : key;
    if (key && baslik) out.push({ key, baslik, slug: slug(baslik) });
  }
  // Ünite anahtarları u1, u2… — sayısal sıra, alfabetik değil (u10 < u2 olmasın).
  return out.sort((a, b) => sayiCek(a.key) - sayiCek(b.key));
}

function sayiCek(s: string): number {
  return Number.parseInt(s.replace(/\D/g, ""), 10) || 0;
}

/** Yayınlanabilir tüm sınıf/ders/ünite ağacı. Sayfa üretimi ve sitemap bunu kullanır. */
export function icerikAgaci(): Sinif[] {
  const ham = dizinHam();
  const out: Sinif[] = [];
  for (const [gradeKey, gv] of Object.entries(ham)) {
    const sinif = sayiCek(gradeKey);
    if (!sinif) continue;
    const subjects = (gv ?? {}) as Record<string, unknown>;
    const dersler: Ders[] = [];
    for (const [dersKey, dv] of Object.entries(subjects)) {
      const uniteler = uniteleriCoz(dv);
      if (!uniteler.length) continue;
      // hayat_bilgisi veritabanı adı; adreste ve ekranda "sosyal" olarak görünür
      // (uygulamadaki kuralın aynısı, bkz. defterBicim.defterDersAnahtari).
      const gorunenKey = dersKey === "hayat_bilgisi" ? "sosyal" : dersKey;
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
