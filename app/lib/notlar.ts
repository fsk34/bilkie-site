// Notlar — kullanıcının kendi sayfalı defteri (15 Eyl 2026). Android data/NotRepo.kt ile
// AYNI şema; üç platform aynı düğümleri okur-yazar:
//
//   users/{uid}/notlar/{notId}                 ← LİSTE { baslik, ders, olusturma, guncelleme, sayfaSayisi, onizleme, kagit, kagitRenk }
//   users/{uid}/notSayfalari/{notId}/{sayfaNo} ← İÇERİK { bloklar:[{t:"metin",v}|{t:"gorsel",yol,boyut}],
//                                                          ink:[{a,r,n:[x,y,…]}|{s,r,n:[x0,y0,x1,y1]}] }
//
// Koordinatlar: sayfa GENİŞLİĞİ 1000 birim (x de y de, tam sayı). Görseller Storage
// `notlar/{uid}/{notId}/{ts}.jpg` (istemcide ≤1280px JPEG %82); DB'ye yalnız yol.
// Taslak DB'ye gitmez; kayıt = iki düğüm tek çok-yollu update (atomik).

import { get, onValue, push, ref, update, type DataSnapshot } from "firebase/database";
import { deleteObject, getDownloadURL, listAll, ref as storageRef, uploadBytes } from "firebase/storage";
import { kullaniciDb, storage } from "./firebase";
import { sessizHata, tavanli } from "./hata";

export const NOT_KOORDINAT_OLCEK = 1000;
export const NOT_RENKLER = ["#111827", "#2563EB", "#E11D2D", "#16A34A", "#E74F1E", "#7C3AED"];
/** Kâğıt renkleri: beyaz, krem, mavi, yeşil, pembe, gri. */
export const NOT_KAGIT_RENKLERI = ["#FCFCF8", "#FBF5E6", "#EAF3FB", "#EEF9EF", "#FDEEF2", "#EEF0F4"];
export const NOT_KAGITLAR = ["kareli", "cizgili", "duz"] as const;
export const NOT_DERSLER = ["turkce", "matematik", "fen", "sosyal", "ingilizce"] as const;

export type NotKagit = (typeof NOT_KAGITLAR)[number];

export function notDersAdi(ders: string | null | undefined): string {
  switch (ders) {
    case "turkce": return "Türkçe";
    case "matematik": return "Matematik";
    case "fen": return "Fen Bilimleri";
    case "sosyal": return "Sosyal Bilgiler";
    case "ingilizce": return "İngilizce";
    default: return "Ders yok";
  }
}

export type NotOzet = {
  id: string;
  baslik: string;
  ders: string | null;
  olusturma: number;
  guncelleme: number;
  sayfaSayisi: number;
  onizleme: string;
  kagit: NotKagit;
  kagitRenk: string;
};

export type NotBlok = { t: "metin"; v: string } | { t: "gorsel"; yol: string; boyut: "kucuk" | "orta" | "tam" };

/** Fırça: `a` dolu, `n` = x,y,x,y,… ; şekil: `s` dolu, `n` = x0,y0,x1,y1.
 *  `k` = kalınlık (px/dp/pt, üç platformda aynı sayı); yoksa aracın tabanı (bkz. NOT_TABAN_KALINLIK). */
export type InkOgesi = { a?: string; s?: string; r: string; n: number[]; k?: number };

/** Araç taban kalınlıkları (Benim Hocam'daki CSS px'ler); şekiller 2,5. */
export const NOT_TABAN_KALINLIK: Record<string, number> = { kalem: 2.5, keceli: 6.5, fosforlu: 16, silgi: 26, sekil: 2.5 };
/** Kalınlık seçenekleri: aracın tabanına çarpan. */
export const NOT_KALINLIKLAR = [["ince", "İnce", 0.5], ["orta", "Orta", 1], ["kalin", "Kalın", 2]] as const;
export function notKalinlik(o: InkOgesi): number {
  return o.k ?? NOT_TABAN_KALINLIK[o.s ? "sekil" : (o.a ?? "kalem")] ?? 2.5;
}

export type NotSayfa = { bloklar: NotBlok[]; ink: InkOgesi[] };

export function yeniNotOzet(id: string): NotOzet {
  return { id, baslik: "", ders: null, olusturma: 0, guncelleme: 0, sayfaSayisi: 1, onizleme: "", kagit: "kareli", kagitRenk: NOT_KAGIT_RENKLERI[0] };
}
export function bosSayfa(): NotSayfa { return { bloklar: [{ t: "metin", v: "" }], ink: [] }; }

export function sayfaMetni(s: NotSayfa): string {
  return s.bloklar.filter((b): b is Extract<NotBlok, { t: "metin" }> => b.t === "metin").map((b) => b.v).join("\n").trim();
}
export function sayfaBosMu(s: NotSayfa): boolean {
  return sayfaMetni(s) === "" && s.ink.length === 0 && !s.bloklar.some((b) => b.t === "gorsel");
}

function kullanici(uid: string) { return ref(kullaniciDb, `users/${uid}`); }

export function yeniNotId(uid: string): string {
  return push(ref(kullaniciDb, `users/${uid}/notlar`)).key ?? String(Date.now());
}

// ---------------------------------------------------------------- okuma
function s(snap: DataSnapshot, k: string): string { const v = snap.child(k).val(); return typeof v === "string" ? v : ""; }
function n(snap: DataSnapshot, k: string): number { const v = snap.child(k).val(); return typeof v === "number" ? v : Number(v) || 0; }

function toOzet(snap: DataSnapshot): NotOzet {
  const kagit = s(snap, "kagit");
  return {
    id: snap.key ?? "",
    baslik: s(snap, "baslik"),
    ders: s(snap, "ders") || null,
    olusturma: n(snap, "olusturma"),
    guncelleme: n(snap, "guncelleme"),
    sayfaSayisi: Math.max(1, n(snap, "sayfaSayisi")),
    onizleme: s(snap, "onizleme"),
    kagit: (NOT_KAGITLAR as readonly string[]).includes(kagit) ? (kagit as NotKagit) : "kareli",
    kagitRenk: s(snap, "kagitRenk") || NOT_KAGIT_RENKLERI[0],
  };
}

/** Liste — canlı dinleyici (başka cihazda yazılan not burada görünsün). Yeniden eskiye. */
export function notlariDinle(uid: string, onChange: (l: NotOzet[]) => void): () => void {
  return onValue(
    ref(kullaniciDb, `users/${uid}/notlar`),
    (snap) => {
      const out: NotOzet[] = [];
      snap.forEach((c) => { out.push(toOzet(c)); });
      onChange(out.sort((a, b) => b.guncelleme - a.guncelleme));
    },
    () => onChange([])
  );
}

function toSayfa(snap: DataSnapshot): NotSayfa {
  const bloklar: NotBlok[] = [];
  snap.child("bloklar").forEach((b) => {
    const t = s(b, "t");
    if (t === "metin") bloklar.push({ t: "metin", v: s(b, "v") });
    else if (t === "gorsel" && s(b, "yol")) {
      const boyut = s(b, "boyut");
      bloklar.push({ t: "gorsel", yol: s(b, "yol"), boyut: boyut === "kucuk" || boyut === "orta" ? boyut : "tam" });
    }
  });
  if (bloklar.length === 0) bloklar.push({ t: "metin", v: "" });
  const ink: InkOgesi[] = [];
  snap.child("ink").forEach((i) => {
    const pts: number[] = [];
    i.child("n").forEach((p) => { pts.push(Number(p.val()) || 0); });
    if (pts.length < 2) return;
    const o: InkOgesi = { r: s(i, "r") || NOT_RENKLER[0], n: pts };
    if (s(i, "a")) o.a = s(i, "a");
    if (s(i, "s")) o.s = s(i, "s");
    if (n(i, "k") > 0) o.k = n(i, "k");
    ink.push(o);
  });
  return { bloklar, ink };
}

/** Sayfa anahtarları 0..n-1 dizisi olmayan notlar: sayfa-başı kayıt yanlış düğüme yazar → bir kez tam yazılır. */
const duzensizNotlar = new Set<string>();

/**
 * ⚠️ Okunamazsa FIRLATIR (çevrimdışı + önbellekte yok, ya da 10 sn zaman aşımı). Boş sayfa
 * DÖNDÜRMEZ: editör boş sayfayla açılıp otomatik kaydederse notun TÜM sayfaları silinirdi
 * (Android NotRepo, 24 Eyl 2026). Okuma başarılı ama düğüm boşsa tek boş sayfa döner.
 */
export async function notSayfalari(uid: string, notId: string): Promise<NotSayfa[]> {
  const snap = await tavanli(get(ref(kullaniciDb, `users/${uid}/notSayfalari/${notId}`)), 10000);
  if (!snap) throw new Error("Not okunamadı");
  const cocuklar: DataSnapshot[] = [];
  snap.forEach((c) => { cocuklar.push(c); });
  const sirali = cocuklar.sort((a, b) => (Number(a.key) || 0) - (Number(b.key) || 0));
  if (sirali.some((c, i) => c.key !== String(i))) duzensizNotlar.add(notId); else duzensizNotlar.delete(notId);
  const out = sirali.map(toSayfa);
  return out.length ? out : [bosSayfa()];
}

// ---------------------------------------------------------------- yazma
function onizleme(sayfalar: NotSayfa[]): string {
  const m = (sayfalar[0] ? sayfaMetni(sayfalar[0]) : "").replace(/\n/g, " ").trim();
  if (m) return m.slice(0, 80);
  if (sayfalar.some((p) => p.bloklar.some((b) => b.t === "gorsel"))) return "🖼️ Görsel";
  if (sayfalar.some((p) => p.ink.length > 0)) return "🖊️ Çizim notu";
  return "";
}

function sayfaDugumu(p: NotSayfa): Record<string, unknown> {
  // Yüklemesi bitmemiş (geçici yollu) görsel DB'ye yazılmaz — editör zaten yüklemeleri bekler, bu emniyet
  return {
    bloklar: p.bloklar
      .filter((b) => !(b.t === "gorsel" && b.yol.startsWith(YEREL_ONEK)))
      .map((b) => (b.t === "metin" ? { t: "metin", v: b.v } : { t: "gorsel", yol: b.yol, boyut: b.boyut })),
    ink: p.ink.map((o) => ({ ...(o.a ? { a: o.a } : {}), ...(o.s ? { s: o.s } : {}), ...(o.k ? { k: o.k } : {}), r: o.r, n: o.n })),
  };
}

/**
 * Liste düğümü + sayfalar tek çok-yollu update: yarım not kalmaz.
 *
 * `onceki` = en son yazılan sayfalar. Verilirse YALNIZ değişen sayfalar yazılır
 * (`notSayfalari/{id}/{i}`), sondan eksilen sayfalar null'lanır — her otomatik kayıtta tüm çizim
 * noktalarını yeniden göndermemek için (şema aynı). null ise (ilk kayıt) sayfaların tamamı yazılır.
 *
 * Beklemesiz (Android kaydetBaslat, 24 Eyl 2026): yazma hemen yerel kuyruğa girer, liste dinleyicisi
 * anında görür. Dönen `yazma` sözü çevrimdışıyken HİÇ çözülmez — çağıran onu beklemeye mecbur değil.
 */
export function notKaydetBaslat(
  uid: string, not: NotOzet, sayfalar: NotSayfa[], onceki: NotSayfa[] | null
): { guncel: NotOzet; yazma: Promise<void> } {
  const simdi = Date.now();
  const guncel: NotOzet = {
    ...not,
    olusturma: not.olusturma > 0 ? not.olusturma : simdi,
    guncelleme: simdi,
    sayfaSayisi: Math.max(1, sayfalar.length),
    onizleme: onizleme(sayfalar),
  };
  const ozet = {
    baslik: guncel.baslik, ders: guncel.ders ?? "",
    olusturma: guncel.olusturma, guncelleme: guncel.guncelleme,
    sayfaSayisi: guncel.sayfaSayisi, onizleme: guncel.onizleme,
    kagit: guncel.kagit, kagitRenk: guncel.kagitRenk,
  };
  const degisim: Record<string, unknown> = { [`notlar/${not.id}`]: ozet };
  if (onceki == null || duzensizNotlar.delete(not.id)) {
    const sayfaMap: Record<string, unknown> = {};
    sayfalar.forEach((p, i) => { sayfaMap[String(i)] = sayfaDugumu(p); });
    degisim[`notSayfalari/${not.id}`] = sayfaMap;
  } else {
    sayfalar.forEach((p, i) => { if (onceki[i] !== p) degisim[`notSayfalari/${not.id}/${i}`] = sayfaDugumu(p); });
    for (let i = sayfalar.length; i < onceki.length; i++) degisim[`notSayfalari/${not.id}/${i}`] = null;
  }
  return { guncel, yazma: update(kullanici(uid), degisim) };
}

/**
 * İki düğüm birlikte; Storage görselleri best-effort. Beklemesiz: DB silmesi yerel kuyruğa girer
 * (çevrimdışı da liste anında güncellenir), Storage temizliği arkada sürer.
 */
export function notSil(uid: string, notId: string): void {
  update(kullanici(uid), { [`notlar/${notId}`]: null, [`notSayfalari/${notId}`]: null }).catch((e) => sessizHata("notSil", e));
  void (async () => {
    try {
      const liste = await listAll(storageRef(storage, `notlar/${uid}/${notId}`));
      await Promise.all(liste.items.map((i) => deleteObject(i).catch(() => {})));
    } catch { /* yetim dosya kalabilir */ }
  })();
}

/** Tek görsel dosyasını sil (blok/sayfa silindi, taslaktan vazgeçildi) — best-effort, arkada. */
export function notGorselSil(yol: string): void {
  if (!yol || yol.startsWith(YEREL_ONEK)) return;
  urlOnbellek.delete(yol);
  deleteObject(storageRef(storage, yol)).catch(() => { /* yetim kalabilir */ });
}

// ---------------------------------------------------------------- görsel
const urlOnbellek = new Map<string, string>();
/** Bu oturumda yüklenen görsellerin yerel object URL'si: ekranda ANINDA gösterilir, ağdan geri
 *  indirilmez (Android ile aynı; "görsel yükleyince yavaş" geri bildirimi). */
const yerelUrl = new Map<string, string>();
const bekleyenBlob = new Map<string, Blob>();
export const YEREL_ONEK = "yerel:";

export async function notGorselUrl(yol: string): Promise<string | null> {
  const y = yerelUrl.get(yol);
  if (y) return y;
  const c = urlOnbellek.get(yol);
  if (c) return c;
  if (yol.startsWith(YEREL_ONEK)) return null;   // yüklemesi bitmemiş
  // Storage çevrimdışı uzun süre yeniden dener → tavan; null = "görsel yüklenemedi"
  const u = await tavanli(getDownloadURL(storageRef(storage, yol)), 15000);
  if (!u) return null;
  urlOnbellek.set(yol, u);
  return u;
}

/**
 * İYİMSER EKLEME, 1. adım: dosyayı küçült (≤1280px, JPEG %82), yerel URL'yi önbelleğe koy ve GEÇİCİ
 * bir yol döndür — kâğıda hemen basılır, kullanıcı yüklemeyi beklemez.
 */
export async function notGorselHazirla(dosya: File): Promise<string> {
  const blob = await kucult(dosya);
  const gecici = `${YEREL_ONEK}${Date.now()}`;
  yerelUrl.set(gecici, URL.createObjectURL(blob));
  bekleyenBlob.set(gecici, blob);
  return gecici;
}

/** 2. adım: Storage'a yükle; DB'ye yazılacak GERÇEK yolu döndürür (yerel URL o yola taşınır). */
export async function notGorselYukle(uid: string, notId: string, gecici: string): Promise<string> {
  const blob = bekleyenBlob.get(gecici);
  if (!blob) throw new Error("Görsel bulunamadı");
  const yol = `notlar/${uid}/${notId}/${gecici.slice(YEREL_ONEK.length)}.jpg`;
  try {
    await uploadBytes(storageRef(storage, yol), blob, { contentType: "image/jpeg" });
  } catch (e) {
    notGorselVazgec(gecici);   // başarısız yükleme baytları bellekte kalmasın
    throw e;
  }
  const u = yerelUrl.get(gecici);
  if (u) yerelUrl.set(yol, u);
  bekleyenBlob.delete(gecici);
  return yol;
}

/** Yüklemesi bitmemiş görseli bellekten at (yükleme başarısız / vazgeçildi). */
export function notGorselVazgec(gecici: string): void {
  bekleyenBlob.delete(gecici);
  const u = yerelUrl.get(gecici);
  if (u) { URL.revokeObjectURL(u); yerelUrl.delete(gecici); }
}

function kucult(dosya: File): Promise<Blob> {
  return new Promise((cozul, reddet) => {
    const url = URL.createObjectURL(dosya);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const olcek = Math.min(1, 1280 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * olcek); c.height = Math.round(img.height * olcek);
      c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? cozul(b) : reddet(new Error("Görsel işlenemedi"))), "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reddet(new Error("Görsel okunamadı")); };
    img.src = url;
  });
}
