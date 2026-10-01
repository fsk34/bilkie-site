"use client";

// Uygulamadaki LottieView'in web karşılığı.
// Aynı JSON dosyaları (Sources/BilkieIOS/Resources/Lottie) public/uygulama/lottie'ye kopyalandı.
// lottie-web DİNAMİK yüklenir → ana pakete girmez, yalnız animasyon ekrana gelince iner.
// Animasyonlarda ifade (expression) yok, bu yüzden hafif oynatıcı (lottie_light) yeter.

import { useEffect, useRef } from "react";

type Props = {
  /** dosya adı, uzantısız: "resultscreen" | "streaktest" | "streakdefter" | "streakyazili" | "dogrubes" | "confetti" */
  ad: string;
  dongu?: boolean;
  /** döngüsüz oynatmada kaç tur (Android iterations); verilmezse 1 */
  tekrar?: number;
  /** döngüsüz oynatma bitince */
  bittiginde?: () => void;
  className?: string;
  style?: React.CSSProperties;
};

export default function Lottie({ ad, dongu = false, tekrar, bittiginde, className, style }: Props) {
  const kap = useRef<HTMLDivElement | null>(null);
  const bittiRef = useRef(bittiginde);
  bittiRef.current = bittiginde;

  useEffect(() => {
    let iptal = false;
    let anim: { destroy: () => void } | null = null;

    (async () => {
      try {
        const mod = await import("lottie-web/build/player/lottie_light");
        const lottie = (mod as unknown as { default: typeof import("lottie-web").default }).default;
        if (iptal || !kap.current) return;
        anim = lottie.loadAnimation({
          container: kap.current,
          renderer: "svg",
          // lottie-web: sayı verilirse o kadar EK tur oynar → toplam `tekrar` tur için tekrar − 1
          loop: dongu ? true : tekrar && tekrar > 1 ? tekrar - 1 : false,
          autoplay: true,
          path: `/uygulama/lottie/${ad}.json`,
        });
        if (!dongu) {
          (anim as unknown as { addEventListener: (e: string, f: () => void) => void })
            .addEventListener("complete", () => bittiRef.current?.());
        }
      } catch {
        /* animasyon inmezse ekran animasyonsuz çalışmaya devam eder */
      }
    })();

    return () => { iptal = true; anim?.destroy(); };
  }, [ad, dongu, tekrar]);

  return <div ref={kap} className={className} style={style} aria-hidden />;
}
