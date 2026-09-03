"use client";

// Meslek Grupları — uygulamadaki MeslekGruplariScreen'in web karşılığı.
// Veri: meslekler/{onlisans|lisans}/categories → başlığı seçili kategoriye eşit düğümün items'ı.
// Önbellek sıcaksa liste ilk karede dolu gelir, arka planda tazelenir (uygulamadaki davranış).

import Link from "next/link";
import { useEffect, useState } from "react";
import { KesifGirisGerekli } from "../kesif/ortak";
import { useOturum } from "../../lib/oturum";
import {
  MESLEK_KATEGORILERI,
  MESLEK_SEVIYELERI,
  mesleklerGetir,
  mesleklerOnbellekten,
  type Meslek,
} from "../../lib/kesif";

export default function MesleklerSayfasi() {
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
      ? <KesifGirisGerekli tur="meslekler" baslik={"Meslek Grupları"} aciklama={"Meslek içeriğini görmek için giriş yapman gerekiyor."} />
      : null;
  const [seviye, setSeviye] = useState<string>("onlisans");
  const [kategori, setKategori] = useState<string>("Sağlık");
  const [liste, setListe] = useState<Meslek[] | null>(null);
  const [tazeleniyor, setTazeleniyor] = useState(false);

  useEffect(() => {
    let iptal = false;
    const onbellekli = mesleklerOnbellekten(seviye, kategori);
    if (onbellekli) { setListe(onbellekli); setTazeleniyor(true); }
    else { setListe(null); }

    mesleklerGetir(seviye, kategori).then((v) => {
      if (iptal) return;
      setListe(v);
      setTazeleniyor(false);
    });
    return () => { iptal = true; };
  }, [seviye, kategori]);

  if (misafirPerdesi) return misafirPerdesi;

  return (
    <div className="bk-kesif" data-tur="meslekler">
      <div className="bk-kesif-ust">
        <Link className="geri" href="/" aria-label="Geri">✕</Link>
        <h1>Meslek Grupları</h1>
      </div>

      <div className="bk-kademe">
        {MESLEK_SEVIYELERI.map((s) => (
          <button key={s.key} data-secili={seviye === s.key} onClick={() => setSeviye(s.key)}>
            {s.ad}
          </button>
        ))}
      </div>

      <div className="bk-kesif-serit">
        {MESLEK_KATEGORILERI.map((k) => (
          <button key={k} className="bk-kesif-cip" data-secili={kategori === k} onClick={() => setKategori(k)}>
            {k}
          </button>
        ))}
      </div>

      {tazeleniyor && <div className="bk-kesif-tazele"><i /></div>}

      {liste == null ? (
        <div className="bk-kesif-bos">Yükleniyor…</div>
      ) : liste.length === 0 ? (
        <div className="bk-kesif-bos">Bu kategoride meslek bulunamadı.</div>
      ) : (
        <div className="bk-meslek-liste">
          {liste.map((m) => (
            <div key={m.id} className="bk-meslek-kart">
              <div className="ad">{m.baslik}</div>
              {m.aciklama && <div className="aciklama">{m.aciklama}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
