"use client";

// Tüm başarılar — uygulamadaki AchievementsScreen'in içeriği, Duolingo satır düzeninde.

import Link from "next/link";
import Kabuk from "../Kabuk";
import { useOturum } from "../../lib/oturum";
import { useBasarimlar } from "../../lib/canliVeri";
import { BASARIMLAR } from "./basarimlar";
import BasarimSatiri from "./BasarimSatiri";

export default function BasarimlarSayfasi() {
  return (
    <Kabuk>
      <Icerik />
    </Kabuk>
  );
}

function Icerik() {
  const { kullanici, sinif } = useOturum();
  // Profil önizlemesiyle AYNI abonelikleri paylaşır — buraya gelmek yeniden okuma yapmaz.
  const sayilar = useBasarimlar(sinif);

  if (!kullanici) {
    return (
      <>
        <h1 style={{ fontSize: 24, marginBottom: 10 }}>Tüm başarılar</h1>
        <div className="bk-kart">
          <p className="bk-soluk" style={{ fontSize: 14, marginBottom: 14 }}>
            Başarımlarını görmek için giriş yapman gerekiyor.
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
        <h1>Tüm başarılar</h1>
      </div>

      <div className="bk-basarim-liste">
        {BASARIMLAR.map((b) => (
          <BasarimSatiri key={b.id} b={b} deger={sayilar?.[b.id] ?? 0} />
        ))}
      </div>
    </>
  );
}
