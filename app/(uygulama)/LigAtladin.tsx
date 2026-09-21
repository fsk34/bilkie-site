"use client";

// "Lig atladın" sahnesi — RozetKazandin ile aynı KutlamaSahnesi, ortada lig kupası.
// Tetik ana ekranda (RozetKazandin'in yanında): XP'den bulunan lig, kayıtlı "görülen"
// ligden yüksekse açılır; kapanınca users/{uid}/league/seenLeague yazılır.
// Ligler ekranındaki ekran-içi terfi animasyonu ayrıca duruyor (ekran açıkken atlarsa).

import { useEffect, useState } from "react";
import { KutlamaSahnesi } from "./RozetKazandin";
import { useOturum } from "../lib/oturum";
import { useUstBilgi } from "../lib/canliVeri";
import { ligBul } from "../lib/veri";
import { LIG_ADI, LIG_SIRASI, bekleyenLigTerfisi, ligSirasi, ligTerfisiGorulduIsaretle } from "../lib/ligAtladin";

const onizleme = () =>
  process.env.NODE_ENV === "development" && new URLSearchParams(window.location.search).get("onizle") === "lig";

export default function LigAtladin() {
  const { kullanici, sinif } = useOturum();
  const ust = useUstBilgi(sinif);
  const simdiki = ust ? ligSirasi(ligBul(ust.xp).key) : 0;
  const [sira, setSira] = useState<number | null>(null);

  useEffect(() => {
    if (!kullanici || simdiki <= 0) return;
    let iptal = false;
    // Önizleme (yalnız geliştirme): localhost:3000/?onizle=lig → bir üst ligin sahnesi, yazma yok
    const bekleyen = onizleme()
      ? Promise.resolve(Math.min(LIG_SIRASI.length, simdiki + 1))
      : bekleyenLigTerfisi(kullanici.uid, simdiki);
    void bekleyen.then((b) => { if (!iptal && b != null) setSira(b); });
    return () => { iptal = true; };
  }, [kullanici, simdiki]);

  if (sira == null || !kullanici) return null;
  const key = LIG_SIRASI[sira - 1];

  const kapat = () => {
    const kapanan = sira;
    setSira(null);
    if (!onizleme()) void ligTerfisiGorulduIsaretle(kullanici.uid, kapanan);
  };

  return (
    <KutlamaSahnesi
      key={sira}
      gorsel={`/uygulama/lig/${key}.png`}
      ust={LIG_ADI[key].toLocaleUpperCase("tr")}
      ana="Lig atladın!"
      alt="Puanların seni yukarı taşıdı"
      etiket={`${LIG_ADI[key]}'ne yükseldin`}
      onKapat={kapat}
    />
  );
}
