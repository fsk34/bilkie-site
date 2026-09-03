"use client";

// Bir dersin üniteleri ve konuları — uygulamadaki SubjectTestHubScreen'in aynısı:
// kabartmalı ünite akordiyonu (numara + ünite ikonu + ad + dönen ok + yüzdeli çubuk),
// açılınca konu kartları (sol üstte "Konu: N" + ad, sol altta ünite ikonu,
// sağda "git" düğmesi, altta %55 genişlikte adım çubuğu, 3/3 olunca "Kilitli").

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Kabuk from "../../Kabuk";
import { useOturum } from "../../../lib/oturum";
import { konuAyristir, uniteler } from "../../../lib/katalog";
import { useTestIlerlemesi } from "../../../lib/canliVeri";
import Bekleme from "../../Bekleme";
import { ADIM_SAYISI } from "../../../lib/veri";

const DERS_STIL: Record<string, { ust: string; alt: string; dolgu: string; ad: string }> = {
  turkce:    { ust: "#72CEFD", alt: "#1E608F", dolgu: "#A3D9FF", ad: "Türkçe" },
  fen:       { ust: "#40DB18", alt: "#206B0D", dolgu: "#72D759", ad: "Fen Bilimleri" },
  ingilizce: { ust: "#971FB5", alt: "#5B0B6E", dolgu: "#E78AFE", ad: "İngilizce" },
  matematik: { ust: "#F04B74", alt: "#A2314D", dolgu: "#FF789A", ad: "Matematik" },
  sosyal:    { ust: "#F0EB4B", alt: "#8F8C2E", dolgu: "#FFFA5D", ad: "Sosyal Bilgiler" },
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
  const [acik, setAcik] = useState<Set<number>>(new Set());
  // Ders listesiyle AYNI canlı düğüm — buraya girmek yeniden okuma yapmıyor.
  const tumIlerleme = useTestIlerlemesi(sinif);
  const ilerleme = tumIlerleme?.[dersKey] ?? {};

  const stil = DERS_STIL[dersKey];
  const liste = uniteler(sinif, dersKey);

  if (!stil || liste.length === 0) {
    return (
      <>
        <Link href="/uygulama/testler">‹ Derslere dön</Link>
        <p style={{ marginTop: 20 }}>Bu sınıfta bu ders için test bulunamadı.</p>
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
        <button className="bk-ustbar-geri" onClick={() => router.push("/uygulama/testler")} aria-label="Geri">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </button>
        <h1>{dersAdi}</h1>
      </div>

      {liste.map((u, i) => {
        const konular = u.topics
          .map((t) => konuAyristir(t))
          .filter((t) => t.testKey.length > 0);
        const yapilan = konular.reduce((t, k) => t + Math.min(ADIM_SAYISI, ilerleme[k.testKey] ?? 0), 0);
        const uniteOrani = konular.length > 0 ? yapilan / (konular.length * ADIM_SAYISI) : 0;
        const acikMi = acik.has(i);
        const uniteIkon = `/uygulama/unite/ic_g${sinif}_${dersKey}_t${i + 1}.svg`;

        return (
          <div key={u.key}>
            <div className="bk-akordiyon" style={{ background: stil.alt }}>
              <div className="bk-akordiyon-ic" style={{ background: stil.ust }}>
                <button className="bk-akordiyon-bas" onClick={() => cevir(i)}>
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
              </div>
            </div>

            {acikMi && (
              <div>
                {konular.map((k, ti) => {
                  const adim = Math.min(ADIM_SAYISI, ilerleme[k.testKey] ?? 0);
                  const kilit = adim >= ADIM_SAYISI;
                  return (
                    <div className="bk-test-kart" key={k.testKey} style={{ background: stil.ust }}>
                      <div className="no">Konu: {ti + 1}</div>
                      <div className="ad">{k.baslik}</div>

                      <UniteIkon kaynak={uniteIkon} sinif="unite-ikon" />

                      <span className="iz" style={{ background: stil.alt }}>
                        <i style={{ width: `${adimOrani(adim) * 100}%`, background: stil.dolgu }} />
                      </span>

                      {kilit ? (
                        <span className="git" data-kilit="true">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/uygulama/${dersKey}git.svg`} alt="" />
                          <span className="kilit-yazi">Kilitli</span>
                        </span>
                      ) : (
                        <Link
                          className="git"
                          href={`/uygulama/test/${dersKey}/${k.testKey}`}
                          aria-label={`${k.baslik} testine git`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={`/uygulama/${dersKey}git.svg`} alt="" />
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
