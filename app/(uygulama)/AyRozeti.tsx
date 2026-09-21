"use client";

// Bu ayın rozeti — masaüstünde sağ rayda (Kabuk, görevlerin altında), ray gizliyken ana ekranda
// Hedef'in altında (20 Eyl 2026: Bilgie Koç'un yanından taşındı). Aylık görevlerin hepsi bitince
// ayın rozeti kazanılır (gorevYaz.aylikRozetVer).

import Link from "next/link";
import UcNokta from "./UcNokta";
import { useGorevler, useRozetler } from "../lib/canliVeri";
import { AY_AD, AY_ANAHTAR } from "../lib/ayGorsel";

export default function AyRozetiKutusu() {
  const aylik = useGorevler("aylik");
  const rozetler = useRozetler();
  const simdi = new Date();
  const ay = simdi.getMonth();
  const aySonu = new Date(simdi.getFullYear(), ay + 1, 0).getDate();
  const kalanGun = aySonu - simdi.getDate();
  const kazanildi = rozetler?.includes(ay) ?? false;
  const kalanGorev = aylik ? aylik.filter((g) => g.ilerleme < g.hedef).length : null;

  return (
    <Link href="/rozetler" className="bk-veri-kutu">
      <h3>Bu ayın rozeti</h3>
      <div className="bk-rozet-ay">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/uygulama/rozet/${AY_ANAHTAR[ay]}rozet.webp`} alt="" data-kazanildi={kazanildi} />
        {aylik == null && !kazanildi
          ? <UcNokta boyut={8} aralik={6} etiket="Rozet yükleniyor" />
          : <p>
              <b>{AY_AD[ay]} rozeti</b>{" "}
              {kazanildi
                ? "senin! Tebrikler."
                : kalanGorev === 0
                  ? "için tüm görevler tamam — işleniyor."
                  : `için ${kalanGorev} görev daha. Ayın sonuna ${kalanGun === 0 ? "bugün son gün" : `${kalanGun} gün var`}.`}
            </p>}
      </div>
    </Link>
  );
}
