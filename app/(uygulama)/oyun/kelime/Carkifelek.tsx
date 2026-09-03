"use client";

// Harf çarkı — Android `KgWheel` portu. Tuvalde çizilir, parmak/fare ile harfler
// birleştirilir. Ölçüler kutuya oranlı: yarıçap = min(cx,cy)·0.66, harf dairesi
// cx·0.20, isabet yarıçapı cx·0.257 (uygulamadaki 28dp/36dp'nin 140px kutudaki karşılığı).

import { useCallback, useEffect, useRef, useState } from "react";

export type Harf = { id: number; harf: string };

type Props = {
  harfler: Harf[];
  onKelime: (kelime: string) => void;
  onDegisti: (kelime: string) => void;
  onNota: (indeks: number) => void;
};

/** Harfin çarktaki yeri — Android slotOffset. */
function yuva(i: number, toplam: number, g: number, y: number): [number, number] {
  if (toplam === 0) return [g / 2, y / 2];
  const cx = g / 2, cy = y / 2;
  const r = Math.min(cx, cy) * 0.66;
  const aci = (2 * Math.PI * i) / toplam - Math.PI / 2;
  return [cx + r * Math.cos(aci), cy + r * Math.sin(aci)];
}

export default function Carkifelek({ harfler, onKelime, onDegisti, onNota }: Props) {
  const tuvalRef = useRef<HTMLCanvasElement>(null);
  const kapRef = useRef<HTMLDivElement>(null);
  const [secili, setSecili] = useState<number[]>([]);
  const surukleRef = useRef<{ x: number; y: number } | null>(null);
  const dalgaRef = useRef<{ x: number; y: number; bas: number } | null>(null);
  const olcuRef = useRef({ g: 0, y: 0 });
  const seciliRef = useRef<number[]>([]);
  const harflerRef = useRef<Harf[]>([]);
  const kareRef = useRef(0);
  // Karıştırma animasyonu: harf id → başlangıç yuvası + zaman
  const kaymaRef = useRef<{ eski: Map<number, number>; bas: number } | null>(null);
  const oncekiRef = useRef<Harf[]>([]);

  seciliRef.current = secili;
  harflerRef.current = harfler;

  // Karıştırma: aynı harf kümesi farklı sırada geldiyse eski yuvalardan yenilere süzül
  useEffect(() => {
    const onceki = oncekiRef.current;
    const ayniKume =
      onceki.length === harfler.length &&
      onceki.every((h) => harfler.some((y) => y.id === h.id));
    if (ayniKume && onceki.some((h, i) => harfler[i]?.id !== h.id)) {
      const eski = new Map<number, number>();
      onceki.forEach((h, i) => eski.set(h.id, i));
      kaymaRef.current = { eski, bas: performance.now() };
    }
    oncekiRef.current = harfler;
  }, [harfler]);

  const konumlar = useCallback((simdi: number): [number, number][] => {
    const { g, y } = olcuRef.current;
    const hs = harflerRef.current;
    const kayma = kaymaRef.current;
    const p = kayma ? Math.min(1, (simdi - kayma.bas) / 360) : 1;
    if (p >= 1) kaymaRef.current = null;
    // easeInOut (Android FastOutSlowInEasing yaklaşığı)
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;

    return hs.map((h, i) => {
      const hedef = yuva(i, hs.length, g, y);
      if (!kayma || p >= 1) return hedef;
      const baslangic = yuva(kayma.eski.get(h.id) ?? i, hs.length, g, y);
      return [
        baslangic[0] + (hedef[0] - baslangic[0]) * e,
        baslangic[1] + (hedef[1] - baslangic[1]) * e,
      ];
    });
  }, []);

  const ciz = useCallback((simdi: number) => {
    const tuval = tuvalRef.current;
    const ctx = tuval?.getContext("2d");
    if (!tuval || !ctx) return;
    const oran = window.devicePixelRatio || 1;
    const g = tuval.width / oran;
    const y = tuval.height / oran;
    olcuRef.current = { g, y };
    ctx.setTransform(oran, 0, 0, oran, 0, 0);
    ctx.clearRect(0, 0, g, y);

    const cx = g / 2, cy = y / 2;
    const kucuk = Math.min(cx, cy);
    const harfR = kucuk * 0.20;

    ctx.fillStyle = "rgba(255,255,255,.20)";
    ctx.beginPath();
    ctx.arc(cx, cy, kucuk * 0.94, 0, Math.PI * 2);
    ctx.fill();

    const pos = konumlar(simdi);
    if (pos.length === 0) return;

    // Dalga (ripple)
    const dalga = dalgaRef.current;
    if (dalga) {
      const t = Math.min(1, (simdi - dalga.bas) / 420);
      const saydam = Math.max(0, 0.55 * (1 - (simdi - dalga.bas) / 380));
      if (saydam > 0) {
        ctx.strokeStyle = "transparent";
        ctx.fillStyle = `rgba(74,123,255,${saydam})`;
        ctx.beginPath();
        ctx.arc(dalga.x, dalga.y, harfR * 1.8 * t, 0, Math.PI * 2);
        ctx.fill();
      } else {
        dalgaRef.current = null;
      }
    }

    // Seçim çizgisi
    const sec = seciliRef.current.map((i) => pos[i]).filter(Boolean);
    ctx.lineCap = "round";
    if (sec.length > 1) {
      ctx.strokeStyle = "#4A7BFF";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sec[0][0], sec[0][1]);
      for (let i = 1; i < sec.length; i++) ctx.lineTo(sec[i][0], sec[i][1]);
      ctx.stroke();
    }
    const suruk = surukleRef.current;
    if (suruk && sec.length > 0) {
      ctx.strokeStyle = "rgba(74,123,255,.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(sec[sec.length - 1][0], sec[sec.length - 1][1]);
      ctx.lineTo(suruk.x, suruk.y);
      ctx.stroke();
    }

    // Harfler
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(harfR * 1.2)}px "bk-main", system-ui, sans-serif`;
    pos.forEach(([px, py], i) => {
      if (seciliRef.current.includes(i)) {
        ctx.fillStyle = "#4A7BFF";
        ctx.beginPath();
        ctx.arc(px, py, harfR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#7BA3FF";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.fillStyle = "#000";
      ctx.fillText(harflerRef.current[i]?.harf.toLocaleUpperCase("tr") ?? "", px, py);
    });
  }, [konumlar]);

  // Çizim döngüsü — sürükleme, dalga ya da karıştırma varken sürer
  useEffect(() => {
    let calisiyor = true;
    const dongu = () => {
      if (!calisiyor) return;
      const simdi = performance.now();
      ciz(simdi);
      if (surukleRef.current || dalgaRef.current || kaymaRef.current) {
        kareRef.current = requestAnimationFrame(dongu);
      } else {
        kareRef.current = 0;
      }
    };
    dongu();
    return () => { calisiyor = false; if (kareRef.current) cancelAnimationFrame(kareRef.current); };
  }, [ciz, secili, harfler]);

  // Tuval ölçüsü
  useEffect(() => {
    const olc = () => {
      const t = tuvalRef.current;
      const kap = kapRef.current;
      if (!t || !kap) return;
      const oran = window.devicePixelRatio || 1;
      const k = kap.getBoundingClientRect();
      t.width = Math.round(k.width * oran);
      t.height = Math.round(k.height * oran);
      ciz(performance.now());
    };
    olc();
    window.addEventListener("resize", olc);
    return () => window.removeEventListener("resize", olc);
  }, [ciz]);

  const dongusuUyandir = () => {
    if (kareRef.current === 0) {
      const dongu = () => {
        const simdi = performance.now();
        ciz(simdi);
        if (surukleRef.current || dalgaRef.current || kaymaRef.current) kareRef.current = requestAnimationFrame(dongu);
        else kareRef.current = 0;
      };
      kareRef.current = requestAnimationFrame(dongu);
    }
  };

  const yerelKonum = (e: React.PointerEvent): { x: number; y: number } => {
    const k = tuvalRef.current!.getBoundingClientRect();
    return { x: e.clientX - k.left, y: e.clientY - k.top };
  };

  const isabet = (x: number, y: number): number => {
    const pos = konumlar(performance.now());
    const kucuk = Math.min(olcuRef.current.g, olcuRef.current.y) / 2;
    const yaricap = kucuk * 0.257;
    return pos.findIndex(([px, py]) => Math.hypot(px - x, py - y) < yaricap);
  };

  const dalgaBaslat = (i: number, nota: number) => {
    const pos = konumlar(performance.now());
    if (!pos[i]) return;
    dalgaRef.current = { x: pos[i][0], y: pos[i][1], bas: performance.now() };
    onNota(nota);
    dongusuUyandir();
  };

  const basildi = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = yerelKonum(e);
    surukleRef.current = p;
    const i = isabet(p.x, p.y);
    const yeni = i >= 0 ? [i] : [];
    setSecili(yeni);
    seciliRef.current = yeni;
    onDegisti(yeni.map((k) => harfler[k].harf).join(""));
    if (i >= 0) dalgaBaslat(i, 0);
    dongusuUyandir();
  };

  const hareket = (e: React.PointerEvent) => {
    if (!surukleRef.current) return;
    const p = yerelKonum(e);
    surukleRef.current = p;
    const i = isabet(p.x, p.y);
    if (i >= 0) {
      const s = seciliRef.current;
      let yeni = s;
      if (i === s[s.length - 1]) yeni = s;
      else if (i === s[s.length - 2]) yeni = s.slice(0, -1);   // geri dönüş: son harfi bırak
      else if (!s.includes(i)) yeni = [...s, i];
      if (yeni !== s) {
        setSecili(yeni);
        seciliRef.current = yeni;
        if (yeni.length > s.length) dalgaBaslat(i, yeni.length - 1);
        onDegisti(yeni.map((k) => harfler[k].harf).join(""));
      }
    }
    dongusuUyandir();
  };

  const birakildi = () => {
    const s = seciliRef.current;
    if (s.length >= 2) onKelime(s.map((k) => harfler[k].harf).join(""));
    surukleRef.current = null;
    setSecili([]);
    seciliRef.current = [];
    onDegisti("");
    dongusuUyandir();
  };

  return (
    <div
      ref={kapRef}
      className="bk-kg-cark"
      onPointerDown={basildi}
      onPointerMove={hareket}
      onPointerUp={birakildi}
      onPointerCancel={birakildi}
    >
      <canvas ref={tuvalRef} />
    </div>
  );
}
