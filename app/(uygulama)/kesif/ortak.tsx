"use client";

// Keşif ekranlarının ortak parçaları: Storage görsellerini adresine çevirip gösterme.
// Adres çözümü `gorselAdresi` içinde önbelleğe alınır, aynı görsel iki kez sorulmaz.

import { useEffect, useState } from "react";
import { gorselAdresi } from "../../lib/kesif";

export function useGorselAdresi(yol: string): string | null {
  const [adres, setAdres] = useState<string | null>(null);
  useEffect(() => {
    let iptal = false;
    setAdres(null);
    if (!yol) return;
    gorselAdresi(yol).then((u) => { if (!iptal) setAdres(u); });
    return () => { iptal = true; };
  }, [yol]);
  return adres;
}

/** Yuvarlak kategori ikonu; adres çözülene kadar yedek emoji durur. */
export function KesifDaire({ yol, yedek }: { yol: string; yedek: string }) {
  const adres = useGorselAdresi(yol);
  return (
    <span className="bk-kesif-daire">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {adres ? <img src={adres} alt="" /> : yedek}
    </span>
  );
}

/** Kart görseli: yüklenince doğal en/boy oranını bildirir — kart o orana göre ölçülür,
    böylece çerçeve resmi tam sarar (ne kırpma ne boş kenar). */
export function KesifKartGorseli({ yol, onOran }: { yol: string; onOran: (o: number) => void }) {
  const adres = useGorselAdresi(yol);
  if (!adres) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={adres}
      alt=""
      onLoad={(e) => {
        const g = e.currentTarget;
        if (g.naturalHeight > 0) onOran(g.naturalWidth / g.naturalHeight);
      }}
    />
  );
}

/** Tam genişlik görsel; adres yokken aynı ölçüde boş kutu bırakır (zıplama olmasın). */
export function KesifGorsel({ yol, sinif }: { yol: string; sinif: string }) {
  const adres = useGorselAdresi(yol);
  if (!adres) return <div className={sinif} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={sinif} src={adres} alt="" />;
}

/** Keşif içerikleri (atasözleri/harikalar/meslekler/türkiye veritabanları) giriş ister —
    misafirken boş liste yerine açıkça giriş kartı gösterilir. */
export function KesifGirisGerekli({
  tur, baslik, aciklama,
}: { tur: string; baslik: string; aciklama: string }) {
  return (
    <div className="bk-kesif" data-tur={tur}>
      <div className="bk-kesif-ust">
        <a className="geri" href="/" aria-label="Geri">✕</a>
        <h1>{baslik}</h1>
      </div>
      <div className="bk-kesif-kart">
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.85)", margin: "0 0 14px" }}>{aciklama}</p>
        <a className="bk-dugme" href="/giris">Giriş yap</a>
      </div>
    </div>
  );
}
