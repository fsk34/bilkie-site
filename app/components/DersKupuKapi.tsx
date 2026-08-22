"use client";

import { useEffect, useRef, useState, type ComponentType } from "react";

/* Küp de akan bloklar gibi kapının arkasında: bölüm yaklaşana kadar
   ne three.js ne de sahne iniyor. Sayfada üç boyutlu ikinci parça bu,
   ama three.js zaten bir önceki bölümde indiği için buradaki ek maliyet
   yalnız bileşenin kendisi. */
export default function DersKupuKapi() {
  const kapRef = useRef<HTMLDivElement>(null);
  const [Kup, setKup] = useState<ComponentType | null>(null);

  useEffect(() => {
    const el = kapRef.current;
    if (!el) return;
    let iptal = false;
    const g = new IntersectionObserver(
      ([giris]) => {
        if (!giris.isIntersecting) return;
        g.disconnect();
        import("./DersKupu")
          .then((m) => { if (!iptal) setKup(() => m.default); })
          .catch(() => {});
      },
      { rootMargin: "100% 0px" }
    );
    g.observe(el);
    return () => { iptal = true; g.disconnect(); };
  }, []);

  return <div ref={kapRef} className="kup-kapi">{Kup ? <Kup /> : null}</div>;
}
