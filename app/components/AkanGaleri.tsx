"use client";

import { useCallback, useEffect, useRef } from "react";

/* ————————————————————————————————————————————————————————————
   AKAN GALERİ — hero'nun ARKA PLANI

   Uygulama ekranları yavaşça süzülüyor, alttan/üstten sonsuz sarıyor.
   Süs olduğu için tıklanmıyor (`pointerEvents:none`): hero'nun asıl işi
   Google Play düğmesi, onun önüne hareketli hiçbir şey konmuyor.

   Kare başına HİÇ React state güncellenmiyor — tek bir rAF döngüsü
   `transform`'u doğrudan düğüme yazıyor. Kartlar `position:absolute`
   olduğu için yeniden yerleşim (reflow) hiç olmuyor. Yazılan tek şey
   `translate3d + rotate + scale`: düz, iki boyutlu, ekran kartının
   doğrudan işlediği tür — donanım hızlandırma kapalı makinede de
   `preserve-3d` katmanları gibi çökmez.
   ———————————————————————————————————————————————————————————— */

/** Ekran görüntülerinin oranı: 764 × 1558. Kartlar bu oranda, böylece
 *  `objectFit` hiçbir şeyi kırpmıyor — kırpılmış bir uygulama ekranında
 *  okunacak bir şey kalmıyor. */
const ORAN = 764 / 1558;

/** Süzülme yönü: -1 yukarı, +1 aşağı. */
const YON = -1;
/** Referans hız, px/sn. Arka plan olduğu için bilerek çok yavaş. */
const HIZ = 15;

const GORSELLER = [
  "konutesti1",
  "istatistik1",
  "konudefteri2",
  "ligler",
  "yazili1",
  "oyunlastirma3",
  "profil1",
  "konutesti3",
  "istatistik3",
  "yazili3",
].map((ad) => `/ekran/mini/${ad}.jpg`);

/* Yerleşim tablosu. x/y kapsayıcının yüzdesi.
   `o` = ölçek, `h` = hız çarpanı — küçük kart daha UZAKTA sayılır ve daha
   yavaş akar (paralaks). Ortadakiler (x 38–63) bilerek en küçük ve en
   soluk: başlığın ve telefonun oturduğu yer orası.
   `kenar` = dar ekranda da kalsın mı — telefonda yalnız kenardakiler var,
   ortası zaten metin ve telefonla dolu. */
const YUVALAR: ReadonlyArray<{
  x: number;
  y: number;
  o: number;
  h: number;
  kenar: boolean;
}> = [
  { x: 3, y: 8, o: 1.0, h: 1.0, kenar: true },
  { x: 15, y: 55, o: 0.78, h: 0.72, kenar: false },
  { x: 27, y: 22, o: 0.92, h: 0.88, kenar: false },
  { x: 39, y: 78, o: 0.62, h: 0.55, kenar: false },
  { x: 52, y: 12, o: 0.58, h: 0.5, kenar: false },
  { x: 63, y: 62, o: 0.66, h: 0.6, kenar: false },
  { x: 74, y: 18, o: 0.95, h: 0.9, kenar: false },
  { x: 86, y: 70, o: 0.82, h: 0.76, kenar: false },
  { x: 97, y: 30, o: 1.0, h: 1.0, kenar: true },
  { x: 45, y: 42, o: 0.54, h: 0.46, kenar: false },
];

/** Aynı indeks her zaman aynı sayı: sunucu ve tarayıcı aynı şeyi çizsin
 *  diye Math.random YOK (yoksa hidrasyon uyuşmazlığı). */
function karma01(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

type Kart = {
  y: number; // sarmalanmamış dikey konum, px
  x: number; // px
  g: number; // genişlik, px
  yuk: number; // yükseklik, px
  hiz: number; // px/sn
  don: number; // derece
  saydam: number;
  gizli: boolean;
};

export default function AkanGaleri() {
  const kokRef = useRef<HTMLDivElement>(null);
  const kartlarRef = useRef<Kart[]>([]);
  /* Düğümler kartlardan AYRI bir ref'te: React, ref geri çağrısını
     kartları tohumlayan effect'ten ÖNCE çalıştırıyor, bu yüzden düğümü
     kartın üstüne yazmak boş diziye yazmak olurdu. */
  const dugumRef = useRef<Array<HTMLDivElement | null>>([]);
  const olcuRef = useRef({ g: 0, y: 0 });

  const tohumla = useCallback(() => {
    const { g: G, y: Y } = olcuRef.current;
    if (!G || !Y) return;

    const dar = G < 760;

    // Kart boyu kapsayıcı genişliğine bağlı, üstten ve alttan sınırlı.
    const taban = Math.max(84, Math.min(190, G * 0.13));

    /* Dar ekranda diziyi SÜZMÜYORUZ, yalnız gizliyoruz. Süzmek kart
       dizisini kısaltıyor ama DOM'daki düğüm sayısı aynı kalıyordu —
       indeksler kayıyor, kart yanlış düğüme yazılıyordu. */
    kartlarRef.current = YUVALAR.map((yuva, i) => {
      const g = taban * yuva.o;
      const yuk = g / ORAN;
      const onceki = kartlarRef.current[i];
      return {
        x: (yuva.x / 100) * G - g / 2,
        // Yeniden boyutlanmada dikey ilerleme korunuyor, yoksa zıplar.
        y: onceki ? onceki.y : (yuva.y / 100) * Y - yuk / 2,
        g,
        yuk,
        hiz: HIZ * yuva.h,
        don: (karma01(i) - 0.5) * 9, // ±4,5° — ızgara değil kolaj olsun
        // Uzak kart daha soluk. Üstteki karartma katmanı zaten var,
        // bu onun üstüne derinlik ekliyor.
        saydam: 0.31 + yuva.o * 0.38,
        // Telefonda ortası zaten metin ve cihazla dolu: yalnız kenardakiler.
        gizli: dar && !yuva.kenar,
      };
    });
  }, []);

  useEffect(() => {
    const kok = kokRef.current;
    if (!kok) return;
    const olc = () => {
      olcuRef.current = { g: kok.offsetWidth, y: kok.offsetHeight };
      tohumla();
    };
    olc();
    const ro = new ResizeObserver(olc);
    ro.observe(kok);
    return () => ro.disconnect();
  }, [tohumla]);

  useEffect(() => {
    // Hareket hassasiyeti olan kullanıcıya akış dayatılmıyor: kartlar
    // durduğu yerde kalıyor, sayfa yine dolu görünüyor.
    const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)");

    let raf = 0;
    let son = performance.now();

    /* Ölçüler de burada yazılıyor. Başlangıçtaki satır içi width/height
       yalnız ilk boyama içindi; JS onları hiç güncellemeyince kartlar
       görüntü alanı büyüyünce büyümüyordu. */
    const yaz = (k: Kart, dugum: HTMLDivElement) => {
      dugum.style.width = `${k.g}px`;
      dugum.style.height = `${k.yuk}px`;
      dugum.style.transform =
        `translate3d(${k.x}px, ${k.y}px, 0) rotate(${k.don}deg)`;
      dugum.style.opacity = k.gizli ? "0" : String(k.saydam);
    };

    const kare = (simdi: number) => {
      raf = requestAnimationFrame(kare);
      // dt kırpılıyor: sekme arkaya atılıp geri gelince dev bir fark
      // dönüyor ve her şey ışınlanıyor.
      const dt = Math.min(0.05, (simdi - son) / 1000);
      son = simdi;

      const { y: Y } = olcuRef.current;
      if (!Y) return;

      for (let i = 0; i < kartlarRef.current.length; i++) {
        const k = kartlarRef.current[i];
        const dugum = dugumRef.current[i];
        if (!dugum) continue;
        if (k.gizli) {
          dugum.style.opacity = "0";
          continue;
        }

        k.y += YON * k.hiz * dt;
        // Kesintisiz sarma: kart tam bir boy dışarı çıkınca öbür uçtan girer.
        const acik = Y + k.yuk;
        if (k.y > Y) k.y -= acik;
        else if (k.y < -k.yuk) k.y += acik;

        yaz(k, dugum);
      }
    };

    const basla = () => {
      cancelAnimationFrame(raf);
      if (azHareket.matches) {
        // Tek sefer yerleştir, döngüyü hiç kurma.
        const id = requestAnimationFrame(() => {
          kartlarRef.current.forEach((k, i) => {
            const d = dugumRef.current[i];
            if (d) yaz(k, d);
          });
        });
        raf = id;
        return;
      }
      son = performance.now();
      raf = requestAnimationFrame(kare);
    };

    basla();
    azHareket.addEventListener("change", basla);
    return () => {
      cancelAnimationFrame(raf);
      azHareket.removeEventListener("change", basla);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <div ref={kokRef} style={{ position: "absolute", inset: 0 }}>
        {GORSELLER.map((src, i) => {
          const yuva = YUVALAR[i];
          return (
            <div
              key={src}
              ref={(n) => {
                dugumRef.current[i] = n;
              }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                // Ölçüler tohumlamada JS ile yazılıyor; ilk boyanmada
                // görünmesin diye başlangıçta saydamlık 0.
                width: Math.round(160 * yuva.o),
                height: Math.round((160 * yuva.o) / ORAN),
                opacity: 0,
                borderRadius: 12,
                overflow: "hidden",
                background: "#132450",
                boxShadow: "0 18px 40px rgba(3,8,22,.45)",
                willChange: "transform",
              }}
            >
              <img
                src={src}
                alt=""
                draggable={false}
                decoding="async"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          );
        })}
      </div>

      {/* KARARTMA — ekranlar renkli, başlık #8FB3D9. Araya bu katman
          girmezse yazı okunmuyor. Bulanıklık (blur) YERİNE bu kullanıldı:
          blur hareket eden elemanda kare başına yeniden hesaplanır ve
          zayıf makinede en pahalı şey odur. Bu ise tek, sabit bir degrade. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: [
            "radial-gradient(ellipse 70% 62% at 50% 50%, #0C1A3F 0%, rgba(12,26,63,.9) 34%, rgba(12,26,63,.5) 66%, rgba(12,26,63,.08) 100%)",
            "linear-gradient(to bottom, #0C1A3F 0%, rgba(12,26,63,0) 16%, rgba(12,26,63,0) 84%, #0C1A3F 100%)",
          ].join(","),
        }}
      />
    </div>
  );
}
