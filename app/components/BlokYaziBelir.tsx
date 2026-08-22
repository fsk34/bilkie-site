"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/* ————————————————————————————————————————————————————————————
   BLOKLA AÇILAN YAZI

   Yazı, üzerinden geçen renkli bloklarla açılıyor: yumuşak bir cephe
   soldan sağa süzülüyor, önü kelimeyi ÖRTÜYOR, arkası AÇIYOR.

   Kaynak Framer bileşeni 900 satırdı ve panel denetimleri, sticky sürücü,
   satır kipi, vurgu plakaları gibi bizde karşılığı olmayan şeyler
   taşıyordu. Onu olduğu gibi taşımak yerine ÇEKİRDEĞİNİ yazdım:
   ölçüm + tek rAF + kelime başına yumuşak cephe. Bağımlılık yok.

   Kare başına React state güncellenmiyor; opaklık doğrudan düğüme
   yazılıyor. Kelimeler satır içi akışta duruyor, bloklar üstlerinde
   mutlak konumlu — yani hiç yeniden yerleşim olmuyor.
   ———————————————————————————————————————————————————————————— */

type Kutu = { x: number; y: number; g: number; yuk: number; satir: number };

/** Cephenin yumuşaklığı, satır biriminde. Kelime başına şelale bundan doğar. */
const YUMUSAK = 0.55;
/** Cephenin örtme ile açma arasındaki mesafesi, satır biriminde. */
const BANT = 1.6;
/** Bir tam geçişin süresi, ms. */
const SURE = 1500;

const kis = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
/** Quintic smootherstep — kenarları hem başta hem sonda düz. */
const yumusat = (t: number) => {
  const x = kis(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

export default function BlokYaziBelir({
  yazi,
  className,
  style,
  blokRengi = "var(--isik, #8FB3D9)",
}: {
  yazi: string;
  className?: string;
  style?: React.CSSProperties;
  blokRengi?: string;
}) {
  const kokRef = useRef<HTMLParagraphElement>(null);
  const kelimeRef = useRef<Array<HTMLSpanElement | null>>([]);
  const dayanakRef = useRef<Array<HTMLSpanElement | null>>([]);
  const blokRef = useRef<Array<HTMLSpanElement | null>>([]);
  const olcumRef = useRef<{ kutular: Kutu[]; satir: number } | null>(null);
  const [olcum, setOlcum] = useState<{ kutular: Kutu[]; satir: number } | null>(null);
  olcumRef.current = olcum;

  const kelimeler = yazi.trim().split(/\s+/).filter(Boolean);

  const olc = useCallback(() => {
    const els = kelimeRef.current;
    if (!els.length || !els[0]) return;
    const kutular: Kutu[] = [];
    let satir = -1;
    let taban = NaN;

    for (let i = 0; i < els.length; i++) {
      const el = els[i];
      if (!el) continue;
      /* Satır gruplaması offsetTop ile YAPILAMAZ: aynı satırdaki farklı
         boyda kelimeler ortak taban çizgisinde otururken farklı offsetTop
         verir. Sıfır boyutlu bir dayanak (strut) tam taban çizgisine oturur
         ve her kelime için aynı değeri döndürür. */
      const d = dayanakRef.current[i];
      const t = el.offsetTop + (d ? d.offsetTop : 0);
      if (!Number.isFinite(taban) || t - taban > 0.5) {
        satir += 1;
        taban = t;
      }
      kutular.push({
        x: el.offsetLeft,
        y: el.offsetTop,
        g: el.offsetWidth,
        yuk: el.offsetHeight,
        satir: Math.max(0, satir),
      });
    }
    if (!kutular.length) return;
    const yeni = { kutular, satir: satir + 1 };
    const eski = olcumRef.current;
    // Ölç → setState → ölç döngüsünü kesen imza karşılaştırması.
    if (
      eski &&
      eski.kutular.length === kutular.length &&
      eski.kutular.every((k, i) =>
        Math.round(k.x) === Math.round(kutular[i].x) &&
        Math.round(k.y) === Math.round(kutular[i].y) &&
        Math.round(k.g) === Math.round(kutular[i].g)
      )
    ) return;
    setOlcum(yeni);
  }, []);

  useLayoutEffect(() => { olc(); }, [olc, yazi]);

  useEffect(() => {
    const el = kokRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => olc());
    ro.observe(el);
    // Sonradan inen yazı tipi bütün kelimeleri kaydırır.
    document.fonts?.ready.then(() => olc()).catch(() => {});
    return () => ro.disconnect();
  }, [olc]);

  useEffect(() => {
    const kok = kokRef.current;
    const m = olcum;
    if (!kok || !m) return;

    const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const yaz = (p: number) => {
      const bant = Math.min(BANT, Math.max(1, m.satir));
      const yumusakl = Math.max(0.35, bant * YUMUSAK);
      // +yumusakl: p=1'de cephenin arkası son kelimeyi de tamamen geçsin.
      const cephe = p * (m.satir + bant + yumusakl);

      for (let i = 0; i < m.kutular.length; i++) {
        const k = m.kutular[i];
        // Satır içindeki yatay oran: kelime kelime ilerlesin, satır satır değil.
        let enSol = Infinity, enSag = -Infinity;
        for (const o of m.kutular) {
          if (o.satir !== k.satir) continue;
          enSol = Math.min(enSol, o.x);
          enSag = Math.max(enSag, o.x + o.g);
        }
        const u = kis((k.x + k.g / 2 - enSol) / Math.max(1, enSag - enSol));
        const yer = k.satir + u;
        const on = yumusat((cephe - yer) / yumusakl);
        const arka = yumusat((cephe - bant - yer) / yumusakl);

        const b = blokRef.current[i];
        if (b) {
          const v = Math.max(0, on - arka);
          b.style.opacity = String(v);
          b.style.transform = `scaleY(${0.92 + 0.08 * v})`;
        }
        const w = kelimeRef.current[i];
        if (w) w.style.opacity = String(arka);
      }
    };

    if (azHareket) { yaz(1); return; }

    yaz(0);
    let raf = 0;
    let basladi = false;
    const gozlemci = new IntersectionObserver(
      ([g]) => {
        if (!g.isIntersecting || basladi) return;
        basladi = true;
        gozlemci.disconnect();
        const t0 = performance.now();
        const kare = (simdi: number) => {
          const t = kis((simdi - t0) / SURE);
          yaz(t);
          if (t < 1) raf = requestAnimationFrame(kare);
        };
        raf = requestAnimationFrame(kare);
      },
      { threshold: 0.25 }
    );
    gozlemci.observe(kok);
    return () => { gozlemci.disconnect(); cancelAnimationFrame(raf); };
  }, [olcum]);

  return (
    <p ref={kokRef} className={className} style={{ position: "relative", ...style }}>
      {olcum && (
        <span aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2 }}>
          {olcum.kutular.map((k, i) => (
            <span
              key={i}
              ref={(el) => { blokRef.current[i] = el; }}
              style={{
                position: "absolute",
                // %2 taşma: hem yazıyı tam örter hem komşu bloklar arasındaki
                // yarım piksellik dikişi kapatır.
                left: k.x - k.g * 0.01,
                top: k.y + k.yuk * 0.06,
                width: k.g * 1.02,
                height: k.yuk * 0.86,
                background: blokRengi,
                borderRadius: 4,
                opacity: 0,
                transformOrigin: "50% 50%",
                willChange: "opacity, transform",
              }}
            />
          ))}
        </span>
      )}
      {kelimeler.map((k, i) => (
        <span
          key={i}
          ref={(el) => { kelimeRef.current[i] = el; }}
          style={{ display: "inline-block", marginRight: "0.26em", opacity: 0 }}
        >
          <span
            ref={(el) => { dayanakRef.current[i] = el; }}
            aria-hidden="true"
            style={{ display: "inline-block", width: 0, height: 0 }}
          />
          {k}
        </span>
      ))}
    </p>
  );
}
