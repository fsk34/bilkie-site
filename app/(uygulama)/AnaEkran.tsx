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
//   6. Bilkie'nin önerisi (kural tabanlı, ≤2 madde) + Bu ayın rozeti
// Taslak: ~/Desktop/bilkie-taslak/ana-*.png

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Kabuk from "./Kabuk";
import RozetKazandin from "./RozetKazandin";
import UcNokta from "./UcNokta";
import { useOturum } from "../lib/oturum";
import { uniteler } from "../lib/katalog";
import {
  useDefterIlerlemesi, useGorevler, useGunlukGorevler, useQuizBitenler, useRozetler, useSonDokunulan, useTestIlerlemesi,
} from "../lib/canliVeri";
import { tumKonuIstatistikleri, type Gorev } from "../lib/veri";
import { acilisMetni, yaziliTakvimi, type YaziliSinav } from "../lib/yaziliTakvim";
import { AY_AD, AY_ANAHTAR, ayVurgu } from "../lib/ayGorsel";
import {
  DERS_SIRASI, dersEkli, dersEtiketi, dersOranlari, devamKartiHesapla, onerileriHesapla, type DevamKarti as DevamKartiVerisi, type Oneri,
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
  return (
    <Kabuk>
      <RozetKazandin />
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
  const gunluk = useGunlukGorevler();
  const haftalik = useGorevler("haftalik");
  const yazili = useYaziliDurumu();

  const oranlar = useMemo(
    () => dersOranlari(sinif, { ilerleme: ilerleme ?? {}, defter: defter ?? {}, quiz: quiz ?? {} }),
    [sinif, ilerleme, defter, quiz]
  );
  const hesaplanan = useMemo(
    () => (ilerleme && defter && quiz && son !== undefined ? devamKartiHesapla(sinif, son, { ilerleme, defter, quiz }) : null),
    [sinif, son, ilerleme, defter, quiz]
  );
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
          </Link>
        ))}
      </div>

      {devam && <DevamKarti sinif={sinif} devam={devam} />}

      <HedefKarti gunluk={gunluk} haftalik={haftalik} />

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
                <i className="dolgu" style={{ width: `calc(${p * 100}% - 6px)`, background: s.dolgu }} />
                <i className="parlak" style={{ width: `calc(${p * 100}% - 14px)`, background: s.parlak }} />
              </span>
            </Link>
          );
        })}
      </div>

      {yazili.durum === "kapali" && <YaziliSatiri metin={yazili.metin} />}

      <div className="bk-veri">
        <OneriKutusu sinif={sinif} uid={kullanici?.uid ?? null} ilerleme={ilerleme} defter={defter} quiz={quiz} devam={devam} />
        <AyRozetiKutusu />
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

function HedefKarti({ gunluk, haftalik }: { gunluk: Gorev[] | null; haftalik: Gorev[] | null }) {
  const renk = ayVurgu(new Date().getMonth());
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
      {gunluk == null && <UcNokta boyut={8} aralik={6} etiket="Görevler yükleniyor" style={{ padding: "8px 0" }} />}
      {gunluk != null && gunluk.length === 0 && <p className="bk-soluk" style={{ fontSize: 13 }}>Bugün için görev bulunmuyor.</p>}
      {gunluk?.slice(0, 2).map((g) => satir(g))}
      {haftalik?.slice(0, 1).map((g) => satir(g, "BU HAFTA"))}
    </div>
  );
}

/* -------------------------------------------------------------- yazılı bandı */

type YaziliDurumu =
  | { durum: "bekliyor" }
  | { durum: "acik"; sinav: YaziliSinav }
  | { durum: "kapali"; metin: string };

/** Takvim tek okunur: açık sınav varsa band, yoksa bir sonraki açılış tarihi. */
function useYaziliDurumu(): YaziliDurumu {
  const [d, setD] = useState<YaziliDurumu>({ durum: "bekliyor" });
  useEffect(() => {
    let iptal = false;
    yaziliTakvimi().then((r) => {
      if (iptal) return;
      if (r.durum !== "basarili") { setD({ durum: "kapali", metin: "Yazılı zamanı geldiğinde burada açılacak" }); return; }
      const acik = r.sinavlar.find((s) => s.acik);
      if (acik) { setD({ durum: "acik", sinav: acik }); return; }
      const bugun = new Date().toISOString().slice(0, 10);
      const sonraki = r.sinavlar.filter((s) => s.baslar && s.baslar > bugun).sort((a, b) => a.baslar!.localeCompare(b.baslar!))[0];
      setD({ durum: "kapali", metin: sonraki ? `${sonraki.ad} ${acilisMetni(sonraki.baslar)}` : "Yazılı zamanı geldiğinde burada açılacak" });
    });
    return () => { iptal = true; };
  }, []);
  return d;
}

function YaziliBandi({ sinav }: { sinav: YaziliSinav }) {
  return (
    <Link href={`/yazili/${sinav.anahtar}`} className="bk-yazili">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/uygulama/yazili.png" alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2>Yazılıya Hazırlık</h2>
        <p>{sinav.ad} dönemi açık — derslere göre hazırlan</p>
      </div>
      <span className="rozet">YAZILI ZAMANI</span>
    </Link>
  );
}

function YaziliSatiri({ metin }: { metin: string }) {
  return (
    <Link href="/yazili" className="bk-yazili sessiz">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/uygulama/yazili.png" alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2>Yazılıya Hazırlık</h2>
        <p>{metin}</p>
      </div>
      <span className="ok">›</span>
    </Link>
  );
}

/* ------------------------------------------------------------- öneri kutusu */
/* İstatistik (subjects) ve quiz_done tek seferlik okunur; ilerleme/defter canlı.
   Kurallar anaEkran.ts'te. Veri yetersizse kutu dürüstçe "biraz test çöz" der. */

function OneriKutusu({ sinif, uid, ilerleme, defter, quiz, devam }: {
  sinif: number; uid: string | null;
  ilerleme: Record<string, Record<string, number>> | null;
  defter: ReturnType<typeof useDefterIlerlemesi>;
  quiz: ReturnType<typeof useQuizBitenler>;
  devam: DevamKartiVerisi | null;
}) {
  // İstatistik tek okuma (ağır düğüm, canlı abonelik gereksiz); defter/quiz canlı hook'tan.
  const [istatistik, setIstatistik] = useState<Awaited<ReturnType<typeof tumKonuIstatistikleri>> | null>(null);
  useEffect(() => {
    if (!uid) return;
    let iptal = false;
    tumKonuIstatistikleri(uid, sinif).then((v) => { if (!iptal) setIstatistik(v); });
    return () => { iptal = true; };
  }, [uid, sinif]);

  const oneriler: Oneri[] | null = useMemo(() => {
    if (!istatistik || !ilerleme || !defter || !quiz) return null;
    // Kart bir quiz gösteriyorsa öneride aynı quiz tekrar etmesin
    const haricQuiz = devam?.tur === "quiz" ? { ders: devam.ders, key: devam.href.split("/").pop() ?? "" } : null;
    const haricDers = devam?.hal === "dersbitti" ? devam.ders : null;
    return onerileriHesapla({ sinif, ilerleme, istatistik, defter, quiz, haricQuiz, haricDers, dersAdi: (d) => dersEtiketi(d, sinif) });
  }, [istatistik, ilerleme, defter, quiz, devam, sinif]);

  return (
    <div className="bk-veri-kutu">
      <h3>Bilkie&apos;nin önerisi</h3>
      {oneriler == null && <UcNokta boyut={8} aralik={6} etiket="Öneri hazırlanıyor" style={{ padding: "8px 0" }} />}
      {oneriler != null && oneriler.length === 0 && (
        <p className="bk-soluk" style={{ fontSize: 13, lineHeight: 1.45 }}>
          Henüz yeterli veri yok. Birkaç test daha çöz, sana özel öneri burada çıksın.
        </p>
      )}
      {oneriler?.map((o) => {
        const s = DERS_STIL[o.ders];
        return (
          <Link key={o.kural + o.href} href={o.href} className="bk-oneri">
            <span className="no" style={{ background: s?.ust, color: o.ders === "ingilizce" ? "#fff" : "#150538" }}>{dersKisa(o.ders)}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ad">{o.baslik}</div>
              <div className="neden">{o.neden}</div>
            </div>
            <span className="git">{o.eylem} ›</span>
          </Link>
        );
      })}
    </div>
  );
}

function dersKisa(d: string): string {
  return ({ turkce: "TÜR", matematik: "MAT", fen: "FEN", sosyal: "SOS", ingilizce: "İNG" } as Record<string, string>)[d] ?? d.slice(0, 3).toUpperCase();
}

/* ---------------------------------------------------------- bu ayın rozeti */
/* Aylık görevlerin hepsi bitince ayın rozeti kazanılır (gorevYaz.aylikRozetVer). */

function AyRozetiKutusu() {
  const aylik = useGorevler("aylik");
  const rozetler = useRozetler();
  const simdi = new Date();
  const ay = simdi.getMonth();
  const aySonu = new Date(simdi.getFullYear(), ay + 1, 0).getDate();
  const kalanGun = aySonu - simdi.getDate();
  const kazanildi = rozetler?.includes(ay) ?? false;
  const kalanGorev = aylik ? aylik.filter((g) => g.ilerleme < g.hedef).length : null;

  return (
    <Link href="/rozetler" className="bk-veri-kutu">
      <h3>Bu ayın rozeti</h3>
      <div className="bk-rozet-ay">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/rozet/${AY_ANAHTAR[ay]}rozet.webp`} alt="" data-kazanildi={kazanildi} />
        {aylik == null && !kazanildi
          ? <UcNokta boyut={8} aralik={6} etiket="Rozet yükleniyor" />
          : <p>
              <b>{AY_AD[ay]} rozeti</b>{" "}
              {kazanildi
                ? "senin! Tebrikler."
                : kalanGorev === 0
                  ? "için tüm görevler tamam — işleniyor."
                  : `için ${kalanGorev} görev daha. Ayın sonuna ${kalanGun === 0 ? "bugün son gün" : `${kalanGun} gün var`}.`}
            </p>}
      </div>
    </Link>
  );
}
