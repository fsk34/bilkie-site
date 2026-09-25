"use client";

// Ligler — uygulamadaki LeagueScreen'in web karşılığı.
// Aynı veri: leaderboards/leagues/grade{N}/{sezon}; aynı sıralama kuralı ve görseller.

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { useLigTablosu } from "../../lib/canliVeri";
import { LIG_LISTE_LIMITI, ligBul, ligKendiniYayinla, ligSatiriGoruldu } from "../../lib/veri";

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
    // Android: parçacık k, tur içinde sv = 1−faz anında yeniden başlar → gecikme (1−faz)·1,1s;
    // en başta 700ms bekleme. Tur uzunluğu CSS'te (1,45s), iki tur.
    gecikme: 0.7 + (1 - faz) * 1.1,
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
  const { kullanici, profil, sinif } = useOturum();
  // Tablo CANLI: başka öğrenci puan aldığında sıralama kendiliğinden güncellenir
  // (uygulamada da dinleyici var). Kendi puanımız da bu tablodan okunuyor.
  const satirlar = useLigTablosu(sinif);

  // Ekran açılınca kendi satırını tazele — uygulamadaki davranış; sonucu dinleyici getirir.
  // Profil gelmeden çağırma: sınıf varsayılan 3'e düşüyor ve yanlış tabloya satır yazılıyordu.
  useEffect(() => {
    if (!kullanici || !profil) return;
    void ligKendiniYayinla(kullanici.uid, sinif).catch(() => {});
  }, [kullanici, profil, sinif]);

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
  const benimSiram = benimSatirim ? (benimSatirim.disarida ? `${LIG_LISTE_LIMITI}+` : benimSatirim.sira) : undefined;

  // Sunucudaki kendi satırını yazıcıya öğret → aynı değerler için tekrar transaction yok
  useEffect(() => {
    if (!kullanici || !benimSatirim || benimSatirim.disarida) return;
    ligSatiriGoruldu(kullanici.uid, sinif, benimSatirim.puan, benimSatirim.ad, benimSatirim.avatar);
  }, [kullanici, sinif, benimSatirim]);

  /* ---- kupa terfi animasyonu (Android: trophyPromotionTrigger) ---- */
  const [gosterilen, setGosterilen] = useState(indeks);
  const [cikan, setCikan] = useState<number | null>(null);
  const [giris, setGiris] = useState(0);
  const ilkKupaRef = useRef(true);
  const oncekiIndeksRef = useRef(indeks);

  useEffect(() => {
    // İlk veri gelişinde animasyon yok — uygulamada da lastSeenLeagueIndex -1 iken atlanıyor.
    if (ilkKupaRef.current) {
      ilkKupaRef.current = false;
      oncekiIndeksRef.current = indeks;
      setGosterilen(indeks);
      return;
    }
    const onceki = oncekiIndeksRef.current;
    oncekiIndeksRef.current = indeks;
    if (indeks === onceki) return;
    if (indeks < onceki) { setGosterilen(indeks); return; }   // düşüşte animasyon yok

    setCikan(onceki);
    const z = window.setTimeout(() => {
      setGosterilen(indeks);
      setCikan(null);
      setGiris((n) => n + 1);
    }, 520);   // eski kupa: 300ms büyüme + 220ms sönme
    return () => window.clearTimeout(z);
  }, [indeks]);

  useEffect(() => {
    if (giris === 0) return;
    // Giriş animasyonu bitince sınıf kalksın ki boştaki nabız animasyonu geri gelsin.
    const z = window.setTimeout(() => setGiris(0), 780);
    return () => window.clearTimeout(z);
  }, [giris]);

  /* ---- kendi satırın: pop + kaydırma (Android: yourPopTrigger, didAutoScroll) ---- */
  const benimRef = useRef<HTMLDivElement | null>(null);
  const oncekiPuanRef = useRef<number | null>(null);
  const oncekiSiraRef = useRef<number | null>(null);
  const kaydirildiRef = useRef(false);

  useEffect(() => {
    if (!benimSatirim) return;
    const el = benimRef.current;
    const oncekiPuan = oncekiPuanRef.current;
    const oncekiSira = oncekiSiraRef.current;
    const puanArtti = oncekiPuan != null && benimSatirim.puan > oncekiPuan;
    const siraIyilesti = oncekiSira != null && benimSatirim.sira < oncekiSira;
    oncekiPuanRef.current = benimSatirim.puan;
    oncekiSiraRef.current = benimSatirim.sira;

    const azHareket =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Satır parıltısı: puan artınca ya da sıra yükselince (Android'de aynı iki koşul).
    // CSS animasyonu yeniden tetiklemek sınıf ekle-çıkar hilesi gerektirdiği için
    // doğrudan Web Animations API kullanılıyor. Süreler Android LeagueRow popTrigger:
    // glow 140ms yükselir · scale 1,05 140ms · geri 220ms · glow 420ms söner = 920ms.
    if (el && (puanArtti || siraIyilesti) && !azHareket) {
      el.animate(
        [
          { transform: "scale(1)",    backgroundColor: "rgba(255,213,79,.08)" },
          { transform: "scale(1.05)", backgroundColor: "rgba(255,213,79,.26)", offset: 0.152 },
          { transform: "scale(1)",    backgroundColor: "rgba(255,213,79,.26)", offset: 0.391 },
          { transform: "scale(1)",    backgroundColor: "rgba(255,213,79,.08)" },
        ],
        // composite:add — aynı anda yer değiştirme (translateY) animasyonu da varsa
        // scale onu ezmesin, üstüne eklensin.
        { duration: 920, easing: "ease-out", composite: "add" }
      );
    }

    // ⚠️ Uygulamada liste kendi içinde kayan bir bileşen; web'de kaydırılan şey
    // SAYFANIN TAMAMI. Satır zaten ekrandaysa sayfayı zıplatmamak için önce
    // görünürlük kontrol ediliyor — yoksa 1. sıradaki kullanıcıda bile sayfa oynardı.
    const gorunurMu = () => {
      if (!el) return true;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight;
    };

    if (siraIyilesti && el && !gorunurMu()) {
      el.scrollIntoView({ behavior: azHareket ? "auto" : "smooth", block: "center" });
    }
    if (!kaydirildiRef.current && el) {
      kaydirildiRef.current = true;
      if (!gorunurMu()) el.scrollIntoView({ block: "center" });
    }
  }, [benimSatirim]);

  /* ---- satır yer değiştirme (Android: Modifier.animateItemPlacement) ----
     Liste yeniden sıralanınca her satır eski yerinden yenisine kayar. FLIP: çizimden önce
     eski konumlar ölçülür, yeni çizimde fark kadar geri itilip 0'a animasyonla getirilir. */
  const listeRef = useRef<HTMLDivElement | null>(null);
  const konumlarRef = useRef<Map<string, number>>(new Map());
  useLayoutEffect(() => {
    const kok = listeRef.current;
    if (!kok) return;
    const azHareket = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const yeni = new Map<string, number>();
    kok.querySelectorAll<HTMLElement>("[data-uid]").forEach((el) => {
      const id = el.dataset.uid!;
      const ust = el.getBoundingClientRect().top;
      yeni.set(id, ust);
      const eski = konumlarRef.current.get(id);
      if (eski != null && !azHareket) {
        const fark = eski - ust;
        if (Math.abs(fark) > 1) {
          el.animate(
            [{ transform: `translateY(${fark}px)` }, { transform: "translateY(0)" }],
            { duration: 380, easing: "cubic-bezier(.2,.8,.2,1)" }
          );
        }
      }
    });
    konumlarRef.current = yeni;
  }, [satirlar]);

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 22 }}>LİGLER</h1>
        <p className="bk-soluk" style={{ fontSize: 12, fontWeight: 600 }}>Sezon Sıralaması</p>
      </div>

      <div className="bk-lig-ust">
        <div className="bk-kupa-kutu">
          {cikan != null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="kupa cikan" src={`/uygulama/lig/${LIGLER[cikan].key}.png`} alt="" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={giris}
            className={`kupa${giris > 0 ? " giren" : ""}`}
            style={cikan != null ? { visibility: "hidden" } : undefined}
            src={`/uygulama/lig/${LIGLER[gosterilen].key}.png`}
            alt=""
          />
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
        <div className="ad">{LIGLER[gosterilen].ad}</div>

        <div className="bk-lig-gosterge">
          {LIGLER.map((l, i) => (
            <span key={l.key} data-aktif={i === gosterilen}>
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

        {satirlar == null && (
          // Android: sınıf doğrulanana kadar üç zıplayan nokta
          <div className="bk-nokta-yukleniyor" aria-label="Sıralama yükleniyor"><i /><i /><i /></div>
        )}
        {satirlar != null && satirlar.length === 0 && (
          <p className="bk-soluk" style={{ fontSize: 14 }}>
            Bu sezon için henüz sıralama yok. Test çözdükçe puanın buraya işlenir.
          </p>
        )}

        <div ref={listeRef}>
        {satirlar?.map((s) => (
          <div
            className="bk-lig-satir"
            data-sensin={s.sensin}
            data-uid={s.uid}
            key={s.uid}
            ref={s.sensin ? benimRef : undefined}
          >
            <span className="bk-lig-sira">
              {s.disarida ? `${LIG_LISTE_LIMITI}+` : s.sira <= 3 ? (
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
      </div>
    </>
  );
}
