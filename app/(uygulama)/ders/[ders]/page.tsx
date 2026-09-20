"use client";

// Bir dersin sayfası — 19 Eyl 2026: Konu Testleri (/ders) ile Konu Defterleri (/defter) BİRLEŞTİ.
// Ana ekrandaki ders kartı buraya gelir. Yapı:
//   • Özet kartı: genel ilerleme + "N ünite · N konu · N test tamamlandı · N defter bitti"
//     + SARI "Yazılıya Hazırlık" düğmesi (yazılı DERSE bağlıdır, üniteye değil)
//   • Ünite akordiyonu (SubjectTestHubScreen kabartması: numara + ünite ikonu + ad + ok + yüzdeli
//     çubuk) + altında iki hap: Konu Defteri | Quiz (bitince yeşil ✔)
//   • Açık ünitede konu satırları (17 Eyl tasarımı): numara + ad + adım çubuğu + yüzde +
//     Başla / Devam Et / ✓ Tamamlandı (dersin renginde hap düğme)
// İlk açılışta en son dokunulan konunun ünitesi açık gelir; hiç yoksa ilk ünite.
// Taslak: ~/Desktop/bilkie-taslak/ders-*.png

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Kabuk from "../../Kabuk";
import { useOturum } from "../../../lib/oturum";
import { konuAyristir, uniteler } from "../../../lib/katalog";
import { useDefterIlerlemesi, useQuizBitenler, useSonDokunulan, useTestIlerlemesi } from "../../../lib/canliVeri";
import Bekleme from "../../Bekleme";
import { ADIM_SAYISI } from "../../../lib/veri";
import { yaziliTakvimi } from "../../../lib/yaziliTakvim";
import { dersEtiketi, dersOranlari, uniteIsOrani } from "../../../lib/anaEkran";

// `ustYazi`: düğme yazısı — dolgu rengine göre kontrast ölçüldü (lacivert #0C1A3F ya da beyaz).
// Yalnız İngilizce'nin `ust` moru beyaz ister (6,6:1); diğer hepsinde lacivert daha yüksek.
const LACIVERT = "#0C1A3F";
// `basYazi`: ünite başlığının yazısı. Sarı zeminde beyaz okunmuyor → Sosyal'de koyu ton.
const DERS_STIL: Record<string, { ust: string; alt: string; dolgu: string; ikon: string; ustYazi: string; basYazi: string }> = {
  turkce:    { ust: "#72CEFD", alt: "#1E608F", dolgu: "#A3D9FF", ikon: "abc",    ustYazi: LACIVERT,  basYazi: "#fff" },
  fen:       { ust: "#40DB18", alt: "#206B0D", dolgu: "#72D759", ikon: "deney",  ustYazi: LACIVERT,  basYazi: "#fff" },
  ingilizce: { ust: "#971FB5", alt: "#5B0B6E", dolgu: "#E78AFE", ikon: "hello",  ustYazi: "#FFFFFF", basYazi: "#fff" },
  matematik: { ust: "#F04B74", alt: "#A2314D", dolgu: "#FF789A", ikon: "abakus", ustYazi: LACIVERT,  basYazi: "#fff" },
  sosyal:    { ust: "#F0EB4B", alt: "#8F8C2E", dolgu: "#FFFA5D", ikon: "dunya",  ustYazi: LACIVERT,  basYazi: "#150538" },
};

// Uygulamadaki stepFraction: 1 adım %35, 2 adım %70, 3 adım tam
function adimOrani(adim: number): number {
  switch (Math.min(ADIM_SAYISI, Math.max(0, adim))) {
    case 1: return 0.35;
    case 2: return 0.70;
    case 3: return 1;
    default: return 0;
  }
}

export default function DersSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const params = useParams<{ ders: string }>();
  const dersKey = params?.ders ?? "";
  const router = useRouter();
  const { sinif } = useOturum();

  // Üçü de sınıf-geneli canlı düğümler; ana ekranla aynı abonelik, buraya girmek yeniden okuma yapmaz.
  const tumIlerleme = useTestIlerlemesi(sinif);
  const tumDefter = useDefterIlerlemesi(sinif);
  const tumQuiz = useQuizBitenler(sinif);
  const son = useSonDokunulan(sinif);
  const ilerleme = tumIlerleme?.[dersKey] ?? {};
  const defter = tumDefter?.[dersKey] ?? {};
  // Bitmiş quizler (Android'deki quiz_done işareti) — 20 Eyl: tek okuma yerine ana ekranla paylaşılan canlı düğüm
  const bitenQuizler = tumQuiz?.[dersKey] ?? {};

  // Yazılı düğmesinin hedefi: açık sınav varsa doğrudan bu dersin yazılısı, yoksa liste
  // ("2 Kasım'da açılacak" orada yazıyor).
  const [yaziliYolu, setYaziliYolu] = useState("/yazili");
  useEffect(() => {
    let iptal = false;
    yaziliTakvimi().then((r) => {
      if (iptal || r.durum !== "basarili") return;
      const acik = r.sinavlar.find((s) => s.acik);
      if (acik) setYaziliYolu(`/yazili/${acik.anahtar}/${dersKey}`);
    });
    return () => { iptal = true; };
  }, [dersKey]);

  const stil = DERS_STIL[dersKey];
  const liste = uniteler(sinif, dersKey);

  // Açık üniteler: ilk açılışta son dokunulan konunun ünitesi (bu dersteyse), yoksa ilk ünite.
  const [acik, setAcik] = useState<Set<number> | null>(null);
  const acikKume = useMemo(() => {
    if (acik) return acik;
    if (son === undefined) return new Set<number>();
    let i = 0;
    if (son && son.ders === dersKey) {
      const bulunan = son.tur === "defter"
        ? liste.findIndex((u) => (u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key) === son.konu)
        : liste.findIndex((u) => u.topics.some((t) => konuAyristir(t).testKey === son.konu));
      if (bulunan >= 0) i = bulunan;
    }
    return new Set([i]);
  }, [acik, son, dersKey, liste]);

  if (!stil || liste.length === 0) {
    return (
      <>
        <Link href="/">‹ Ana ekrana dön</Link>
        <p style={{ marginTop: 20 }}>Bu sınıfta bu ders için içerik bulunamadı.</p>
      </>
    );
  }

  function cevir(i: number) {
    setAcik(() => {
      const yeni = new Set(acikKume);
      if (yeni.has(i)) yeni.delete(i); else yeni.add(i);
      return yeni;
    });
  }

  // `null` = henüz bilinmiyor (kimlik çözülüyor ya da cihazda ilk açılış).
  if (tumIlerleme === null || tumDefter === null) return <Bekleme satir={6} yukseklik={72} />;

  // Özet sayıları — hepsi elimizdeki veriden; ders bazlı XP tutulmuyor, gösterilmiyor.
  const konuSayisi = liste.reduce((t, u) => t + u.topics.filter((k) => konuAyristir(k).testKey).length, 0);
  const tamamlananTest = Object.values(ilerleme).filter((a) => a >= ADIM_SAYISI).length;
  // Genel ilerleme = ünite iş zinciri (defter + adımlar + quiz), ana ekrandaki ders kartıyla aynı hesap
  const isVerisi = { ilerleme: tumIlerleme, defter: tumDefter, quiz: tumQuiz ?? {} };
  const genelOran = dersOranlari(sinif, isVerisi)[dersKey] ?? 0;
  const bitenDefter = liste.filter((u) => defter[u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key]?.bitti).length;
  const dersAdi = dersEtiketi(dersKey, sinif);

  return (
    <>
      <div className="bk-icerik-bas">
        <button className="bk-ustbar-geri" onClick={() => router.push("/")} aria-label="Geri">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </button>
        {/* Ders adı kartın içinde (kullanıcı, 19 Eyl); burada yalnız geri oku */}
      </div>

      <div className="bk-devam bk-ozet" style={{ background: stil.ust, borderColor: stil.alt, color: dersKey === "ingilizce" ? "#fff" : LACIVERT }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ marginBottom: 10 }}>{dersAdi}</h2>
          <div className="etiket">GENEL İLERLEME</div>
          <span className="iz" style={{ background: stil.alt }}><i style={{ width: `${genelOran * 100}%`, background: "#fff" }} /></span>
          {/* Sayıların yanındaki 3B ikonlar (19 Eyl, kullanıcı gönderdi): public/uygulama/ozet/ */}
          <div className="ozet-satir">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span><img src="/uygulama/ozet/unite.png" alt="" /><b>{liste.length}</b> Ünite</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span><img src="/uygulama/ozet/konu.png" alt="" /><b>{konuSayisi}</b> Konu</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span><img src="/uygulama/ozet/tamamlandi.png" alt="" /><b>{tamamlananTest}</b> Test Tamamlandı</span>
            <span><b>{bitenDefter}</b> Defter Bitti</span>
          </div>
          <Link href={yaziliYolu} className="bk-sari-dugme" style={{ marginTop: 14 }}>📝 Yazılıya Hazırlık</Link>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/${stil.ikon}.png`} alt="" />
      </div>

      {liste.map((u, i) => {
        const konular = u.topics.map((t) => konuAyristir(t)).filter((t) => t.testKey.length > 0);
        const isOrani = uniteIsOrani(u, dersKey, isVerisi);
        const uniteOrani = isOrani.toplam > 0 ? isOrani.yapilan / isOrani.toplam : 0;
        const acikMi = acikKume.has(i);
        const uniteIkon = `/uygulama/unite/ic_g${sinif}_${dersKey}_t${i + 1}.svg`;
        const defterAnahtari = u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key;
        // Quiz içeriği ayrı bir anahtarla durabiliyor (katalogdaki quizKey)
        const quizAnahtari = u.quizKey && u.quizKey.length > 0 ? u.quizKey : u.key;

        return (
          <div key={u.key} className="bk-unite" data-acik={acikMi}>
            <div className="bk-akordiyon" style={{ background: stil.alt }}>
              <div className="bk-akordiyon-ic" style={{ background: stil.ust, color: stil.basYazi }}>
                <button className="bk-akordiyon-bas" onClick={() => cevir(i)} style={{ color: stil.basYazi }}>
                  <div className="bk-akordiyon-satir">
                    <span className="bk-akordiyon-no">{i + 1}</span>
                    <UniteIkon kaynak={uniteIkon} sinif="bk-akordiyon-ikon" />
                    <span className="bk-akordiyon-ad">{u.title}</span>
                    <span className="bk-akordiyon-ok" data-acik={acikMi}>▾</span>
                  </div>
                  <div className="bk-akordiyon-cubuk-satir">
                    <div className="bk-akordiyon-cubuk" style={{ background: stil.alt, flex: 1 }}>
                      <i style={{ width: `${uniteOrani * 100}%`, background: stil.dolgu }} />
                    </div>
                    <span className="bk-akordiyon-yuzde">{Math.round(uniteOrani * 100)}%</span>
                  </div>
                </button>

                {/* Konu Defteri | Quiz hapları (eski defter sayfasından); quiz bitince yeşil "Tamamlandı" stili */}
                <div className="bk-akordiyon-haplar">
                  {!u.defterYok && (
                    <Link
                      className="bk-konu-dugme"
                      href={`/defter/${dersKey}/${defterAnahtari}`}
                      style={{ background: stil.dolgu, borderColor: stil.alt, color: LACIVERT }}
                    >
                      ✎ Konu Defteri
                    </Link>
                  )}
                  {bitenQuizler[quizAnahtari] ? (
                    <Link className="bk-konu-dugme" href={`/quiz/${dersKey}/${quizAnahtari}`} data-durum="bitti">
                      ✓ Quiz ✔
                    </Link>
                  ) : (
                    <Link
                      className="bk-konu-dugme"
                      href={`/quiz/${dersKey}/${quizAnahtari}`}
                      style={{ background: stil.dolgu, borderColor: stil.alt, color: LACIVERT }}
                    >
                      ✓ Quiz
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {acikMi && (
              <div className="bk-konu-grup" style={{ borderColor: stil.alt }}>
                {konular.map((k, ti) => {
                  const adim = Math.min(ADIM_SAYISI, ilerleme[k.testKey] ?? 0);
                  const bitti = adim >= ADIM_SAYISI;
                  const yuzde = Math.round(adimOrani(adim) * 100);
                  return (
                    <div className="bk-konu-satir" key={k.testKey}>
                      <span className="no" style={{ background: stil.alt }}>{ti + 1}</span>
                      <span className="ad">{k.baslik}</span>
                      <span className="iz" style={{ background: stil.alt }}>
                        <i style={{ width: `${yuzde}%`, background: stil.dolgu }} />
                      </span>
                      <span className="yuzde" style={{ color: bitti ? "var(--yesil)" : "#fff" }}>% {yuzde}</span>

                      {bitti ? (
                        <span className="bk-konu-dugme" data-durum="bitti">✓ Tamamlandı</span>
                      ) : adim === 0 ? (
                        <Link
                          className="bk-konu-dugme"
                          href={`/test/${dersKey}/${k.testKey}`}
                          style={{ background: stil.ust, borderColor: stil.alt, color: stil.ustYazi }}
                          aria-label={`${k.baslik} testine başla`}
                        >
                          Başla
                        </Link>
                      ) : (
                        <Link
                          className="bk-konu-dugme"
                          href={`/test/${dersKey}/${k.testKey}`}
                          style={{ background: stil.dolgu, borderColor: stil.alt, color: LACIVERT }}
                          aria-label={`${k.baslik} testine devam et`}
                        >
                          Devam Et
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

/** Ünite ikonu her sınıf/ders/ünite için yok; dosya bulunamazsa gizlenir. */
function UniteIkon({ kaynak, sinif }: { kaynak: string; sinif: string }) {
  const [gizli, setGizli] = useState(false);
  if (gizli) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={sinif} src={kaynak} alt="" onError={() => setGizli(true)} />;
}
