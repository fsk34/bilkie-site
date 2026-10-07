"use client";

// İlerleme çubuklarının GÖSTERİLEN değeri — Android IlerlemeBar.kt (119c75e) ile aynı kural:
// - son gösterilen değer TARAYICIDA saklı → çubuk ilk karede onunla çizilir; okunan değer aynıysa
//   hiçbir şey kıpırdamaz (sayfa yeniden açılınca boş → dolu atlaması yok);
// - değer gösterilenden YÜKSELİRSE (test/yazılı/defter bitirip dönünce) çubuk eski değerden başlar,
//   kısa bir beklemeden sonra yeni değere dolar. Eskiden sayfa yeni değerle açıldığı için çubuk
//   olduğu yerde beliriyordu — CSS geçişi ilk çizimde çalışmaz, artış hiç görünmüyordu.
// Dolum süresi CSS'te (--bk-dolum). Anahtar uid + sınıf içermeli.

import { useEffect, useMemo, useState, type ReactNode } from "react";

const ONEK = "bk-cubuk:";
/** Sayfa geçişi otursun diye dolum biraz bekler (Android ILERLEME_DOLUM_GECIKMESI_MS) */
const DOLUM_GECIKMESI_MS = 400;

const bellek = new Map<string, number>();

function oku(k: string): number | undefined {
  if (bellek.has(k)) return bellek.get(k);
  if (typeof window === "undefined") return undefined;
  try {
    const s = window.localStorage.getItem(ONEK + k);
    if (s === null) return undefined;
    const v = Number(s);
    if (!Number.isFinite(v)) return undefined;
    bellek.set(k, v);
    return v;
  } catch {
    return undefined;
  }
}

function yaz(k: string, v: number): void {
  if (bellek.get(k) === v) return;
  bellek.set(k, v);
  try { window.localStorage.setItem(ONEK + k, String(v)); } catch { /* yok say */ }
}

/** Hesap silme: o kullanıcının saklı çubuk değerleri düşer (anahtarlar "…/uid/…" içerir). */
export function gosterilenOranlariUnut(uid: string): void {
  for (const k of [...bellek.keys()]) if (k.includes(`/${uid}/`)) bellek.delete(k);
  try {
    for (const a of Object.keys(window.localStorage)) {
      if (a.startsWith(ONEK) && a.includes(`/${uid}/`)) window.localStorage.removeItem(a);
    }
  } catch { /* yok say */ }
}

/**
 * Çubuğun o an çizilecek oranı (0–1).
 * @param anahtar null = kullanıcı yok (saklanmaz, doğrudan hedef)
 * @param hazir false = veri henüz okunmadı → saklı değer (yoksa 0) gösterilir, okununca karar verilir
 */
export function useGosterilenOran(anahtar: string | null, hedef: number, hazir: boolean): number {
  // Karar her yeni (anahtar, hedef, hazir) için bir kez: saklı değerden yükseliyorsa dolum
  const plan = useMemo(() => {
    if (!anahtar) return { bas: hazir ? hedef : 0, dolum: false };
    const onceki = oku(anahtar);
    if (!hazir) return { bas: onceki ?? 0, dolum: false };
    if (onceki !== undefined && hedef > onceki + 0.001) return { bas: onceki, dolum: true };
    return { bas: hedef, dolum: false };
  }, [anahtar, hedef, hazir]);

  const planId = `${anahtar}|${hedef}|${hazir}`;
  const [dolan, setDolan] = useState<string | null>(null);

  useEffect(() => {
    if (!anahtar || !hazir) return;
    yaz(anahtar, hedef);
    if (!plan.dolum) return;
    const z = setTimeout(() => setDolan(planId), DOLUM_GECIKMESI_MS);
    return () => clearTimeout(z);
  }, [anahtar, hedef, hazir, plan, planId]);

  return plan.dolum && dolan !== planId ? plan.bas : plan.dolum ? hedef : plan.bas;
}

/** Listelerde (map içinde kanca çağrılamaz) aynı kural: çocuk fonksiyon gösterilen oranı alır. */
export function GosterilenOran({ anahtar, hedef, hazir, children }: {
  anahtar: string | null; hedef: number; hazir: boolean; children: (oran: number) => ReactNode;
}) {
  return <>{children(useGosterilenOran(anahtar, hedef, hazir))}</>;
}
