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

/** Fırça: `a` dolu, `n` = x,y,x,y,… ; şekil: `s` dolu, `n` = x0,y0,x1,y1. */
export type InkOgesi = { a?: string; s?: string; r: string; n: number[] };

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
    ink.push(o);
  });
  return { bloklar, ink };
}

export async function notSayfalari(uid: string, notId: string): Promise<NotSayfa[]> {
  const snap = await get(ref(kullaniciDb, `users/${uid}/notSayfalari/${notId}`));
  const cocuklar: DataSnapshot[] = [];
  snap.forEach((c) => { cocuklar.push(c); });
  const out = cocuklar.sort((a, b) => (Number(a.key) || 0) - (Number(b.key) || 0)).map(toSayfa);
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

/** Liste düğümü + tüm sayfalar tek çok-yollu update: yarım not kalmaz. */
export async function notKaydet(uid: string, not: NotOzet, sayfalar: NotSayfa[]): Promise<NotOzet> {
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
  const sayfaMap: Record<string, unknown> = {};
  sayfalar.forEach((p, i) => {
    sayfaMap[String(i)] = {
      bloklar: p.bloklar.map((b) => (b.t === "metin" ? { t: "metin", v: b.v } : { t: "gorsel", yol: b.yol, boyut: b.boyut })),
      ink: p.ink.map((o) => ({ ...(o.a ? { a: o.a } : {}), ...(o.s ? { s: o.s } : {}), r: o.r, n: o.n })),
    };
  });
  await update(kullanici(uid), { [`notlar/${not.id}`]: ozet, [`notSayfalari/${not.id}`]: sayfaMap });
  return guncel;
}

/** İki düğüm birlikte; Storage görselleri best-effort. */
export async function notSil(uid: string, notId: string): Promise<void> {
  await update(kullanici(uid), { [`notlar/${notId}`]: null, [`notSayfalari/${notId}`]: null });
  try {
    const liste = await listAll(storageRef(storage, `notlar/${uid}/${notId}`));
    await Promise.all(liste.items.map((i) => deleteObject(i).catch(() => {})));
  } catch { /* yetim dosya kalabilir */ }
}

// ---------------------------------------------------------------- görsel
const urlOnbellek = new Map<string, string>();

export async function notGorselUrl(yol: string): Promise<string | null> {
  const c = urlOnbellek.get(yol);
  if (c) return c;
  try {
    const u = await getDownloadURL(storageRef(storage, yol));
    urlOnbellek.set(yol, u);
    return u;
  } catch { return null; }
}

/** Seçilen dosyayı küçültüp (≤1280px, JPEG %82) yükler; DB'ye yazılacak YOLU döner. */
export async function notGorselYukle(uid: string, notId: string, dosya: File): Promise<string> {
  const blob = await kucult(dosya);
  const yol = `notlar/${uid}/${notId}/${Date.now()}.jpg`;
  await uploadBytes(storageRef(storage, yol), blob, { contentType: "image/jpeg" });
  return yol;
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
