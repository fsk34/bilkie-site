"use client";

// İstatistik → "Bilgie Koç" sekmesi (20 Eyl 2026): bugünkü fotoğraf, mevcut veriyle.
//   1. Bilgie ne diyor? — tutan TÜM kurallar (ana ekranda yalnız ilki var), konuşma balonu + eylem düğmesi
//   1b. Ders ders durumun — yalnız "Tüm dersler"deyken: her ders bir satır (soru · süre · en zayıf konu · %),
//       satıra dokununca üstteki ders seçici o derse geçer (sayfa state'i, onDersSec)
//   2. Süper olduğun konular / Biraz daha çalışalım — en iyi 3 / en zayıf 3 konu (≥10 soru)
//   3. Ne kadar hızlısın? — ders başına ortalama test süresi
//   4. Tekrar bakacağın sorular — ders ders sayı, hazır olanlar, konu bazında ilk 5, Hata Turu
//   5. Kâğıtta çözdüklerin — elle girilen kayıtlar
//   6. "Haftalık ilerleme yakında" (zaman serisi verisi henüz yazılmıyor — uydurmuyoruz)
// Dil (21 Eyl): 3.–4. sınıf çocuğuna hitap — kısa cümle, "sen" dili, sayı eşiği/terim yok.
// Üstteki ders seçici burada da geçerli: tek ders seçiliyse o derse ait olanlar.

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import UcNokta from "../UcNokta";
import { konuAyristir, uniteler } from "../../lib/katalog";
import { useDefterIlerlemesi, useIstatistikAgaci, useQuizBitenler, useSonDokunulan, useTestIlerlemesi, useUstBilgi } from "../../lib/canliVeri";
import { dersEtiketi, devamKartiHesapla, type DevamVerisi } from "../../lib/anaEkran";
import { ESIK, KURAL_ETIKETI, istatistikBirlestir, kocGozlemleri, kocIstatistikCoz, type KocGozlem, type KocIstatistik } from "../../lib/koc";
import { evdeKayitlariOku, evdeOzetle, type EvdeKayit } from "../../lib/evde";
import { HATA_OLGUNLASMA_GUN, hatalariOku, olgunHatalar, type Hata } from "../../lib/hatalar";
import { yaziliTakvimi } from "../../lib/yaziliTakvim";
import { dersRengi } from "../../lib/veri";

const KOC_DERSLER = ["turkce", "matematik", "fen", "sosyal", "ingilizce"];

export default function BilgieKocBolumu({ uid, sinif, dersKey, onDersSec }: { uid: string; sinif: number; dersKey: string | null; onDersSec: (ders: string) => void }) {
  const ilerleme = useTestIlerlemesi(sinif);
  const defter = useDefterIlerlemesi(sinif);
  const quiz = useQuizBitenler(sinif);
  const son = useSonDokunulan(sinif);
  const ust = useUstBilgi(sinif);

  // İstatistik CANLI (stats/grade{N} ağacı, İstatistik ekranıyla aynı abonelik); evde
  // çözülenler üstüne eklenir. Hatalar/evde/takvim ise açılışta bir kez okunur.
  const agac = useIstatistikAgaci(sinif);
  const [hatalar, setHatalar] = useState<Hata[] | null>(null);
  const [evde, setEvde] = useState<EvdeKayit[] | null>(null);
  const [simdi, setSimdi] = useState(0);   // veri geldiğinde sabitlenen "şimdi" (render'da Date.now() yok)
  const [yazili, setYazili] = useState<{ ad: string; anahtar: string; gunKaldi: number } | null | undefined>(undefined);

  useEffect(() => {
    let iptal = false;
    Promise.all([hatalariOku(uid, sinif), yaziliTakvimi(), evdeKayitlariOku(uid, sinif)]).then(([h, t, e]) => {
      if (iptal) return;
      setHatalar(h); setEvde(e); setSimdi(Date.now());
      if (t.durum !== "basarili") { setYazili(null); return; }
      const acik = t.sinavlar.find((s) => s.acik);
      if (acik) { setYazili({ ad: acik.ad, anahtar: acik.anahtar, gunKaldi: 0 }); return; }
      const bugun = new Date().toISOString().slice(0, 10);
      const sonraki = t.sinavlar.filter((s) => s.baslar && s.baslar > bugun).sort((a, b) => a.baslar!.localeCompare(b.baslar!))[0];
      setYazili(sonraki?.baslar ? { ad: sonraki.ad, anahtar: sonraki.anahtar, gunKaldi: Math.max(0, Math.round((Date.parse(sonraki.baslar) - Date.parse(bugun)) / 86400000)) } : null);
    });
    return () => { iptal = true; };
  }, [uid, sinif]);

  const istatistik: KocIstatistik | null = useMemo(() => {
    if (!agac || evde === null) return null;
    const app = kocIstatistikCoz((agac as { subjects?: unknown }).subjects);
    return evde.length > 0 ? istatistikBirlestir(app, evdeOzetle(evde)) : app;
  }, [agac, evde]);

  const veri = useMemo<DevamVerisi | null>(() => (ilerleme && defter && quiz ? { ilerleme, defter, quiz } : null), [ilerleme, defter, quiz]);

  const gozlemler: KocGozlem[] | null = useMemo(() => {
    if (!istatistik || !hatalar || !veri || yazili === undefined) return null;
    const simdi = new Date();
    const devam = son !== undefined ? devamKartiHesapla(sinif, son, veri) : null;
    const hepsi = kocGozlemleri({
      sinif, veri, istatistik, devam, yazili,
      seri: ust ? { seri: ust.seri, bugunAktif: ust.bugunAktif } : null,
      hatalar: { olgun: olgunHatalar(hatalar, simdi.getTime()).length, toplam: hatalar.length },
      simdi: simdi.getTime(), saat: simdi.getHours(),
    });
    // Ders seçiliyse: o derse ait gözlemler + dersten bağımsız olanlar (yazılı, yanlışlar, seri)
    return dersKey ? hepsi.filter((g) => !g.eylem || g.eylem.ders === dersKey || g.eylem.ders === "hata") : hepsi;
  }, [istatistik, hatalar, veri, yazili, son, ust, sinif, dersKey]);

  if (gozlemler == null || hatalar == null || istatistik == null) return <UcNokta boyut={10} aralik={8} etiket="Bilgie düşünüyor" style={{ padding: "28px 0" }} />;

  const dersler = dersKey ? [dersKey] : KOC_DERSLER;

  return (
    <div className="bk-koc-sayfa">
      <Gozlemler gozlemler={gozlemler} />
      {!dersKey && <DersDers sinif={sinif} istatistik={istatistik} onDersSec={onDersSec} />}
      <GucluZayif sinif={sinif} istatistik={istatistik} dersler={dersler} />
      <Hiz sinif={sinif} istatistik={istatistik} dersler={dersler} />
      <Yanlislar sinif={sinif} hatalar={hatalar} dersler={dersler} simdi={simdi} />
      <EvdeCozduklerim sinif={sinif} kayitlar={(evde ?? []).filter((k) => dersler.includes(k.ders))} />
      <p className="bk-soluk bk-koc-yakinda">📈 Haftalık ilerleme grafiğin yakında burada olacak.</p>
    </div>
  );
}

/* ------------------------------------------------------------ bölüm başlığı */
/* Her bölüm aynı kalıp: simge kutusu + başlık (+ tek satır açıklama, + sağda bağlantı). */

function Baslik({ simge, baslik, alt, sag }: { simge: ReactNode; baslik: string; alt?: string; sag?: ReactNode }) {
  return (
    <div className="bk-koc-baslik">
      <span className="simge">{simge}</span>
      <div className="metin">
        <h3>{baslik}</h3>
        {alt && <p className="bk-soluk">{alt}</p>}
      </div>
      {sag}
    </div>
  );
}

/* ------------------------------------------------------------- gözlemler */

function Gozlemler({ gozlemler }: { gozlemler: KocGozlem[] }) {
  return (
    <section className="bk-koc-bolum bk-koc-gozlemler">
      <Baslik
        /* eslint-disable-next-line @next/next/no-img-element */
        simge={<img src="/bilkie-ikon.png" alt="" />}
        baslik="Bilgie ne diyor?"
        alt={gozlemler.length === 0 ? "Bugün her şey yolunda görünüyor." : `Bugün sana ${gozlemler.length} şey söyleyeceğim.`}
      />
      {gozlemler.length === 0 && <p className="bk-soluk">Dikkatimi çeken bir şey yok. Kaldığın yerden devam et, ben buradayım. 😊</p>}
      {gozlemler.map((g, i) => (
        <div className="bk-koc-gozlem" key={g.kural + i} data-kural={g.kural}>
          <span className="bk-koc-etiket" style={g.eylem ? etiketRengi(g.eylem.ders) : undefined}>{KURAL_ETIKETI[g.kural]}</span>
          <p>{g.mesaj}</p>
          {g.eylem && (
            <Link href={g.eylem.href} className="bk-koc-git" style={dugmeRengi(g.eylem.ders)}>{g.eylem.baslik} ›</Link>
          )}
        </div>
      ))}
    </section>
  );
}

/** Eylem düğmesi dersin renginde; yazı rengi zemine göre (İngilizce moru koyu, üstüne beyaz). */
function dugmeRengi(ders: string): { background: string; color: string } {
  const hex = dersRengi(ders);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const parlaklik = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return { background: hex, color: parlaklik > 0.45 ? "#0c1a3f" : "#ffffff" };
}

/** Tür rozeti dersin renginde ama hafif: saydam zemin + renkli yazı, dolu düğmeden ayrışsın. */
function etiketRengi(ders: string): { background: string; color: string; boxShadow: string } {
  const hex = dersRengi(ders);
  return { background: `${hex}2e`, color: hex, boxShadow: `inset 0 0 0 1px ${hex}66` };
}

/* ---------------------------------------------------------- ders ders durum */
/* Beş dersin hepsi listelenir; test çözülmemiş ders de "Henüz test çözmedin" diye durur ki
   çocuk hangi derse hiç dokunmadığını görsün. En zayıf konu = ≥10 sorulu en düşük başarı. */

function DersDers({ sinif, istatistik, onDersSec }: { sinif: number; istatistik: KocIstatistik; onDersSec: (ders: string) => void }) {
  const satirlar = KOC_DERSLER.map((ders) => {
    const t = istatistik[ders]?.tests;
    const zayif = konuListesi(sinif, istatistik, [ders]).sort((a, b) => a.basari - b.basari)[0] ?? null;
    return { ders, soru: t?.soru ?? 0, basari: t?.basari ?? 0, ortSn: t?.ortSn ?? 0, zayif };
  });
  if (satirlar.every((r) => r.soru === 0)) return null;
  return (
    <section className="bk-koc-bolum">
      <Baslik simge="📚" baslik="Ders ders durumun" alt="Bir derse dokun, Bilgie yalnız o dersi anlatsın." />
      {satirlar.map((r) => (
        <button type="button" key={r.ders} className="bk-koc-ders" onClick={() => onDersSec(r.ders)} data-bos={r.soru === 0}>
          <span className="bk-koc-nokta" style={{ background: dersRengi(r.ders) }} />
          <span className="ad">{dersEtiketi(r.ders, sinif)}</span>
          <span className="alt">
            {r.soru === 0
              ? "Henüz test çözmedin"
              : [`${r.soru} soru`, r.ortSn > 0 ? `test başına ${sureMetni(r.ortSn)}` : null, r.zayif ? `en zor: ${r.zayif.konuAdi}` : null].filter(Boolean).join(" · ")}
          </span>
          {r.soru > 0 && (
            <span className="sag">
              <b data-ton={r.basari >= 85 ? "guclu" : r.basari < ESIK.zayifBasari ? "zayif" : "orta"}>%{r.basari}</b>
              <span className="cubuk"><i style={{ width: `${r.basari}%`, background: dersRengi(r.ders) }} /></span>
            </span>
          )}
          <span className="ok">›</span>
        </button>
      ))}
    </section>
  );
}

/* ------------------------------------------------------ güçlü / zayıf konular */

type KonuSatiri = { ders: string; konuAdi: string; konuKey: string; basari: number; soru: number };

function konuListesi(sinif: number, istatistik: KocIstatistik, dersler: string[]): KonuSatiri[] {
  const out: KonuSatiri[] = [];
  for (const ders of dersler) {
    const adlar = new Map<string, string>();
    for (const u of uniteler(sinif, ders)) for (const t of u.topics) { const k = konuAyristir(t); if (k.testKey) adlar.set(k.testKey, k.baslik); }
    for (const [konuKey, s] of Object.entries(istatistik[ders]?.topics ?? {})) {
      if (s.soru < ESIK.konuSoru) continue;
      const ad = adlar.get(konuKey);
      if (ad) out.push({ ders, konuAdi: ad, konuKey, basari: s.basari, soru: s.soru });
    }
  }
  return out;
}

function GucluZayif({ sinif, istatistik, dersler }: { sinif: number; istatistik: KocIstatistik; dersler: string[] }) {
  const liste = konuListesi(sinif, istatistik, dersler);
  const guclu = [...liste].filter((k) => k.basari >= 85).sort((a, b) => b.basari - a.basari).slice(0, 3);
  const zayif = [...liste].filter((k) => k.basari < ESIK.zayifBasari).sort((a, b) => a.basari - b.basari).slice(0, 3);
  const satir = (k: KonuSatiri, ton: "guclu" | "zayif") => (
    <Link key={k.ders + k.konuKey} href={`/test/${k.ders}/${k.konuKey}`} className="bk-koc-konu" data-ton={ton}>
      <span className="bk-koc-nokta" style={{ background: dersRengi(k.ders) }} />
      <span className="ad">{k.konuAdi}</span>
      <span className="ders">{dersEtiketi(k.ders, sinif)}</span>
      <b>%{k.basari}</b>
      <span className="soru">{k.soru} soru</span>
    </Link>
  );
  return (
    <div className="bk-koc-iki">
      <section className="bk-koc-bolum">
        <Baslik simge="🌟" baslik="Süper olduğun konular" />
        {guclu.length === 0
          ? <p className="bk-soluk">Bir konuda {ESIK.konuSoru} soru çözünce en iyi konuların burada görünür.</p>
          : guclu.map((k) => satir(k, "guclu"))}
      </section>
      <section className="bk-koc-bolum">
        <Baslik simge="💪" baslik="Biraz daha çalışalım" />
        {zayif.length === 0
          ? <p className="bk-soluk">Zorlandığın bir konu yok. Böyle devam! 🎉</p>
          : zayif.map((k) => satir(k, "zayif"))}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- hız */

function Hiz({ sinif, istatistik, dersler }: { sinif: number; istatistik: KocIstatistik; dersler: string[] }) {
  const satirlar = dersler
    .map((d) => ({ ders: d, ortSn: istatistik[d]?.tests?.ortSn ?? 0, cozulen: istatistik[d]?.tests?.cozulen ?? 0 }))
    .filter((r) => r.ortSn > 0 && r.cozulen > 0);
  if (satirlar.length === 0) return null;
  const enUzun = Math.max(...satirlar.map((r) => r.ortSn));
  const enHizli = [...satirlar].sort((a, b) => a.ortSn - b.ortSn)[0];
  const enYavas = [...satirlar].sort((a, b) => b.ortSn - a.ortSn)[0];
  return (
    <section className="bk-koc-bolum">
      <Baslik simge="⏱️" baslik="Ne kadar hızlısın?" alt="Bir testi ortalama bu kadar sürede bitiriyorsun." />
      {satirlar.map((r) => (
        <div className="bk-koc-hiz" key={r.ders}>
          <span className="ders">{dersEtiketi(r.ders, sinif)}</span>
          <span className="cubuk"><i style={{ width: `${(r.ortSn / enUzun) * 100}%`, background: dersRengi(r.ders) }} /></span>
          <span className="sn">{sureMetni(r.ortSn)}</span>
        </div>
      ))}
      {satirlar.length > 1 && (
        <p className="bk-soluk bk-koc-not">
          En hızlı olduğun ders <b>{dersEtiketi(enHizli.ders, sinif)}</b>, en çok düşündüğün ders <b>{dersEtiketi(enYavas.ders, sinif)}</b>.
          Yavaş olmak sorun değil; önemli olan doğru çözmek. 😊
        </p>
      )}
    </section>
  );
}

function sureMetni(sn: number): string {
  if (sn < 60) return `${Math.round(sn)} sn`;
  const dk = Math.floor(sn / 60), kalan = Math.round(sn % 60);
  return kalan > 0 ? `${dk} dk ${kalan} sn` : `${dk} dk`;
}

/* ------------------------------------------------------------- yanlışlar */

function Yanlislar({ sinif, hatalar, dersler, simdi }: { sinif: number; hatalar: Hata[]; dersler: string[]; simdi: number }) {
  const liste = hatalar.filter((h) => dersler.includes(h.ders));
  const olgun = olgunHatalar(liste, simdi).length;
  // Hiçbiri hazır değilse: ilk hazır olacak olana kaç gün var (çocuğa "bekle" değil, "2 gün sonra" deriz)
  const ilkHazirGun = liste.length > 0 && olgun === 0
    ? Math.max(1, Math.ceil((Math.min(...liste.map((h) => h.zaman)) + HATA_OLGUNLASMA_GUN * 86400000 - simdi) / 86400000))
    : 0;
  // Konu bazında sayım (ilk 5)
  const konuSayim = new Map<string, { ders: string; konu: string; sayi: number }>();
  for (const h of liste) {
    const k = `${h.ders}/${h.konu}`;
    konuSayim.set(k, { ders: h.ders, konu: h.konu, sayi: (konuSayim.get(k)?.sayi ?? 0) + 1 });
  }
  const konular = [...konuSayim.values()].sort((a, b) => b.sayi - a.sayi).slice(0, 5);
  const konuAdi = (ders: string, konuKey: string) => {
    for (const u of uniteler(sinif, ders)) for (const t of u.topics) { const k = konuAyristir(t); if (k.testKey === konuKey) return k.baslik; }
    return konuKey;
  };
  return (
    <section className="bk-koc-bolum">
      <Baslik simge="🔁" baslik="Tekrar bakacağın sorular" alt="Testlerde yanlış yaptığın soruları birkaç gün sonra sana yeniden sorarım." />
      {liste.length === 0 ? (
        <p className="bk-soluk">Şu an yanlışın yok. Harika! 🎉</p>
      ) : (
        <>
          <div className="bk-yanlis-sayi bk-koc-sayi">
            {olgun > 0
              ? <><b>{olgun}</b> soru seni bekliyor. Hadi yeniden çözelim!</>
              : <><b>{liste.length}</b> yanlışın var. {ilkHazirGun === 1 ? "Yarın" : `${ilkHazirGun} gün sonra`} yeniden soracağım.</>}
          </div>
          {konular.map((k) => (
            <div className="bk-koc-hiz" key={k.ders + k.konu}>
              <span className="ders" style={{ flexBasis: "auto", flex: 1 }}>
                <span className="bk-koc-nokta" style={{ background: dersRengi(k.ders), marginRight: 8 }} />{konuAdi(k.ders, k.konu)}
              </span>
              <span className="sn">{k.sayi} soru</span>
            </div>
          ))}
          {olgun > 0 && (
            <Link href="/hata-turu" className="bk-konu-dugme bk-koc-dugme" style={{ background: "#ffa726", borderColor: "#b85c00", color: "#0C1A3F", marginTop: 12 }}>
              Yanlışlarımı yeniden çöz
            </Link>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ evde çözdüklerim */
/* Üç görünüm (kullanıcı, 20 Eyl): Derse göre · Kitaba göre · Son kayıtlar. Grup satırı = ad · soru · %;
   açılınca konu satırları (D/Y + yanlış no'lar). Kaynaksız kayıtlar "Kaynak yazılmamış" grubunda. */

type EvdeGrup = { ad: string; soru: number; dogru: number; satirlar: { ad: string; alt: string; dogru: number; yanlis: number; nolar: number[] }[] };

function EvdeCozduklerim({ sinif, kayitlar }: { sinif: number; kayitlar: EvdeKayit[] }) {
  const [gorunum, setGorunum] = useState<"ders" | "kitap" | "kayit">("ders");
  const [acik, setAcik] = useState<string | null>(null);
  const toplam = kayitlar.reduce((t, k) => t + k.dogru + k.yanlis, 0);
  const dogru = kayitlar.reduce((t, k) => t + k.dogru, 0);
  const konuAdi = (ders: string, konuKey: string) => {
    if (!konuKey) return "Ünite geneli";
    for (const u of uniteler(sinif, ders)) for (const t of u.topics) { const k = konuAyristir(t); if (k.testKey === konuKey) return k.baslik; }
    return konuKey;
  };
  const tarih = (ms: number) => new Date(ms).toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  const yuzde = (d: number, s: number) => (s > 0 ? Math.round((d / s) * 100) : 0);

  // Gruplama: derse göre (satır = konu, kitap alt bilgisi) · kitaba göre (satır = konu, ders alt bilgisi)
  const gruplar: EvdeGrup[] = (() => {
    const m = new Map<string, EvdeGrup>();
    for (const k of kayitlar) {
      const anahtar = gorunum === "ders" ? k.ders : (k.kaynak || "Kaynak yazılmamış");
      const ad = gorunum === "ders" ? dersEtiketi(k.ders, sinif) : anahtar;
      const g = m.get(anahtar) ?? { ad, soru: 0, dogru: 0, satirlar: [] };
      g.soru += k.dogru + k.yanlis; g.dogru += k.dogru;
      // Aynı konu (ve aynı kitap/ders) birden çok kayıtsa topla
      const satirAd = konuAdi(k.ders, k.konu);
      const alt = gorunum === "ders" ? (k.kaynak || "kaynaksız") : dersEtiketi(k.ders, sinif);
      const mevcut = g.satirlar.find((r) => r.ad === satirAd && r.alt === alt);
      if (mevcut) { mevcut.dogru += k.dogru; mevcut.yanlis += k.yanlis; mevcut.nolar = [...new Set([...mevcut.nolar, ...k.yanlisNolar])].sort((x, y) => x - y); }
      else g.satirlar.push({ ad: satirAd, alt, dogru: k.dogru, yanlis: k.yanlis, nolar: [...k.yanlisNolar] });
      m.set(anahtar, g);
    }
    return [...m.values()].sort((x, y) => y.soru - x.soru);
  })();

  return (
    <section className="bk-koc-bolum">
      <Baslik simge="📒" baslik="Kâğıtta çözdüklerin" sag={<Link href="/evde" className="bk-koc-ekle">+ EKLE</Link>} />
      {kayitlar.length === 0 ? (
        <p className="bk-soluk">Kitaptan ya da kâğıttan çözdüğün testleri de ekle; seni daha iyi tanırım. Puan kazandırmaz ama serini korur.</p>
      ) : (
        <>
          <div className="bk-yanlis-sayi bk-koc-sayi"><b>{toplam}</b> soru çözdün, <b>%{yuzde(dogru, toplam)}</b> doğru.</div>
          <div className="bk-evde-gorunum">
            {([["ders", "Derse göre"], ["kitap", "Kitaba göre"], ["kayit", "Son kayıtlar"]] as const).map(([id, ad]) => (
              <button key={id} type="button" data-aktif={gorunum === id} onClick={() => { setGorunum(id); setAcik(null); }}>{ad}</button>
            ))}
          </div>

          {gorunum !== "kayit" && gruplar.map((g) => {
            const acikMi = acik === g.ad;
            return (
              <div key={g.ad} className="bk-evde-grup" data-acik={acikMi}>
                <button type="button" className="bk-evde-grup-bas" onClick={() => setAcik(acikMi ? null : g.ad)}>
                  {gorunum === "ders" && <span className="bk-koc-nokta" style={{ background: dersRengi(kayitlar.find((k) => dersEtiketi(k.ders, sinif) === g.ad)?.ders ?? "") }} />}
                  <span className="ad">{g.ad}</span>
                  <span className="sayi">{g.soru} soru</span>
                  <span className="cubuk"><i style={{ width: `${yuzde(g.dogru, g.soru)}%` }} /></span>
                  <b>%{yuzde(g.dogru, g.soru)}</b>
                  <span className="ok">{acikMi ? "▴" : "▾"}</span>
                </button>
                {acikMi && g.satirlar.map((r) => (
                  <div className="bk-koc-evde-satir" key={r.ad + r.alt}>
                    <div className="ad">
                      <div>{r.ad}</div>
                      <div className="alt">{r.alt}{r.nolar.length > 0 ? ` · yanlış: ${r.nolar.join(", ")}` : ""}</div>
                    </div>
                    <span className="sonuc"><b>{r.dogru}</b> D · {r.yanlis} Y · %{yuzde(r.dogru, r.dogru + r.yanlis)}</span>
                  </div>
                ))}
              </div>
            );
          })}

          {gorunum === "kayit" && kayitlar.slice(0, 12).map((k) => (
            <div className="bk-koc-evde-satir" key={k.id}>
              <span className="bk-koc-nokta" style={{ background: dersRengi(k.ders) }} />
              <div className="ad">
                <div>{konuAdi(k.ders, k.konu)}</div>
                <div className="alt">{dersEtiketi(k.ders, sinif)} · {tarih(k.zaman)}{k.kaynak ? ` · ${k.kaynak}` : ""}{k.yanlisNolar.length > 0 ? ` · yanlış: ${k.yanlisNolar.join(", ")}` : ""}</div>
              </div>
              <span className="sonuc"><b>{k.dogru}</b> D · {k.yanlis} Y</span>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
