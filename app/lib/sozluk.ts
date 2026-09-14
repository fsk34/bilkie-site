// Sözlükler — Android SozlukScreen.kt / iOS SozlukScreen.swift veri katmanı (SozlukRepo).
// Veri: content/<kok>/meta/counts/<H>/kelimeler · letters/<H>/kelimeler/<idx> =
// { text, meaning, tur, ornek, ornekTr? } (Vikisözlük çıkarımı, CC BY-SA).
// Arama ilgili harfin listesini çekip yerelde süzer (önbellekli); sözlük 6–7 bin kelime,
// harf düğümü çekmek yeterli.

import { get, ref as dbRef, type DataSnapshot, type Database } from "firebase/database";
import { ingSozlukDb, trSozlukDb } from "./firebase";
import { onbellegeYaz, onbellektenOku } from "./onbellek";
import { gunAnahtari } from "./tarih";

export type SozlukTuru = "turkce" | "ingilizce";

export type SozlukKelime = {
  id: string; text: string; meaning: string; tur: string; ornek: string; ornekTr: string;
};

export const TR_HARFLER = [
  "A","B","C","Ç","D","E","F","G","Ğ","H","I","İ","J","K","L","M",
  "N","O","Ö","P","R","S","Ş","T","U","Ü","V","Y","Z",
];
export const EN_HARFLER = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));

export const SOZLUK: Record<SozlukTuru, {
  baslik: string; altBaslik: string; aramaIpucu: string; kok: string; db: Database;
  harfler: string[]; yerel: string; yol: string;
}> = {
  turkce: {
    baslik: "Türkçe Sözlük", altBaslik: "Kelime ara, anlamını öğren!", aramaIpucu: "Kelime ara…",
    kok: "sozluk", db: trSozlukDb, harfler: TR_HARFLER, yerel: "tr", yol: "/sozluk",
  },
  ingilizce: {
    baslik: "İngilizce Sözlük", altBaslik: "Word ara, Türkçesini öğren!", aramaIpucu: "Search a word…",
    kok: "ingsozluk", db: ingSozlukDb, harfler: EN_HARFLER, yerel: "en", yol: "/ingilizce-sozluk",
  },
};

/** Kelimenin harf düğümü: Türkçe'de i→İ, ı→I. */
export function harfi(tur: SozlukTuru, kelime: string): string | null {
  const c = kelime.trim()[0];
  if (!c) return null;
  const h = c === "i" ? "İ" : c === "ı" ? "I" : c.toLocaleUpperCase(SOZLUK[tur].yerel);
  return SOZLUK[tur].harfler.includes(h) ? h : null;
}

const metin = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const tamsayi = (v: unknown) => (typeof v === "number" ? Math.round(v) : typeof v === "string" ? Number.parseInt(v, 10) || 0 : 0);
function cocuklar(snap: DataSnapshot): DataSnapshot[] {
  const out: DataSnapshot[] = [];
  snap.forEach((c) => { out.push(c); });
  return out;
}

export function sozlukSayilariOnbellekten(tur: SozlukTuru): Record<string, number> | null {
  return onbellektenOku<Record<string, number>>(`sozlukSayilari:${tur}`, true);
}

export async function sozlukSayilariniGetir(tur: SozlukTuru): Promise<Record<string, number>> {
  const s = SOZLUK[tur];
  const snap = await get(dbRef(s.db, `content/${s.kok}/meta/counts`));
  const out: Record<string, number> = {};
  for (const c of cocuklar(snap)) if (c.key) out[c.key] = tamsayi(c.child("kelimeler").val());
  onbellegeYaz(`sozlukSayilari:${tur}`, out, true);
  return out;
}

/** Bir harfin tüm kelimeleri (alfabetik) — sekme ömrünce önbellekte. */
export async function sozlukHarfGetir(tur: SozlukTuru, harf: string): Promise<SozlukKelime[]> {
  const anahtar = `sozlukHarf:${tur}:${harf}`;
  const hazir = onbellektenOku<SozlukKelime[]>(anahtar, true);
  if (hazir) return hazir;
  const s = SOZLUK[tur];
  const snap = await get(dbRef(s.db, `content/${s.kok}/letters/${harf}/kelimeler`));
  const out: SozlukKelime[] = [];
  for (const c of cocuklar(snap)) {
    const text = metin(c.child("text").val());
    const meaning = metin(c.child("meaning").val());
    if (!text || !meaning) continue;
    out.push({
      id: c.key ?? String(out.length), text, meaning,
      tur: metin(c.child("tur").val()), ornek: metin(c.child("ornek").val()), ornekTr: metin(c.child("ornekTr").val()),
    });
  }
  out.sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  onbellegeYaz(anahtar, out, true);
  return out;
}

/** Kotlin `String.hashCode()` — günün kelimesi üç platformda aynı çıksın diye. */
function javaHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}

/** Günün kelimesi: abs(hash("H_kok") + yyyymmdd) % adet — Android/iOS ile aynı formül. */
export async function gununKelimesi(tur: SozlukTuru, harf: string): Promise<SozlukKelime | null> {
  const liste = await sozlukHarfGetir(tur, harf);
  if (liste.length === 0) return null;
  const g = gunAnahtari();   // "yyyy-MM-dd" (İstanbul)
  const seed = Number(g.slice(0, 4)) * 10000 + Number(g.slice(5, 7)) * 100 + Number(g.slice(8, 10));
  const toplam = (javaHash(`${harf}_${SOZLUK[tur].kok}`) + seed) | 0;
  return liste[Math.abs(toplam) % liste.length];
}

/** Arama: sorgunun ilk harfinin listesi; "başlayan"lar önce, sonra "içeren"ler (en çok 60). */
export async function sozlukAra(tur: SozlukTuru, sorgu: string): Promise<SozlukKelime[]> {
  const yerel = SOZLUK[tur].yerel;
  const q = sorgu.trim().toLocaleLowerCase(yerel);
  if (!q) return [];
  const h = harfi(tur, q);
  if (!h) return [];
  const liste = await sozlukHarfGetir(tur, h);
  const k = (m: SozlukKelime) => m.text.toLocaleLowerCase(yerel);
  const baslayan = liste.filter((m) => k(m).startsWith(q));
  const iceren = liste.filter((m) => !k(m).startsWith(q) && k(m).includes(q));
  return [...baslayan, ...iceren].slice(0, 60);
}
