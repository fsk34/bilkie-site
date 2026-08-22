"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhoneFrame from "./PhoneFrame";

/* ————————————————————————————————————————————————————————————
   OYUN VİTRİNİ — 3B coverflow

   Beş oyun; ortadaki dik ve önde, komşuları perspektifte geriye yatık.
   Tıkla, parmakla kaydır ya da ok tuşlarıyla gez.

   Neden yelpaze değil de bu:
   ① Yelpazeye üç telefon sığıyor, elimizde BEŞ oyun var.
   ② Video için ölçülebilir bir kazanç: yelpazede üç video birden kod
      çözerdi, burada YALNIZ ORTADAKİ oynuyor — kenardakiler duraklatılmış
      poster. Aynı anda tek çözücü.

   3B yalnız GEÇİŞTE var (tıklayınca bir kez), sürekli dönen bir şey değil.
   ———————————————————————————————————————————————————————————— */

export type Oyun = { ad: string; video: string; poster: string };

/** Merkezden kaç komşu görünsün. Ötesi tamamen saydam. */
const GORUNUR = 2;
/** Her basamakta geriye, kart genişliğinin katı olarak. */
const DERINLIK = 0.58;
/** Her basamakta yana, kart genişliğinin katı olarak. */
const ARALIK = 0.74;
/** Her basamakta rotateY, derece. */
const ACI = 30;
/** Her basamakta küçülme. */
const OLCEK = 0.13;
/** Parmakla kaydırmada bir kart atlamak için gereken en az yatay mesafe. */
const ESIK = 44;

export default function OyunVitrini({ oyunlar }: { oyunlar: Oyun[] }) {
  const n = oyunlar.length;
  const [etkin, setEtkin] = useState(0);
  const kokRef = useRef<HTMLDivElement>(null);
  const kartRef = useRef<HTMLDivElement>(null);
  const videolarRef = useRef<Array<HTMLVideoElement | null>>([]);
  const [genislik, setGenislik] = useState(210);
  const [gorunur, setGorunur] = useState(false);

  /* Aralık ve derinlik kart genişliğinin KATI. Sabit piksel verilseydi
     telefonda kartlar üst üste biner, geniş ekranda arası açılırdı. */
  useEffect(() => {
    const el = kartRef.current;
    if (!el) return;
    const olc = () => setGenislik(el.offsetWidth || 210);
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Bölüm ekranda mı? Görünmeyen vitrinin videosu hiç oynamaz — preload
     "none" ile birlikte, sayfayı açan kişi buraya hiç gelmezse tek bayt
     bile inmez. */
  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const g = new IntersectionObserver(
      ([giris]) => setGorunur(giris.isIntersecting),
      { threshold: 0.25 }
    );
    g.observe(el);
    return () => g.disconnect();
  }, []);

  /* Oynatma: yalnız etkin kart, yalnız bölüm görünürken.
     play() bir söz döndürür ve reddedilebilir (iPhone Düşük Güç Modu
     otomatik oynatmayı tamamen kapatır) — yakalanmazsa konsola hata düşer.
     Duraklatılan kartın currentTime'ı SIFIRLANMIYOR: sıfırlansa geri
     dönüldüğünde görüntü zıplar. */
  useEffect(() => {
    const azHareket =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    videolarRef.current.forEach((v, i) => {
      if (!v) return;
      if (i === etkin && gorunur && !azHareket) void v.play().catch(() => {});
      else v.pause();
    });
  }, [etkin, gorunur, n]);

  const git = useCallback(
    (yon: number) => setEtkin((a) => ((a + yon) % n + n) % n),
    [n]
  );

  /* Parmakla kaydırma. Kaynak bileşende YOKTU — yalnız tıklama ve ok
     tuşları vardı. Telefonda ok tuşu yok ve beş oyun arasında tek tek
     tıklayarak gezmek işkence; sayfanın yarısından fazlası mobil. */
  const basla = useRef<{ x: number; y: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    basla.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const b = basla.current;
    basla.current = null;
    if (!b) return;
    const dx = e.clientX - b.x;
    const dy = e.clientY - b.y;
    // Dikey hareket baskınsa bu bir SAYFA kaydırmasıdır, karta dokunma.
    if (Math.abs(dx) < ESIK || Math.abs(dx) < Math.abs(dy)) return;
    git(dx < 0 ? 1 : -1);
  };

  const adim = genislik;

  /* Tıklamayı KART üzerinde değil SAHNE üzerinde yakalıyoruz.
     Sebebi ölçüldü: kartın tam ortasında `elementFromPoint` kartı değil
     `.vitrin-sahne`'yi döndürüyor — iç içe geçmiş üç boyutlu bağlamlar
     (sahnenin perspective'i, kartın preserve-3d'si, PhoneFrame'in kendi
     perspective'i) tarayıcının isabet testini bozuyor. Düğümün üstündeki
     onClick hiç ateşlenmiyordu, doğrudan .click() ise çalışıyordu.

     Burada kartların ekrandaki KUTULARINI okuyup noktayı kendimiz
     eşliyoruz; üst üste binen kutulardan en öndeki (merkeze en yakın)
     kazanıyor. Üç boyutlu isabet testine hiç güvenmiyoruz. */
  const sahneTikla = (e: React.MouseEvent) => {
    const sahne = e.currentTarget as HTMLElement;
    const kartlar = Array.from(sahne.querySelectorAll<HTMLElement>(".vitrin-kart"));
    let secilen = -1;
    let enYakin = Infinity;
    kartlar.forEach((el, i) => {
      let rel = i - etkin;
      if (rel > n / 2) rel -= n;
      if (rel < -n / 2) rel += n;
      if (Math.abs(rel) > GORUNUR || rel === 0) return;
      const r = el.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      if (e.clientY < r.top || e.clientY > r.bottom) return;
      if (Math.abs(rel) < enYakin) { enYakin = Math.abs(rel); secilen = i; }
    });
    if (secilen >= 0) setEtkin(secilen);
  };

  return (
    <div
      ref={kokRef}
      className="vitrin"
      role="group"
      aria-roledescription="carousel"
      aria-label="bilkie oyunları"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") { e.preventDefault(); git(1); }
        else if (e.key === "ArrowLeft") { e.preventDefault(); git(-1); }
      }}
    >
      <div className="vitrin-sahne" onClick={sahneTikla}>
        {oyunlar.map((oyun, i) => {
          // Döngüsel konum: -2 .. +2
          let rel = i - etkin;
          if (rel > n / 2) rel -= n;
          if (rel < -n / 2) rel += n;
          const uzak = Math.abs(rel);
          const acik = uzak <= GORUNUR;
          const merkez = rel === 0;

          return (
            <div
              key={oyun.ad}
              ref={i === 0 ? kartRef : undefined}
              className={"vitrin-kart" + (merkez ? " merkez" : "")}
              style={{
                transform:
                  `translate(-50%, -50%)` +
                  ` translateX(${rel * adim * ARALIK}px)` +
                  ` translateZ(${-uzak * adim * DERINLIK}px)` +
                  ` rotateY(${-rel * ACI}deg)` +
                  ` scale(${Math.max(0.4, 1 - uzak * OLCEK)})`,
                opacity: acik ? 1 : 0,
                // Kartlar hiç isabet almıyor; tıklamayı sahne çözüyor.
                pointerEvents: "none",
              }}
              aria-hidden={!acik}
            >
              <PhoneFrame
                src={oyun.poster}
                alt={`bilkie — ${oyun.ad}`}
                video={oyun.video}
                videoRef={(el) => { videolarRef.current[i] = el; }}
              />
              {/* Etkin olmayan kartı karartan katman: odak ortada kalsın. */}
              <span className="vitrin-perde" aria-hidden="true" />
            </div>
          );
        })}
      </div>

      <div className="vitrin-alt">
        <p className="vitrin-ad" aria-live="polite">{oyunlar[etkin]?.ad}</p>
        <div className="vitrin-noktalar">
          {oyunlar.map((oyun, i) => (
            <button
              key={oyun.ad}
              type="button"
              className={"vitrin-nokta" + (i === etkin ? " secili" : "")}
              aria-label={oyun.ad}
              aria-current={i === etkin}
              onClick={() => setEtkin(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
