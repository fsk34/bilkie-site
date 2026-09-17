"use client";

// Bir dersin üniteleri — uygulamadaki DefterTopicHubScreen'in aynısı:
// kabartmalı ünite akordiyonu (dışta koyu ton, içte açık ton, altta 5px),
// numaralı daire + ünite adı + dönen ok, ilerleme çubuğu, altta Konu Defteri | Quiz.
// Açılınca konu satırları (17 Eyl 2026, konu testleriyle aynı görünüm): ünitenin altına
// bağlı çerçeve içinde numara + ad. Defterde konular yalnız GÖSTERİM — düğme/çubuk yok.

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Kabuk from "../../Kabuk";
import { useOturum } from "../../../lib/oturum";
import { konuAyristir, uniteler } from "../../../lib/katalog";
import { useDefterIlerlemesi } from "../../../lib/canliVeri";
import Bekleme from "../../Bekleme";
import { quizBitenler } from "../../../lib/quiz";

// Uygulamadaki ders renk çiftleri (üst/alt) ve zemin görselleri
const DERS_STIL: Record<string, { ust: string; alt: string; dolgu: string; gorsel: string; ad: string }> = {
  turkce:    { ust: "#72CEFD", alt: "#1E608F", dolgu: "#A3D9FF", gorsel: "turkcebutton",    ad: "Türkçe" },
  fen:       { ust: "#40DB18", alt: "#206B0D", dolgu: "#72D759", gorsel: "fenbutton",       ad: "Fen Bilimleri" },
  ingilizce: { ust: "#971FB5", alt: "#5B0B6E", dolgu: "#E78AFE", gorsel: "ingilizcebutton", ad: "İngilizce" },
  matematik: { ust: "#F04B74", alt: "#A2314D", dolgu: "#FF789A", gorsel: "matematikbutton", ad: "Matematik" },
  sosyal:    { ust: "#F0EB4B", alt: "#8F8C2E", dolgu: "#FFFA5D", gorsel: "sosyalbutton",    ad: "Sosyal Bilgiler" },
};

export default function DefterUniteleriSayfasi() {
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
  const { sinif, kullanici } = useOturum();
  const [acik, setAcik] = useState<Set<number>>(new Set());
  // Defter listesiyle AYNI canlı düğüm — buraya girmek yeniden okuma yapmıyor.
  const tumIlerleme = useDefterIlerlemesi(sinif);
  const durum = tumIlerleme?.[dersKey] ?? {};

  // Bitmiş quizler — ders başına TEK okuma (Android'deki quiz_done işareti).
  const [bitenQuizler, setBitenQuizler] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (!kullanici || !dersKey) return;
    let iptal = false;
    quizBitenler(kullanici.uid, sinif, dersKey)
      .then((v) => { if (!iptal) setBitenQuizler(v); })
      .catch(() => {});
    return () => { iptal = true; };
  }, [kullanici, sinif, dersKey]);

  const stil = DERS_STIL[dersKey];
  const liste = uniteler(sinif, dersKey);

  if (!stil || liste.length === 0) {
    return (
      <>
        <Link href="/defterler">‹ Defterlere dön</Link>
        <p style={{ marginTop: 20 }}>Bu sınıfta bu ders için defter bulunamadı.</p>
      </>
    );
  }

  const dersAdi =
    dersKey === "sosyal" && sinif === 3 ? "Hayat Bilgisi"
    : dersKey === "sosyal" && sinif === 8 ? "T.C. İnkılap Tarihi"
    : stil.ad;

  function cevir(i: number) {
    setAcik((eski) => {
      const yeni = new Set(eski);
      if (yeni.has(i)) yeni.delete(i); else yeni.add(i);
      return yeni;
    });
  }

  // `null` = henüz bilinmiyor (kimlik çözülüyor ya da cihazda ilk açılış).
  if (tumIlerleme === null) return <Bekleme satir={6} yukseklik={72} />;

  return (
    <>
      <div className="bk-icerik-bas">
        <button className="bk-ustbar-geri" onClick={() => router.push("/defterler")} aria-label="Geri">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </button>
        <h1>{dersAdi}</h1>
      </div>

      {liste.map((u, i) => {
        const anahtar = u.defterKey && u.defterKey.length > 0 ? u.defterKey : u.key;
        // Quiz içeriği ayrı bir anahtarla durabiliyor (katalogdaki quizKey)
        const quizAnahtari = u.quizKey && u.quizKey.length > 0 ? u.quizKey : u.key;
        const d = durum[anahtar];
        const hedef = (d?.toplamSayfa ?? 0) >= 2 ? Math.min(d!.toplamSayfa, 10) : 10;
        const oran = d?.bitti ? 1 : Math.min(1, Math.max(0, (d?.okunanSayfa ?? 0) / hedef));
        const acikMi = acik.has(i);

        return (
          <div key={u.key} className="bk-unite" data-acik={acikMi}>
            <div className="bk-akordiyon" style={{ background: stil.alt }}>
              {/* Sarı zeminde beyaz okunmuyor → Sosyal'de başlık + alt bağlantılar ders kutusuyla aynı koyu ton */}
              <div className="bk-akordiyon-ic" style={{ background: stil.ust, color: dersKey === "sosyal" ? "#150538" : "#fff" }}>
                <button className="bk-akordiyon-bas" onClick={() => cevir(i)}>
                  <div className="bk-akordiyon-satir">
                    <span className="bk-akordiyon-no">{i + 1}</span>
                    <span className="bk-akordiyon-ad">{u.title}</span>
                    <span className="bk-akordiyon-ok" data-acik={acikMi}>▾</span>
                  </div>
                  <div className="bk-akordiyon-cubuk" style={{ background: stil.alt }}>
                    <i style={{ width: `${oran * 100}%`, background: stil.ust, opacity: .9 }} />
                  </div>
                </button>

                {/* Konu Defteri | Quiz: metin bağlantısı yerine hap düğmeler (konu testlerindeki
                    "Devam Et" stili: dolgu + alt çerçeve); quiz bitince yeşil "Tamamlandı" stili. */}
                <div className="bk-akordiyon-haplar">
                  <Link
                    className="bk-konu-dugme"
                    href={`/defter/${dersKey}/${anahtar}`}
                    style={{ background: stil.dolgu, borderColor: stil.alt, color: "#0C1A3F" }}
                  >
                    ✎ Konu Defteri
                  </Link>
                  {bitenQuizler[quizAnahtari] ? (
                    <Link className="bk-konu-dugme" href={`/quiz/${dersKey}/${quizAnahtari}`} data-durum="bitti">
                      ✓ Quiz ✔
                    </Link>
                  ) : (
                    <Link
                      className="bk-konu-dugme"
                      href={`/quiz/${dersKey}/${quizAnahtari}`}
                      style={{ background: stil.dolgu, borderColor: stil.alt, color: "#0C1A3F" }}
                    >
                      ✓ Quiz
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {acikMi && (
              <div className="bk-konu-grup" style={{ borderColor: stil.alt }}>
                {u.topics.map((satir, ti) => {
                  const { baslik } = konuAyristir(satir);
                  return (
                    <div className="bk-konu-satir sade" key={ti}>
                      <span className="no" style={{ background: stil.alt }}>{ti + 1}</span>
                      <span className="ad">{baslik}</span>
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
