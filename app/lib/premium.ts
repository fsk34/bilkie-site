"use client";

// Tek premium kaynağı (22 Eyl 2026) — Android: domain/Premium.kt · iOS: Domain/Premium.swift
// `users/{uid}/premium` düğümünü canlı dinler; düğümü YALNIZ sunucu yazar (kural `.validate: false`,
// bkz. Android database/PREMIUM.md), istemci okur. aktif = premium.bitis > şimdi.
// Reklam kapısı buradan beslenir (oyun/Reklam.tsx). Bugün sunucu olmadığı için düğüm boş →
// aktif=false → davranış değişmez. `hatirla`: soğuk açılışta ilk kare için son bilinen değer.

import { useCanli } from "./canli";
import { kullaniciDb } from "./firebase";
import { useOturum } from "./oturum";

export type PremiumDurum = { aktif: boolean; bitisMs: number };

export function usePremium(): PremiumDurum {
  const { kullanici } = useOturum();
  const d = useCanli<{ bitis?: unknown }>(
    kullaniciDb,
    kullanici ? `users/${kullanici.uid}/premium` : null,
    { hatirla: true },
  );
  const ham = d.veri?.bitis;
  const bitisMs = typeof ham === "number" ? ham : Number(ham) || 0;
  return { aktif: bitisMs > Date.now(), bitisMs };
}
