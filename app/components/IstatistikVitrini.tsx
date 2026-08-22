"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PhoneFrame from "./PhoneFrame";

/* ————————————————————————————————————————————————————————————
   İSTATİSTİK VİTRİNİ — mıknatıslı dizi (macOS rıhtımı gibi)

   Dört ekran yan yana duruyor; imleç hangisine yakınsa o büyüyor,
   komşuları uzaklığa göre azalarak. Dokunmatikte dokunulan odaklanıyor.

   Kaynak bileşenden ALINMAYAN şey: orada büyütme her karede
   `setFactors([...cur])` ile React state'e yazılıyordu — saniyede 60 kez
   bütün çubuklar yeniden çiziliyor. Burada ölçüler doğrudan düğüme
   yazılıyor, kare başına React hiç çalışmıyor.

   Ölçüler `width` DEĞİL `transform` ile veriliyor: genişlik değişmek
   her karede yeniden yerleşim (reflow) demek. Konumlar analitik olarak
   hesaplanıp translateX + scale olarak yazılıyor — yalnız birleştirici
   katman çalışıyor.
   ———————————————————————————————————————————————————————————— */

export type Ekran = { ad: string; gorsel: string; renk: string };

/** Ekran görüntülerinin oranı (genişlik / yükseklik). */
const ORAN = 560 / 1218;
/** Yaklaşılan ekranın kaç kat büyüyeceği. Dördü de aynı boyda dursun,
    imleç yaklaşınca yalnızca HAFİF büyüsün istendi. Taban genişlik bu
    orandan türüyor (hepsi bir satıra sığmak zorunda), yani oran düştükçe
    taban yükseliyor: 1,12'de dördü de 193 px, yaklaşılan 216 px. */
const TEPE = 1.12;
/** Dar ekranda tabanın inebileceği en küçük değer.
    Bu sınır olmasaydı 390 px'e dört telefon sığdırmak için taban 75 px'e
    inecekti — dördü de okunmuyor. Sınır konunca satır kapsayıcıyı aşıyor
    ve YANA KAYDIRILABİLİR oluyor; boy korunuyor, eşitlik de bozulmuyor. */
const EN_KUCUK_TABAN = 130;
/** Etkinin kaç komşuya kadar uzandığı, indeks biriminde. */
const ETKI = 1.35;
/** Kartlar arası boşluk, px. */
const BOSLUK = 14;
/** Odağın hedefe yaklaşma hızı (kare hızından bağımsız). */
const YUMUSAMA = 9;

const kis = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const smoothstep = (t: number) => { const x = kis(t, 0, 1); return x * x * (3 - 2 * x); };

export default function IstatistikVitrini({ ekranlar }: { ekranlar: Ekran[] }) {
  const n = ekranlar.length;
  const kokRef = useRef<HTMLDivElement>(null);
  const kartRef = useRef<Array<HTMLDivElement | null>>([]);
  const rayRef = useRef<HTMLDivElement>(null);
  /* Dinlenme odağı İLK kart. Ortada (n-1)/2 bırakılınca iki kart birden
     yarı büyük kalıyordu — okunur tek bir telefon yerine iki yarım. */
  const odakRef = useRef(0);
  const hedefRef = useRef(0);
  const olcuRef = useRef({ taban: 110, g: 0 });
  const [yakin, setYakin] = useState(0);
  const [dokunmatik, setDokunmatik] = useState(false);

  /* Taban genişlik iki kısıttan küçüğü:
     ① en geniş hâlde satır kapsayıcıya sığmalı,
     ② en uzun kart kapsayıcı yüksekliğini aşmamalı.
     Sabit piksel verilseydi telefonda kartlar üst üste binerdi. */
  const olc = useCallback(() => {
    const el = kokRef.current;
    if (!el) return;
    const g = el.clientWidth || 600;
    const enBoyKisiti = (g - BOSLUK * (n - 1)) / (TEPE + n - 1);
    const yukKisiti = (Math.min(470, window.innerHeight * 0.56) * ORAN) / TEPE;
    const taban = Math.max(EN_KUCUK_TABAN, Math.min(enBoyKisiti, yukKisiti));
    olcuRef.current = { taban, g };
    // Kartlar genişliği CSS değişkeninden alıyor; ölçek transform'la geliyor.
    el.style.setProperty("--taban", `${taban}px`);
    el.style.height = `${(taban * TEPE) / ORAN}px`;
  }, [n]);

  useEffect(() => {
    olc();
    const el = kokRef.current;
    if (!el) return;
    const ro = new ResizeObserver(olc);
    ro.observe(el);
    setDokunmatik(!window.matchMedia("(hover: hover) and (pointer: fine)").matches);
    return () => ro.disconnect();
  }, [olc]);

  useEffect(() => {
    let raf = 0;
    let son = performance.now();
    const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const yaz = () => {
      const { taban, g } = olcuRef.current;
      const odak = odakRef.current;
      const olcek: number[] = [];
      let toplam = 0;
      for (let i = 0; i < n; i++) {
        const f = smoothstep(1 - Math.abs(i - odak) / ETKI);
        const s = 1 + (TEPE - 1) * f;
        olcek.push(s);
        toplam += taban * s;
      }
      toplam += BOSLUK * (n - 1);
      const ray = rayRef.current;
      if (ray) ray.style.width = `${Math.ceil(toplam)}px`;
      /* Sığıyorsa ortala; sığmıyorsa sola daya — negatif başlangıç
         kartların ilkini kapsayıcının dışına iter ve kaydırılamaz hâle
         getirirdi. Sığmadığında kapsayıcı yana kaydırılıyor. */
      let x = Math.max(0, (g - toplam) / 2);
      for (let i = 0; i < n; i++) {
        const el = kartRef.current[i];
        if (el) {
          el.style.transform = `translateX(${x.toFixed(1)}px) scale(${olcek[i].toFixed(4)})`;
          // Odaktan uzaklaştıkça geri planda kalsın.
          el.style.opacity = (0.86 + 0.14 * ((olcek[i] - 1) / (TEPE - 1))).toFixed(3);
          el.style.zIndex = String(10 + Math.round(olcek[i] * 10));
        }
        x += taban * olcek[i] + BOSLUK;
      }
    };

    const kare = (simdi: number) => {
      const dt = Math.min(0.05, (simdi - son) / 1000);
      son = simdi;
      const fark = hedefRef.current - odakRef.current;
      if (Math.abs(fark) < 0.0005) {
        odakRef.current = hedefRef.current;
        yaz();
        raf = 0;
        return;
      }
      // Kare hızından bağımsız yumuşama: 30 ve 144 FPS'te aynı sürede oturur.
      odakRef.current += fark * (1 - Math.exp(-YUMUSAMA * dt));
      yaz();
      raf = requestAnimationFrame(kare);
    };

    const surdur = () => {
      if (azHareket) { odakRef.current = hedefRef.current; yaz(); return; }
      if (!raf) { son = performance.now(); raf = requestAnimationFrame(kare); }
    };

    yaz();
    const el = kokRef.current;
    if (!el) return;

    const hareket = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      const { taban, g } = olcuRef.current;
      // İmleç konumunu indeks uzayına çeviriyoruz. DİNLENME düzeni
      // kullanılıyor (her kart taban genişliğinde): canlı düzen kullanılsaydı
      // büyüyen kart imleci kendinden uzaklaştırır, odak titrerdi.
      const dinlenme = taban * n + BOSLUK * (n - 1);
      const bas = Math.max(0, (g - dinlenme) / 2);
      // Kaydırma payı düşülüyor: satır kaymışken imleç konumu ray içindeki
      // yeriyle örtüşmezdi ve odak yanlış karta düşerdi.
      const yerel = e.clientX - r.left + el.scrollLeft - bas;
      hedefRef.current = kis(yerel / (taban + BOSLUK) - 0.5, 0, n - 1);
      setYakin(Math.round(hedefRef.current));
      surdur();
    };
    const cikis = () => {
      hedefRef.current = 0;
      setYakin(0);
      surdur();
    };

    el.addEventListener("pointermove", hareket);
    el.addEventListener("pointerleave", cikis);
    const odakla = (i: number) => { hedefRef.current = i; setYakin(i); surdur(); };
    (el as HTMLDivElement & { odakla?: (i: number) => void }).odakla = odakla;

    return () => {
      el.removeEventListener("pointermove", hareket);
      el.removeEventListener("pointerleave", cikis);
      cancelAnimationFrame(raf);
    };
  }, [n]);

  const odakla = (i: number) => {
    hedefRef.current = i;
    setYakin(i);
    const el = kokRef.current as (HTMLDivElement & { odakla?: (i: number) => void }) | null;
    el?.odakla?.(i);
  };

  return (
    <div className="ist-vitrin">
      <div
        className="ist-dizi"
        ref={kokRef}
        role="group"
        aria-label="İstatistik ekranları"
      >
        <div className="ist-ray" ref={rayRef}>
        {ekranlar.map((e, i) => (
          <button
            key={e.gorsel}
            type="button"
            ref={(el) => { kartRef.current[i] = el as unknown as HTMLDivElement; }}
            className={"ist-kart" + (i === yakin ? " yakin" : "")}
            aria-label={e.ad}
            aria-current={i === yakin}
            onClick={() => odakla(i)}
            onFocus={() => odakla(i)}
          >
            <PhoneFrame src={e.gorsel} alt={`bilkie istatistik — ${e.ad}`} kamera={false} />
          </button>
        ))}
        </div>
      </div>

      <p className="ist-ad" aria-live="polite" style={{ color: ekranlar[yakin]?.renk }}>
        {ekranlar[yakin]?.ad}
      </p>
      {dokunmatik && <p className="ist-ipucu">Yana kaydır</p>}
    </div>
  );
}
