"use client";

// Kökün iki yüzü: giriş yapmış kullanıcı uygulamayı, yapmamış ziyaretçi tanıtımı görür.
//
// ⚠️ Tanıtım SUNUCUDA basılır ve React ağacında HER ZAMAN vardır — arama motoru
// JavaScript çalıştırmadan da okuyabilsin diye. Giriş yapmış kullanıcı uygulamayı
// açarken tanıtımın bir an görünmesini (flaş) engelleyen şey React değil, boyamadan
// ÖNCE çalışan bir betik: layout.tsx `bk-oturum` bayrağını okuyup <html>'e işaretler,
// CSS de o işarete göre hangisinin görüneceğine karar verir (bkz. uygulama.css).
//
// Bayrağın eskimiş olması (başka cihazdan çıkış yapılmış) sorun değil: oturum
// gerçekten bilindiğinde aşağıdaki useEffect işareti düzeltir.

import { useEffect } from "react";
import { useOturum } from "../lib/oturum";

export default function KokKapi({
  tanitim,
  children,
}: {
  tanitim: React.ReactNode;
  children: React.ReactNode;
}) {
  const { yukleniyor, kullanici } = useOturum();

  useEffect(() => {
    if (!yukleniyor) {
      document.documentElement.dataset.bkOturum = kullanici ? "1" : "0";
    }
  }, [yukleniyor, kullanici]);

  if (yukleniyor) {
    return (
      <>
        <div className="bk-kok-tanitim">{tanitim}</div>
        <div className="bk-kok-bekleme">
          <div className="bk">
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
              <div className="bk-bekleme" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ height: 96, animationDelay: `${i * 90}ms` }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (kullanici) return <>{children}</>;

  // `gorunur`: bayrak ne derse desin tanıtım gösterilir — oturum artık kesin biliniyor.
  return <div className="bk-kok-tanitim gorunur">{tanitim}</div>;
}
