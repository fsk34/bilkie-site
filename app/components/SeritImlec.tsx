"use client";

import { useEffect, useRef } from "react";

/* ————————————————————————————————————————————————————————————
   ŞERİT İMLEÇ

   Fare peşinde yumuşak şeritler sürükleniyor. Her şerit bir yay
   zinciri: baş düğüm imlece yaylanıyor, arkadakiler bir öncekine.
   Gerginlik zincir boyunca azaldığı için uç kısım tembelleşiyor,
   savrulan kurdele hissi buradan geliyor.

   Kaynak bileşenden DÜZELTİLEN üç şey:
   ① `touchmove` üzerinde `preventDefault()` çağırıyordu — telefonda
      sayfayı kaydırmayı BLOKE eder. Zaten dokunmatikte imleç izi diye
      bir şey yok; efekt yalnız fareli cihazda açılıyor.
   ② Döngü bir kez başlayınca hiç durmuyordu. Artık sekme arkaya
      atılınca da duruyor.
   ③ Renkleri Oklab'e çevirip parlaklık tavanı uygulayan ~80 satır
      vardı; `lighter` harmanında beyaza yakın renkler patlamasın diye.
      Paletimiz zaten orta tonlu, o hesaba gerek yok — çıkarıldı.

   Etiket yazısı yok (kaynakta "HOVER ME" vardı).
   ———————————————————————————————————————————————————————————— */

/** bilkie paleti. Renk belirli aralıklarla değişiyor. */
const RENKLER = ["#8FB3D9", "#F3A24C", "#A6A0D6", "#59A99D", "#F1C83F"];
/** Kaç şerit. Kaynakta 60'tı; 1800 düğüm demek. 24'te görüntü aynı,
    kare başına iş üçte bir. */
const SERIT = 24;
/** Bir şeritteki düğüm sayısı — uzunluğu bu belirliyor. */
const DUGUM = 22;
const KALINLIK = 2;
/** Şerit başına alfa. `lighter` harmanında üst üste binerek parlıyor. */
const ALFA = 0.5 * (20 / SERIT);
/** Renk kaç saniyede bir değişsin. */
const RENK_SURESI = 1.6;

const SONUM = 0.1;      // önceki düğümün hızından devralınan pay
const GERGINLIK = 0.95; // yay sertliği zincir boyunca bu oranda azalır
const SURTUNME = 0.5;

type Dugum = { x: number; y: number; vx: number; vy: number };

export default function SeritImlec() {
  const tuvalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tuval = tuvalRef.current;
    if (!tuval) return;
    // Dokunmatikte imleç izi anlamsız; hareket hassasiyeti olana da dayatma yok.
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = tuval.getContext("2d");
    if (!ctx) return;

    const hedef = { x: 0, y: 0 };
    let seritler: { yay: number; surtunme: number; dugumler: Dugum[] }[] = [];

    const kur = () => {
      seritler = [];
      for (let i = 0; i < SERIT; i++) {
        const dugumler: Dugum[] = [];
        for (let j = 0; j < DUGUM; j++)
          dugumler.push({ x: hedef.x, y: hedef.y, vx: 0, vy: 0 });
        seritler.push({
          // Her şeride birazcık farklı yay/sürtünme: hepsi aynı olsaydı
          // üst üste binip tek bir kalın çizgi gibi görünürlerdi.
          yay: 0.4 + (i / SERIT) * 0.025 + Math.random() * 0.1 - 0.02,
          surtunme: SURTUNME + Math.random() * 0.01 - 0.002,
          dugumler,
        });
      }
    };

    const boyutla = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      tuval.width = Math.round(window.innerWidth * dpr);
      tuval.height = Math.round(window.innerHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    boyutla();

    let raf = 0, basladi = false, calisiyor = true, dogum = 0;

    const kare = () => {
      if (!calisiyor) { raf = 0; return; }
      raf = requestAnimationFrame(kare);
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";

      if (!dogum) dogum = performance.now();
      const sira = Math.floor((performance.now() - dogum) / (RENK_SURESI * 1000));
      const r = parseInt(RENKLER[sira % RENKLER.length].slice(1), 16);
      ctx.strokeStyle = `rgba(${(r >> 16) & 255},${(r >> 8) & 255},${r & 255},${ALFA})`;
      ctx.lineWidth = KALINLIK;

      for (const s of seritler) {
        let yay = s.yay;
        const d = s.dugumler;
        d[0].vx += (hedef.x - d[0].x) * yay;
        d[0].vy += (hedef.y - d[0].y) * yay;
        for (let i = 0; i < d.length; i++) {
          const n = d[i];
          if (i > 0) {
            const o = d[i - 1];
            n.vx += (o.x - n.x) * yay;
            n.vy += (o.y - n.y) * yay;
            n.vx += o.vx * SONUM;
            n.vy += o.vy * SONUM;
          }
          n.vx *= s.surtunme; n.vy *= s.surtunme;
          n.x += n.vx; n.y += n.vy;
          yay *= GERGINLIK;
        }
        // Düğümlerin ORTA noktalarından geçen ikinci derece eğri:
        // düğümden düğüme düz çizgi çekilse şerit köşeli görünürdü.
        ctx.beginPath();
        ctx.moveTo(d[0].x, d[0].y);
        for (let i = 1; i < d.length - 2; i++) {
          const a = d[i], b = d[i + 1];
          ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
        }
        const a = d[d.length - 2], b = d[d.length - 1];
        ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
        ctx.stroke();
      }
    };

    const surdur = () => { if (basladi && calisiyor && !raf) raf = requestAnimationFrame(kare); };

    const oynat = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hedef.x = e.clientX;
      hedef.y = e.clientY;
      if (!basladi) { kur(); basladi = true; surdur(); }
    };

    /* Sekme arkadayken çizmenin anlamı yok — kaynakta hiç durmuyordu. */
    const gorunurluk = () => {
      calisiyor = !document.hidden;
      if (calisiyor) surdur(); else { cancelAnimationFrame(raf); raf = 0; }
    };
    const kaybol = () => { ctx.clearRect(0, 0, window.innerWidth, window.innerHeight); };

    window.addEventListener("pointermove", oynat, { passive: true });
    window.addEventListener("resize", boyutla);
    document.addEventListener("visibilitychange", gorunurluk);
    document.documentElement.addEventListener("pointerleave", kaybol);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", oynat);
      window.removeEventListener("resize", boyutla);
      document.removeEventListener("visibilitychange", gorunurluk);
      document.documentElement.removeEventListener("pointerleave", kaybol);
    };
  }, []);

  return <canvas ref={tuvalRef} className="serit-imlec" aria-hidden="true" />;
}
