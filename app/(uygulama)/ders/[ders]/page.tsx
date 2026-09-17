"use client";

// Bir dersin üniteleri ve konuları. Ünite başlığı uygulamadaki SubjectTestHubScreen'in
// aynısı (kabartmalı akordiyon: numara + ünite ikonu + ad + dönen ok + yüzdeli çubuk).
// Konu satırları 17 Eyl 2026 tasarımı (önce web'de): açılan ünitenin altına bağlı çerçeve
// içinde ince satırlar — numara + ad + adım çubuğu + yüzde + düğme. Düğme profildeki
// sınıf hapı kalıbında, dersin renginde: çerçeve `alt`, Başla `ust`, Devam Et `dolgu`
// (seçenek A), Tamamlandı her derste yeşil ve tıklanmaz (eski "Kilitli" davranışı).

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Kabuk from "../../Kabuk";
import { useOturum } from "../../../lib/oturum";
import { konuAyristir, uniteler } from "../../../lib/katalog";
import { useTestIlerlemesi } from "../../../lib/canliVeri";
import Bekleme from "../../Bekleme";
import { ADIM_SAYISI } from "../../../lib/veri";

// `ustYazi`: düğme yazısı — dolgu rengine göre kontrast ölçüldü (lacivert #0C1A3F ya da beyaz).
// Yalnız İngilizce'nin `ust` moru beyaz ister (6,6:1); diğer hepsinde lacivert daha yüksek.
const LACIVERT = "#0C1A3F";
// `basYazi`: ünite başlığının yazısı. Sarı zeminde beyaz okunmuyor → Sosyal'de ders
// kutusuyla aynı koyu ton (#150538, testler sayfasındaki `.bk-ders-kutu .ad`); diğerleri beyaz.
const DERS_STIL: Record<string, { ust: string; alt: string; dolgu: string; ad: string; ustYazi: string; basYazi: string }> = {
  turkce:    { ust: "#72CEFD", alt: "#1E608F", dolgu: "#A3D9FF", ad: "Türkçe",          ustYazi: LACIVERT,  basYazi: "#fff" },
  fen:       { ust: "#40DB18", alt: "#206B0D", dolgu: "#72D759", ad: "Fen Bilimleri",   ustYazi: LACIVERT,  basYazi: "#fff" },
  ingilizce: { ust: "#971FB5", alt: "#5B0B6E", dolgu: "#E78AFE", ad: "İngilizce",       ustYazi: "#FFFFFF", basYazi: "#fff" },
  matematik: { ust: "#F04B74", alt: "#A2314D", dolgu: "#FF789A", ad: "Matematik",       ustYazi: LACIVERT,  basYazi: "#fff" },
  sosyal:    { ust: "#F0EB4B", alt: "#8F8C2E", dolgu: "#FFFA5D", ad: "Sosyal Bilgiler", ustYazi: LACIVERT,  basYazi: "#150538" },
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
        <Link href="/testler">‹ Derslere dön</Link>
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
        <button className="bk-ustbar-geri" onClick={() => router.push("/testler")} aria-label="Geri">
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
          <div key={u.key} className="bk-unite" data-acik={acikMi}>
            <div className="bk-akordiyon" style={{ background: stil.alt }}>
              <div className="bk-akordiyon-ic" style={{ background: stil.ust }}>
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
