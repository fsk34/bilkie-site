"use client";

// Soru ekranlarının üst ilerleme çubuğu — Android SoruIlerlemeCubugu.kt (23 Eki): test, Hata Turu, yazılı bölümleri.
// İçinde "3 / 10" sayacı (mevcut = o an bulunulan soru; boşluk doldurmada doldurulan boşluk sayısı). Çubuk ilerleyince:
// yaylanarak dolar · hafifçe zıplar · dolguda parlama süzülür · uçta halka + baloncuklar · sayı büyüyüp oturur.
// Son soru da bitince (dolu) çubuk boyunca kutlama baloncukları çıkar. Animasyonlar yalnız ilerleyince oynar (CSS).

import { useEffect, useRef, useState } from "react";

const BALONCUK = [-80, -45, -15, 15, 45, 80];
const UZAKLIK = [4.2, 5.6, 6.4, 6.4, 5.6, 4.2];
const BOY = [0.42, 0.34, 0.4, 0.34, 0.4, 0.42];

export default function SoruCubugu({
  hedef, mevcut, toplam, dolguRengi = "#2ECC71", izRengi = "#474E7C",
}: {
  hedef: number; mevcut: number; toplam: number; dolguRengi?: string; izRengi?: string;
}) {
  const h = Math.min(1, Math.max(0, hedef));
  const onceki = useRef(h);
  const oncekiSayi = useRef(mevcut);
  const govdeRef = useRef<HTMLDivElement | null>(null);
  const sayiRef = useRef<HTMLSpanElement | null>(null);
  const [ilerleme, setIlerleme] = useState(0);   // her ilerlemede artar → animasyonlar yeniden başlar
  const [sayiOlay, setSayiOlay] = useState(0);

  useEffect(() => {
    if (h > onceki.current) {
      setIlerleme((x) => x + 1);
      // çubuk hafifçe zıplar (110 ms'de 1,22, sonra yaylanarak 1)
      govdeRef.current?.animate?.(
        [
          { transform: "scale(1, 1)" },
          { transform: "scale(1.026, 1.22)", offset: 0.18 },
          { transform: "scale(0.995, 0.94)", offset: 0.45 },
          { transform: "scale(1.004, 1.04)", offset: 0.7 },
          { transform: "scale(1, 1)" },
        ],
        { duration: 600, easing: "ease-out" }
      );
    }
    onceki.current = h;
  }, [h]);
  useEffect(() => {
    if (mevcut !== oncekiSayi.current) {
      setSayiOlay((x) => x + 1);
      // sayı büyüyüp oturur
      sayiRef.current?.animate?.(
        [{ transform: "scale(1.45)" }, { transform: "scale(0.92)", offset: 0.55 }, { transform: "scale(1)" }],
        { duration: 450, easing: "ease-out" }
      );
    }
    oncekiSayi.current = mevcut;
  }, [mevcut]);

  const r = 10;   // yükseklik 20 → yarıçap
  const acik = `color-mix(in srgb, ${dolguRengi} 62%, white)`;
  const renkler = [acik, "#FFE37A", dolguRengi, acik, "#FFE37A", dolguRengi];

  return (
    <div className="bk-soru-cubuk" style={{ flex: 1 }}>
      <div ref={govdeRef} className="govde" style={{ background: izRengi }}>
        <div className="dolgu" style={{ width: h > 0 ? `max(${h * 100}%, 20px)` : 0, background: dolguRengi }}>
          <span className="isik" />
          {ilerleme > 0 && <span key={`p${ilerleme}`} className="parlama" />}
        </div>
        {toplam > 0 && (
          <span ref={sayiRef} className="sayi" data-olay={sayiOlay}>
            {Math.min(Math.max(mevcut, 0), toplam)} / {toplam}
          </span>
        )}
      </div>
      {ilerleme > 0 && h > 0 && (
        <span key={`u${ilerleme}`} className="uc" style={{ left: `max(calc(${h * 100}% - ${r}px), ${r}px)` }}>
          <i className="halka" style={{ borderColor: acik }} />
          {BALONCUK.map((a, i) => {
            const rad = (a * Math.PI) / 180;
            const d = r * UZAKLIK[i];
            return (
              <i key={i} className="balon" style={{
                width: r * BOY[i] * 2, height: r * BOY[i] * 2, background: renkler[i],
                ["--x" as string]: `${Math.cos(rad) * d}px`, ["--y" as string]: `${Math.sin(rad) * d}px`,
              }} />
            );
          })}
        </span>
      )}
      {ilerleme > 0 && h >= 1 && (
        <span key={`b${ilerleme}`} className="bitis">
          {Array.from({ length: 9 }, (_, k) => (
            <i key={k} style={{
              left: `${((k + 0.5) / 9) * 100}%`, background: renkler[k % renkler.length],
              ["--y" as string]: `${-r * 5 * (0.7 + (k % 3) * 0.2)}px`,
            }} />
          ))}
        </span>
      )}
    </div>
  );
}
