"use client";

// Rozetler — uygulamadaki BadgesScreen: sezonun ay madalyaları.

import Link from "next/link";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { useRozetler } from "../../lib/canliVeri";
import { AY_ROZETLERI } from "../basarimlar/basarimlar";

export default function RozetlerSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici } = useOturum();
  // Profil önizlemesiyle AYNI abonelik — buraya gelmek yeniden okuma yapmaz.
  const aylar = useRozetler() ?? [];

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Rozetler</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Rozetlerini görmek için giriş yapman gerekiyor.
          </p>
          <Link className="bk-dugme" href="/giris">Giriş yap</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="bk-icerik-bas">
        <Link href="/profil" className="bk-ustbar-geri" aria-label="Geri">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/uygulama/cikis.png" alt="" />
        </Link>
        <h1>2025-2026 Güz</h1>
      </div>

      <div className="bk-kart">
        <div className="bk-rozet-izgara">
          {AY_ROZETLERI.map((a) => (
            <div className="bk-rozet" key={a.i} data-kazanildi={aylar.includes(a.i)}>
              <div className="kutu">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/uygulama/rozet/${a.gorsel}.svg`} alt="" />
              </div>
              <span className="ad">{a.ad}</span>
            </div>
          ))}
        </div>
        <p className="bk-soluk" style={{ fontSize: 13, marginTop: 14 }}>
          Ay rozetleri, o ayın tüm görevlerini tamamlayınca kazanılır.
        </p>
      </div>
    </>
  );
}
