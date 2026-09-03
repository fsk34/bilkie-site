"use client";

// Türkiye'yi Keşfet — uygulamadaki TurkiyeyiKesfetScreen'in web karşılığı.
// Veri: content/turkiyeyi_kesfet → order (varsa sıralama) + items{title, where, when, why, funFact, didYouKnow, image}
// Kart uygulamadaki gibi ÇEVRİLİYOR: ön yüz görsel, arka yüz bilgi şeritleri (0.42 s).

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOturum } from "../../lib/oturum";
import { KesifGirisGerekli, KesifKartGorseli } from "../kesif/ortak";
import { kesfetGetir, kesfetOnbellekten, type KesfetYer } from "../../lib/kesif";

export default function TurkiyeSayfasi() {
  return (
    <div className="bk bk-kesif-sahne">
      <Icerik />
    </div>
  );
}

function Icerik() {
  const { yukleniyor, kullanici } = useOturum();

  const misafirPerdesi =
    !yukleniyor && !kullanici
      ? <KesifGirisGerekli tur="turkiye" baslik={"Türkiye'yi Keşfet"} aciklama={"Türkiye'yi Keşfet içeriğini görmek için giriş yapman gerekiyor."} />
      : null;
  const [yerler, setYerler] = useState<KesfetYer[] | null>(kesfetOnbellekten());
  const [hata, setHata] = useState(false);
  const [indeks, setIndeks] = useState(0);
  const [arka, setArka] = useState(false);
  const [oran, setOran] = useState(0.75);   // görsel yüklenince gerçek oranıyla değişir

  useEffect(() => {
    if (yerler) return;
    let iptal = false;
    kesfetGetir()
      .then((v) => { if (!iptal) setYerler(v); })
      .catch(() => { if (!iptal) setHata(true); });
    return () => { iptal = true; };
  }, [yerler]);

  if (misafirPerdesi) return misafirPerdesi;

  const toplam = yerler?.length ?? 0;
  const yer = yerler?.[indeks];

  function git(delta: number) {
    setIndeks((i) => Math.min(Math.max(0, i + delta), Math.max(0, toplam - 1)));
    setArka(false);   // kart hep ön yüzüyle açılır (uygulamadaki gibi)
  }

  return (
    <div className="bk-kesif" data-tur="turkiye">
      <div className="bk-kesif-ust">
        <Link className="geri" href="/uygulama" aria-label="Geri">✕</Link>
        <h1>Türkiye&apos;yi Keşfet</h1>
      </div>

      {hata ? (
        <div className="bk-kesif-bos">Veriler yüklenemedi.</div>
      ) : yerler == null ? (
        <div className="bk-kesif-bos">Yükleniyor…</div>
      ) : !yer ? (
        <div className="bk-kesif-bos">İçerik bulunamadı.</div>
      ) : (
        <>
          <div className="bk-cevir" data-arka={arka}>
            <div
              className="bk-cevir-ic"
              style={{ ["--oran" as string]: String(oran) } as React.CSSProperties}
              onClick={() => setArka((a) => !a)}
            >
              {/* ön yüz */}
              <div className="bk-cevir-yuz on">
                <div className="bk-kesif-rozet">{yer.baslik || "(İsimsiz)"}</div>
                <div className="bk-kesif-gorsel-kutu">
                  <KesifKartGorseli yol={yer.gorsel} onOran={setOran} />
                </div>
                <div className="bk-kesif-ipucu">Detay için dokun</div>
              </div>

              {/* arka yüz — uygulamada kart, başlık rozetini de kaplayacak kadar uzun */}
              <div className="bk-cevir-yuz arka">
                <div className="bk-cevir-arka">
                  <div className="bk-kesif-rozet" style={{ margin: 0 }}>{yer.baslik || "(İsimsiz)"}</div>
                  {yer.nerede && <div className="sat">{yer.nerede}</div>}
                  {yer.neZaman && <div className="sat">{yer.neZaman}</div>}
                  {yer.neden && <div className="sat neden">{yer.neden}</div>}
                  {yer.biliyorMuydun && <div className="sat">{yer.biliyorMuydun}</div>}
                  {yer.ilginc && <div className="sat">{yer.ilginc}</div>}
                  <div className="kapan">Kapağa dönmek için dokun</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bk-kesif-gezinme">
            <button className="bk-kesif-ok" disabled={indeks === 0} onClick={() => git(-1)}>← Önceki</button>
            <span className="sayac">{indeks + 1}/{toplam}</span>
            <button className="bk-kesif-ok" disabled={indeks >= toplam - 1} onClick={() => git(1)}>Sonraki →</button>
          </div>
        </>
      )}
    </div>
  );
}
