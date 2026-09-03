"use client";

// Yazılıya Hazırlık — sınav seçimi (uygulamadaki YaziliyaHazirlikScreen).

import Link from "next/link";
import { useRouter } from "next/navigation";
import Kabuk from "../Kabuk";

// Uygulamada şimdilik tek sınav tanımlı
const SINAVLAR = [{ key: "term2_exam2", ad: "2. Dönem 2. Yazılı" }];

export default function YaziliSayfasi() {
  const router = useRouter();

  return (
    <Kabuk>
      <div className="bk-ustbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
            <button className="bk-ustbar-geri" onClick={() => router.push("/")} aria-label="Geri">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/uygulama/cikis.png" alt="" />
            </button>
            <h1>YAZILIYA HAZIRLIK</h1>
          </div>
          <p>Yazılılara en iyi şekilde hazırlan</p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uygulama/yazili.png" alt="" />
      </div>

      {SINAVLAR.map((s) => (
        <Link key={s.key} href={`/yazili/${s.key}`} className="bk-sinav-dugme">
          {s.ad.toLocaleUpperCase("tr")}
        </Link>
      ))}
    </Kabuk>
  );
}
