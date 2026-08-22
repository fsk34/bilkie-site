"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

/* ————————————————————————————————————————————————————————————
   DERS KÜPÜ

   Altı yüz, altı ders rengi. Küp kendi kendine dönüyor ve katman
   katman karışıyor; sürüklenebiliyor.

   Kaynak bileşenden İKİ MALİYET ALINMADI:
   ① `motion/react` — dönüşü sürmek için tek başına bir kütüphane
      ekleniyordu. Yerine 20 satırlık kendi yumuşatmamız var.
   ② Dış sunucudan inen matcap dokusu (framerusercontent.com) — metalik
      görünüm için. Renkli yüzlerde zaten gerekmiyor; üstelik bizim
      denetimimizde olmayan bir adrese bağımlılık demekti, o adres bir gün
      404 verirse küp boyasız kalırdı.

   Renkler uydurulmadı: uygulamanın istatistik ekranındaki ders renkleri.
   ———————————————————————————————————————————————————————————— */

/** +x, -x, +y, -y, +z, -z sırasıyla — uygulamadaki ders renkleri. */
const DERS_RENK = ["#F0426B", "#6FCBF0", "#F2CE1B", "#A234C4", "#4BD37B", "#F3A24C"];
/** Dışarıda olmayan yüzler gerçek küpteki gibi siyah kalıyor. */
const IC_RENK = "#0A1130";

const IZGARA = 3;
const YUZ_EKSEN: Array<[number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
];
const EKSEN = ["x", "y", "z"] as const;
/** Kenar yuvarlaklığı, küpçüğün kenar uzunluğuna oran. */
const YUVARLAK = 0.075;
/** Bir çeyrek dönüşün süresi, ms. */
const DONUS_MS = 620;
/** İki dönüş arası bekleme, ms. */
const BEKLEME_MS = 900;

const merkez = (i: number) => -1 + (2 * i + 1) / IZGARA;
const merkezIndeks = (c: number) =>
  Math.max(0, Math.min(IZGARA - 1, Math.round((c * IZGARA + IZGARA - 1) / 2)));
/** Yüzlerce dönüşten sonra yuvarlama hataları birikmesin diye kilitleme. */
const kilitle = (c: number) => merkez(merkezIndeks(c));
/** easeInOut — yay değil, bağımlılıksız ve öngörülebilir. */
const yumusat = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export default function DersKupu() {
  const kapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const kap = kapRef.current;
    if (!kap) return;
    const azHareket = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let cizici: THREE.WebGLRenderer;
    try {
      cizici = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // WebGL yok — alan boş kalır, bölüm çalışmaya devam eder.
    }
    cizici.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    cizici.outputColorSpace = THREE.SRGBColorSpace;
    const tuval = cizici.domElement;
    tuval.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;cursor:grab;touch-action:none";
    kap.appendChild(tuval);

    const sahne = new THREE.Scene();
    const kamera = new THREE.PerspectiveCamera(30, 1, 0.1, 200);
    const grup = new THREE.Group();
    const pivot = new THREE.Group();
    grup.add(pivot);
    const ortam = new THREE.AmbientLight(0xffffff, 0.78);
    const anaIsik = new THREE.DirectionalLight(0xffffff, 0.68);
    anaIsik.position.set(0.4, 0.7, 1);
    kamera.add(anaIsik);
    sahne.add(ortam, kamera, grup);

    const malzeme = new THREE.MeshLambertMaterial({ vertexColors: true });
    const kenar = (2 / IZGARA) * 0.97;
    const geolar: THREE.BufferGeometry[] = [];
    const kupcukler: THREE.Mesh[] = [];
    const paletim = DERS_RENK.map((c) => new THREE.Color(c));
    const ic = new THREE.Color(IC_RENK);

    for (let i = 0; i < IZGARA; i++)
      for (let j = 0; j < IZGARA; j++)
        for (let k = 0; k < IZGARA; k++) {
          const kabukta =
            i === 0 || i === IZGARA - 1 || j === 0 || j === IZGARA - 1 || k === 0 || k === IZGARA - 1;
          if (!kabukta) continue;
          const geo = new RoundedBoxGeometry(kenar, kenar, kenar, 3, kenar * YUVARLAK);
          geolar.push(geo);
          const dis = [i === IZGARA - 1, i === 0, j === IZGARA - 1, j === 0, k === IZGARA - 1, k === 0];

          /* Bir köşe noktası, normali hangi yüze en çok bakıyorsa o yüzün
             rengini alıyor — böylece renk sınırı pahın ortasına düşüyor,
             gerçek bir çıkartmanın kenarının olduğu yere. */
          const nrm = geo.getAttribute("normal");
          const renkler = new THREE.BufferAttribute(new Float32Array(nrm.count * 3), 3);
          for (let v = 0; v < nrm.count; v++) {
            let yuz = 0, enIyi = -Infinity;
            for (let f = 0; f < 6; f++) {
              const a = YUZ_EKSEN[f];
              const d = nrm.getX(v) * a[0] + nrm.getY(v) * a[1] + nrm.getZ(v) * a[2];
              if (d > enIyi) { enIyi = d; yuz = f; }
            }
            const c = dis[yuz] ? paletim[yuz] : ic;
            renkler.setXYZ(v, c.r, c.g, c.b);
          }
          geo.setAttribute("color", renkler);

          const ag = new THREE.Mesh(geo, malzeme);
          ag.position.set(merkez(i), merkez(j), merkez(k));
          grup.add(ag);
          kupcukler.push(ag);
        }

    const boyutla = () => {
      const g = kap.clientWidth || 1, y = kap.clientHeight || 1;
      cizici.setSize(g, y, false);
      const oran = g / y;
      const uzaklik = 6.6;
      // Kısa kenar 3,4 model birimi görsün: küp kadrajı doldursun ama
      // döndüğünde köşeleri kesilmesin (köşegen kenardan 1,73 kat uzun).
      const yukseklik = oran < 1 ? 3.4 / oran : 3.4;
      kamera.aspect = oran;
      kamera.position.set(0, 0, uzaklik);
      kamera.lookAt(0, 0, 0);
      kamera.fov = 2 * Math.atan(yukseklik / 2 / uzaklik) * (180 / Math.PI);
      kamera.updateProjectionMatrix();
    };
    boyutla();
    const ro = new ResizeObserver(boyutla);
    ro.observe(kap);

    // ——— sürükleme ———
    let suruklu = false, sonX = 0, sonY = 0, aciX = 0.52, aciY = 0.68;
    const bas = (e: PointerEvent) => { suruklu = true; sonX = e.clientX; sonY = e.clientY; tuval.style.cursor = "grabbing"; };
    const oynat = (e: PointerEvent) => {
      if (!suruklu) return;
      aciY += (e.clientX - sonX) * 0.008;
      aciX += (e.clientY - sonY) * 0.008;
      sonX = e.clientX; sonY = e.clientY;
    };
    const birak = () => { suruklu = false; tuval.style.cursor = "grab"; };
    tuval.addEventListener("pointerdown", bas);
    window.addEventListener("pointermove", oynat);
    window.addEventListener("pointerup", birak);

    // ——— katman dönüşleri ———
    type Hamle = { eksen: number; katman: number; yon: number };
    let hamle: Hamle | null = null, hedef = 0, t0 = 0, sonHamle: Hamle | null = null;
    let bosluk = BEKLEME_MS;

    const seç = () => {
      let h: Hamle, dene = 0;
      do {
        h = { eksen: (Math.random() * 3) | 0, katman: (Math.random() * IZGARA) | 0, yon: Math.random() < 0.5 ? 1 : -1 };
        dene++;
        // Az önceki hamlenin tersini seçme; küp yerinde sayıyormuş gibi olur.
      } while (dene < 8 && sonHamle && h.eksen === sonHamle.eksen && h.katman === sonHamle.katman && h.yon === -sonHamle.yon);

      const e = EKSEN[h.eksen];
      pivot.rotation.set(0, 0, 0);
      for (const m of kupcukler) {
        if (merkezIndeks(m.position[e]) !== h.katman) continue;
        // attach: dünya dönüşümü korunur, küpçük ebeveyn değiştirirken zıplamaz.
        pivot.attach(m);
      }
      hamle = h; hedef = (h.yon * Math.PI) / 2; sonHamle = h; t0 = performance.now();
    };

    const bitir = () => {
      if (!hamle) return;
      const e = EKSEN[hamle.eksen];
      pivot.rotation.set(0, 0, 0);
      pivot.rotation[e] = hedef;
      pivot.updateMatrixWorld(true);
      for (let i = pivot.children.length - 1; i >= 0; i--) {
        const m = pivot.children[i];
        grup.attach(m);
        m.position.set(kilitle(m.position.x), kilitle(m.position.y), kilitle(m.position.z));
      }
      pivot.rotation.set(0, 0, 0);
      hamle = null;
    };

    let raf = 0, gorunur = false, son = performance.now();
    const kare = () => {
      raf = gorunur ? requestAnimationFrame(kare) : 0;
      const simdi = performance.now();
      let dt = (simdi - son) / 1000;
      son = simdi;
      if (!Number.isFinite(dt) || dt < 0) dt = 0;
      if (dt > 0.05) dt = 0.05;

      if (!suruklu && !azHareket) aciY += 0.16 * dt;
      grup.rotation.set(aciX, aciY, 0);

      if (!azHareket) {
        if (hamle) {
          const t = Math.min(1, (simdi - t0) / DONUS_MS);
          pivot.rotation[EKSEN[hamle.eksen]] = hedef * yumusat(t);
          if (t >= 1) { bitir(); bosluk = BEKLEME_MS; }
        } else {
          bosluk -= dt * 1000;
          if (bosluk <= 0) seç();
        }
      }
      cizici.render(sahne, kamera);
    };

    // Görünmüyorken tek kare bile çizilmiyor.
    const gozlemci = new IntersectionObserver(
      ([g]) => {
        gorunur = g.isIntersecting;
        if (gorunur && !raf) { son = performance.now(); raf = requestAnimationFrame(kare); }
      },
      { rootMargin: "10% 0px" }
    );
    gozlemci.observe(kap);

    return () => {
      gozlemci.disconnect(); ro.disconnect(); cancelAnimationFrame(raf);
      tuval.removeEventListener("pointerdown", bas);
      window.removeEventListener("pointermove", oynat);
      window.removeEventListener("pointerup", birak);
      for (const g of geolar) g.dispose();
      malzeme.dispose(); cizici.dispose();
      if (tuval.parentNode === kap) kap.removeChild(tuval);
    };
  }, []);

  return <div ref={kapRef} className="kup" role="img" aria-label="Altı yüzü altı ders rengiyle boyanmış küp" />;
}
