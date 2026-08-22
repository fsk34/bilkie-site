"use client";

import { useEffect, useRef } from "react";

/* ————————————————————————————————————————————————————————————
   HAVAİ FİŞEK — Ligler bölümünün arka planı

   Canvas 2D nokta sistemi. Roket yükselir, tepede patlar, kıvılcımlar
   yerçekimi ve sürtünmeyle sönerek dağılır. Üç boyutlu bir alan var
   (x sağ, z derinlik, y yükseklik); kamera eğimi ve perspektif bölmesi
   yakın patlamayı büyük, uzağı küçük gösteriyor.

   Bağımlılık YOK — three.js değil, düz canvas. Bu bölümde WebGL'e gerek
   olmadığı için de kullanılmadı.

   Kaynak bileşenden düzeltilen üç şey:
   ① `minWidth: 1200; minHeight: 800` sert tabanı — telefonda sayfayı
      yana taşırırdı. Kaldırıldı, kapsayıcıya uyuyor.
   ② Döngü sayfa açık olduğu sürece dönüyordu. Artık yalnız bölüm
      ekrandayken; dışarıdayken tek kare bile çizilmiyor.
   ③ prefers-reduced-motion hiç sorulmuyordu. Şimdi açıksa hiç başlamıyor.
   ———————————————————————————————————————————————————————————— */

/** Patlama renkleri — bilkie paleti. */
const RENKLER = ["#F3A24C", "#F1C83F", "#8FB3D9", "#A6A0D6", "#E6A893", "#59A99D", "#5874F0"];
/** Bölümün zemini. */
const ZEMIN = "#0C1A3F";
/** İz kaç ara konumla çiziliyor. Kıvılcım kendi hızına göre geriye
    doğru bu kadar noktaya da basılıyor; hareket bulanıklığı gibi. */
const IZ_ADIM = 4;

const ALAN = 1.5;        // yer düzleminde x,z aralığı
const TEPE_ALT = 0.7;    // patlama yüksekliği alt sınırı
const TEPE_UST = 1.6;
const KAMERA = 3.4;      // perspektif bölmesi sıfıra yaklaşmasın
const YERCEKIMI = 1.21;  // dünya birimi / sn²
const HAVUZ = 9000;      // kıvılcım havuzu (halka tampon)
const EGIM = 45;         // kamera eğimi, derece
const HIZ = 0.72;        // zaman ölçeği
const SIKLIK = 0.85;     // saniyede kaç patlama
const KIVILCIM = 300;    // patlama başına kıvılcım
         // iz solma alfası — küçük = uzun iz

function renkAyir(c: string) {
  const n = parseInt(c.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function Havai() {
  const tuvalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const tuval = tuvalRef.current;
    if (!tuval) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = tuval.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const zemin = renkAyir(ZEMIN);
    const palet = RENKLER.map(renkAyir);

    /* Kıvılcımlar koşut tipli dizilerde, sırayla yazılıyor. Nesne dizisi
       olsaydı saniyede yüzlerce nesne doğup ölür, çöp toplayıcı düzenli
       olarak takılmaya sebep olurdu. */
    const P = {
      x: new Float32Array(HAVUZ), y: new Float32Array(HAVUZ), z: new Float32Array(HAVUZ),
      vx: new Float32Array(HAVUZ), vy: new Float32Array(HAVUZ), vz: new Float32Array(HAVUZ),
      omur: new Float32Array(HAVUZ), enOmur: new Float32Array(HAVUZ),
      r: new Float32Array(HAVUZ), g: new Float32Array(HAVUZ), b: new Float32Array(HAVUZ),
    };
    let imlec = 0;
    let roketler: Array<{ x: number; y: number; z: number; vy: number; r: number; g: number; b: number }> = [];
    let birikim = 0, son = 0;

    const roketAt = () => {
      const tepe = TEPE_ALT + Math.random() * (TEPE_UST - TEPE_ALT);
      const c = palet[(Math.random() * palet.length) | 0];
      roketler.push({
        x: (Math.random() * 2 - 1) * ALAN,
        z: (Math.random() * 2 - 1) * ALAN,
        y: 0,
        // Tepede hızı sıfıra iniyor: apeks yerçekiminden bağımsız sabit.
        vy: Math.sqrt(2 * YERCEKIMI * tepe),
        r: c.r, g: c.g, b: c.b,
      });
    };

    const patlat = (rk: { x: number; y: number; z: number; r: number; g: number; b: number }) => {
      for (let i = 0; i < KIVILCIM; i++) {
        // Birim küre üzerinde düzgün dağılım.
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const rr = Math.sqrt(1 - u * u);
        const h = 0.85 * (0.45 + Math.random() * 0.55);
        const c = imlec; imlec = (imlec + 1) % HAVUZ;
        P.x[c] = rk.x; P.y[c] = rk.y; P.z[c] = rk.z;
        P.vx[c] = rr * Math.cos(th) * h;
        P.vy[c] = u * h;
        P.vz[c] = rr * Math.sin(th) * h;
        const o = 1.1 + Math.random() * 0.9;
        P.omur[c] = o; P.enOmur[c] = o;
        P.r[c] = rk.r; P.g[c] = rk.g; P.b[c] = rk.b;
      }
    };

    let G = 0, Y = 0;
    const boyutla = () => {
      const g = Math.max(1, Math.round(tuval.clientWidth));
      const y = Math.max(1, Math.round(tuval.clientHeight));
      const bg = Math.floor(g * dpr), by = Math.floor(y * dpr);
      if (tuval.width !== bg || tuval.height !== by) {
        tuval.width = bg; tuval.height = by;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        // Tuval saydam; bölümün kendi laciverti altından görünüyor.
      }
      G = g; Y = y;
    };

    const a = (EGIM * Math.PI) / 180;
    const cosA = Math.cos(a), sinA = Math.sin(a);

    const kare = (simdi: number) => {
      raf = gorunur ? requestAnimationFrame(kare) : 0;
      boyutla();
      if (!son) son = simdi;
      let dt = (simdi - son) / 1000;
      son = simdi;
      // Sekme arkaya atılıp dönünce dev bir fark gelir ve her şey ışınlanır.
      if (dt > 0.05) dt = 0.05;
      dt *= HIZ;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      /* TAM SİLME. Önceden iz efekti için ekranın üstüne her karede soluk
         bir zemin dikdörtgeni basılıyordu. Matematiksel olarak zemine
         yakınsıyor ama 8 bitlik renk yuvarlanması yüzünden ASLA tam
         zemine ulaşmıyor: fark 1-2 birime inince yuvarlama onu geri
         aynı değere çeviriyor ve patlamalar kalıcı hayalet lekeler
         bırakıyor — bildirdiğin hata buydu. Artık her kare sıfırdan
         çiziliyor, birikme fiziksel olarak imkânsız. İz ise kıvılcımın
         kendi hızından türetiliyor (aşağıda). */
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, G, Y);

      const odak = Math.min(G, Y) * 0.9;
      const mx = G / 2, my = Y / 2;
      const izdusum = (x: number, y: number, z: number) => {
        const derin = -y * sinA + z * cosA + KAMERA;
        if (derin <= 0.05) return null;
        const yukari = y * cosA + z * sinA;
        const p = odak / derin;
        return { sx: mx + x * p, sy: my - yukari * p, o: KAMERA / derin };
      };

      birikim += dt;
      const aralik = 1 / SIKLIK;
      let koruma = 0;
      while (birikim >= aralik && koruma < 8) {
        birikim -= aralik;
        if (roketler.length < 20) roketAt();
        koruma++;
      }

      ctx.globalCompositeOperation = "lighter";

      for (let i = roketler.length - 1; i >= 0; i--) {
        const rk = roketler[i];
        rk.vy -= YERCEKIMI * dt;
        rk.y += rk.vy * dt;
        if (rk.vy <= 0 || rk.y <= 0) { patlat(rk); roketler.splice(i, 1); continue; }
        ctx.fillStyle = `rgb(${rk.r},${rk.g},${rk.b})`;
        // Roketin izi de aynı yolla: yükselme hızının tersine doğru.
        for (let k = 0; k < 8; k++) {
          const p = izdusum(rk.x, rk.y - rk.vy * k * 0.03, rk.z);
          if (!p) continue;
          ctx.globalAlpha = 1 - k / 8;
          const s = Math.max(1, Math.min(6, Math.round(2.8 * p.o)));
          ctx.fillRect((p.sx - s / 2) | 0, (p.sy - s / 2) | 0, s, s);
        }
      }

      const surtunme = Math.pow(0.5, dt);
      for (let c = 0; c < HAVUZ; c++) {
        let o = P.omur[c];
        if (o <= 0) continue;
        o -= dt;
        if (o <= 0) { P.omur[c] = 0; continue; }
        P.omur[c] = o;
        P.vy[c] -= YERCEKIMI * dt;
        P.vx[c] *= surtunme; P.vy[c] *= surtunme; P.vz[c] *= surtunme;
        const x = (P.x[c] += P.vx[c] * dt);
        const y = (P.y[c] += P.vy[c] * dt);
        const z = (P.z[c] += P.vz[c] * dt);
        const p = izdusum(x, y, z);
        if (!p) continue;
        const parlak = o / P.enOmur[c];
        // Kare alma: sönme hızlansın, kıvılcım "ölüyor" gibi okunsun.
        ctx.globalAlpha = parlak * parlak;
        const s = Math.max(1, Math.min(5, Math.round(2.3 * p.o)));
        ctx.fillStyle = `rgb(${P.r[c]},${P.g[c]},${P.b[c]})`;
        ctx.fillRect((p.sx - s / 2) | 0, (p.sy - s / 2) | 0, s, s);
      }
      ctx.globalAlpha = 1;
    };

    let raf = 0, gorunur = false;
    const gozlemci = new IntersectionObserver(
      ([g]) => {
        gorunur = g.isIntersecting;
        if (gorunur && !raf) { son = 0; raf = requestAnimationFrame(kare); }
      },
      { rootMargin: "10% 0px" }
    );
    gozlemci.observe(tuval);

    return () => { gozlemci.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  return <canvas ref={tuvalRef} className="havai" aria-hidden="true" />;
}
