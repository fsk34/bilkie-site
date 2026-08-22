"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

/* ————————————————————————————————————————————————————————————
   AKAN BLOKLAR — YÜKLEME KAPISI

   Neden var: three.js derlendiğinde **532 KB**'lık ayrı bir parça çıkıyor
   (ölçüldü, tahmin değil) ve doğrudan import edilince sayfa AÇILIRKEN
   iniyordu. O parça sayfanın en büyük tek dosyası ve tek bir bölümün
   dekoratif arka planı için var; hero'yu açıp çıkan ziyaretçinin bunu
   ödemesi için hiçbir sebep yok.

   Bu kapı hiçbir şey yüklemiyor; bölüm görüş alanına yaklaşınca (bir
   ekran öncesinden) three.js'i ve sahneyi dinamik olarak indiriyor.
   Sayfanın açılış maliyeti sıfır.

   prefers-reduced-motion açıksa hiç indirmiyor — hareketi zaten
   göstermeyeceğiz, baytını da indirmeyelim.
   ———————————————————————————————————————————————————————————— */

export default function BlokAkisKapi() {
  const kapRef = useRef<HTMLDivElement>(null);
  const [Sahne, setSahne] = useState<ComponentType | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = kapRef.current;
    if (!el) return;
    let iptal = false;

    const gozlemci = new IntersectionObserver(
      ([g]) => {
        if (!g.isIntersecting) return;
        gozlemci.disconnect();
        import("./BlokAkis")
          .then((m) => { if (!iptal) setSahne(() => m.default); })
          .catch(() => {}); // İnmezse bölüm düz lacivert kalır, sayfa çalışır.
      },
      // Bir ekran öncesinden başlat: kullanıcı bölüme vardığında sahne hazır olsun.
      { rootMargin: "100% 0px" }
    );
    gozlemci.observe(el);
    return () => { iptal = true; gozlemci.disconnect(); };
  }, []);

  return (
    <div ref={kapRef} className="blok-akis-kapi" aria-hidden="true">
      {Sahne ? <Sahne /> : null}
    </div>
  );
}
