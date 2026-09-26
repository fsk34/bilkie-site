"use client";

// Ana ekran — 19 Eyl 2026 yeniden kurgu (önce web, onay sonra Android/iOS).
// Eskiden: 4 küçük kutu + KONU TESTLERİ / KONU DEFTERLERİ / YAZILIYA HAZIRLIK kapıları;
// çocuk önce "ne tür içerik" seçiyor, sonra ders, sonra ünite — her seferinde 3-4 tık.
// Şimdi sıra (kullanıcı kararı):
//   1. 4 küçük kutu (Notlar · sözlükler · atasözü) — telefonda TEK SIRA
//   2. Kaldığın Yerden Devam Et — tek tıkla içeriğe; üç hâl (Hadi başlayalım / Devam Et / Sıradaki);
//      20 Eyl: iş türü ünitenin sırasını izler (Defter → konu testleri → Quiz → sonraki ünite)
//   3. Bugünkü Hedef — YALNIZ sağ ray gizliyken (≤1260px; masaüstünde rayda zaten var)
//   4. Yazılıya Hazırlık — açık dönemde büyük band (derslerin ÜSTÜNDE), yoksa ince satır (ALTINDA)
//   5. 5 ders kartı (Konu Testleri sayfasındaki .bk-ders-kutu dili) → /ders/[ders]
//   6. Bilgie Koç (kural tabanlı, lib/koc.ts: tek cümle + eylemler) + Yanlışlarım (Hata Turu evi)
//      Bu ayın rozeti 20 Eyl'de sağ raya taşındı (Kabuk), ray gizliyken Hedef'in altında.
// Taslak: ~/Desktop/bilkie-taslak/ana-*.png

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Kabuk from "./Kabuk";
import RozetKazandin from "./RozetKazandin";
import LigAtladin from "./LigAtladin";
import UcNokta from "./UcNokta";
import { useOturum } from "../lib/oturum";
import { uniteler } from "../lib/katalog";
import {
  useDefterIlerlemesi, useGorevDurumu, useGorevler, useIstatistikAgaci, useQuizBitenler, useSonDokunulan, useTestIlerlemesi, useUstBilgi,
} from "../lib/canliVeri";
import { type Gorev } from "../lib/veri";
import { istatistikBirlestir, kocIstatistikCoz, kocPlaniHesapla, type KocIstatistik, type KocPlani } from "../lib/koc";
import { evdeKayitlariOku, evdeOzetle, type EvdeOzet } from "../lib/evde";
import { HATA_OLGUNLASMA_GUN, hatalariOku, olgunHatalar } from "../lib/hatalar";
import { acilisMetni, yaziliTakvimi, type YaziliSinav } from "../lib/yaziliTakvim";
import { ayVurgu } from "../lib/ayGorsel";
import { gunAnahtari } from "../lib/tarih";
import AyRozetiKutusu from "./AyRozeti";
import {
  DERS_SIRASI, dersEkli, dersEtiketi, dersOranlari, devamKartiHesapla, type DevamKarti as DevamKartiVerisi, type DevamVerisi,
} from "../lib/anaEkran";

const KUTULAR = [
  // 15 Eyl 2026 sırası (kullanıcı kararı): Notlarım · Türkçe Sözlük · İngilizce Sözlük · Atasözleri.
  { ad: "Notlarım",                 gorsel: "notlar",   ust: "#25256B", alt: "#453486", yol: "/notlar" },
  { ad: "Türkçe\nSözlük",           gorsel: "abc",      ust: "#10496E", alt: "#0F5870", yol: "/sozluk" },
  { ad: "İngilizce\nSözlük",        gorsel: "hello",    ust: "#2967A5", alt: "#346EB5", yol: "/ingilizce-sozluk" },
  { ad: "Atasözleri\nve Deyimler", gorsel: "atasozu",  ust: "#1F2C6B", alt: "#262F6F", yol: "/atasozleri" },
];

// Ders kartı renkleri Konu Testleri sayfasındakiyle (KonuTestleriScreen) birebir.
const DERS_STIL: Record<string, { ust: string; alt: string; ikon: string; dolgu: string; parlak: string }> = {
  turkce:    { ust: "#72CEFD", alt: "#1E608F", ikon: "abc",    dolgu: "#A3D9FF", parlak: "#DEF2FF" },
  matematik: { ust: "#F04B74", alt: "#A2314D", ikon: "abakus", dolgu: "#FF789A", parlak: "#FFBDCE" },
  fen:       { ust: "#40DB18", alt: "#206B0D", ikon: "deney",  dolgu: "#72D759", parlak: "#B8F0AE" },
  sosyal:    { ust: "#F0EB4B", alt: "#8F8C2E", ikon: "dunya",  dolgu: "#FFFA5D", parlak: "#FFFDBC" },
  ingilizce: { ust: "#971FB5", alt: "#5B0B6E", ikon: "hello",  dolgu: "#E78AFE", parlak: "#F4C8FF" },
};

export default function AnaEkran() {
  // Rozet sahnesi bakarken/açıkken lig sahnesi bekler (Android ile aynı sıra: önce rozet, sonra lig)
  const [rozetMesgul, setRozetMesgul] = useState(true);
  return (
    <Kabuk>
      <RozetKazandin onMesgul={setRozetMesgul} />
      <LigAtladin bekle={rozetMesgul} />
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { sinif, kullanici } = useOturum();
  const ilerleme = useTestIlerlemesi(sinif);
  const son = useSonDokunulan(sinif);
  const defter = useDefterIlerlemesi(sinif);
  const quiz = useQuizBitenler(sinif);
  const gunlukDurum = useGorevDurumu("gunluk");
  const haftalik = useGorevler("haftalik");
  const yazili = useYaziliDurumu();

  const oranlar = useMemo(
    () => dersOranlari(sinif, { ilerleme: ilerleme ?? {}, defter: defter ?? {}, quiz: quiz ?? {} }),
    [sinif, ilerleme, defter, quiz]
  );
  const veri = useMemo<DevamVerisi | null>(
    () => (ilerleme && defter && quiz ? { ilerleme, defter, quiz } : null), [ilerleme, defter, quiz]
  );
  const hesaplanan = useMemo(
    () => (veri && son !== undefined ? devamKartiHesapla(sinif, son, veri) : null),
    [sinif, son, veri]
  );
  const ust = useUstBilgi(sinif);
  const seri = useMemo(() => (ust ? { seri: ust.seri, bugunAktif: ust.bugunAktif } : null), [ust]);
  const devam = useOnizleme(sinif, hesaplanan);
  const dersler = DERS_SIRASI.filter((d) => uniteler(sinif, d).length > 0);

  return (
    <>
      {/* Başlık yok: içerik doğrudan yukarıdan başlar, sağ raydaki kartlarla aynı hizada. */}
      <div className="bk-kutular">
        {KUTULAR.map((k) => (
          <Link key={k.gorsel} href={k.yol} className="bk-kutu" style={{ background: `linear-gradient(${k.ust}, ${k.alt})` }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/uygulama/${k.gorsel}.png`} alt="" />
            <span>{k.ad}</span>
            <i className="ok" aria-hidden>›</i>
          </Link>
        ))}
      </div>

      {devam && <DevamKarti sinif={sinif} devam={devam} />}

      <HedefKarti gunluk={gunlukDurum.gorevler} hata={gunlukDurum.hata} tekrarDene={gunlukDurum.tekrarDene} haftalik={haftalik} />
      {/* Bu ayın rozeti masaüstünde sağ rayda (Kabuk); ray gizliyken (≤1260px) Hedef'in altında */}
      <div className="bk-hedef"><AyRozetiKutusu /></div>

      {yazili.durum === "acik" && <YaziliBandi sinav={yazili.sinav} />}

      <div className="bk-dersler">
        {dersler.map((d) => {
          const s = DERS_STIL[d];
          const p = oranlar[d] ?? 0;
          return (
            <Link key={d} href={`/ders/${d}`} className="bk-ders-kutu" style={{ background: s.ust, borderBottom: `7px solid ${s.alt}` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="ikon" src={`/uygulama/${s.ikon}.png`} alt="" />
              <span className="ad">{dersEtiketi(d, sinif)}</span>
              <span className="iz">
                <i className="dolgu" style={{ width: `${p * 100}%`, background: s.dolgu }} />
                {p > 0.15 && <i className="parlak" style={{ width: `calc(${p * 100}% - 14px)`, background: s.parlak }} />}
              </span>
            </Link>
          );
        })}
      </div>

      {yazili.durum === "kapali" && <YaziliSatiri metin={yazili.metin} />}

      <div className="bk-veri">
        <BilkieAIKutusu sinif={sinif} uid={kullanici?.uid ?? null} veri={veri} devam={devam} yazili={yazili.koc} seri={seri} />
        <YanlislarimKutusu uid={kullanici?.uid ?? null} sinif={sinif} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------- devam kartı */

/** YALNIZ geliştirme: `?onizle=dersbitti` kartı "Türkçeyi bitirdin → Matematik" hâline zorlar (tasarımı görmek için). */
const hicAbone = () => () => {};
function useOnizleme(sinif: number, gercek: DevamKartiVerisi | null): DevamKartiVerisi | null {
  // Sunucuda null, istemcide adres çubuğu (hydration uyuşmazlığı olmasın)
  const zorla = useSyncExternalStore(
    hicAbone,
    () => (process.env.NODE_ENV === "development" ? new URLSearchParams(window.location.search).get("onizle") : null),
    () => null
  );
  if (zorla !== "dersbitti") return gercek;
  const u = uniteler(sinif, "matematik")[0];
  return {
    hal: "dersbitti", tur: "defter", ders: "matematik", uniteAdi: u?.title ?? "", uniteIndeks: 0,
    baslik: u?.title ?? "", href: `/defter/matematik/${u?.defterKey || u?.key || ""}`,
    adim: 0, okunanSayfa: 0, toplamSayfa: 0, oran: 0,
    bitenDers: "turkce", bitenUnite: uniteler(sinif, "turkce").length,
  };
}

function DevamKarti({ sinif, devam }: { sinif: number; devam: DevamKartiVerisi }) {
  const s = DERS_STIL[devam.ders];
  // Kart SABİT (Bilkie lacivert + #4A538E kenar) — A/B karşılaştırması sonrası kullanıcı kararı (19 Eyl):
  // ders renginde kartta düğme kartla aynı tondan eriyor, sarı (yazılı) sinyaliyle de çakışıyordu.
  // Ders rengi üç yerde: etiket yanındaki hap, ilerleme çubuğu ve düğme (konu satırlarındaki
  // Başla = `ust` / Devam Et = `dolgu`, kenar `alt`; İngilizce moru beyaz yazı ister).
  const biten = devam.hal === "dersbitti" && devam.bitenDers ? devam.bitenDers : null;
  const etiket = biten ? `${dersEkli(biten, sinif, "i").toLocaleUpperCase("tr")} BİTİRDİN 🎉`
    : devam.hal === "devam" ? "KALDIĞIN YERDEN DEVAM ET" : devam.hal === "siradaki" ? "SIRADAKİ" : "HADİ BAŞLAYALIM";
  // İş türü rozeti: ders sayfasındaki hapların işaretleriyle aynı dil (✎ Konu Defteri / ✓ Quiz)
  const TUR = { defter: "✎ Konu Defteri", test: "Konu Testi", quiz: "✓ Ünite Quizi" } as const;
  const durumMetni =
    devam.tur === "test" ? (devam.adim > 0 ? `${devam.adim}. adım tamam` : "")
    : devam.tur === "defter" ? (devam.toplamSayfa > 0 ? `${devam.okunanSayfa}/${devam.toplamSayfa} sayfa` : "")
    : "";
  const alt = biten
    ? `${dersEtiketi(biten, sinif)} · ${devam.bitenUnite} ünite · tüm defterler, testler ve quizler tamam`
    : [dersEtiketi(devam.ders, sinif), devam.tur === "test" ? devam.uniteAdi : `${devam.uniteIndeks + 1}. ünite`, durumMetni]
      .filter(Boolean).join(" · ");
  const mor = devam.ders === "ingilizce";
  // Kutlama hâlinde sıradaki iş yarım kalmış olabilir (oran > 0) → "…e devam et"
  const dugme = devam.hal === "devam"
    ? { yazi: "Devam Et", stil: { background: s.dolgu, borderColor: s.alt, color: "#0C1A3F" } }
    : biten
      ? { yazi: `${dersEkli(devam.ders, sinif, "e")} ${devam.oran > 0 ? "devam et" : "başla"}`, stil: { background: s.ust, borderColor: s.alt, color: mor ? "#fff" : "#0C1A3F" } }
      : { yazi: "Başla", stil: { background: s.ust, borderColor: s.alt, color: mor ? "#fff" : "#0C1A3F" } };

  return (
    // Kartın tamamı değil, yalnız düğme tıklanır (kullanıcı, 19 Eyl): kaydırırken yanlışlıkla teste girmesin.
    <div className="bk-devam">
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="etiket">
          {etiket}
          <span className="hap" style={{ background: s.ust, color: mor ? "#fff" : "#150538" }}>{dersEtiketi(devam.ders, sinif)}</span>
          <span className="hap tur">{TUR[devam.tur]}</span>
        </div>
        <h2>{biten ? `${dersEkli(devam.ders, sinif, "e")} geçelim mi?` : devam.baslik}</h2>
        <div className="alt">{alt}</div>
        {devam.oran > 0 ? (
          <span className="iz" style={{ background: s.alt }}><i style={{ width: `${Math.round(devam.oran * 100)}%`, background: s.dolgu }} /></span>
        ) : (
          <span className="iz bos" />
        )}
        <Link href={devam.href} className="bk-konu-dugme" style={{ ...dugme.stil, width: biten ? "auto" : 150, minWidth: 150, padding: "0 18px" }}>
          {dugme.yazi}
        </Link>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/uygulama/${s.ikon}.png`} alt="" />
    </div>
  );
}

/* -------------------------------------------------------------- hedef kartı */
/* Sağ raydaki Günlük Görevler kartının içerik-içi kopyası; CSS yalnız ≤1260px'te gösterir.
   Görev v4'te günde tek görev var → altına haftalık görevin ilkini de koyuyoruz. */

function HedefKarti({ gunluk, hata, tekrarDene, haftalik }: { gunluk: Gorev[] | null; hata: boolean; tekrarDene: () => void; haftalik: Gorev[] | null }) {
  const renk = ayVurgu(Number(gunAnahtari().slice(5, 7)) - 1);
  const satir = (g: Gorev, onek?: string) => {
    const oran = Math.min(100, (g.ilerleme / Math.max(1, g.hedef)) * 100);
    return (
      <div className="bk-gorev" key={(onek ?? "") + g.id}>
        <div className="bk-gorev-govde">
          <div className="bk-gorev-ad">{onek && <span className="bk-gorev-onek">{onek}</span>}{onek && " · "}{g.baslik}</div>
          <div className="bk-cubuk"><i style={{ width: `${oran}%`, background: renk }} /></div>
          <div className="bk-gorev-sayi">{g.ilerleme} / {g.hedef}</div>
        </div>
        {g.xp > 0 && <span className="bk-gorev-xp">+{g.xp}</span>}
      </div>
    );
  };
  return (
    <div className="bk-hedef">
      <div className="bk-kart-ust">
        <h3>Bugünkü Hedef</h3>
        <Link href="/gorevler">TÜMÜNÜ GÖSTER</Link>
      </div>
      {gunluk == null && !hata && <UcNokta boyut={8} aralik={6} etiket="Görevler yükleniyor" style={{ padding: "8px 0" }} />}
      {hata && (
        <p className="bk-soluk" style={{ fontSize: 13 }}>
          Görevler yüklenemedi. <button type="button" className="bk-metin-dugme" onClick={tekrarDene}>Tekrar dene</button>
        </p>
      )}
      {gunluk != null && gunluk.length === 0 && <p className="bk-soluk" style={{ fontSize: 13 }}>Bugün için görev bulunmuyor.</p>}
      {gunluk?.slice(0, 2).map((g) => satir(g))}
      {haftalik?.slice(0, 1).map((g) => satir(g, "BU HAFTA"))}
    </div>
  );
}

/* -------------------------------------------------------------- yazılı bandı */

/** Bilkie AI'nın yazılı girdisi: açık ya da bir sonraki sınav, kaç gün kaldı (açıksa 0). */
type KocYazili = { ad: string; anahtar: string; gunKaldi: number } | null;
type YaziliDurumu =
  | { durum: "bekliyor"; koc: null }
  | { durum: "acik"; sinav: YaziliSinav; koc: KocYazili }
  | { durum: "kapali"; metin: string; koc: KocYazili };

/** Takvim tek okunur: açık sınav varsa band, yoksa bir sonraki açılış tarihi. */
function useYaziliDurumu(): YaziliDurumu {
  const [d, setD] = useState<YaziliDurumu>({ durum: "bekliyor", koc: null });
  useEffect(() => {
    let iptal = false;
    yaziliTakvimi().then((r) => {
      if (iptal) return;
      if (r.durum !== "basarili") { setD({ durum: "kapali", metin: "Yazılı zamanı geldiğinde burada açılacak", koc: null }); return; }
      const acik = r.sinavlar.find((s) => s.acik);
      if (acik) { setD({ durum: "acik", sinav: acik, koc: { ad: acik.ad, anahtar: acik.anahtar, gunKaldi: 0 } }); return; }
      const bugun = new Date().toISOString().slice(0, 10);
      const sonraki = r.sinavlar.filter((s) => s.baslar && s.baslar > bugun).sort((a, b) => a.baslar!.localeCompare(b.baslar!))[0];
      const gunKaldi = sonraki?.baslar ? Math.max(0, Math.round((Date.parse(sonraki.baslar) - Date.parse(bugun)) / 86400000)) : null;
      setD({
        durum: "kapali",
        metin: sonraki ? `${sonraki.ad} ${acilisMetni(sonraki.baslar)}` : "Yazılı zamanı geldiğinde burada açılacak",
        koc: sonraki && gunKaldi !== null ? { ad: sonraki.ad, anahtar: sonraki.anahtar, gunKaldi } : null,
      });
    });
    return () => { iptal = true; };
  }, []);
  return d;
}

/* Ana ekrandaki Yazılıya Hazırlık = ders sayfasındaki SARI düğmeyle aynı kalıp (kullanıcı, 20 Eyl):
   .bk-sari-dugme, tam genişlik; altında küçük durum satırı (dönem açık / ne zaman açılacak).
   Yer kuralı aynı: açık dönemde derslerin ÜSTÜNDE, kapalıyken ALTINDA. */
function YaziliBandi({ sinav }: { sinav: YaziliSinav }) {
  return (
    <Link href={`/yazili/${sinav.anahtar}`} className="bk-sari-dugme bk-yazili-dugme">
      <span>📝 Yazılıya Hazırlık</span>
      <small>{sinav.ad} dönemi açık — derslere göre hazırlan</small>
    </Link>
  );
}

function YaziliSatiri({ metin }: { metin: string }) {
  return (
    <Link href="/yazili" className="bk-sari-dugme bk-yazili-dugme">
      <span>📝 Yazılıya Hazırlık</span>
      <small>{metin}</small>
    </Link>
  );
}

/* ------------------------------------------------------------- Bilkie AI */
/* Kural tabanlı koç (lib/koc.ts): istatistik (subjects) tek okunur; ilerleme/defter/quiz canlı.
   API/LLM yok. Veri yetersizse teşhis uydurmaz, "seni tanıyayım" der. Sonra İstatistik'te tam alan. */
function BilkieAIKutusu({ sinif, uid, veri, devam, yazili, seri }: {
  sinif: number; uid: string | null;
  veri: DevamVerisi | null;
  devam: DevamKartiVerisi | null;
  yazili: KocYazili;
  seri: { seri: number; bugunAktif: boolean } | null;
}) {
  // İstatistik CANLI (stats/grade{N} ağacı — İstatistik ekranıyla paylaşılan abonelik).
  // Evde çözülenler de sayılır (evde.ts): koç çocuğun kâğıttaki yarısını da görsün.
  const agac = useIstatistikAgaci(sinif);
  const [evde, setEvde] = useState<EvdeOzet | null>(null);
  const [hatalar, setHatalar] = useState<{ olgun: number; toplam: number } | null>(null);
  useEffect(() => {
    if (!uid) return;
    let iptal = false;
    Promise.all([hatalariOku(uid, sinif), evdeKayitlariOku(uid, sinif)]).then(([h, e]) => {
      if (iptal) return;
      setEvde(e.length > 0 ? evdeOzetle(e) : {});
      setHatalar({ olgun: olgunHatalar(h, Date.now()).length, toplam: h.length });
    });
    return () => { iptal = true; };
  }, [uid, sinif]);
  const istatistik: KocIstatistik | null = useMemo(() => {
    if (!agac || evde === null) return null;
    const app = kocIstatistikCoz((agac as { subjects?: unknown }).subjects);
    return Object.keys(evde).length > 0 ? istatistikBirlestir(app, evde) : app;
  }, [agac, evde]);

  const plan: KocPlani | null = useMemo(() => {
    if (!istatistik || !veri) return null;
    const simdi = new Date();
    return kocPlaniHesapla({ sinif, veri, istatistik, devam, yazili, seri, hatalar, simdi: simdi.getTime(), saat: simdi.getHours() });
  }, [istatistik, hatalar, veri, devam, yazili, seri, sinif]);

  return (
    <div className="bk-veri-kutu bk-koc">
      {/* Başlığın kendisi İstatistik → Bilgie Koç'a gider; küçük › tıklanabilirliği söyler */}
      <Link href="/istatistik?sekme=koc" className="bk-koc-bas" aria-label="Bilgie Koç'un tüm gözlemleri">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/bilgie-koc.png" alt="" />
        <h3>Bilgie Koç</h3>
        <span className="ok">›</span>
      </Link>
      {plan == null && <UcNokta boyut={8} aralik={6} etiket="Bilgie düşünüyor" style={{ padding: "8px 0" }} />}
      {plan && <p className="bk-koc-mesaj" data-kural={plan.kural}>{plan.mesaj}</p>}
      {plan?.eylem && (
        <Link href={plan.eylem.href} className="bk-konu-dugme bk-koc-dugme"
          style={{ background: DERS_STIL[plan.eylem.ders]?.dolgu ?? "#ffa726", borderColor: DERS_STIL[plan.eylem.ders]?.alt ?? "#b85c00", color: "#0C1A3F" }}>
          {plan.eylem.baslik} ›
        </Link>
      )}
      {plan && plan.digerleri.length > 0 && <div className="bk-koc-diger">Başka önerim</div>}
      {plan?.digerleri.map((o) => {
        const s = DERS_STIL[o.ders];
        return (
          <Link key={o.kural + o.href} href={o.href} className="bk-oneri">
            <span className="no" style={{ background: s?.ust ?? "#ffc93c", color: o.ders === "ingilizce" ? "#fff" : "#150538" }}>{o.kural === "hata" ? "⟲" : dersKisa(o.ders)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ad">{o.baslik}</div>
              <div className="neden">{o.neden}</div>
            </div>
            <span className="git">{o.etiket} ›</span>
          </Link>
        );
      })}
    </div>
  );
}
function dersKisa(d: string): string {
  return ({ turkce: "TÜR", matematik: "MAT", fen: "FEN", sosyal: "SOS", ingilizce: "İNG" } as Record<string, string>)[d] ?? d.slice(0, 3).toUpperCase();
}

/* ------------------------------------------------------------- Yanlışlarım */
/* Hata Turu'nun kalıcı evi (Duolingo "Mistakes"): toplam yanlış, kaçı tekrar için olgun; boşsa kutlama.
   Bilgie Koç zamanı gelince dürter, burası her zaman durur. Tek okuma (kutu açılınca). */
function YanlislarimKutusu({ uid, sinif }: { uid: string | null; sinif: number }) {
  const [sayim, setSayim] = useState<{ olgun: number; toplam: number } | null>(null);
  useEffect(() => {
    if (!uid) return;
    let iptal = false;
    hatalariOku(uid, sinif).then((h) => { if (!iptal) setSayim({ olgun: olgunHatalar(h, Date.now()).length, toplam: h.length }); });
    return () => { iptal = true; };
  }, [uid, sinif]);

  return (
    <div className="bk-veri-kutu bk-yanlislarim">
      <h3>Yanlışlarım</h3>
      {sayim == null && <UcNokta boyut={8} aralik={6} etiket="Yanlışlar sayılıyor" style={{ padding: "8px 0" }} />}
      {sayim && sayim.toplam === 0 && (
        <p className="bk-soluk" style={{ fontSize: 13, lineHeight: 1.45 }}>
          Tekrar edilecek yanlışın yok 🎉 Testlerde yanlış yaptığın sorular burada birikir, {HATA_OLGUNLASMA_GUN} gün sonra yeniden sorarım.
        </p>
      )}
      {sayim && sayim.toplam > 0 && (
        <>
          <div className="bk-yanlis-sayi">
            <b>{sayim.toplam}</b> yanlış · <b>{sayim.olgun}</b> tekrar için hazır
          </div>
          <p className="bk-soluk" style={{ fontSize: 12, lineHeight: 1.4, margin: "4px 0 12px" }}>
            {sayim.olgun > 0
              ? "Yanlışını doğruya çevirince kayıt silinir."
              : `Yeni yanlışlar ${HATA_OLGUNLASMA_GUN} gün sonra tura girer; şimdi de deneyebilirsin.`}
          </p>
          <Link href="/hata-turu" className="bk-konu-dugme bk-koc-dugme" style={{ background: "#ffa726", borderColor: "#b85c00", color: "#0C1A3F" }}>
            ⟲ Hata turuna başla
          </Link>
        </>
      )}
    </div>
  );
}
