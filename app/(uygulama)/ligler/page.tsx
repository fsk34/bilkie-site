"use client";

// Ligler — uygulamadaki LeagueScreen'in web karşılığı.
// Aynı veri: leaderboards/leagues/grade{N}/{sezon}; aynı sıralama kuralı ve görseller.

import Link from "next/link";
import { useEffect } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { useLigTablosu } from "../../lib/canliVeri";
import { ligBul, ligKendiniYayinla } from "../../lib/veri";

// Uygulamadaki lig adları ve kupa görselleri (sırayla)
const LIGLER = [
  { key: "baslangic",   ad: "Başlangıç Ligi" },
  { key: "gelisim",     ad: "Gelişim Ligi" },
  { key: "ustalik",     ad: "Ustalık Ligi" },
  { key: "sampiyonlar", ad: "Şampiyonlar" },
  { key: "efsaneler",   ad: "Efsaneler" },
  { key: "zirve",       ad: "Zirve" },
];


// Kupanın etrafında dışa doğru süzülen 4 ışıltı — uygulamadaki yönler ve fazlar
// (dirs: (-0.85,-0.55) (0.85,-0.40) (-0.55,0.85) (0.70,0.75), fazlar 0/.25/.5/.75).
const ISILTILAR = [
  { yx: -0.85, yy: -0.55, faz: 0 },
  { yx: 0.85,  yy: -0.40, faz: 0.25 },
  { yx: -0.55, yy: 0.85,  faz: 0.5 },
  { yx: 0.70,  yy: 0.75,  faz: 0.75 },
].map(({ yx, yy, faz }) => {
  const baslangicYaricap = 130 * 0.24;      // uygulamada startR = genişlik * 0.24
  const suzulme = 130 * 0.20;               // maxDrift
  return {
    x0: Math.round(yx * baslangicYaricap - 4),
    y0: Math.round(yy * baslangicYaricap - 4),
    x1: Math.round(yx * (baslangicYaricap + suzulme) - 4),
    y1: Math.round(yy * (baslangicYaricap + suzulme) - 4),
    gecikme: -faz * 2.6,
  };
});

export default function LiglerSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici, sinif } = useOturum();
  // Tablo CANLI: başka öğrenci puan aldığında sıralama kendiliğinden güncellenir
  // (uygulamada da dinleyici var). Kendi puanımız da bu tablodan okunuyor.
  const satirlar = useLigTablosu(sinif);

  // Ekran açılınca kendi satırını tazele — uygulamadaki davranış; sonucu dinleyici getirir.
  useEffect(() => {
    if (!kullanici) return;
    void ligKendiniYayinla(kullanici.uid, sinif).catch(() => {});
  }, [kullanici, sinif]);

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Ligler</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Sıralamayı görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  // ⚠️ Kademe, canlı XP'den DEĞİL lig satırındaki puandan hesaplanır — Android
  // `currentLeagueIndex` de `you?.points` kullanıyor. Canlı XP kullanılırsa başlıktaki
  // lig ile listeyi süzen kademe birbirini tutmayabiliyordu (satır henüz tazelenmemişse
  // başlık "GELİŞİM" derken liste "BAŞLANGIÇ"a göre süzülüyordu).
  const benimSatirim = satirlar?.find((s) => s.sensin);
  const lig = ligBul(benimSatirim?.puan ?? 0);
  const indeks = Math.max(0, LIGLER.findIndex((l) => l.key === lig.key));
  const benimSiram = benimSatirim?.sira;

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22 }}>LİGLER</h1>
        <p className="bk-soluk" style={{ fontSize: 12, fontWeight: 600 }}>Sezon Sıralaması</p>
      </div>

      <div className="bk-lig-ust">
        <div className="bk-kupa-kutu">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="kupa" src={`/uygulama/lig/${LIGLER[indeks].key}.png`} alt="" />
          {ISILTILAR.map((p, i) => (
            <i
              key={i}
              style={{
                ["--x0" as string]: `${p.x0}px`,
                ["--y0" as string]: `${p.y0}px`,
                ["--x1" as string]: `${p.x1}px`,
                ["--y1" as string]: `${p.y1}px`,
                animationDelay: `${p.gecikme}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
        <div className="ad">{LIGLER[indeks].ad}</div>

        <div className="bk-lig-gosterge">
          {LIGLER.map((l, i) => (
            <span key={l.key} data-aktif={i === indeks}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/uygulama/lig/${l.key}.png`} alt="" />
            </span>
          ))}
        </div>
      </div>

      <div className="bk-kart">
        <div className="bk-kart-ust">
          <h3>{sinif}. Sınıf sıralaması</h3>
          {benimSiram ? <span className="bk-soluk" style={{ fontSize: 13 }}>Sıran: {benimSiram}</span> : null}
        </div>

        {satirlar == null && <p className="bk-soluk" style={{ fontSize: 14 }}>Sıralama yükleniyor…</p>}
        {satirlar != null && satirlar.length === 0 && (
          <p className="bk-soluk" style={{ fontSize: 14 }}>
            Bu sezon için henüz sıralama yok. Test çözdükçe puanın buraya işlenir.
          </p>
        )}

        {satirlar?.map((s) => (
          <div className="bk-lig-satir" data-sensin={s.sensin} key={s.uid}>
            <span className="bk-lig-sira">
              {s.sira <= 3 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/uygulama/lig/${["birinci", "ikinci", "ucuncu"][s.sira - 1]}.png`} alt={`${s.sira}.`} />
              ) : (
                s.sira
              )}
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="bk-lig-avatar" src={`/uygulama/avatar/${s.avatar}.png`} alt="" />
            <span className="bk-lig-ad" style={{ fontWeight: s.sensin ? 900 : 600 }}>{s.ad}</span>
            <span className="bk-lig-puan">{s.puan}</span>
          </div>
        ))}
      </div>
    </>
  );
}
