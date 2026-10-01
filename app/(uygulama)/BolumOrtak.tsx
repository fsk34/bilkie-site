"use client";

// Android OyunBolumOrtak.kt'nin web karşılığı (Ok Bulmaca, Resim Yapboz): OyunUstBar, "Bölümden çıkılsın mı?"
// (beyaz kart), "Hakların bitti" (beyaz kart), BolumBitisOverlay (koyu kart, ¾ yükseklik, karartmasız, konfeti
// 2 tur). Web'de eskiden 2048 tarzı koyu onay kutuları ve sarı 40px başlıklı karartmalı bitiş örtüsü vardı.

import MIkon from "./MIkon";
import Lottie from "./Lottie";

export type BolumTema = "acik" | "koyu";

/** Geri (Material ArrowBack 24, 6 iç boşluk, köşe 12) + başlık (MainFont 20, normal, sola yaslı) + sağ içerik */
export function OyunUstBar({ baslik, tema, onGeri, sag }: {
  baslik: string; tema: BolumTema; onGeri: () => void; sag?: React.ReactNode;
}) {
  return (
    <div className="bk-bolum-ust" data-tema={tema}>
      <button className="geri" aria-label="Geri" onClick={onGeri}><MIkon ad="geri" renk="#fff" /></button>
      <span className="ad">{baslik}</span>
      {sag ? <span className="sag">{sag}</span> : <span style={{ width: 40 }} />}
    </div>
  );
}

/** Android OnayDugme: köşe 14, dikey 13, MainFont kalın 15 */
export function OnayDugme({ metin, zemin, renk, onClick }: { metin: string; zemin: string; renk: string; onClick: () => void }) {
  return (
    <button className="bk-bolum-onay-dugme" style={{ background: zemin, color: renk }} onClick={onClick}>{metin}</button>
  );
}

/** Android CikisOnayi: karartma .5 (dokununca kalır), beyaz kart köşe 20, iç 24, aralık 14 */
export function BolumCikisOnayi({ onKal, onCik }: { onKal: () => void; onCik: () => void }) {
  return (
    <div className="bk-bolum-onay" onClick={onKal}>
      <div className="kart" onClick={(e) => e.stopPropagation()}>
        <b>Bölümden çıkılsın mı?</b>
        <span>İlerlemen bu bölüm için kaybolur.</span>
        <div className="ikili">
          <OnayDugme metin="Kal" zemin="#E6E9F2" renk="#2B3350" onClick={onKal} />
          <OnayDugme metin="Çık" zemin="#EDC22E" renk="#000" onClick={onCik} />
        </div>
      </div>
    </div>
  );
}

/** Android BolumBitisOverlay: tam ekran konfeti (2 tur) + koyu kart (BiasAlignment 0, 0.5), karartma YOK */
export function BolumBitis({ baslik, altMetin, dugme, onDevam }: {
  baslik: string; altMetin?: string; dugme: string; onDevam: () => void;
}) {
  return (
    <>
      <Lottie ad="confetti" tekrar={2} className="bk-kg-konfeti" />
      <div className="bk-bolum-bitis">
        <div className="kart">
          <div className="bas"><span className="tik">✓</span><b>{baslik}</b></div>
          {altMetin && <span className="alt">{altMetin}</span>}
          <button className="devam" onClick={onDevam}>{dugme}</button>
        </div>
      </div>
    </>
  );
}
