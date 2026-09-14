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

export default function RozetKazandin() {
  const { kullanici } = useOturum();
  const [ay, setAy] = useState<number | null>(null);

  useEffect(() => {
    if (!kullanici) return;
    let iptal = false;
    // Ana ekran her açıldığında bakılır (Android: Home sekmesi + başka örtü yok)
    void bekleyenRozetAylari(kullanici.uid).then((b) => { if (!iptal && b.length > 0) setAy(b[0]); });
    return () => { iptal = true; };
  }, [kullanici]);

  if (ay == null || !kullanici) return null;

  const kapat = async () => {
    const kapanan = ay;
    setAy(null);
    await rozetGorulduIsaretle(kullanici.uid, kapanan);
    // birikmiş başka ay varsa sırayla
    const kalan = await bekleyenRozetAylari(kullanici.uid);
    if (kalan.length > 0) setAy(kalan[0]);
  };

  return <Sahne key={ay} ay={ay} onKapat={kapat} />;
}

function Sahne({ ay, onKapat }: { ay: number; onKapat: () => void }) {
  const [fisek, setFisek] = useState(false);
  useEffect(() => {
    const z = window.setTimeout(() => setFisek(true), 2000);
    return () => window.clearTimeout(z);
  }, []);

  return (
    <div className="bk-rozetk-ortu" role="dialog" aria-label={`${AY_AD[ay]} rozetini kazandın`}>
      <div className="bk-rozetk-sahne">
        <div className="bk-rozetk-kutu">
          <div className="bk-rozetk-isinlar" />
          <div className="bk-rozetk-hale" />
          {fisek && <Lottie ad="fireworks" dongu className="bk-rozetk-fisek" />}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="bk-rozetk-rozet" src={`/uygulama/rozet/${AY_ANAHTAR[ay]}rozet.webp`} alt="" />
        </div>
        <div className="bk-rozetk-yazi">
          <div className="ay">{AY_AD[ay].toLocaleUpperCase("tr")}</div>
          <div className="ana">Rozeti kazandın!</div>
          <div className="alt">Ayın tüm görevlerini tamamladın</div>
        </div>
        <button className="bk-rozetk-dugme" type="button" onClick={onKapat}>Harika!</button>
      </div>
    </div>
  );
}
