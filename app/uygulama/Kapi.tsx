"use client";

// Uygulamanın giriş kapısı: /uygulama altında MİSAFİR KULLANICI YOK.
// Giriş yapmamış biri hangi adrese gelirse gelsin giriş ekranına gönderilir.
//
// Neden tek yerde: misafir durumu eskiden 19 ayrı sayfaya dağılmıştı ("giriş yapman
// gerekiyor" kartları, sağ raydaki Misafir kutusu, alt menüdeki Giriş yap satırı).
// Kapı buraya konunca hepsi erişilemez hâle geliyor; sayfalardaki kontroller
// TypeScript için null koruması olarak duruyor ama artık ekrana çıkmıyor.

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useOturum } from "../lib/oturum";

/** Giriş gerektirmeyen yollar — kapının kendisi bunları kilitlemez. */
const ACIK_YOLLAR = ["/uygulama/giris", "/uygulama/kayit"];

export default function Kapi({ children }: { children: React.ReactNode }) {
  const { yukleniyor, kullanici } = useOturum();
  const yol = usePathname() ?? "";
  const router = useRouter();

  const acik = ACIK_YOLLAR.some((p) => yol === p || yol.startsWith(`${p}/`));

  useEffect(() => {
    if (!acik && !yukleniyor && !kullanici) router.replace("/uygulama/giris");
  }, [acik, yukleniyor, kullanici, router]);

  if (acik) return <>{children}</>;

  // Oturum henüz bilinmiyor ya da yönlendirme sürüyor: içeriği çizme.
  if (yukleniyor || !kullanici) {
    return (
      <div className="bk">
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
          <Bekleyen />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Bekleyen() {
  return (
    <div className="bk-bekleme" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ height: 96, animationDelay: `${i * 90}ms` }} />
      ))}
    </div>
  );
}
