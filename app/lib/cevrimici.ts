"use client";

// Tarayıcı bağlantı durumu (navigator.onLine + online/offline olayları).
// Koç kartları için: istatistik hiç gelmemişken (bu cihazda önbellek yok) ve bağlantı da yoksa
// sonsuza kadar "Bilgie düşünüyor" demek yerine "bağlantı yok" denir — Android/iOS ile aynı (29 Eyl 2026).
import { useSyncExternalStore } from "react";

function abone(bildir: () => void): () => void {
  window.addEventListener("online", bildir);
  window.addEventListener("offline", bildir);
  return () => {
    window.removeEventListener("online", bildir);
    window.removeEventListener("offline", bildir);
  };
}

/** Sunucuda ve ilk çizimde true (yanlış "bağlantı yok" flaşı olmasın). */
export function useCevrimici(): boolean {
  return useSyncExternalStore(abone, () => navigator.onLine, () => true);
}
