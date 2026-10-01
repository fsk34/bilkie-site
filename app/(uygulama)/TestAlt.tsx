"use client";

// Android TestScreens.kt: TestBottomResultBanner + TestStrokeActionButton'ın web karşılığı (Test, Quiz,
// Hata Turu, Yazılı). Eskiden web'de hep görünen koyu bir alt bant vardı; kontrol edince koyu yeşil/kırmızıya
// dönüyor, "Doğru! 🎉" yazıyordu. Android'de kontrol öncesi bant YOK, düğme boşlukta durur; kontrol edince
// canlı yeşil/kırmızı bant düğmenin ARKASINDAN alttan kayarak gelir (✓/✗ 32 · "Doğru"/"Yanlış" ·
// isteğe bağlı "Doğru cevap: …").

import { useRef } from "react";

export function AltSonucBandi({ gorunur, dogru, dogruCevap }: {
  gorunur: boolean; dogru: boolean; dogruCevap?: string | null;
}) {
  // Android AnimatedVisibility çıkarken SON içeriği gösterir (bannerWasCorrect) — sonraki sorunun
  // sonucu kayarken bandın rengine sızmasın
  const son = useRef({ dogru, dogruCevap });
  if (gorunur) son.current = { dogru, dogruCevap };
  const { dogru: d, dogruCevap: c } = son.current;
  return (
    <div className="bk-sonuc-bandi" data-gorunur={gorunur} data-dogru={d} aria-hidden={!gorunur}>
      <svg width="32" height="32" viewBox="0 0 24 24" fill="#fff" aria-hidden>
        {d
          ? <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          : <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />}
      </svg>
      <div className="yazi">
        <b>{d ? "Doğru" : "Yanlış"}</b>
        {!d && c ? <span>Doğru cevap: {c}</span> : null}
      </div>
    </div>
  );
}

export function AksiyonDugmesi({ etiket, etkin, ton, onClick }: {
  etiket: string; etkin: boolean; ton: "normal" | "dogru" | "yanlis"; onClick: () => void;
}) {
  return (
    <button
      className="bk-aksiyon"
      data-ton={ton}
      data-bant={etiket === "Devam Et" || undefined}
      disabled={!etkin}
      onClick={onClick}
    >
      {etiket}
    </button>
  );
}
