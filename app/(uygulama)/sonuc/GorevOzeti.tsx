"use client";

// Aktivite sonrası "Görev özeti" — Android: ResultScreens.kt TaskSummaryScreen,
// iOS: Screens/Tasks/TaskSummaryScreen.swift.
//
// Uygulamadaki davranış: ilerleyen görevler SIRAYLA canlanır; her çubuk eski
// değerinden yenisine akar, her adımda task sesi çalar, görev tamamlandıysa
// gorevtamamlandi sesi çalıp sıradakine geçilir. Hiç ilerleme yoksa bu ekran
// gösterilmez (akış onu zaten atlar).

import { useEffect, useState } from "react";
import { sesCal } from "../ses";
import type { GorevDegisimi } from "../../lib/gorevYaz";

const BOLUM_ADI: Record<GorevDegisimi["donem"], string> = {
  gunluk: "Günlük Görevler",
  haftalik: "Haftalık Görevler",
  aylik: "Aylık Görevler",
};

/** Aylık dolgu renkleri — Görevler ekranındakiyle aynı (uygulamadaki monthFill). */
const AY_RENK = ["#F8B9C3", "#F8B9C3", "#FFB63B", "#A7F432", "#FAD785", "#D3211B"];

export default function GorevOzeti({
  degisenler,
  onDevam,
}: {
  degisenler: GorevDegisimi[];
  onDevam: () => void;
}) {
  // Kaç satırın canlanması bittiğini tutar; sıradaki satır bir öncekini bekler.
  const [acikIndeks, setAcikIndeks] = useState(0);
  const renk = AY_RENK[new Date().getMonth()] ?? AY_RENK[0];

  const bolumler: GorevDegisimi["donem"][] = ["gunluk", "haftalik", "aylik"];
  const sirali = bolumler.flatMap((b) => degisenler.filter((d) => d.donem === b));

  return (
    <>
      <div className="bk-gorev-ozet">
        <h2>Görevlerin ilerledi</h2>

        {bolumler.map((b) => {
          const grup = degisenler.filter((d) => d.donem === b);
          if (grup.length === 0) return null;
          return (
            <div key={b}>
              <h3 className="bk-gorev-bolum">{BOLUM_ADI[b]}</h3>
              <div className="bk-gorev-kutu">
                {grup.map((g) => (
                  <Satir
                    key={g.id}
                    g={g}
                    renk={renk}
                    // Sıra bu satıra geldiğinde canlanmaya başlar.
                    aktif={sirali.indexOf(g) <= acikIndeks}
                    onBitti={() => setAcikIndeks((i) => Math.max(i, sirali.indexOf(g) + 1))}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <button className="bk-akis-dugme" onClick={onDevam}>Devam Et</button>
    </>
  );
}

function Satir({
  g, renk, aktif, onBitti,
}: {
  g: GorevDegisimi; renk: string; aktif: boolean; onBitti: () => void;
}) {
  // Çubuk ÖNCEKİ değerden başlar, sıra gelince yeniye akar.
  const [deger, setDeger] = useState(g.onceki);

  useEffect(() => {
    if (!aktif || deger === g.yeni) return;
    // Bir kare bekle: başlangıç genişliği çizilmeden yeni değere geçersek
    // tarayıcı geçişi hiç oynatmaz, çubuk zıplar.
    const baslat = window.setTimeout(() => {
      setDeger(g.yeni);
      sesCal("task", 0.6);
    }, 60);
    // Çubuk geçişi .5s (uygulama.css) — bitince sıradakine haber ver.
    const bitir = window.setTimeout(() => {
      if (g.yeniBitti) sesCal("gorevtamamlandi", 0.7);
      onBitti();
    }, 620);
    return () => { window.clearTimeout(baslat); window.clearTimeout(bitir); };
    // onBitti her render'da yeniden üretiliyor; bağımlılığa alınırsa zamanlayıcı
    // sürekli sıfırlanır ve çubuk hiç dolmaz.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aktif, g.yeni, g.yeniBitti]);

  const bitti = deger >= g.hedef;
  const oran = Math.min(100, (deger / Math.max(1, g.hedef)) * 100);

  return (
    <div className="bk-gorev-satir" data-bitti={bitti}>
      <div className="ust">
        <span className="ad">{g.baslik}</span>
        {g.xp > 0 && <span className="xp">+{g.xp}</span>}
        <span className="sayi">{deger}/{g.hedef}</span>
      </div>
      <div className="bk-gorev-cubuk">
        <i style={{ width: `${oran}%`, background: bitti ? "#2ECC71" : renk }} />
      </div>
    </div>
  );
}
