"use client";

// Mobil uygulamadaki Rive animasyonlarının web karşılığı (23 Eki): seri kitap yığını, konfeti, sonuç yıldızları.
// Aynı .riv dosyaları (Android res/raw) public/uygulama/rive'a kopyalandı; kaynakları ~/RiveProjeler.
// @rive-app/canvas DİNAMİK yüklenir → ana pakete girmez, yalnız animasyon ekrana gelince iner.

import { useEffect, useRef } from "react";
import { ACT_DEFTER, ACT_TEST, ACT_YAZILI } from "../lib/veri";

type Girdiler = Record<string, boolean | number>;

type Props = {
  /** dosya adı, uzantısız: "seri_kitap_baslik" | "seri_kitap_kutlama" | "seri_konfeti" | "sonuc_yildiz" */
  dosya: string;
  durumMakinesi: string;
  /** durum makinesi girdileri; değişince yeniden yazılır */
  girdiler?: Girdiler;
  sigdir?: "contain" | "cover";
  className?: string;
  style?: React.CSSProperties;
};

type GirdiNesnesi = { name: string; value: boolean | number };
type RiveOrnegi = {
  stateMachineInputs: (sm: string) => GirdiNesnesi[] | undefined;
  resizeDrawingSurfaceToCanvas: () => void;
  cleanup: () => void;
};

export default function Rive({ dosya, durumMakinesi, girdiler, sigdir = "contain", className, style }: Props) {
  const tuval = useRef<HTMLCanvasElement | null>(null);
  const ornek = useRef<RiveOrnegi | null>(null);
  const girdiRef = useRef(girdiler);
  girdiRef.current = girdiler;

  const yaz = () => {
    const r = ornek.current;
    const g = girdiRef.current;
    if (!r || !g) return;
    const liste = r.stateMachineInputs(durumMakinesi) ?? [];
    // Sıra önemli (seri): önce "yeni"ler, sonra maske — nesne sırasıyla yazılır
    for (const [ad, deger] of Object.entries(g)) {
      const girdi = liste.find((x) => x.name === ad);
      if (girdi) girdi.value = deger;
    }
  };

  useEffect(() => {
    let iptal = false;
    let boyutGozcusu: ResizeObserver | null = null;
    (async () => {
      try {
        const mod = await import("@rive-app/canvas");
        if (iptal || !tuval.current) return;
        const r = new mod.Rive({
          src: `/uygulama/rive/${dosya}.riv`,
          canvas: tuval.current,
          stateMachines: durumMakinesi,
          autoplay: true,
          layout: new mod.Layout({
            fit: sigdir === "cover" ? mod.Fit.Cover : mod.Fit.Contain,
            alignment: mod.Alignment.Center,
          }),
          onLoad: () => {
            r.resizeDrawingSurfaceToCanvas();
            yaz();
          },
        }) as unknown as RiveOrnegi;
        ornek.current = r;
        boyutGozcusu = new ResizeObserver(() => ornek.current?.resizeDrawingSurfaceToCanvas());
        boyutGozcusu.observe(tuval.current);
      } catch {
        /* animasyon yüklenemezse alan boş kalır; ekranın geri kalanı çalışır */
      }
    })();
    return () => {
      iptal = true;
      boyutGozcusu?.disconnect();
      ornek.current?.cleanup();
      ornek.current = null;
    };
    // dosya/durum makinesi değişmez; girdiler ayrı efektte
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dosya, durumMakinesi, sigdir]);

  const anahtar = JSON.stringify(girdiler ?? {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { yaz(); }, [anahtar]);

  return <canvas ref={tuval} className={className} style={{ display: "block", ...style }} />;
}

/** Seri kitap yığını girdileri: önce "yeni"ler, sonra maske (Hepsi katmanı yeni bilgisini aynı karede görmeli). */
export function seriGirdileri(maske: number, yeniMaske: number): Girdiler {
  return {
    yeniTest: (yeniMaske & ACT_TEST) !== 0,
    yeniDefter: (yeniMaske & ACT_DEFTER) !== 0,
    yeniYazili: (yeniMaske & ACT_YAZILI) !== 0,
    test: (maske & ACT_TEST) !== 0,
    defter: (maske & ACT_DEFTER) !== 0,
    yazili: (maske & ACT_YAZILI) !== 0,
  };
}

/** Takvim günü görseli: o günün yapılan bölümleri dolu kitap, diğerleri gri. */
export function seriGunResim(maske: number): string {
  const m = maske & (ACT_TEST | ACT_DEFTER | ACT_YAZILI);
  const ad =
    m === ACT_TEST ? "test" :
    m === ACT_DEFTER ? "defter" :
    m === ACT_YAZILI ? "yazili" :
    m === (ACT_TEST | ACT_DEFTER) ? "test_defter" :
    m === (ACT_TEST | ACT_YAZILI) ? "test_yazili" :
    m === (ACT_DEFTER | ACT_YAZILI) ? "defter_yazili" :
    m === (ACT_TEST | ACT_DEFTER | ACT_YAZILI) ? "hepsi" : "hicbiri";
  return `/uygulama/seri/seri_gun_${ad}.png`;
}

/**
 * Seri ekranının başlığında bugün hangi bölümlerin gösterildiği (bu tarayıcıda, kullanıcı + gün başına).
 * Yeni bölüm = bugünün maskesi − gösterilen; ekrana girince yalnız onlar düşer (+ konfeti). Depolama
 * kapalıysa (gizli pencere) 0 döner: kitaplar her girişte düşer, ekran yine çalışır.
 */
export const SeriGosterilen = {
  oku(uid: string, gun: string): number {
    try {
      const k = localStorage.getItem(`seri_gosterilen|${uid}`);
      if (!k) return 0;
      const [g, m] = k.split("|");
      return g === gun ? Math.trunc(Number(m) || 0) : 0;
    } catch { return 0; }
  },
  yaz(uid: string, gun: string, maske: number) {
    try { localStorage.setItem(`seri_gosterilen|${uid}`, `${gun}|${maske}`); } catch { /* yok say */ }
  },
};
