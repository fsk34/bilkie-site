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
import { sesleriHazirla } from "./ses";
import UcNokta from "./UcNokta";
import { useOturum } from "../lib/oturum";

/** Giriş gerektirmeyen yollar — kapının kendisi bunları kilitlemez. */
//
// Kök (/) de açık: giriş yapmamış ziyaretçi oradan /giris'e ATILMAZ, tanıtımı görür.
// Kararı KokKapi verir (bkz. page.tsx); kapı yalnız yolu serbest bırakır.
const ACIK_YOLLAR = ["/giris", "/kayit"];

export default function Kapi({ children }: { children: React.ReactNode }) {
  // Sesler: ilk dokunuşta AudioContext açılır + sık sesler belleğe alınır (Android SoundPool gibi)
  useEffect(() => { sesleriHazirla(); }, []);
  const { yukleniyor, kullanici } = useOturum();
  const yol = usePathname() ?? "";
  const router = useRouter();

  const acik = yol === "/" || ACIK_YOLLAR.some((p) => yol === p || yol.startsWith(`${p}/`));

  useEffect(() => {
    if (!acik && !yukleniyor && !kullanici) router.replace("/giris");
  }, [acik, yukleniyor, kullanici, router]);

  if (acik) return <>{children}</>;

  // Oturum henüz bilinmiyor ya da yönlendirme sürüyor: içeriği çizme (üç nokta — 15 Eyl kararı).
  if (yukleniyor || !kullanici) {
    return (
      <div className="bk" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <UcNokta />
      </div>
    );
  }

  return <>{children}</>;
}
