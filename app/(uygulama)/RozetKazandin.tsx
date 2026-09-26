"use client";

// "Rozeti Kazandın" sahnesi — Android RozetKazandin.kt / iOS RozetKazandinOverlay.swift birebir.
// Kurgu (14 Eyl 2026, prototiple onaylandı):
//   0–1,4 s  madalya 200px, %25 soluk, sağa-sola sallanır (±8° → ±5° → ±2°, pivot üstte %12),
//            arkada küçük altın hale nabız atar
//   1,4 s    madalya renklenir + 1,10 pop; hale büyür ve parlar; dönen ışın demeti belirir
//   2,0 s    havai fişek (Lottie fireworks) madalyanın ARKASINDA, döngüde
//   2,2 s    "EYLÜL" · "Rozeti kazandın!" · "Ayın tüm görevlerini tamamladın"
//   2,5 s    "Harika!" düğmesi
// "Harika!"ya basılana kadar hale nabzı + ışın dönüşü + havai fişek sürer. Işıltı CSS ile çizilir.
// Tetik ana ekranda (AnaEkran.tsx): kazanılıp kutlanmamış ay varsa açılır, kapanınca badges_seen yazılır.

import { useEffect, useState } from "react";
import Lottie from "./Lottie";
import { AY_AD, AY_ANAHTAR } from "../lib/ayGorsel";
import { useOturum } from "../lib/oturum";
import { bekleyenRozetAylari, rozetGorulduIsaretle } from "../lib/rozetKazandin";

/** `onMesgul(true)` bakılırken ve sahne açıkken; iş bitince false (lig sahnesi bunu bekler). */
export default function RozetKazandin({ onMesgul }: { onMesgul?: (m: boolean) => void }) {
  const { kullanici } = useOturum();
  const [ay, setAy] = useState<number | null>(null);

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    onMesgul?.(true);
    // Ana ekran her açıldığında bakılır (Android: Home sekmesi + başka örtü yok)
    void bekleyenRozetAylari(kullanici.uid).then((b) => {
      if (iptal) return;
      if (b.length > 0) setAy(b[0]); else onMesgul?.(false);
    });
    return () => { iptal = true; };
  }, [kullanici, onMesgul]);

  if (ay == null || !kullanici) return null;

  const kapat = async () => {
    const kapanan = ay;
    setAy(null);
    await rozetGorulduIsaretle(kullanici.uid, kapanan);
    // birikmiş başka ay varsa sırayla
    const kalan = await bekleyenRozetAylari(kullanici.uid);
    if (kalan.length > 0) setAy(kalan[0]); else onMesgul?.(false);
  };

  return <Sahne key={ay} ay={ay} onKapat={kapat} />;
}

/**
 * Kutlama sahnesi — rozet VE lig için ortak (21 Eyl: lig terfisi de bu sahneyle kutlanıyor).
 * Zamanlama üstte; `gorsel` ortadaki madalya/kupa, üç satır yazı, düğme.
 */
export function KutlamaSahnesi({ gorsel, ust, ana, alt, etiket, onKapat }: {
  gorsel: string; ust: string; ana: string; alt: string; etiket: string; onKapat: () => void;
}) {
  const [fisek, setFisek] = useState(false);
  useEffect(() => {
    const z = window.setTimeout(() => setFisek(true), 2000);
    return () => window.clearTimeout(z);
  }, []);

  return (
    <div className="bk-rozetk-ortu" role="dialog" aria-label={etiket}>
      <div className="bk-rozetk-sahne">
        <div className="bk-rozetk-kutu">
          <div className="bk-rozetk-isinlar" />
          <div className="bk-rozetk-hale" />
          {fisek && <Lottie ad="fireworks" dongu className="bk-rozetk-fisek" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bk-rozetk-rozet" src={gorsel} alt="" />
        </div>
        <div className="bk-rozetk-yazi">
          <div className="ay">{ust}</div>
          <div className="ana">{ana}</div>
          <div className="alt">{alt}</div>
        </div>
        <button className="bk-rozetk-dugme" type="button" onClick={onKapat}>Harika!</button>
      </div>
    </div>
  );
}

function Sahne({ ay, onKapat }: { ay: number; onKapat: () => void }) {
  return (
    <KutlamaSahnesi
      gorsel={`/uygulama/rozet/${AY_ANAHTAR[ay]}rozet.webp`}
      ust={AY_AD[ay].toLocaleUpperCase("tr")}
      ana="Rozeti kazandın!"
      alt="Ayın tüm görevlerini tamamladın"
      etiket={`${AY_AD[ay]} rozetini kazandın`}
      onKapat={onKapat}
    />
  );
}
