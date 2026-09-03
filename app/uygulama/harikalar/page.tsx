"use client";

// Dünya Harikaları — uygulamadaki DunyaHarikalariScreen'in web karşılığı.
// Veri: dunyaHarikalari/categories → {title, iconImage, items[{title, location, imageName, description}]}
// Görseller Storage'da `harikalar/{imageName}` altında; adresler bir kez çözülüp önbelleğe alınır.
// Akış uygulamadaki gibi: kategori listesi → kategori içinde kart kart gezinme.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useOturum } from "../../lib/oturum";
import { KesifDaire, KesifGorsel , KesifGirisGerekli } from "../kesif/ortak";
import {
  harikalariGetir,
  harikalarOnbellekten,
  type Harika,
  type HarikaKategori,
} from "../../lib/kesif";

export default function HarikalarSayfasi() {
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
      ? <KesifGirisGerekli tur="harikalar" baslik={"Dünya Harikaları"} aciklama={"Dünya harikaları içeriğini görmek için giriş yapman gerekiyor."} />
      : null;
  const [kategoriler, setKategoriler] = useState<HarikaKategori[] | null>(harikalarOnbellekten());
  const [hata, setHata] = useState(false);
  const [secili, setSecili] = useState<number | null>(null);

  useEffect(() => {
    if (kategoriler) return;
    let iptal = false;
    harikalariGetir()
      .then((v) => { if (!iptal) setKategoriler(v); })
      .catch(() => { if (!iptal) setHata(true); });
    return () => { iptal = true; };
  }, [kategoriler]);

  if (misafirPerdesi) return misafirPerdesi;

  if (secili != null && kategoriler && kategoriler[secili]) {
    return <KategoriDetay kategori={kategoriler[secili]} onGeri={() => setSecili(null)} />;
  }

  return (
    <div className="bk-kesif" data-tur="harikalar">
      <div className="bk-kesif-ust">
        <Link className="geri" href="/uygulama" aria-label="Geri">✕</Link>
        <div>
          <h1>Dünya Harikaları</h1>
          <div className="alt">Kategori seç, keşfet, öğren!</div>
        </div>
      </div>

      {hata ? (
        <div className="bk-kesif-bos">Veriler yüklenemedi.</div>
      ) : kategoriler == null ? (
        <div className="bk-kesif-bos">Yükleniyor…</div>
      ) : (
        <div className="bk-harika-liste">
          {kategoriler.map((k, i) => (
            <button
              key={k.id || i}
              className="bk-harika-kat"
              data-ters={i % 2 === 1}
              onClick={() => setSecili(i)}
            >
              <KesifDaire yol={k.ikon ? `harikalar/${k.ikon}` : ""} yedek="🌍" />
              <span className="orta">
                <span className="ad" style={{ display: "block" }}>{k.baslik}</span>
                <span className="adet" style={{ display: "block" }}>{k.ogeler.length} kart</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- kategori içi */

function KategoriDetay({ kategori, onGeri }: { kategori: HarikaKategori; onGeri: () => void }) {
  const [indeks, setIndeks] = useState(0);
  const toplam = kategori.ogeler.length;
  const oge: Harika | undefined = kategori.ogeler[indeks];

  return (
    <div className="bk-kesif" data-tur="harikalar">
      <div className="bk-kesif-ust">
        <button className="geri" onClick={onGeri} aria-label="Geri">✕</button>
        <h1>{kategori.baslik}</h1>
      </div>

      {!oge ? (
        <div className="bk-kesif-bos">İçerik bulunamadı.</div>
      ) : (
        <>
          <div className="bk-harika-orta">
            <KesifGorsel yol={oge.gorsel ? `harikalar/${oge.gorsel}` : ""} sinif="bk-harika-gorsel" />
            <div className="bk-harika-metin">
              <h2>{oge.baslik}</h2>
              {oge.yer && <div className="yer">{oge.yer}</div>}
              {oge.aciklama && <p>{oge.aciklama}</p>}
            </div>
          </div>

          <div className="bk-kesif-gezinme">
            <button className="bk-kesif-ok" disabled={indeks === 0} onClick={() => setIndeks((i) => Math.max(0, i - 1))}>
              ← Önceki
            </button>
            <span className="sayac">{indeks + 1}/{toplam}</span>
            <button
              className="bk-kesif-ok"
              disabled={indeks >= toplam - 1}
              onClick={() => setIndeks((i) => Math.min(toplam - 1, i + 1))}
            >
              Sonraki →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
