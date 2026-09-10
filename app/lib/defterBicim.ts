// Defter içeriğinin BİÇİM katmanı: Firebase'den gelen ham JSON'u DefterBlok/DefterSayfa'ya
// çevirir. Firebase'e HİÇ bağlı değil — saf dönüşüm.
//
// Neden ayrı dosya: aynı dönüşüm iki yerden lazım. İstemci (veri.ts) canlı veritabanından
// okuyup çeviriyor; sunucu tarafı (içerik sayfaları) dışa aktarılmış JSON'dan okuyup aynı
// şeyi çeviriyor. Kopyalanırsa ikisi zamanla ayrışır; blok tipleri uygulamanın
// veritabanındaki `type` alanlarıyla birebir eşleşmek zorunda.

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

/** Sayı okuma: veritabanında aynı alan bazen sayı bazen metin geliyor. */
export function sayi(v: unknown): number {
  if (typeof v === "number") return Math.round(v);
  if (typeof v === "string") return Number.parseInt(v, 10) || 0;
  return 0;
}

export function metin(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export function dizi(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (v && typeof v === "object") {
    return Object.keys(v as object)
      .sort((a, b) => (Number(a) || 0) - (Number(b) || 0))
      .map((k) => (v as Record<string, unknown>)[k])
      .filter((x): x is string => typeof x === "string");
  }
  return [];
}

/** 3. sınıfta sosyal içeriği veritabanında hayat_bilgisi altında (uygulamayla aynı kural). */
export function defterDersAnahtari(sinif: number, dersKey: string): string {
  return sinif === 3 && dersKey === "sosyal" ? "hayat_bilgisi" : dersKey;
}

/* ------------------------------------------------------------ matematik yazımı */

/* Defter metinlerinin bir kısmı LaTeX parçalarıyla yazılmış: "0^\\circ", "3 \\times 5",
   "1 \\text{ t}". Ekranda ham görünüyorlardı — öğrenci "0^\circ ile 90^\circ arasındadır"
   okuyor. Ölçüldü: 25.782 metin parçasının 169'u (%0,7), ağırlıklı olarak matematik ve fen.
   Karşılığı olan her komut Unicode'a çevriliyor; kalanların yalnız ters bölü işareti
   düşüyor, metin okunur kalıyor. */
const MATEMATIK_SEMBOL: Record<string, string> = {
  times: "×", cdot: "·", div: "÷", pm: "±",
  le: "≤", leq: "≤", ge: "≥", geq: "≥", neq: "≠", approx: "≈",
  circ: "°", perp: "⊥", parallel: "∥", cong: "≅", sim: "∼",
  rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", to: "→",
  triangle: "△", square: "□", bigcirc: "○", angle: "∠",
  alpha: "α", beta: "β", gamma: "γ", theta: "θ", pi: "π", Omega: "Ω", Delta: "Δ",
  infty: "∞", dots: "…", ldots: "…", cdots: "…",
};

/** LaTeX parçalarını okunur metne çevirir. */
export function sadeMetin(g: string): string {
  if (!g || !/[\\$^]/.test(g)) return g;
  let s = g;
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");              // \text{ t} → " t"
  s = s.replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "$1/$2"); // \frac{a}{b} → a/b
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√$1");
  s = s.replace(/\\sqrt/g, "√");
  s = s.replace(/\^\{?\\circ\}?/g, "°");                   // 90^\circ → 90°
  s = s.replace(/\\([a-zA-Z]+)/g, (t, ad: string) => MATEMATIK_SEMBOL[ad] ?? ad);
  s = s.replace(/\^\{([^}]*)\}/g, "^$1");
  s = s.replace(/\$/g, "");
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

export function blokCevir(ham: Record<string, unknown>): DefterBlok | null {
  const tip = metin(ham.type);
  const s = (k: string) => sadeMetin(metin(ham[k]));
  switch (tip) {
    case "heading":                  return { tip: "baslik", baslik: s("title") };
    case "main_title": case "title":  return { tip: "baslik", baslik: s("text") };
    case "sub_title": case "subtitle":return { tip: "altbaslik", metin: s("text") };
    case "text": case "paragraph":    return { tip: "paragraf", metin: s("text") };
    case "highlight": case "info":    return { tip: "bilgi", metin: s("text") };
    case "bullet_list": case "list":  return { tip: "liste", baslik: s("title"), maddeler: dizi(ham.items).map(sadeMetin) };
    case "note": case "example":      return { tip: "ornek", metin: s("text") };
    case "rule":                      return { tip: "kural", metin: s("text") };
    case "formula":                   return { tip: "formul", metin: s("text") };
    case "pattern":                   return { tip: "kalip", metin: s("text") };
    case "warning":                   return { tip: "uyari", metin: s("text") };
    case "definition":                return { tip: "tanim", terim: s("term"), metin: s("text") };
    case "steps": case "strategy":    return { tip: "adimlar", baslik: s("title"), adimlar: dizi(ham.steps).map(sadeMetin) };
    case "problem":                   return { tip: "problem", baslik: s("title"), metin: s("text") };
    case "table": {
      const satirlar: string[][] = [];
      const r = ham.rows;
      if (Array.isArray(r)) for (const x of r) satirlar.push(dizi(x).map(sadeMetin));
      else if (r && typeof r === "object") {
        for (const k of Object.keys(r as object).sort((a, b) => (Number(a) || 0) - (Number(b) || 0))) {
          satirlar.push(dizi((r as Record<string, unknown>)[k]).map(sadeMetin));
        }
      }
      return { tip: "tablo", basliklar: dizi(ham.headers).map(sadeMetin), satirlar };
    }
    default: return null;
  }
}

export function sayfalariCevir(ham: unknown): DefterSayfa[] {
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
